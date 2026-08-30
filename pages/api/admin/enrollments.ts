import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const { classId } = req.query;
      if (!classId) {
        return res.status(400).json({ error: 'Class ID is required.' });
      }

      // 1. Get currently enrolled students
      const enrolled = await safeQuery(`
        SELECT 
          ce.id as enrollment_id, 
          s.id as student_id, 
          s.first_name, 
          s.last_name, 
          s.belt_rank 
        FROM class_enrollments ce 
        JOIN students s ON ce.student_id = s.id 
        WHERE ce.class_id = ? AND ce.status = 'enrolled'
      `, [classId]);

      // 2. Get active students NOT enrolled in this class
      const unenrolled = await safeQuery(`
        SELECT 
          s.id as student_id, 
          s.first_name, 
          s.last_name, 
          s.belt_rank 
        FROM students s 
        WHERE s.enrollment_status = 'active' 
          AND s.id NOT IN (
            SELECT student_id FROM class_enrollments 
            WHERE class_id = ? AND status = 'enrolled'
          )
        ORDER BY s.first_name, s.last_name
      `, [classId]);

      return res.status(200).json({ success: true, enrolled, unenrolled });
    } catch (error: any) {
      console.error('Failed to fetch enrollments:', error);
      return res.status(500).json({ error: 'Failed to retrieve enrollments: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { class_id, student_id } = req.body;

      if (!class_id || !student_id) {
        return res.status(400).json({ error: 'Class ID and Student ID are required.' });
      }

      // Check capacity
      const classDetails = await safeQuery(
        'SELECT capacity FROM classes WHERE id = ? LIMIT 1',
        [class_id]
      );
      const capacity = classDetails[0]?.capacity || 0;

      const enrolledCountDetails = await safeQuery(
        "SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ? AND status = 'enrolled'",
        [class_id]
      );
      const currentEnrolled = enrolledCountDetails[0]?.count || 0;

      if (currentEnrolled >= capacity) {
        return res.status(400).json({ error: 'Failed to enroll student. Class is already at maximum capacity.' });
      }

      // Insert or update enrollment (handling duplicates)
      const existing = await safeQuery(
        'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ? LIMIT 1',
        [class_id, student_id]
      );

      if (existing && existing.length > 0) {
        // Update existing row back to enrolled
        await safeQuery(
          "UPDATE class_enrollments SET status = 'enrolled', enrollment_date = CURRENT_TIMESTAMP WHERE id = ?",
          [existing[0].id]
        );
      } else {
        // Insert new enrollment row
        await safeQuery(
          "INSERT INTO class_enrollments (class_id, student_id, status) VALUES (?, ?, 'enrolled')",
          [class_id, student_id]
        );
      }

      // Send student notification
      try {
        const classInfo = await safeQuery(
          'SELECT name, location FROM classes WHERE id = ? LIMIT 1',
          [class_id]
        );
        const studentInfo = await safeQuery(
          'SELECT user_id FROM students WHERE id = ? LIMIT 1',
          [student_id]
        );
        
        if (classInfo?.length > 0 && studentInfo?.length > 0) {
          const className = classInfo[0].name;
          const classLocation = classInfo[0].location;
          const studentUserId = studentInfo[0].user_id;

          await safeQuery(
            "INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'class_reminder', 'Enrolled in Class', ?)",
            [studentUserId, `You have been enrolled in the class "${className}" at ${classLocation}.`]
          );
        }
      } catch (notifErr) {
        console.error('Failed to write enrollment notification:', notifErr);
      }

      return res.status(201).json({ success: true, message: 'Student enrolled successfully.' });
    } catch (error: any) {
      console.error('Failed to enroll student:', error);
      return res.status(500).json({ error: 'Failed to enroll student: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { enrollmentId } = req.query;

      if (!enrollmentId) {
        return res.status(400).json({ error: 'Enrollment ID is required.' });
      }

      // Remove the enrollment record
      await safeQuery('DELETE FROM class_enrollments WHERE id = ?', [enrollmentId]);

      return res.status(200).json({ success: true, message: 'Enrollment cancelled successfully.' });
    } catch (error: any) {
      console.error('Failed to cancel enrollment:', error);
      return res.status(500).json({ error: 'Failed to cancel enrollment: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
