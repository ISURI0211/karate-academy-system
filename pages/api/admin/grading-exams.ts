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
      const exams = await safeQuery(`
        SELECT 
          ge.id,
          ge.name,
          ge.description,
          DATE_FORMAT(ge.exam_date, '%Y-%m-%d') as exam_date,
          ge.examiner_id,
          ge.fee,
          CONCAT(i.first_name, ' ', i.last_name) as examiner_name
        FROM grading_exams ge
        JOIN instructors i ON ge.examiner_id = i.id
        ORDER BY ge.exam_date DESC
      `);

      return res.status(200).json({ success: true, exams });
    } catch (error: any) {
      console.error('Failed to fetch grading exams:', error);
      return res.status(500).json({ error: 'Failed to retrieve exams: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { name, description, exam_date, examiner_id, fee } = req.body;

      if (!name?.trim() || !exam_date || !examiner_id) {
        return res.status(400).json({ error: 'Missing required grading exam fields.' });
      }

      await safeQuery(`
        INSERT INTO grading_exams (name, description, exam_date, examiner_id, fee)
        VALUES (?, ?, ?, ?, ?)
      `, [name.trim(), description?.trim() || null, exam_date, examiner_id, fee || 0.00]);

      return res.status(201).json({ success: true, message: 'Grading exam created successfully.' });
    } catch (error: any) {
      console.error('Failed to create grading exam:', error);
      return res.status(500).json({ error: 'Failed to create exam: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, name, description, exam_date, examiner_id, fee } = req.body;

      if (!id || !name?.trim() || !exam_date || !examiner_id) {
        return res.status(400).json({ error: 'Missing required update fields.' });
      }

      await safeQuery(`
        UPDATE grading_exams SET 
          name = ?, 
          description = ?, 
          exam_date = ?, 
          examiner_id = ?, 
          fee = ?
        WHERE id = ?
      `, [name.trim(), description?.trim() || null, exam_date, examiner_id, fee || 0.00, id]);

      return res.status(200).json({ success: true, message: 'Grading exam details updated.' });
    } catch (error: any) {
      console.error('Failed to update grading exam:', error);
      return res.status(500).json({ error: 'Failed to update exam: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Exam ID required.' });
      }

      // Cascade deletes registrations first
      await safeQuery('DELETE FROM grading_registrations WHERE exam_id = ?', [id]);
      await safeQuery('DELETE FROM grading_exams WHERE id = ?', [id]);

      return res.status(200).json({ success: true, message: 'Grading exam deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete exam:', error);
      return res.status(500).json({ error: 'Failed to delete exam: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
