import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const userId = session.user.id;

  const studentResult = await safeQuery(
    'SELECT id, first_name, last_name, belt_rank, joining_date FROM students WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (!studentResult || studentResult.length === 0) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }
  const student = studentResult[0];
  const studentId = student.id;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Training history (belt upgrades & milestones)
    const trainingHistory = await safeQuery(`
      SELECT 
        id,
        action_type,
        details,
        DATE_FORMAT(action_date, '%Y-%m-%d') as action_date
      FROM student_training_history
      WHERE student_id = ?
      ORDER BY action_date ASC
    `, [studentId]);

    // 2. Grading exam history
    const gradingHistory = await safeQuery(`
      SELECT 
        gr.id,
        ge.name as exam_name,
        DATE_FORMAT(ge.exam_date, '%Y-%m-%d') as exam_date,
        gr.target_belt,
        gr.eligibility_status,
        gr.exam_result,
        gr.score,
        gr.examiner_feedback,
        CONCAT(i.first_name, ' ', i.last_name) as examiner_name
      FROM grading_registrations gr
      JOIN grading_exams ge ON gr.exam_id = ge.id
      JOIN instructors i ON ge.examiner_id = i.id
      WHERE gr.student_id = ?
      ORDER BY ge.exam_date DESC
    `, [studentId]);

    // 3. Latest performance evaluation
    const performanceHistory = await safeQuery(`
      SELECT 
        pe.id,
        DATE_FORMAT(pe.evaluation_date, '%Y-%m-%d') as evaluation_date,
        pe.fitness_score,
        pe.technique_score,
        pe.spar_score,
        pe.discipline_score,
        pe.general_feedback,
        CONCAT(i.first_name, ' ', i.last_name) as instructor_name
      FROM performance_evaluations pe
      JOIN instructors i ON pe.instructor_id = i.id
      WHERE pe.student_id = ?
      ORDER BY pe.evaluation_date DESC
    `, [studentId]);

    return res.status(200).json({
      success: true,
      student: {
        first_name: student.first_name,
        last_name: student.last_name,
        belt_rank: student.belt_rank,
        joining_date: student.joining_date,
      },
      trainingHistory: trainingHistory || [],
      gradingHistory: gradingHistory || [],
      performanceHistory: performanceHistory || [],
    });
  } catch (error: any) {
    console.error('Failed to load progress data:', error);
    return res.status(500).json({ error: 'Failed to load progress: ' + error.message });
  }
}
