import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../utils/db';
import mysql2 from 'mysql2';

// API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Fetch existing customer details
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Customer ID is required' });

        try {
            const [rows]: [mysql2.RowDataPacket[], mysql2.FieldPacket[]] = await db.query(
                "SELECT id, full_name, email, address, phone FROM users WHERE id = ?",
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            return res.status(200).json(rows[0]);
        } catch (error) {
            console.error('Error fetching customer:', error);
            return res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : error });
        }
    }

    if (req.method === 'PUT') {
        // Update customer details
        try {
            const { id, full_name, email, address, phone } = req.body;

            if (!id || !full_name || !email || !address || !phone) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            const [result]: [mysql2.ResultSetHeader, mysql2.FieldPacket[]] = await db.query(
                "UPDATE users SET full_name = ?, email = ?, address = ?, phone = ? WHERE id = ?",
                [full_name, email, address, phone, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            return res.status(200).json({ message: 'Customer updated successfully' });
        } catch (error) {
            console.error('Error updating customer:', error);
            return res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : error });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
