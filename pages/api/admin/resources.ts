import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'instructor')) {
    return res.status(403).json({ error: 'Access denied: Admin or Instructor role required' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const resources = await safeQuery(`
        SELECT 
          r.id,
          r.title,
          r.description,
          r.resource_type,
          r.file_url,
          r.uploaded_by,
          r.class_id,
          DATE_FORMAT(r.created_at, '%Y-%m-%d') as upload_date,
          u.username as uploader_name,
          c.name as class_name
        FROM resources r
        JOIN users u ON r.uploaded_by = u.id
        LEFT JOIN classes c ON r.class_id = c.id
        ORDER BY r.created_at DESC
      `);

      return res.status(200).json({ success: true, resources });
    } catch (error: any) {
      console.error('Failed to fetch resources:', error);
      return res.status(500).json({ error: 'Failed to retrieve resources: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { title, description, resource_type, file_url, class_id } = req.body;

      if (!title?.trim() || !resource_type || !file_url?.trim()) {
        return res.status(400).json({ error: 'Missing required resource fields.' });
      }

      const uploaded_by = session.user.id;
      const targetClassId = class_id ? Number(class_id) : null;

      await safeQuery(`
        INSERT INTO resources (title, description, resource_type, file_url, uploaded_by, class_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [title.trim(), description?.trim() || null, resource_type, file_url.trim(), uploaded_by, targetClassId]);

      return res.status(201).json({ success: true, message: 'Resource added successfully.' });
    } catch (error: any) {
      console.error('Failed to create resource:', error);
      return res.status(500).json({ error: 'Failed to create resource: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, title, description, resource_type, file_url, class_id } = req.body;

      if (!id || !title?.trim() || !resource_type || !file_url?.trim()) {
        return res.status(400).json({ error: 'Missing required update fields.' });
      }

      const targetClassId = class_id ? Number(class_id) : null;

      await safeQuery(`
        UPDATE resources SET 
          title = ?, 
          description = ?, 
          resource_type = ?, 
          file_url = ?, 
          class_id = ?
        WHERE id = ?
      `, [title.trim(), description?.trim() || null, resource_type, file_url.trim(), targetClassId, id]);

      return res.status(200).json({ success: true, message: 'Resource updated successfully.' });
    } catch (error: any) {
      console.error('Failed to update resource:', error);
      return res.status(500).json({ error: 'Failed to update resource: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Resource ID required.' });
      }

      await safeQuery('DELETE FROM resources WHERE id = ?', [id]);

      return res.status(200).json({ success: true, message: 'Resource deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete resource:', error);
      return res.status(500).json({ error: 'Failed to delete resource: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
