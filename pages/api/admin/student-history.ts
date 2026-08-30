import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { safeQuery } from "../../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const history = await safeQuery(`
      SELECT 
        id, 
        action_type, 
        details, 
        DATE_FORMAT(action_date, '%Y-%m-%d') as action_date 
      FROM student_training_history 
      WHERE student_id = ? 
      ORDER BY action_date DESC, id DESC
    `, [studentId]);

    return res.status(200).json({ success: true, history });
  } catch (error: any) {
    console.error('Failed to load student history:', error);
    return res.status(500).json({ error: 'Failed to retrieve student history: ' + error.message });
  }
}
