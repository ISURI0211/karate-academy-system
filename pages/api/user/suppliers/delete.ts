import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing supplier ID' });
    }

    try {
      const [result] = await db.execute('DELETE FROM suppliers WHERE id = ?', [id]);
      const { affectedRows } = result as any;

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      return res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}