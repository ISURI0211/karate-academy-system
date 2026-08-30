import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied: Student credentials required.' });
  }

  const userId = session.user.id;
  const { method } = req;

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

  // Resolve student profile
  const studentResult = await safeQuery('SELECT id, first_name, last_name FROM students WHERE user_id = ? LIMIT 1', [userId]);
  if (!studentResult || studentResult.length === 0) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }
  const studentId = studentResult[0].id;
  const studentName = `${studentResult[0].first_name} ${studentResult[0].last_name}`;

  if (method === 'GET') {
    try {
      // Fetch all events with confirmed registration status
      const events = await safeQuery(`
        SELECT 
          e.id,
          e.name,
          e.description,
          DATE_FORMAT(e.event_date, '%Y-%m-%d') as event_date,
          e.location,
          e.event_type,
          e.status,
          ep.id as registration_id,
          ep.role,
          ep.result_details,
          ep.score,
          ep.attendance_status,
          ep.status as registration_status,
          ep.cancel_reason as registration_cancel_reason,
          (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'confirmed') as participant_count
        FROM events e
        LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.student_id = ?
        ORDER BY e.event_date DESC
      `, [studentId]);

      // Check for pending requests in notifications for each event
      const pendingNotifs = await safeQuery(`
        SELECT message FROM notifications
        WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')
          AND title = 'Event Enrollment Request'
          AND is_read = 0
          AND message LIKE CONCAT('%[SID:', ?, ']%')
      `, [studentId]);

      const pendingEventIds = new Set<number>();
      const pendingRoleMap: Record<number, string> = {};
      if (pendingNotifs) {
        for (const n of pendingNotifs) {
          const eidMatch = n.message.match(/\[EID:(\d+)\]/);
          const roleMatch = n.message.match(/\[ROLE:([^\]]+)\]/);
          if (eidMatch) {
            const eid = Number(eidMatch[1]);
            pendingEventIds.add(eid);
            if (roleMatch) pendingRoleMap[eid] = roleMatch[1];
          }
        }
      }

      // Attach pending state and generate unique EVT ID for confirmed registrations
      const enriched = (events || []).map((ev: any) => ({
        ...ev,
        has_pending_request: !ev.registration_id && pendingEventIds.has(ev.id),
        pending_role: pendingEventIds.has(ev.id) ? pendingRoleMap[ev.id] || null : null,
        // Unique participant ID: EVT-000042 derived from registration record ID
        participant_code: ev.registration_id
          ? `EVT-${String(ev.registration_id).padStart(6, '0')}`
          : null,
      }));

      return res.status(200).json({ success: true, events: enriched });
    } catch (error: any) {
      console.error('Failed to load student events:', error);
      return res.status(500).json({ error: 'Failed to retrieve events: ' + error.message });
    }
  }

  if (method === 'POST') {
    // Submit enrollment REQUEST (not direct insert)
    try {
      const { event_id, role } = req.body;
      if (!event_id || !role) {
        return res.status(400).json({ error: 'Event ID and role are required.' });
      }

      const validRoles = ['competitor', 'volunteer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid participant role. Choose competitor or volunteer.' });
      }

      // Verify event is upcoming
      const eventCheck = await safeQuery('SELECT status, name, DATE_FORMAT(event_date, "%Y-%m-%d") as event_date FROM events WHERE id = ? LIMIT 1', [event_id]);
      if (!eventCheck || eventCheck.length === 0) {
        return res.status(404).json({ error: 'Event not found.' });
      }
      if (eventCheck[0].status !== 'upcoming') {
        return res.status(400).json({ error: 'You can only request to join upcoming events.' });
      }

      // Check if already confirmed
      const existing = await safeQuery('SELECT id FROM event_participants WHERE event_id = ? AND student_id = ? LIMIT 1', [event_id, studentId]);
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'You are already registered for this event.' });
      }

      // Check for duplicate pending request
      const existingRequest = await safeQuery(`
        SELECT id FROM notifications
        WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')
          AND title = 'Event Enrollment Request'
          AND is_read = 0
          AND message LIKE CONCAT('%[SID:', ?, '][EID:', ?, ']%')
        LIMIT 1
      `, [studentId, event_id]);

      if (existingRequest && existingRequest.length > 0) {
        return res.status(400).json({ error: 'An enrollment request for this event is already awaiting admin approval.' });
      }

      const eventName = eventCheck[0].name;
      const eventDate = eventCheck[0].event_date;

      // Send notification to all admins
      const adminUsers = await safeQuery("SELECT id FROM users WHERE role = 'admin'");
      if (adminUsers && adminUsers.length > 0) {
        for (const admin of adminUsers) {
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'announcement', 'Event Enrollment Request', ?)
          `, [
            admin.id,
            `Student "${studentName}" has requested to join the event "${eventName}" (${eventDate}) as a ${role}. Please review and approve from the Events management panel. [SID:${studentId}][EID:${event_id}][ROLE:${role}]`
          ]);
        }
      }

      return res.status(200).json({ success: true, message: 'Enrollment request submitted. Awaiting admin approval.' });
    } catch (error: any) {
      console.error('Failed to submit event enrollment request:', error);
      return res.status(500).json({ error: 'Failed to submit request: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { event_id } = req.body;
      if (!event_id) {
        return res.status(400).json({ error: 'Event ID is required.' });
      }

      const eventCheck = await safeQuery('SELECT status, name FROM events WHERE id = ? LIMIT 1', [event_id]);
      if (!eventCheck || eventCheck.length === 0) {
        return res.status(404).json({ error: 'Event not found.' });
      }
      if (eventCheck[0].status !== 'upcoming') {
        return res.status(400).json({ error: 'You can only cancel registrations for upcoming events.' });
      }

      // Try to cancel confirmed registration first
      const deleted = await safeQuery('DELETE FROM event_participants WHERE event_id = ? AND student_id = ?', [event_id, studentId]);

      // Also cancel any pending requests
      await safeQuery(`
        UPDATE notifications SET is_read = 1 
        WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')
          AND title = 'Event Enrollment Request'
          AND is_read = 0
          AND message LIKE CONCAT('%[SID:', ?, '][EID:', ?, ']%')
      `, [studentId, event_id]);

      return res.status(200).json({ success: true, message: 'Registration cancelled successfully.' });
    } catch (error: any) {
      console.error('Failed to cancel event registration:', error);
      return res.status(500).json({ error: 'Failed to cancel: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
