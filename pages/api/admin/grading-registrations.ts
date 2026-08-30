import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { withTransaction, safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const { examId } = req.query;
      if (!examId) {
        return res.status(400).json({ error: 'Exam ID is required.' });
      }

      // 1. Get currently registered students
      const registered = await safeQuery(`
        SELECT 
          gr.id as registration_id,
          gr.student_id,
          gr.target_belt,
          gr.eligibility_status,
          gr.exam_result,
          gr.score,
          gr.examiner_feedback,
          s.first_name,
          s.last_name,
          s.belt_rank as current_belt
        FROM grading_registrations gr
        JOIN students s ON gr.student_id = s.id
        WHERE gr.exam_id = ?
      `, [examId]);

      // 2. Get active students NOT registered for this exam
      const unregistered = await safeQuery(`
        SELECT 
          s.id as student_id,
          s.first_name,
          s.last_name,
          s.belt_rank as current_belt
        FROM students s
        WHERE s.enrollment_status = 'active'
          AND s.id NOT IN (
            SELECT student_id FROM grading_registrations WHERE exam_id = ?
          )
        ORDER BY s.first_name, s.last_name
      `, [examId]);

      return res.status(200).json({ success: true, registered, unregistered });
    } catch (error: any) {
      console.error('Failed to fetch grading registrations:', error);
      return res.status(500).json({ error: 'Failed to retrieve registrations: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { exam_id, student_id, target_belt } = req.body;

      if (!exam_id || !student_id || !target_belt) {
        return res.status(400).json({ error: 'Exam ID, Student ID, and Target Belt are required.' });
      }

      // Insert new registration
      await safeQuery(`
        INSERT INTO grading_registrations (exam_id, student_id, target_belt, eligibility_status, exam_result)
        VALUES (?, ?, ?, 'eligible', 'pending')
      `, [exam_id, student_id, target_belt]);

      // Send student notification
      try {
        const examInfo = await safeQuery('SELECT name FROM grading_exams WHERE id = ? LIMIT 1', [exam_id]);
        const studentInfo = await safeQuery('SELECT user_id FROM students WHERE id = ? LIMIT 1', [student_id]);
        if (examInfo?.length > 0 && studentInfo?.length > 0) {
          const examName = examInfo[0].name;
          const studentUserId = studentInfo[0].user_id;
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message) 
            VALUES (?, 'grading_exam', 'Grading Exam Registered', ?)
          `, [
            studentUserId, 
            `You have been registered for the grading board "${examName}" targeting the belt rank ${target_belt}.`
          ]);
        }
      } catch (notifErr) {
        console.error('Failed to write grading registration notification:', notifErr);
      }

      return res.status(201).json({ success: true, message: 'Student registered for grading successfully.' });
    } catch (error: any) {
      console.error('Failed to register student for grading:', error);
      return res.status(500).json({ error: 'Failed to register student: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { registration_id, exam_result, score, examiner_feedback } = req.body;

      if (!registration_id || !exam_result) {
        return res.status(400).json({ error: 'Registration ID and Exam Result are required.' });
      }

      // Fetch registration details
      const registrationDetails = await safeQuery(`
        SELECT 
          gr.student_id, 
          gr.target_belt, 
          gr.exam_result as old_result, 
          ge.name as exam_name,
          s.belt_rank as current_belt
        FROM grading_registrations gr
        JOIN grading_exams ge ON gr.exam_id = ge.id
        JOIN students s ON gr.student_id = s.id
        WHERE gr.id = ? LIMIT 1
      `, [registration_id]);

      if (!registrationDetails || registrationDetails.length === 0) {
        return res.status(404).json({ error: 'Grading registration not found.' });
      }

      const { student_id, target_belt, old_result, exam_name, current_belt } = registrationDetails[0];

      await withTransaction(async (connection) => {
        // 1. Update registration status
        await connection.execute(`
          UPDATE grading_registrations 
          SET exam_result = ?, score = ?, examiner_feedback = ? 
          WHERE id = ?
        `, [exam_result, score !== undefined ? score : null, examiner_feedback?.trim() || null, registration_id]);

        // Fetch student user_id for notification
        const [studentUser]: any = await connection.execute(
          'SELECT user_id FROM students WHERE id = ? LIMIT 1',
          [student_id]
        );
        const studentUserId = studentUser[0]?.user_id;

        // 2. If result transitioned to 'pass' and wasn't 'pass' before:
        if (exam_result === 'pass' && old_result !== 'pass') {
          // Upgrade student belt rank
          await connection.execute(
            'UPDATE students SET belt_rank = ? WHERE id = ?',
            [target_belt, student_id]
          );

          // Add history entry
          const todayStr = new Date().toISOString().slice(0, 10);
          await connection.execute(
            'INSERT INTO student_training_history (student_id, action_type, details, action_date) VALUES (?, ?, ?, ?)',
            [
              student_id,
              'Belt Upgrade',
              `Promoted from ${current_belt} to ${target_belt} upon passing the "${exam_name}".`,
              todayStr
            ]
          );

          // Send passed notification
          if (studentUserId) {
            await connection.execute(`
              INSERT INTO notifications (user_id, type, title, message) 
              VALUES (?, 'grading_exam', 'Belt Promotion Passed!', ?)
            `, [
              studentUserId, 
              `Congratulations! You passed the grading board "${exam_name}" with a score of ${score || 0} and have been promoted to ${target_belt}!`
            ]);
          }
        } else if (exam_result === 'fail' && old_result !== 'fail') {
          // Send failed notification
          if (studentUserId) {
            await connection.execute(`
              INSERT INTO notifications (user_id, type, title, message) 
              VALUES (?, 'grading_exam', 'Grading Results Finalized', ?)
            `, [
              studentUserId, 
              `Your results for the grading board "${exam_name}" have been updated. Status: Fail. Score: ${score || 0}. Feedback: ${examiner_feedback || 'Keep training!'}`
            ]);
          }
        }
      });

      return res.status(200).json({ success: true, message: 'Result finalized successfully.' });
    } catch (error: any) {
      console.error('Failed to finalize result:', error);
      return res.status(500).json({ error: 'Failed to finalize result: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { registrationId } = req.query;

      if (!registrationId) {
        return res.status(400).json({ error: 'Registration ID is required.' });
      }

      await safeQuery('DELETE FROM grading_registrations WHERE id = ?', [registrationId]);

      return res.status(200).json({ success: true, message: 'Grading registration cancelled.' });
    } catch (error: any) {
      console.error('Failed to delete registration:', error);
      return res.status(500).json({ error: 'Failed to cancel registration: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
