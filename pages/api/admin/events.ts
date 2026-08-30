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
      const events = await safeQuery(`
        SELECT 
          e.id,
          e.name,
          e.description,
          DATE_FORMAT(e.event_date, '%Y-%m-%d') as event_date,
          e.location,
          e.event_type,
          e.status,
          (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participant_count
        FROM events e
        ORDER BY e.event_date DESC
      `);

      return res.status(200).json({ success: true, events });
    } catch (error: any) {
      console.error('Failed to fetch events:', error);
      return res.status(500).json({ error: 'Failed to retrieve events: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { name, description, event_date, location, event_type, status } = req.body;

      if (!name?.trim() || !event_date || !location?.trim() || !event_type) {
        return res.status(400).json({ error: 'Missing required event fields.' });
      }

      await safeQuery(`
        INSERT INTO events (name, description, event_date, location, event_type, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name.trim(), description?.trim() || null, event_date, location.trim(), event_type, status || 'upcoming']);

      return res.status(201).json({ success: true, message: 'Event scheduled successfully.' });
    } catch (error: any) {
      console.error('Failed to create event:', error);
      return res.status(500).json({ error: 'Failed to schedule event: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, name, description, event_date, location, event_type, status } = req.body;

      if (!id || !name?.trim() || !event_date || !location?.trim() || !event_type) {
        return res.status(400).json({ error: 'Missing required update fields.' });
      }

      await safeQuery(`
        UPDATE events SET 
          name = ?, 
          description = ?, 
          event_date = ?, 
          location = ?, 
          event_type = ?, 
          status = ?
        WHERE id = ?
      `, [name.trim(), description?.trim() || null, event_date, location.trim(), event_type, status, id]);

      return res.status(200).json({ success: true, message: 'Event details updated.' });
    } catch (error: any) {
      console.error('Failed to update event:', error);
      return res.status(500).json({ error: 'Failed to update event: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Event ID required.' });
      }

      // Cascade deletes participants first
      await safeQuery('DELETE FROM event_participants WHERE event_id = ?', [id]);
      await safeQuery('DELETE FROM events WHERE id = ?', [id]);

      return res.status(200).json({ success: true, message: 'Event deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      return res.status(500).json({ error: 'Failed to delete event: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
