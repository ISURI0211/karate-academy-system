import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { withTransaction, safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'instructor')) {
    return res.status(403).json({ error: 'Access denied: Admin or Instructor credentials required.' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const { classId, date, month } = req.query;
      if (!classId) {
        return res.status(400).json({ error: 'Class ID is required.' });
      }

      if (month) {
        // Query enrolled students for this class
        const students = await safeQuery(`
          SELECT 
            s.id as student_id, 
            s.first_name, 
            s.last_name, 
            s.belt_rank
          FROM class_enrollments ce
          JOIN students s ON ce.student_id = s.id
          WHERE ce.class_id = ? AND ce.status = 'enrolled'
          ORDER BY s.first_name, s.last_name
        `, [classId]);

        // Query all distinct dates in this month where attendance was recorded for this class
        const datesResult = await safeQuery(`
          SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') as date
          FROM attendance
          WHERE class_id = ? AND DATE_FORMAT(attendance_date, '%Y-%m') = ?
          GROUP BY DATE_FORMAT(attendance_date, '%Y-%m-%d')
          ORDER BY date ASC
        `, [classId, month]);

        const dates = datesResult.map((d: any) => d.date);

        // Query all attendance records for this month and class
        const records = await safeQuery(`
          SELECT 
            a.id,
            a.student_id,
            DATE_FORMAT(a.attendance_date, '%Y-%m-%d') as attendance_date,
            a.status
          FROM attendance a
          WHERE a.class_id = ? AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
        `, [classId, month]);

        return res.status(200).json({ 
          success: true, 
          students, 
          dates, 
          monthlyRecords: records 
        });
      }

      if (!date) {
        return res.status(400).json({ error: 'Date or Month parameter is required.' });
      }

      // Query enrolled students for this class with their attendance status on this specific date
      const attendance = await safeQuery(`
        SELECT 
          s.id as student_id, 
          s.first_name, 
          s.last_name, 
          s.belt_rank, 
          a.status as attendance_status,
          a.id as attendance_id
        FROM class_enrollments ce
        JOIN students s ON ce.student_id = s.id
        LEFT JOIN attendance a ON a.student_id = s.id 
          AND a.class_id = ce.class_id 
          AND a.attendance_date = ?
        WHERE ce.class_id = ? AND ce.status = 'enrolled'
        ORDER BY s.first_name, s.last_name
      `, [date, classId]);

      return res.status(200).json({ success: true, attendance });
    } catch (error: any) {
      console.error('Failed to fetch attendance data:', error);
      return res.status(500).json({ error: 'Failed to retrieve attendance: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { class_id, attendance_date, records } = req.body;

      if (!class_id || !attendance_date || !records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Missing attendance logs parameters.' });
      }

      const marked_by = session.user.id;

      await withTransaction(async (connection) => {
        for (const rec of records) {
          const { student_id, status } = rec;
          if (!student_id || !status) continue;

          // Check if attendance is already logged
          const [existing]: any = await connection.execute(
            'SELECT id FROM attendance WHERE class_id = ? AND student_id = ? AND attendance_date = ? LIMIT 1',
            [class_id, student_id, attendance_date]
          );

          if (existing && existing.length > 0) {
            // Update
            await connection.execute(
              'UPDATE attendance SET status = ?, marked_by = ? WHERE id = ?',
              [status, marked_by, existing[0].id]
            );
          } else {
            // Insert
            await connection.execute(
              'INSERT INTO attendance (class_id, student_id, attendance_date, status, marked_by) VALUES (?, ?, ?, ?, ?)',
              [class_id, student_id, attendance_date, status, marked_by]
            );
          }

          // Send notification if absent or excused to keep students updated
          if (status === 'absent' || status === 'excused') {
            const [studentUser]: any = await connection.execute(
              'SELECT user_id FROM students WHERE id = ? LIMIT 1',
              [student_id]
            );
            const [classDetails]: any = await connection.execute(
              'SELECT name FROM classes WHERE id = ? LIMIT 1',
              [class_id]
            );
            const studentUserId = studentUser[0]?.user_id;
            const className = classDetails[0]?.name;

            if (studentUserId && className) {
              const capStatus = status.charAt(0).toUpperCase() + status.slice(1);
              // Avoid duplicate notification spam within an hour for the same marking
              const [dupNotif]: any = await connection.execute(`
                SELECT id FROM notifications 
                WHERE user_id = ? 
                  AND type = 'class_reminder' 
                  AND title = ? 
                  AND message LIKE ?
                LIMIT 1
              `, [studentUserId, `Marked ${capStatus}`, `%${className}%`]);

              if (dupNotif.length === 0) {
                await connection.execute(`
                  INSERT INTO notifications (user_id, type, title, message) 
                  VALUES (?, 'class_reminder', ?, ?)
                `, [
                  studentUserId,
                  `Marked ${capStatus}`,
                  `You were marked as ${capStatus} for the class "${className}" on ${attendance_date}.`
                ]);
              }
            }
          }
        }
      });

      return res.status(200).json({ success: true, message: 'Attendance records updated.' });
    } catch (error: any) {
      console.error('Failed to save attendance logs:', error);
      return res.status(500).json({ error: 'Failed to save attendance: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
