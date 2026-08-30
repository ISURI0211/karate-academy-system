import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { safeQuery } from '../../../utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    console.log('🔄 Received admin registration request:', {
      username,
      email,
      password: password ? '[REDACTED]' : undefined
    });

    // Validate inputs
    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Username, email, and password are required fields.' });
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

    // Insert into users table
    await safeQuery(
      'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [username.trim(), email.trim(), passwordHash, 'admin', 'active']
    );

    console.log('✅ Admin registration successful:', username);

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully.'
    });

  } catch (error: any) {
    console.error('💥 Admin registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error occurred while registering admin.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
