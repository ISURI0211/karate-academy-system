import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') return res.status(405).json({ message: 'Method Not Allowed' });
    
    try {
        const { id } = req.query;
        await db.query("DELETE FROM users WHERE id = ?", [id]);
        res.status(200).json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}