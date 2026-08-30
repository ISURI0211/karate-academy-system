import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { safeQuery } from "../../utils/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(410).json({ message: 'Unauthorized' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      // Get all notifications for the user, order by newest first
      const notifications = await safeQuery(`
        SELECT 
          id, 
          type, 
          title, 
          message, 
          is_read, 
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as time 
        FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
      `, [userId]);

      return res.status(200).json({ success: true, notifications });
    } catch (error: any) {
      console.error('Failed to get notifications:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      // Mark all notifications as read
      await safeQuery(`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE user_id = ?
      `, [userId]);

      return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      console.error('Failed to update notifications:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      // Mark single notification as read
      const { notificationId } = req.body;
      if (!notificationId) {
        return res.status(400).json({ success: false, message: 'Notification ID required' });
      }

      await safeQuery(`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = ? AND user_id = ?
      `, [notificationId, userId]);

      return res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
      console.error('Failed to update single notification:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
