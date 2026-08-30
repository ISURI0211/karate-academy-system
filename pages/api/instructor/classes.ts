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

  if (method === 'GET') {
    try {
      // 1. Fetch Instructor Profile
      const instructorProfiles = await safeQuery(`
        SELECT id FROM instructors WHERE user_id = ? LIMIT 1
      `, [userId]);

      if (!instructorProfiles || instructorProfiles.length === 0) {
        return res.status(404).json({ error: 'Instructor profile not found for this user.' });
      }

      const instructorId = instructorProfiles[0].id;
      const { classId } = req.query;

      // 2. Fetch student roster if a specific classId is provided
      if (classId) {
        const targetClassId = Number(classId);

        // Verify class belongs to this instructor
        const classOwnership = await safeQuery(`
          SELECT id FROM classes WHERE id = ? AND instructor_id = ? LIMIT 1
        `, [targetClassId, instructorId]);

        if (!classOwnership || classOwnership.length === 0) {
          return res.status(403).json({ error: 'Access denied: You are not the assigned instructor for this class.' });
        }

        const roster = await safeQuery(`
          SELECT 
            ce.id as enrollment_id,
            s.id as student_id,
            s.first_name,
            s.last_name,
            s.belt_rank,
            s.phone,
            s.emergency_contact_name,
            s.emergency_contact_phone,
            DATE_FORMAT(ce.enrollment_date, '%Y-%m-%d') as enrollment_date
          FROM class_enrollments ce
          JOIN students s ON ce.student_id = s.id
          WHERE ce.class_id = ? AND ce.status = 'enrolled'
          ORDER BY s.first_name ASC, s.last_name ASC
        `, [targetClassId]);

        return res.status(200).json({ success: true, roster });
      }

      // 3. Otherwise, fetch all classes assigned to this instructor
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
          (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.status = 'enrolled') as enrolled_count
        FROM classes c
        WHERE c.instructor_id = ?
        ORDER BY c.class_date DESC, c.start_time DESC
      `, [instructorId]);

      return res.status(200).json({ success: true, classes });
    } catch (error: any) {
      console.error('Failed to load instructor classes details:', error);
      return res.status(500).json({ error: 'Failed to retrieve classes info: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
