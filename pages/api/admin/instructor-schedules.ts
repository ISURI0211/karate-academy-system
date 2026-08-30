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
      const { instructorId } = req.query;
      if (!instructorId) {
        return res.status(400).json({ error: 'Instructor ID is required.' });
      }

      const schedules = await safeQuery(`
        SELECT 
          id, 
          instructor_id, 
          day_of_week, 
          TIME_FORMAT(start_time, '%H:%i') as start_time, 
          TIME_FORMAT(end_time, '%H:%i') as end_time 
        FROM instructor_schedules 
        WHERE instructor_id = ? 
        ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), start_time
      `, [instructorId]);

      return res.status(200).json({ success: true, schedules });
    } catch (error: any) {
      console.error('Failed to fetch instructor schedules:', error);
      return res.status(500).json({ error: 'Failed to retrieve schedules: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { instructor_id, day_of_week, start_time, end_time } = req.body;

      if (!instructor_id || !day_of_week || !start_time || !end_time) {
        return res.status(400).json({ error: 'Missing schedule entries (day, start time, or end time).' });
      }

      // Check if start time is before end time
      if (start_time >= end_time) {
        return res.status(400).json({ error: 'Start time must be strictly before end time.' });
      }

      // Save schedule
      await safeQuery(`
        INSERT INTO instructor_schedules (instructor_id, day_of_week, start_time, end_time) 
        VALUES (?, ?, ?, ?)
      `, [instructor_id, day_of_week, start_time, end_time]);

      return res.status(201).json({ success: true, message: 'Schedule entry added successfully.' });
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      return res.status(500).json({ error: 'Failed to save schedule: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Schedule entry ID is required.' });
      }

      await safeQuery('DELETE FROM instructor_schedules WHERE id = ?', [id]);

      return res.status(200).json({ success: true, message: 'Schedule entry removed.' });
    } catch (error: any) {
      console.error('Failed to delete schedule:', error);
      return res.status(500).json({ error: 'Failed to delete schedule: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
