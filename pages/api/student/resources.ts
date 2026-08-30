import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied: Student account required.' });
  }

  const userId = session.user.id;
  const { method } = req;

  if (method === 'GET') {
    try {
      // 1. Fetch Student Profile
      const studentProfiles = await safeQuery(`
        SELECT id FROM students WHERE user_id = ? LIMIT 1
      `, [userId]);

      if (!studentProfiles || studentProfiles.length === 0) {
        return res.status(404).json({ error: 'Student profile not found for this user.' });
      }

      const studentId = studentProfiles[0].id;

      // 2. Fetch Resources target for this student (generic or class-specific)
      const resources = await safeQuery(`
        SELECT 
          r.id,
          r.title,
          r.description,
          r.resource_type,
          r.file_url,
          r.class_id,
          DATE_FORMAT(r.created_at, '%Y-%m-%d') as upload_date,
          COALESCE(CONCAT(i.first_name, ' ', i.last_name), u.username) as uploader_name,
          c.name as class_name
        FROM resources r
        JOIN users u ON r.uploaded_by = u.id
        LEFT JOIN instructors i ON u.id = i.user_id
        LEFT JOIN classes c ON r.class_id = c.id
        WHERE r.class_id IS NULL OR r.class_id IN (
          SELECT class_id FROM class_enrollments WHERE student_id = ? AND status = 'enrolled'
        )
        ORDER BY r.created_at DESC
      `, [studentId]);

      return res.status(200).json({ success: true, resources });
    } catch (error: any) {
      console.error('Failed to load student training resources:', error);
      return res.status(500).json({ error: 'Failed to retrieve training resources: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
