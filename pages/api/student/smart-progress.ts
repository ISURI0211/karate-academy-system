import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";
import { runSmartProgressMLPipeline } from "../../../utils/ml-engine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied: Student credentials required.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const studentInfo = await safeQuery(
      'SELECT id, first_name, last_name, belt_rank, DATE_FORMAT(joining_date, "%Y-%m-%d") as joining_date FROM students WHERE user_id = ? LIMIT 1',
      [session.user.id]
    );

    if (!studentInfo || studentInfo.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const student = studentInfo[0];
    const { period = '3m' } = req.query;

    // Fetch raw historical records for ML preprocessing
    const rawAttendance = await safeQuery(`
      SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') as attendance_date, status
      FROM attendance WHERE student_id = ? ORDER BY attendance_date ASC
    `, [student.id]);

    const rawPerformance = await safeQuery(`
      SELECT DATE_FORMAT(evaluation_date, '%Y-%m-%d') as evaluation_date, fitness_score, technique_score, spar_score, discipline_score, general_feedback
      FROM performance_evaluations WHERE student_id = ? ORDER BY evaluation_date ASC
    `, [student.id]);

    const rawGrading = await safeQuery(`
      SELECT DATE_FORMAT(ge.exam_date, '%Y-%m-%d') as exam_date, gr.score, gr.exam_result, gr.target_belt
      FROM grading_registrations gr JOIN grading_exams ge ON gr.exam_id = ge.id WHERE gr.student_id = ? ORDER BY ge.exam_date ASC
    `, [student.id]);

    // Run ML Pipeline
    const mlAnalysis = runSmartProgressMLPipeline(
      rawAttendance || [],
      rawPerformance || [],
      rawGrading || [],
      (period as any) || '3m',
      student.belt_rank || 'Yellow Belt'
    );

    return res.status(200).json({
      success: true,
      student,
      period,
      mlAnalysis
    });
  } catch (error: any) {
    console.error('Failed to run student smart progress pipeline:', error);
    return res.status(500).json({ error: 'Failed to compute progress: ' + error.message });
  }
}
