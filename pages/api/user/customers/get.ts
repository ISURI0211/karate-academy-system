import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';
import db from '../../../../utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const { page = 1, limit = 5, search = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // Fetch customers
        const [customers] = await db.query<RowDataPacket[]>(
            `SELECT id, full_name, email, address, phone FROM users WHERE role = 'customer' AND full_name LIKE ? LIMIT ? OFFSET ?`, 
            [`%${search}%`, Number(limit), offset]
        );

        // Fetch total count
        const [totalResult] = await db.query<RowDataPacket[]>(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'customer' AND full_name LIKE ?", 
            [`%${search}%`]
        );

        const total = totalResult.length > 0 ? totalResult[0].count : 0;

        res.status(200).json({ customers, total });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}
