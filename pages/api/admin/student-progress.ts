import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";
import { runSmartProgressMLPipeline } from "../../../utils/ml-engine";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'instructor')) {
    return res.status(403).json({ error: 'Access denied: Admin or Instructor credentials required.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch student roster list for dropdown selection
    let studentsList = [];
    if (session.user.role === 'instructor') {
      studentsList = await safeQuery(`
        SELECT DISTINCT s.id, s.first_name, s.last_name, s.belt_rank
        FROM students s
        JOIN class_enrollments ce ON ce.student_id = s.id
        JOIN classes c ON ce.class_id = c.id
        JOIN instructors i ON c.instructor_id = i.id
        WHERE i.user_id = ? AND ce.status = 'enrolled'
        ORDER BY s.first_name ASC
      `, [session.user.id]);
    } else {
      studentsList = await safeQuery(`
        SELECT id, first_name, last_name, belt_rank 
        FROM students 
        ORDER BY first_name ASC
      `);
    }

    const { studentId, period = '3m' } = req.query;
    
    // Select requested studentId or default to first student in roster
    const targetStudentId = studentId || (studentsList && studentsList.length > 0 ? studentsList[0].id : null);

    if (!targetStudentId) {
      return res.status(200).json({
        success: true,
        studentsList: [],
        student: null,
        mlAnalysis: null
      });
    }

    // 2. Fetch student info
    const studentInfo = await safeQuery(`
      SELECT 
        s.id,
        s.user_id,
        s.first_name,
        s.last_name,
        s.belt_rank,
        s.enrollment_status,
        DATE_FORMAT(s.joining_date, '%Y-%m-%d') as joining_date,
        s.phone,
        u.email,
        u.username
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
      LIMIT 1
    `, [targetStudentId]);

    if (!studentInfo || studentInfo.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const student = studentInfo[0];

    // 3. Raw Data Queries for ML Preprocessing Pipeline
    const rawAttendance = await safeQuery(`
      SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') as attendance_date, status
      FROM attendance
      WHERE student_id = ?
      ORDER BY attendance_date ASC
    `, [targetStudentId]);

    const rawPerformance = await safeQuery(`
      SELECT 
        DATE_FORMAT(evaluation_date, '%Y-%m-%d') as evaluation_date,
        fitness_score,
        technique_score,
        spar_score,
        discipline_score,
        general_feedback
      FROM performance_evaluations
      WHERE student_id = ?
      ORDER BY evaluation_date ASC
    `, [targetStudentId]);

    const rawGrading = await safeQuery(`
      SELECT 
        DATE_FORMAT(ge.exam_date, '%Y-%m-%d') as exam_date,
        gr.score,
        gr.exam_result,
        gr.target_belt
      FROM grading_registrations gr
      JOIN grading_exams ge ON gr.exam_id = ge.id
      WHERE gr.student_id = ?
      ORDER BY ge.exam_date ASC
    `, [targetStudentId]);

    // 4. Run ML Preprocessing & Predictive Pattern Engine
    const mlAnalysis = runSmartProgressMLPipeline(
      rawAttendance || [],
      rawPerformance || [],
      rawGrading || [],
      (period as any) || '3m',
      student.belt_rank || 'Yellow Belt'
    );

    // 5. Detailed Lists for UI display
    const trainingHistory = await safeQuery(`
      SELECT id, action_type, details, DATE_FORMAT(action_date, '%Y-%m-%d') as action_date
      FROM student_training_history
      WHERE student_id = ?
      ORDER BY action_date ASC
    `, [targetStudentId]);

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
    `, [targetStudentId]);

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
    `, [targetStudentId]);

    return res.status(200).json({
      success: true,
      studentsList: studentsList || [],
      student,
      period,
      mlAnalysis,
      trainingHistory: trainingHistory || [],
      gradingHistory: gradingHistory || [],
      performanceHistory: performanceHistory || []
    });
  } catch (error: any) {
    console.error('Failed to fetch student progress details:', error);
    return res.status(500).json({ error: 'Failed to retrieve student progress: ' + error.message });
  }
}
