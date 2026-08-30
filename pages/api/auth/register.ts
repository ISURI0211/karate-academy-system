import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { withTransaction, safeQuery } from '../../../utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      emergency_contact_name, 
      emergency_contact_phone 
    } = req.body;

    console.log('🔄 Received student registration request:', {
      username,
      email,
      first_name,
      last_name,
      phone,
      dob,
      address,
      emergency_contact_name,
      emergency_contact_phone
    });

    // Validate essential inputs
    if (
      !username?.trim() || 
      !email?.trim() || 
      !password?.trim() || 
      !first_name?.trim() || 
      !last_name?.trim() || 
      !dob
    ) {
      return res.status(400).json({ error: 'Missing required registration fields (username, email, password, first name, last name, and date of birth).' });
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

    // Execute registration steps within a transaction to maintain integrity
    await withTransaction(async (connection) => {
      // 1. Insert into users table
      const [userResult]: any = await connection.execute(
        'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [username.trim(), email.trim(), passwordHash, 'student', 'active']
      );

      const userId = userResult.insertId;

      // 2. Insert into students table
      const todayStr = new Date().toISOString().slice(0, 10);
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
          'White', // Default belt rank for new students
          'active', // Default enrollment status
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

      // 3. Insert history record into student_training_history
      await connection.execute(
        'INSERT INTO student_training_history (student_id, action_type, details, action_date) VALUES (?, ?, ?, ?)',
        [
          studentId,
          'Enrolled',
          'Joined karate academy as a White belt through online registration.',
          todayStr
        ]
      );
    });

    console.log('✅ Student registration successful:', username);

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully.'
    });

  } catch (error: any) {
    console.error('💥 Student registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error occurred while registering student.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
