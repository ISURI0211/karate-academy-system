import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../utils/db';
import mysql2 from 'mysql2';

// API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { full_name, email, phone, address } = req.body;

        if (!full_name || !email || !phone || !address) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Ensure the database connection works
        const defaultPasswordHash = "DEFAULT_PASSWORD_HASH"; // Replace with proper hashing in production
        const [result]: [mysql2.ResultSetHeader, mysql2.FieldPacket[]] = await db.query(
            "INSERT INTO users (full_name, email, phone, address, role, password_hash) VALUES (?, ?, ?, ?, 'customer', ?)",
            [full_name, email, phone, address, defaultPasswordHash]
        );

        return res.status(201).json({ message: 'Customer added successfully', id: result.insertId });
    } catch (error) {
        console.error('Error inserting customer:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : error });
    }
}
