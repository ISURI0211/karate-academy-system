import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Supplier ID is required' });
      }

      const [supplierResult]: any = await db.execute(
        'SELECT * FROM suppliers WHERE id = ?',
        [id]
      );

      if (supplierResult.length === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      return res.status(200).json(supplierResult[0]);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, name, contact_person, phone, email, address } = req.body;

      if (!id || !name || !email) {
        return res.status(400).json({ error: 'ID, name, and email are required' });
      }

      await db.execute(
        'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?',
        [name, contact_person, phone, email, address, id]
      );

      return res.status(200).json({ message: 'Supplier updated successfully' });
    } catch (error) {
      console.error('Error updating supplier:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}