import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { withTransaction, safeQuery } from "../../../utils/db";
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }

  const { method } = req;

  if (method === 'GET') {
    try {
      const instructors = await safeQuery(`
        SELECT 
          i.id,
          i.user_id,
          i.first_name,
          i.last_name,
          i.phone,
          i.qualifications,
          i.joining_date,
          u.username,
          u.email,
          u.status as user_status
        FROM instructors i
        JOIN users u ON i.user_id = u.id
        ORDER BY i.id DESC
      `);

      return res.status(200).json({ success: true, instructors });
    } catch (error: any) {
      console.error('Failed to fetch instructors:', error);
      return res.status(500).json({ error: 'Failed to retrieve instructors: ' + error.message });
    }
  }

  if (method === 'POST') {
    try {
      const {
        username,
        email,
        password,
        first_name,
        last_name,
        phone,
        qualifications,
        user_status
      } = req.body;

      if (!username?.trim() || !email?.trim() || !password?.trim() || !first_name?.trim() || !last_name?.trim()) {
        return res.status(400).json({ error: 'Missing required instructor registration fields.' });
      }

      // Check if user already exists
      const existingUsers = await safeQuery(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username.trim(), email.trim()]
      );

      if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({ error: 'A user with this username or email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const todayStr = new Date().toISOString().slice(0, 10);

      await withTransaction(async (connection) => {
        // 1. Create user entry
        const [userResult]: any = await connection.execute(
          'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
          [username.trim(), email.trim(), passwordHash, 'instructor', user_status || 'active']
        );

        const userId = userResult.insertId;

        // 2. Create instructor entry
        await connection.execute(
          `INSERT INTO instructors (
            user_id, first_name, last_name, phone, qualifications, joining_date
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            first_name.trim(),
            last_name.trim(),
            phone?.trim() || null,
            qualifications?.trim() || null,
            todayStr
          ]
        );
      });

      return res.status(201).json({ success: true, message: 'Instructor added successfully.' });
    } catch (error: any) {
      console.error('Failed to create instructor:', error);
      return res.status(500).json({ error: 'Failed to create instructor: ' + error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const {
        id,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        qualifications,
        user_status
      } = req.body;

      if (!id || !user_id || !first_name?.trim() || !last_name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'Missing required update fields.' });
      }

      await withTransaction(async (connection) => {
        // 1. Update user info
        await connection.execute(
          'UPDATE users SET email = ?, status = ? WHERE id = ?',
          [email.trim(), user_status || 'active', user_id]
        );

        // 2. Update instructor info
        await connection.execute(
          `UPDATE instructors SET 
            first_name = ?, 
            last_name = ?, 
            phone = ?, 
            qualifications = ? 
          WHERE id = ?`,
          [
            first_name.trim(),
            last_name.trim(),
            phone?.trim() || null,
            qualifications?.trim() || null,
            id
          ]
        );
      });

      return res.status(200).json({ success: true, message: 'Instructor updated successfully.' });
    } catch (error: any) {
      console.error('Failed to update instructor:', error);
      return res.status(500).json({ error: 'Failed to update instructor: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id, user_id } = req.query;

      if (!id || !user_id) {
        return res.status(400).json({ error: 'Instructor and User identification required.' });
      }

      // Check if instructor is assigned to any active classes first
      const assignedClasses = await safeQuery(
        'SELECT id FROM classes WHERE instructor_id = ? LIMIT 1',
        [id]
      );

      if (assignedClasses && assignedClasses.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete instructor. They are currently assigned to one or more active classes. Please reassign those classes first.' 
        });
      }

      // Cascade delete handles dropping profiles and schedules when the user is deleted
      await safeQuery('DELETE FROM users WHERE id = ?', [user_id]);

      return res.status(200).json({ success: true, message: 'Instructor removed successfully.' });
    } catch (error: any) {
      console.error('Failed to delete instructor:', error);
      return res.status(500).json({ error: 'Failed to delete instructor: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
