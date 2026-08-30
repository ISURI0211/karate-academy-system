import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, contact_person, phone, email, address } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const result: any = await db.execute(
        'INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
        [name, contact_person, phone, email, address]
      );

      return res.status(201).json({ message: 'Supplier added successfully', supplierId: result.insertId });
    } catch (error) {
      console.error('Error adding supplier:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}