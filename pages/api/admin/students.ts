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
      // Get all students with user details
      const students = await safeQuery(`
        SELECT 
          s.id,
          s.user_id,
          s.first_name,
          s.last_name,
          s.phone,
          s.dob,
          s.address,
          s.belt_rank,
          s.enrollment_status,
          s.joining_date,
          s.emergency_contact_name,
          s.emergency_contact_phone,
          u.username,
          u.email,
          u.status as user_status
        FROM students s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.id DESC
      `);

      return res.status(200).json({ success: true, students });
    } catch (error: any) {
      console.error('Failed to fetch students:', error);
      return res.status(500).json({ error: 'Failed to retrieve students: ' + error.message });
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
        dob,
        address,
        belt_rank,
        enrollment_status,
        emergency_contact_name,
        emergency_contact_phone
      } = req.body;

      if (!username?.trim() || !email?.trim() || !password?.trim() || !first_name?.trim() || !last_name?.trim() || !dob) {
        return res.status(400).json({ error: 'Missing required student details.' });
      }

      // Check if user already exists
      const existingUsers = await safeQuery(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username.trim(), email.trim()]
      );

      if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({ error: 'A user with this username or email already exists.' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      const todayStr = new Date().toISOString().slice(0, 10);

      await withTransaction(async (connection) => {
        // 1. Create user account
        const [userResult]: any = await connection.execute(
          'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
          [username.trim(), email.trim(), passwordHash, 'student', enrollment_status === 'active' ? 'active' : 'inactive']
        );

        const userId = userResult.insertId;

        // 2. Create student profile
        await connection.execute(
          `INSERT INTO students (
            user_id, first_name, last_name, phone, dob, address, 
            belt_rank, enrollment_status, joining_date, 
            emergency_contact_name, emergency_contact_phone
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            first_name.trim(),
            last_name.trim(),
            phone?.trim() || null,
            dob,
            address?.trim() || null,
            belt_rank || 'White',
            enrollment_status || 'active',
            todayStr,
            emergency_contact_name?.trim() || null,
            emergency_contact_phone?.trim() || null
          ]
        );

        const [studentRows]: any = await connection.execute(
          'SELECT id FROM students WHERE user_id = ? LIMIT 1',
          [userId]
        );
        const studentId = studentRows[0]?.id;

        // 3. Log history
        await connection.execute(
          'INSERT INTO student_training_history (student_id, action_type, details, action_date) VALUES (?, ?, ?, ?)',
          [
            studentId,
            'Enrolled',
            `Joined academy as a ${belt_rank || 'White'} belt (Added by Admin).`,
            todayStr
          ]
        );
      });

      return res.status(201).json({ success: true, message: 'Student registered successfully' });
    } catch (error: any) {
      console.error('Failed to create student:', error);
      return res.status(500).json({ error: 'Failed to create student: ' + error.message });
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
        dob,
        address,
        belt_rank,
        enrollment_status,
        emergency_contact_name,
        emergency_contact_phone
      } = req.body;

      if (!id || !user_id || !first_name?.trim() || !last_name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'Missing required update fields.' });
      }

      // Check current belt and status to log changes if they occurred
      const currentData = await safeQuery(
        'SELECT belt_rank, enrollment_status FROM students WHERE id = ? LIMIT 1',
        [id]
      );
      const oldBelt = currentData[0]?.belt_rank;
      const oldStatus = currentData[0]?.enrollment_status;

      await withTransaction(async (connection) => {
        // 1. Update user info (email & user status)
        await connection.execute(
          'UPDATE users SET email = ?, status = ? WHERE id = ?',
          [email.trim(), enrollment_status === 'active' ? 'active' : 'inactive', user_id]
        );

        // 2. Update student profile
        await connection.execute(
          `UPDATE students SET 
            first_name = ?, 
            last_name = ?, 
            phone = ?, 
            dob = ?, 
            address = ?, 
            belt_rank = ?, 
            enrollment_status = ?, 
            emergency_contact_name = ?, 
            emergency_contact_phone = ? 
          WHERE id = ?`,
          [
            first_name.trim(),
            last_name.trim(),
            phone?.trim() || null,
            dob,
            address?.trim() || null,
            belt_rank,
            enrollment_status,
            emergency_contact_name?.trim() || null,
            emergency_contact_phone?.trim() || null,
            id
          ]
        );

        // 3. Log history on belt upgrade
        if (oldBelt && oldBelt !== belt_rank) {
          await connection.execute(
            'INSERT INTO student_training_history (student_id, action_type, details, action_date) VALUES (?, ?, ?, ?)',
            [
              id,
              'Belt Upgrade',
              `Belt upgraded from ${oldBelt} to ${belt_rank} (Updated by Admin).`,
              new Date().toISOString().slice(0, 10)
            ]
          );
        }

        // 4. Log history on status changes
        if (oldStatus && oldStatus !== enrollment_status) {
          await connection.execute(
            'INSERT INTO student_training_history (student_id, action_type, details, action_date) VALUES (?, ?, ?, ?)',
            [
              id,
              'Status Update',
              `Enrollment status updated from ${oldStatus} to ${enrollment_status} (Updated by Admin).`,
              new Date().toISOString().slice(0, 10)
            ]
          );
        }
      });

      return res.status(200).json({ success: true, message: 'Student updated successfully' });
    } catch (error: any) {
      console.error('Failed to update student:', error);
      return res.status(500).json({ error: 'Failed to update student: ' + error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id, user_id } = req.query;

      if (!id || !user_id) {
        return res.status(400).json({ error: 'Student and User identification required.' });
      }

      // Cascade delete handles dropping all logs/history when the user is deleted
      await safeQuery('DELETE FROM users WHERE id = ?', [user_id]);

      return res.status(200).json({ success: true, message: 'Student removed successfully' });
    } catch (error: any) {
      console.error('Failed to delete student:', error);
      return res.status(500).json({ error: 'Failed to delete student: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
