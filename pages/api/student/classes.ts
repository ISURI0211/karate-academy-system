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

  // Resolve student profile
  const studentResult = await safeQuery('SELECT id, first_name, last_name FROM students WHERE user_id = ? LIMIT 1', [userId]);
  if (!studentResult || studentResult.length === 0) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }
  const studentId = studentResult[0].id;
  const studentName = `${studentResult[0].first_name} ${studentResult[0].last_name}`;

  if (method === 'GET') {
    try {
      // List all classes with enrollment state for this student
      const classes = await safeQuery(`
        SELECT 
          c.id,
          c.name,
          c.description,
          DATE_FORMAT(c.class_date, '%Y-%m-%d') as class_date,
          c.start_time,
          c.end_time,
          c.location,
          c.capacity,
          CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
          (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.status = 'enrolled') as current_enrollment,
          (SELECT ce.status FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.student_id = ? AND ce.status = 'enrolled' LIMIT 1) as enrollment_status
        FROM classes c
        JOIN instructors i ON c.instructor_id = i.id
        ORDER BY c.class_date DESC
      `, [studentId]);

      // Check for pending enrollment requests via notifications table
      const pendingRequests = await safeQuery(`
        SELECT message FROM notifications 
        WHERE user_id IN (SELECT id FROM users WHERE role = 'admin') 
          AND title = 'Class Enrollment Request'
          AND is_read = 0
          AND message LIKE ?
      `, [`%[SID:${studentId}]%`]);

      // Build a set of class IDs that have pending requests
      const pendingClassIds = new Set<number>();
      if (pendingRequests) {
        for (const n of pendingRequests) {
          const match = n.message.match(/\[CID:(\d+)\]/);
          if (match) pendingClassIds.add(Number(match[1]));
        }
      }

      // Attach pending state to classes
      const enriched = (classes || []).map((c: any) => ({
        ...c,
        has_pending_request: pendingClassIds.has(c.id)
      }));

      return res.status(200).json({ success: true, classes: enriched });
    } catch (error: any) {
      console.error('Failed to load classes:', error);
      return res.status(500).json({ error: 'Failed to retrieve classes: ' + error.message });
    }
  }

  if (method === 'POST') {
    // Send enrollment REQUEST (notification to admin), NOT direct enrollment
    try {
      const { class_id } = req.body;
      if (!class_id) {
        return res.status(400).json({ error: 'Class ID is required.' });
      }

      // Check if already enrolled
      const existingEnrollment = await safeQuery(`
        SELECT status FROM class_enrollments 
        WHERE class_id = ? AND student_id = ? LIMIT 1
      `, [class_id, studentId]);

      if (existingEnrollment?.length > 0 && existingEnrollment[0].status === 'enrolled') {
        return res.status(400).json({ error: 'You are already enrolled in this class.' });
      }

      // Get class details
      const classInfo = await safeQuery('SELECT name FROM classes WHERE id = ? LIMIT 1', [class_id]);
      if (!classInfo || classInfo.length === 0) {
        return res.status(404).json({ error: 'Class not found.' });
      }
      const className = classInfo[0].name;

      // Check for existing pending request
      const existingRequest = await safeQuery(`
        SELECT id FROM notifications 
        WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')
          AND title = 'Class Enrollment Request'
          AND is_read = 0
          AND message LIKE ?
        LIMIT 1
      `, [`%[SID:${studentId}][CID:${class_id}]%`]);

      if (existingRequest?.length > 0) {
        return res.status(400).json({ error: 'An enrollment request for this class is already pending admin review.' });
      }

      // Send notification to all admin users
      const adminUsers = await safeQuery("SELECT id FROM users WHERE role = 'admin'");
      if (adminUsers && adminUsers.length > 0) {
        for (const admin of adminUsers) {
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, 'class_reminder', 'Class Enrollment Request', ?)
          `, [
            admin.id,
            `Student "${studentName}" has requested enrollment in the class "${className}". Please review and approve from the Classes management panel. [SID:${studentId}][CID:${class_id}]`
          ]);
        }
      }

      return res.status(200).json({ success: true, message: 'Enrollment request submitted. Awaiting admin approval.' });
    } catch (error: any) {
      console.error('Failed to submit enrollment request:', error);
      return res.status(500).json({ error: 'Failed to submit request: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
