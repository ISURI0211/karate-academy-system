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
      qualifications 
    } = req.body;

    console.log('🔄 Received instructor registration request:', {
      username,
      email,
      first_name,
      last_name,
      phone,
      qualifications
    });

    // Validate inputs
    if (
      !username?.trim() || 
      !email?.trim() || 
      !password?.trim() || 
      !first_name?.trim() || 
      !last_name?.trim()
    ) {
      return res.status(400).json({ error: 'Missing required credentials or profile details (username, email, password, first name, and last name).' });
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

    // Insert into users and instructors tables transactionally
    await withTransaction(async (connection) => {
      // 1. Insert into users table
      const [userResult]: any = await connection.execute(
        'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [username.trim(), email.trim(), passwordHash, 'instructor', 'active']
      );

      const userId = userResult.insertId;
      const todayStr = new Date().toISOString().slice(0, 10);

      // 2. Insert into instructors table
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

    console.log('✅ Instructor registration successful:', username);

    return res.status(201).json({
      success: true,
      message: 'Instructor registered successfully.'
    });

  } catch (error: any) {
    console.error('💥 Instructor registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error occurred while registering instructor.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
