import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied: Student account required.' });
  }

  const userId = session.user.id;

  try {
    // 1. Fetch Student Profile
    const studentProfiles = await safeQuery(`
      SELECT id, first_name, last_name, belt_rank, enrollment_status 
      FROM students 
      WHERE user_id = ? LIMIT 1
    `, [userId]);

    if (!studentProfiles || studentProfiles.length === 0) {
      return res.status(404).json({ error: 'Student profile not found for this user.' });
    }

    const student = studentProfiles[0];
    const studentId = student.id;

    // 2. Fetch Attendance Distribution from correct 'attendance' table
    const attendanceStats = await safeQuery(`
      SELECT status, COUNT(*) as count 
      FROM attendance 
      WHERE student_id = ? 
      GROUP BY status
    `, [studentId]);

    // 3. Fetch Fee / Billing status of current bills
    const feeBills = await safeQuery(`
      SELECT status, COUNT(*) as count 
      FROM fees 
      WHERE student_id = ? 
      GROUP BY status
    `, [studentId]);

    const latestBill = await safeQuery(`
      SELECT amount, status, DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, DATE_FORMAT(billing_month, '%Y-%m') as billing_month
      FROM fees 
      WHERE student_id = ? 
      ORDER BY billing_month DESC LIMIT 1
    `, [studentId]);

    // 4. Fetch Enrolled Classes from 'class_enrollments' table (using class_date & location)
    const enrolledClasses = await safeQuery(`
      SELECT 
        c.id, 
        c.name, 
        DATE_FORMAT(c.class_date, '%Y-%m-%d') as class_date, 
        c.start_time, 
        c.end_time, 
        c.location,
        CONCAT(i.first_name, ' ', i.last_name) as instructor_name
      FROM class_enrollments e
      JOIN classes c ON e.class_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      WHERE e.student_id = ? AND e.status = 'enrolled'
    `, [studentId]);

    // 5. Fetch Grading Evaluations history
    const gradingHistory = await safeQuery(`
      SELECT 
        ge.name as exam_name,
        DATE_FORMAT(ge.exam_date, '%Y-%m-%d') as exam_date,
        gr.target_belt,
        gr.exam_result,
        gr.score
      FROM grading_registrations gr
      JOIN grading_exams ge ON gr.exam_id = ge.id
      WHERE gr.student_id = ?
      ORDER BY ge.exam_date ASC
    `, [studentId]);

    // 6. Fetch Target Training Resources (specific to enrolled classes or generic)
    const resources = await safeQuery(`
      SELECT 
        r.id,
        r.title,
        r.description,
        r.resource_type,
        r.file_url,
        c.name as class_name
      FROM resources r
      LEFT JOIN classes c ON r.class_id = c.id
      WHERE r.class_id IS NULL OR r.class_id IN (
        SELECT class_id FROM class_enrollments WHERE student_id = ? AND status = 'enrolled'
      )
      ORDER BY r.created_at DESC
    `, [studentId]);

    return res.status(200).json({
      success: true,
      profile: student,
      attendanceStats,
      feeBills,
      latestBill: latestBill?.[0] || null,
      enrolledClasses,
      gradingHistory,
      resources
    });
  } catch (error: any) {
    console.error('Failed to load student dashboard metrics:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard details: ' + error.message });
  }
}
