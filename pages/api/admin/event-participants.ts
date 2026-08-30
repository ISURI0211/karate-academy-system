import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";
import type { ResultSetHeader } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  // Safe Column Migration (Runs once on first API hit, no duplicates)
  try {
    await safeQuery("ALTER TABLE event_participants ADD COLUMN attendance_status ENUM('pending', 'present', 'absent') DEFAULT 'pending'");
  } catch (e) {}
  try {
    await safeQuery("ALTER TABLE event_participants ADD COLUMN status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed'");
  } catch (e) {}
  try {
    await safeQuery("ALTER TABLE event_participants ADD COLUMN cancel_reason VARCHAR(255) NULL");
  } catch (e) {}

  const { method } = req;

  if (method === 'GET') {
    try {
      const { eventId } = req.query;
      if (!eventId) {
        return res.status(400).json({ error: 'Event ID is required.' });
      }

      // 1. Get all participants (both confirmed and cancelled)
      const participants = await safeQuery(`
        SELECT 
          ep.id as participant_id, 
          ep.student_id, 
          ep.role, 
          ep.result_details, 
          ep.score,
          ep.attendance_status,
          ep.status,
          ep.cancel_reason,
          DATE_FORMAT(ep.created_at, '%Y-%m-%d') as registration_date, 
          s.first_name, 
          s.last_name, 
          s.belt_rank 
        FROM event_participants ep 
        JOIN students s ON ep.student_id = s.id 
        WHERE ep.event_id = ?
        ORDER BY s.first_name, s.last_name
      `, [eventId]);

      // 2. Get active students NOT registered for this event at all
      const unregistered = await safeQuery(`
        SELECT 
          s.id as student_id, 
          s.first_name, 
          s.last_name, 
          s.belt_rank 
        FROM students s 
        WHERE s.enrollment_status = 'active' 
          AND s.id NOT IN (
            SELECT student_id FROM event_participants 
            WHERE event_id = ?
          )
        ORDER BY s.first_name, s.last_name
      `, [eventId]);

      // 3. Get pending requests
      const pendingNotifs = await safeQuery(`
        SELECT id, message, created_at
        FROM notifications
        WHERE title = 'Event Enrollment Request'
          AND is_read = 0
          AND message LIKE CONCAT('%[EID:', ?, ']%')
        GROUP BY message
        ORDER BY created_at DESC
      `, [eventId]);

      const pendingRequests: Array<{
        notification_id: number;
        student_id: number;
        student_name: string;
        belt_rank: string;
        role: string;
        requested_at: string;
      }> = [];

      if (pendingNotifs && pendingNotifs.length > 0) {
        for (const notif of pendingNotifs) {
          const msg: string = notif.message;
          const sidStart = msg.indexOf('[SID:');
          const roleStart = msg.indexOf('[ROLE:');
          if (sidStart === -1) continue;

          const sid = Number(msg.substring(sidStart + 5, msg.indexOf(']', sidStart)));
          const role = roleStart !== -1
            ? msg.substring(roleStart + 6, msg.indexOf(']', roleStart))
            : 'competitor';

          if (isNaN(sid)) continue;

          // Skip if already has any participation row
          const alreadyRegistered = (participants || []).some((p: any) => p.student_id === sid);
          if (alreadyRegistered) continue;

          if (pendingRequests.some(r => r.student_id === sid)) continue;

          const studentInfo = await safeQuery('SELECT first_name, last_name, belt_rank FROM students WHERE id = ? LIMIT 1', [sid]);
          if (studentInfo && studentInfo.length > 0) {
            pendingRequests.push({
              notification_id: notif.id,
              student_id: sid,
              student_name: `${studentInfo[0].first_name} ${studentInfo[0].last_name}`,
              belt_rank: studentInfo[0].belt_rank,
              role,
              requested_at: notif.created_at,
            });
          }
        }
      }

      return res.status(200).json({ success: true, participants, unregistered, pendingRequests });
    } catch (error: any) {
      console.error('Failed to fetch event participants:', error);
      return res.status(500).json({ error: 'Failed to retrieve roster: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { event_id, student_id, role, approve_notification_id } = req.body;

      if (!event_id || !student_id) {
        return res.status(400).json({ error: 'Event ID and Student ID are required.' });
      }

      const assignedRole = role || 'competitor';

      // Insert into event_participants (defaults: status = 'confirmed', attendance_status = 'pending')
      const insertResult = await safeQuery(`
        INSERT INTO event_participants (event_id, student_id, role, status, attendance_status) 
        VALUES (?, ?, ?, 'confirmed', 'pending')
      `, [event_id, student_id, assignedRole]) as unknown as ResultSetHeader;

      const newParticipantId = insertResult.insertId;
      const participantCode = `EVT-${String(newParticipantId).padStart(6, '0')}`;

      // If approving a pending request, mark notification as read
      if (approve_notification_id) {
        await safeQuery(
          `UPDATE notifications SET is_read = 1 
           WHERE title = 'Event Enrollment Request' AND is_read = 0 
           AND message LIKE CONCAT('%[SID:', ?, '][EID:', ?, ']%')`,
          [student_id, event_id]
        );
      }

      // Send confirmation notification to the student
      try {
        const eventInfo = await safeQuery('SELECT name, DATE_FORMAT(event_date, "%Y-%m-%d") as event_date FROM events WHERE id = ? LIMIT 1', [event_id]);
        const studentInfo = await safeQuery('SELECT user_id FROM students WHERE id = ? LIMIT 1', [student_id]);

        if (eventInfo?.length > 0 && studentInfo?.length > 0) {
          const eventName = eventInfo[0].name;
          const eventDate = eventInfo[0].event_date;
          const studentUserId = studentInfo[0].user_id;

          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message) 
            VALUES (?, 'announcement', 'Event Registration Confirmed', ?)
          `, [
            studentUserId,
            `Your registration for "${eventName}" on ${eventDate} as a ${assignedRole} has been approved. Your unique Participant ID is: ${participantCode}`
          ]);
        }
      } catch (notifErr) {
        console.error('Failed to write event notification:', notifErr);
      }

      return res.status(201).json({
        success: true,
        message: `Student registered. Participant code: ${participantCode}`,
        participant_code: participantCode
      });
    } catch (error: any) {
      console.error('Failed to register student for event:', error);
      return res.status(500).json({ error: 'Failed to register student: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { participant_id, role, result_details, score, attendance_status, status, cancel_reason } = req.body;

      if (!participant_id) {
        return res.status(400).json({ error: 'Participant ID is required.' });
      }

      // Fetch details before update
      const participantInfo = await safeQuery(`
        SELECT 
          ep.student_id, 
          ep.event_id, 
          ep.result_details as old_result, 
          ep.status as old_status,
          e.name as event_name, 
          s.user_id 
        FROM event_participants ep
        JOIN events e ON ep.event_id = e.id
        JOIN students s ON ep.student_id = s.id
        WHERE ep.id = ? LIMIT 1
      `, [participant_id]);

      if (!participantInfo || participantInfo.length === 0) {
        return res.status(404).json({ error: 'Registration record not found.' });
      }

      const { student_id, event_id, event_name, user_id, old_result, old_status } = participantInfo[0];

      // Update fields
      // Build dynamic set clauses
      const sets: string[] = [];
      const params: any[] = [];

      if (role !== undefined) { sets.push('role = ?'); params.push(role); }
      if (result_details !== undefined) { sets.push('result_details = ?'); params.push(result_details?.trim() || null); }
      if (score !== undefined) { sets.push('score = ?'); params.push(score); }
      if (attendance_status !== undefined) { sets.push('attendance_status = ?'); params.push(attendance_status); }
      if (status !== undefined) { sets.push('status = ?'); params.push(status); }
      if (cancel_reason !== undefined) { sets.push('cancel_reason = ?'); params.push(cancel_reason?.trim() || null); }

      if (sets.length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
      }

      params.push(participant_id);
      await safeQuery(`
        UPDATE event_participants 
        SET ${sets.join(', ')}
        WHERE id = ?
      `, params);

      // Notification checks
      try {
        // 1. If status changed to cancelled
        if (status === 'cancelled' && old_status !== 'cancelled') {
          const reasonMsg = cancel_reason?.trim() ? ` Reason: ${cancel_reason.trim()}` : '';
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'announcement', 'Event Registration Cancelled', ?)
          `, [
            user_id,
            `Your registration for the event "${event_name}" has been cancelled by the admin.${reasonMsg}`
          ]);
        }
        // 2. If status restored to confirmed
        if (status === 'confirmed' && old_status === 'cancelled') {
          const participantCode = `EVT-${String(participant_id).padStart(6, '0')}`;
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'announcement', 'Event Registration Restored', ?)
          `, [
            user_id,
            `Your registration for the event "${event_name}" has been restored. Your Participant ID is: ${participantCode}`
          ]);
        }
        // 3. Achievement notification
        const hasNewAchievement = result_details?.trim() && (!old_result || old_result.trim() !== result_details.trim());
        if (hasNewAchievement) {
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message) 
            VALUES (?, 'announcement', 'Event Achievement Finalized!', ?)
          `, [
            user_id,
            `Congratulations! You achieved "${result_details.trim()}" in the event "${event_name}"!`
          ]);
        }
      } catch (notifErr) {
        console.error('Failed to dispatch notifications:', notifErr);
      }

      return res.status(200).json({ success: true, message: 'Participant record updated.' });
    } catch (error: any) {
      console.error('Failed to update participant:', error);
      return res.status(500).json({ error: 'Failed to update record: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { participantId } = req.query;

      if (!participantId) {
        return res.status(400).json({ error: 'Participant ID is required.' });
      }

      await safeQuery('DELETE FROM event_participants WHERE id = ?', [participantId]);

      return res.status(200).json({ success: true, message: 'Event registration deleted permanently.' });
    } catch (error: any) {
      console.error('Failed to delete participant:', error);
      return res.status(500).json({ error: 'Failed to delete registration: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
