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
      const classes = await safeQuery(`
        SELECT 
          c.id,
          c.name,
          c.description,
          DATE_FORMAT(c.class_date, '%Y-%m-%d') as class_date,
          TIME_FORMAT(c.start_time, '%H:%i') as start_time,
          TIME_FORMAT(c.end_time, '%H:%i') as end_time,
          c.location,
          c.capacity,
          c.instructor_id,
          CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
          (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.status = 'enrolled') as enrolled_count
        FROM classes c
        JOIN instructors i ON c.instructor_id = i.id
        ORDER BY c.class_date DESC, c.start_time DESC
      `);

      return res.status(200).json({ success: true, classes });
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
      return res.status(500).json({ error: 'Failed to retrieve classes: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { name, description, class_date, start_time, end_time, location, capacity, instructor_id } = req.body;

      if (!name?.trim() || !class_date || !start_time || !end_time || !location?.trim() || !capacity || !instructor_id) {
        return res.status(400).json({ error: 'Missing required class fields.' });
      }

      if (start_time >= end_time) {
        return res.status(400).json({ error: 'Start time must be strictly before end time.' });
      }

      await safeQuery(`
        INSERT INTO classes (name, description, class_date, start_time, end_time, location, capacity, instructor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [name.trim(), description?.trim() || null, class_date, start_time, end_time, location.trim(), capacity, instructor_id]);

      return res.status(201).json({ success: true, message: 'Class scheduled successfully.' });
    } catch (error: any) {
      console.error('Failed to create class:', error);
      return res.status(500).json({ error: 'Failed to schedule class: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, name, description, class_date, start_time, end_time, location, capacity, instructor_id } = req.body;

      if (!id || !name?.trim() || !class_date || !start_time || !end_time || !location?.trim() || !capacity || !instructor_id) {
        return res.status(400).json({ error: 'Missing required update fields.' });
      }

      if (start_time >= end_time) {
        return res.status(400).json({ error: 'Start time must be strictly before end time.' });
      }

      await safeQuery(`
        UPDATE classes SET 
          name = ?, 
          description = ?, 
          class_date = ?, 
          start_time = ?, 
          end_time = ?, 
          location = ?, 
          capacity = ?, 
          instructor_id = ?
        WHERE id = ?
      `, [name.trim(), description?.trim() || null, class_date, start_time, end_time, location.trim(), capacity, instructor_id, id]);

      return res.status(200).json({ success: true, message: 'Class details updated.' });
    } catch (error: any) {
      console.error('Failed to update class:', error);
      return res.status(500).json({ error: 'Failed to update class: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Class ID required.' });
      }

      // Drop all class enrollments first before deleting the class
      await safeQuery('DELETE FROM class_enrollments WHERE class_id = ?', [id]);
      await safeQuery('DELETE FROM classes WHERE id = ?', [id]);

      return res.status(200).json({ success: true, message: 'Class deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete class:', error);
      return res.status(500).json({ error: 'Failed to delete class: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
