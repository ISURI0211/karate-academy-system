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

  // Resolve instructor ID
  const instructorProfiles = await safeQuery(`
    SELECT id FROM instructors WHERE user_id = ? LIMIT 1
  `, [userId]);

  if (!instructorProfiles || instructorProfiles.length === 0) {
    return res.status(404).json({ error: 'Instructor profile not found for this user.' });
  }

  const instructorId = instructorProfiles[0].id;

  if (method === 'GET') {
    try {
      // 1. Fetch evaluations logged by this instructor
      const evaluations = await safeQuery(`
        SELECT 
          pe.id,
          pe.student_id,
          CONCAT(s.first_name, ' ', s.last_name) as student_name,
          s.belt_rank,
          DATE_FORMAT(pe.evaluation_date, '%Y-%m-%d') as evaluation_date,
          pe.fitness_score,
          pe.technique_score,
          pe.spar_score,
          pe.discipline_score,
          pe.general_feedback
        FROM performance_evaluations pe
        JOIN students s ON pe.student_id = s.id
        WHERE pe.instructor_id = ?
        ORDER BY pe.evaluation_date DESC, pe.created_at DESC
      `, [instructorId]);

      // 2. Fetch list of students enrolled in classes taught by this instructor
      const eligibleStudents = await safeQuery(`
        SELECT DISTINCT
          s.id,
          s.first_name,
          s.last_name,
          s.belt_rank
        FROM class_enrollments ce
        JOIN students s ON ce.student_id = s.id
        JOIN classes c ON ce.class_id = c.id
        WHERE c.instructor_id = ? AND ce.status = 'enrolled'
        ORDER BY s.first_name, s.last_name
      `, [instructorId]);

      return res.status(200).json({ success: true, evaluations, students: eligibleStudents });
    } catch (error: any) {
      console.error('Failed to load evaluations data:', error);
      return res.status(500).json({ error: 'Failed to retrieve evaluations details: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { student_id, fitness_score, technique_score, spar_score, discipline_score, general_feedback } = req.body;

      if (!student_id || !fitness_score || !technique_score || !spar_score || !discipline_score) {
        return res.status(400).json({ error: 'Missing required performance metrics.' });
      }

      // Enforce CHECK constraints (between 1 and 10)
      const scores = [Number(fitness_score), Number(technique_score), Number(spar_score), Number(discipline_score)];
      if (scores.some(s => isNaN(s) || s < 1 || s > 10)) {
        return res.status(400).json({ error: 'Scores must be integers between 1 and 10.' });
      }

      // Check if student belongs to instructor's classes
      const studentCheck = await safeQuery(`
        SELECT DISTINCT ce.student_id 
        FROM class_enrollments ce
        JOIN classes c ON ce.class_id = c.id
        WHERE ce.student_id = ? AND c.instructor_id = ? AND ce.status = 'enrolled'
        LIMIT 1
      `, [Number(student_id), instructorId]);

      if (!studentCheck || studentCheck.length === 0) {
        return res.status(403).json({ error: 'Access denied: You can only evaluate students enrolled in your assigned classes.' });
      }

      await safeQuery(`
        INSERT INTO performance_evaluations (student_id, instructor_id, evaluation_date, fitness_score, technique_score, spar_score, discipline_score, general_feedback)
        VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)
      `, [
        Number(student_id), 
        instructorId, 
        Number(fitness_score), 
        Number(technique_score), 
        Number(spar_score), 
        Number(discipline_score), 
        general_feedback?.trim() || null
      ]);

      // Write student notification
      try {
        const studentInfo = await safeQuery('SELECT user_id FROM students WHERE id = ? LIMIT 1', [Number(student_id)]);
        if (studentInfo && studentInfo.length > 0) {
          const studentUserId = studentInfo[0].user_id;
          await safeQuery(`
            INSERT INTO notifications (user_id, type, title, message) 
            VALUES (?, 'announcement', 'New Progress Evaluation Logged', ?)
          `, [
            studentUserId, 
            `A new progress evaluation has been registered for you. Check your Member Progress dashboard to view your scores!`
          ]);
        }
      } catch (notifErr) {
        console.error('Failed to notify student:', notifErr);
      }

      return res.status(201).json({ success: true, message: 'Student evaluation logged successfully.' });
    } catch (error: any) {
      console.error('Failed to insert performance evaluation:', error);
      return res.status(500).json({ error: 'Failed to create student evaluation: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, fitness_score, technique_score, spar_score, discipline_score, general_feedback } = req.body;

      if (!id || !fitness_score || !technique_score || !spar_score || !discipline_score) {
        return res.status(400).json({ error: 'Missing required update parameters.' });
      }

      // Enforce CHECK constraints
      const scores = [Number(fitness_score), Number(technique_score), Number(spar_score), Number(discipline_score)];
      if (scores.some(s => isNaN(s) || s < 1 || s > 10)) {
        return res.status(400).json({ error: 'Scores must be integers between 1 and 10.' });
      }

      // Verify ownership before updating
      const ownershipCheck = await safeQuery(`
        SELECT id FROM performance_evaluations WHERE id = ? AND instructor_id = ? LIMIT 1
      `, [Number(id), instructorId]);

      if (!ownershipCheck || ownershipCheck.length === 0) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to update this evaluation.' });
      }

      await safeQuery(`
        UPDATE performance_evaluations SET 
          fitness_score = ?, 
          technique_score = ?, 
          spar_score = ?, 
          discipline_score = ?, 
          general_feedback = ?,
          evaluation_date = CURDATE()
        WHERE id = ? AND instructor_id = ?
      `, [
        Number(fitness_score), 
        Number(technique_score), 
        Number(spar_score), 
        Number(discipline_score), 
        general_feedback?.trim() || null,
        Number(id),
        instructorId
      ]);

      return res.status(200).json({ success: true, message: 'Student evaluation updated.' });
    } catch (error: any) {
      console.error('Failed to update evaluation:', error);
      return res.status(500).json({ error: 'Failed to save updates: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Evaluation ID required.' });
      }

      // Verify ownership before deleting
      const ownershipCheck = await safeQuery(`
        SELECT id FROM performance_evaluations WHERE id = ? AND instructor_id = ? LIMIT 1
      `, [Number(id), instructorId]);

      if (!ownershipCheck || ownershipCheck.length === 0) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to delete this evaluation.' });
      }

      await safeQuery(`
        DELETE FROM performance_evaluations WHERE id = ? AND instructor_id = ?
      `, [Number(id), instructorId]);

      return res.status(200).json({ success: true, message: 'Evaluation removed successfully.' });
    } catch (error: any) {
      console.error('Failed to delete evaluation:', error);
      return res.status(500).json({ error: 'Failed to process deletion: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
