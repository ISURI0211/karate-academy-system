import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'instructor') {
    return res.status(403).json({ error: 'Access denied: Instructor credentials required.' });
  }

  const userId = session.user.id;
  const { method } = req;

  if (method === 'GET') {
    try {
      // 1. Fetch Instructor Profile
      const instructorProfiles = await safeQuery(`
        SELECT id, first_name, last_name, phone, qualifications as specialization 
        FROM instructors 
        WHERE user_id = ? LIMIT 1
      `, [userId]);

      if (!instructorProfiles || instructorProfiles.length === 0) {
        return res.status(404).json({ error: 'Instructor profile not found for this user.' });
      }

      const instructor = instructorProfiles[0];
      const instructorId = instructor.id;

      // 2. Fetch Assigned Classes (Today and Upcoming)
      const assignedClasses = await safeQuery(`
        SELECT 
          id, 
          name, 
          DATE_FORMAT(class_date, '%Y-%m-%d') as class_date, 
          start_time, 
          end_time, 
          location
        FROM classes
        WHERE instructor_id = ? AND class_date >= CURDATE()
        ORDER BY class_date ASC, start_time ASC
        LIMIT 5
      `, [instructorId]);

      // 3. Fetch Class Attendance rate for this instructor's classes
      const attendanceStats = await safeQuery(`
        SELECT a.status, COUNT(*) as count 
        FROM attendance a
        JOIN classes c ON a.class_id = c.id
        WHERE c.instructor_id = ?
        GROUP BY a.status
      `, [instructorId]);

      // 4. Fetch Pending Evaluations (Grading registrations) where this instructor is examiner
      const pendingEvaluations = await safeQuery(`
        SELECT COUNT(*) as count
        FROM grading_registrations gr
        JOIN grading_exams ge ON gr.exam_id = ge.id
        WHERE ge.examiner_id = ? AND gr.exam_result = 'pending'
      `, [instructorId]);
      
      const pendingCount = pendingEvaluations?.[0]?.count || 0;

      // 5. Fetch Recent Evaluations evaluated by this instructor
      const recentEvaluations = await safeQuery(`
        SELECT 
          gr.id as registration_id,
          s.first_name,
          s.last_name,
          s.belt_rank,
          ge.name as exam_name,
          DATE_FORMAT(ge.exam_date, '%Y-%m-%d') as exam_date,
          gr.target_belt,
          gr.exam_result,
          gr.score
        FROM grading_registrations gr
        JOIN grading_exams ge ON gr.exam_id = ge.id
        JOIN students s ON gr.student_id = s.id
        WHERE ge.examiner_id = ?
        ORDER BY ge.exam_date DESC, gr.updated_at DESC
        LIMIT 5
      `, [instructorId]);

      // 6. Fetch Today's Classes Count
      const todayClasses = await safeQuery(`
        SELECT COUNT(*) as count
        FROM classes
        WHERE instructor_id = ? AND class_date = CURDATE()
      `, [instructorId]);
      const todayCount = todayClasses?.[0]?.count || 0;

      return res.status(200).json({
        success: true,
        profile: instructor,
        assignedClasses,
        attendanceStats,
        pendingCount,
        recentEvaluations,
        todayCount
      });
    } catch (error: any) {
      console.error('Failed to load instructor dashboard metrics:', error);
      return res.status(500).json({ error: 'Failed to retrieve dashboard details: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
