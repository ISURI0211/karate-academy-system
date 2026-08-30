import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";
import type { ResultSetHeader } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required.' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const { history, page = '1', limit = '10' } = req.query;
      const isHistory = history === 'true';
      
      const limitVal = Math.max(1, Number(limit) || 10);
      const pageVal = Math.max(1, Number(page) || 1);
      const offsetVal = (pageVal - 1) * limitVal;
      const isReadStatus = isHistory ? 1 : 0;

      // 1. Get the total count of distinct requests for this status
      const countResult = await safeQuery(`
        SELECT COUNT(DISTINCT message) as total 
        FROM notifications 
        WHERE title = 'Event Enrollment Request'
          AND is_read = ?
      `, [isReadStatus]);
      const total = countResult?.[0]?.total || 0;

      // 2. Fetch the paginated distinct notifications
      const rawNotifs = await safeQuery(`
        SELECT 
          MIN(n.id) as notification_id,
          n.message,
          MAX(n.is_read) as is_read,
          MAX(n.created_at) as created_at
        FROM notifications n
        WHERE n.title = 'Event Enrollment Request'
          AND n.is_read = ?
        GROUP BY n.message
        ORDER BY created_at DESC
        LIMIT ${limitVal} OFFSET ${offsetVal}
      `, [isReadStatus]);

      const requests: Array<{
        notification_id: number;
        student_id: number;
        student_name: string;
        belt_rank: string;
        role: string;
        event_id: number;
        event_name: string;
        event_date: string;
        event_type: string;
        requested_at: string;
        already_confirmed: boolean;
        status: 'pending' | 'approved' | 'declined';
      }> = [];

      if (rawNotifs && rawNotifs.length > 0) {
        for (const notif of rawNotifs) {
          const msg: string = notif.message;

          const sidStart = msg.indexOf('[SID:');
          const eidStart = msg.indexOf('[EID:');
          const roleStart = msg.indexOf('[ROLE:');

          if (sidStart === -1 || eidStart === -1) continue;

          const sid = Number(msg.substring(sidStart + 5, msg.indexOf(']', sidStart)));
          const eid = Number(msg.substring(eidStart + 5, msg.indexOf(']', eidStart)));
          const role = roleStart !== -1
            ? msg.substring(roleStart + 6, msg.indexOf(']', roleStart))
            : 'competitor';

          if (isNaN(sid) || isNaN(eid)) continue;

          // Fetch student info
          const studentInfo = await safeQuery(
            'SELECT first_name, last_name, belt_rank FROM students WHERE id = ? LIMIT 1',
            [sid]
          );
          if (!studentInfo || studentInfo.length === 0) continue;

          // Fetch event info
          const eventInfo = await safeQuery(
            `SELECT name, DATE_FORMAT(event_date, '%Y-%m-%d') as event_date, event_type, status FROM events WHERE id = ? LIMIT 1`,
            [eid]
          );
          if (!eventInfo || eventInfo.length === 0) continue;

          // Check if the student was already confirmed
          const confirmed = await safeQuery(
            'SELECT id FROM event_participants WHERE event_id = ? AND student_id = ? LIMIT 1',
            [eid, sid]
          );
          const already_confirmed = !!(confirmed && confirmed.length > 0);

          // Determine final status for history items
          let finalStatus: 'pending' | 'approved' | 'declined' = 'pending';
          if (notif.is_read === 1) {
            finalStatus = already_confirmed ? 'approved' : 'declined';
          }

          requests.push({
            notification_id: notif.notification_id,
            student_id: sid,
            student_name: `${studentInfo[0].first_name} ${studentInfo[0].last_name}`,
            belt_rank: studentInfo[0].belt_rank,
            role,
            event_id: eid,
            event_name: eventInfo[0].name,
            event_date: eventInfo[0].event_date,
            event_type: eventInfo[0].event_type,
            requested_at: notif.created_at,
            already_confirmed,
            status: finalStatus,
            participant_id: already_confirmed ? confirmed[0].id : null
          });
        }
      }

      return res.status(200).json({
        success: true,
        requests,
        pagination: {
          total,
          page: pageVal,
          limit: limitVal,
          pages: Math.ceil(total / limitVal)
        }
      });
    } catch (error: any) {
      console.error('Failed to fetch event requests:', error);
      return res.status(500).json({ error: 'Failed to retrieve requests: ' + error.message });
    }
  }

  if (method === 'POST') {
    // Approve a request
    try {
      const { notification_id, student_id, event_id, role } = req.body;
      if (!notification_id || !student_id || !event_id || !role) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }

      // Check not already confirmed
      const existing = await safeQuery(
        'SELECT id FROM event_participants WHERE event_id = ? AND student_id = ? LIMIT 1',
        [event_id, student_id]
      );
      if (existing && existing.length > 0) {
        // Already confirmed — just dismiss the notification
        await safeQuery(
          `UPDATE notifications SET is_read = 1 
           WHERE title = 'Event Enrollment Request' AND is_read = 0 
           AND message LIKE CONCAT('%[SID:', ?, '][EID:', ?, ']%')`,
          [student_id, event_id]
        );
        return res.status(200).json({ success: true, message: 'Already confirmed. Notification dismissed.' });
      }

      // Insert participant
      const insertResult = await safeQuery(
        'INSERT INTO event_participants (event_id, student_id, role) VALUES (?, ?, ?)',
        [event_id, student_id, role]
      ) as unknown as ResultSetHeader;
      const newId = insertResult.insertId;
      const participantCode = `EVT-${String(newId).padStart(6, '0')}`;

      // Mark all related notifications as read using CONCAT to avoid bracket issues
      await safeQuery(
        `UPDATE notifications SET is_read = 1 
         WHERE title = 'Event Enrollment Request' AND is_read = 0 
         AND message LIKE CONCAT('%[SID:', ?, '][EID:', ?, ']%')`,
        [student_id, event_id]
      );

      // Notify student
      const eventInfo = await safeQuery(
        `SELECT name, DATE_FORMAT(event_date, '%Y-%m-%d') as event_date FROM events WHERE id = ? LIMIT 1`,
        [event_id]
      );
      const studentUserInfo = await safeQuery(
        'SELECT user_id FROM students WHERE id = ? LIMIT 1',
        [student_id]
      );

      if (eventInfo?.length > 0 && studentUserInfo?.length > 0) {
        await safeQuery(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES (?, 'announcement', 'Event Registration Confirmed', ?)`,
          [
            studentUserInfo[0].user_id,
            `Your registration for "${eventInfo[0].name}" on ${eventInfo[0].event_date} as a ${role} has been approved. Your unique Participant ID is: ${participantCode}`,
          ]
        );
      }

      return res.status(200).json({
        success: true,
        message: `Approved. Participant code: ${participantCode}`,
        participant_code: participantCode,
      });
    } catch (error: any) {
      console.error('Failed to approve event request:', error);
      return res.status(500).json({ error: 'Failed to approve: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    // Reject a request
    try {
      const { notification_id, student_id, event_id } = req.body;
      if (!notification_id || !student_id || !event_id) {
        return res.status(400).json({ error: 'Missing required fields.' });
      }

      // Dismiss all related notifications
      await safeQuery(
        `UPDATE notifications SET is_read = 1 
         WHERE title = 'Event Enrollment Request' AND is_read = 0 
         AND message LIKE CONCAT('%[SID:', ?, '][EID:', ?, ']%')`,
        [student_id, event_id]
      );

      // Notify student of rejection
      const eventInfo = await safeQuery('SELECT name FROM events WHERE id = ? LIMIT 1', [event_id]);
      const studentUserInfo = await safeQuery('SELECT user_id FROM students WHERE id = ? LIMIT 1', [student_id]);

      if (eventInfo?.length > 0 && studentUserInfo?.length > 0) {
        await safeQuery(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES (?, 'announcement', 'Event Request Declined', ?)`,
          [
            studentUserInfo[0].user_id,
            `Your registration request for the event "${eventInfo[0].name}" has been reviewed and declined by the admin.`,
          ]
        );
      }

      return res.status(200).json({ success: true, message: 'Request declined and student notified.' });
    } catch (error: any) {
      console.error('Failed to reject event request:', error);
      return res.status(500).json({ error: 'Failed to reject: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
