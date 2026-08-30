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
  const studentResult = await safeQuery('SELECT id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  if (!studentResult || studentResult.length === 0) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }
  const studentId = studentResult[0].id;

  if (method === 'GET') {
    try {
      // 1. Fetch attendance records list
      const attendanceRecords = await safeQuery(`
        SELECT 
          a.id,
          DATE_FORMAT(a.attendance_date, '%Y-%m-%d') as attendance_date,
          a.status,
          c.name as class_name,
          CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = a.marked_by LIMIT 1) as marked_by_name
        FROM attendance a
        JOIN classes c ON a.class_id = c.id
        JOIN instructors i ON c.instructor_id = i.id
        WHERE a.student_id = ?
        ORDER BY a.attendance_date DESC
      `, [studentId]);

      // 2. Fetch attendance distribution count (present, absent, excused)
      const statsResult = await safeQuery(`
        SELECT status, COUNT(*) as count 
        FROM attendance 
        WHERE student_id = ? 
        GROUP BY status
      `, [studentId]);

      const stats = {
        present: 0,
        absent: 0,
        excused: 0,
        total: 0
      };

      if (statsResult) {
        statsResult.forEach((row: any) => {
          if (row.status === 'present') stats.present = row.count;
          if (row.status === 'absent') stats.absent = row.count;
          if (row.status === 'excused') stats.excused = row.count;
        });
        stats.total = stats.present + stats.absent + stats.excused;
      }

      return res.status(200).json({
        success: true,
        records: attendanceRecords || [],
        stats
      });
    } catch (error: any) {
      console.error('Failed to load student attendance:', error);
      return res.status(500).json({ error: 'Failed to retrieve attendance logs: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
