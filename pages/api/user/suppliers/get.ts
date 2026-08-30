import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../utils/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search = '', page = 1, limit = 10 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const [suppliers] = await db.execute(
        `SELECT * FROM suppliers 
         WHERE name LIKE ? OR contact_person LIKE ? OR email LIKE ? 
         LIMIT ${Number(limit)} OFFSET ${offset}`,
        [`%${search}%`, `%${search}%`, `%${search}%`]
      );

      const [totalCountResult] = await db.execute(
        `SELECT COUNT(*) as totalCount FROM suppliers 
         WHERE name LIKE ? OR contact_person LIKE ? OR email LIKE ?`,
        [`%${search}%`, `%${search}%`, `%${search}%`]
      );

      const totalCount = (totalCountResult as { totalCount: number }[])[0].totalCount;
      const totalPages = Math.ceil(totalCount / Number(limit));

      return res.status(200).json({
        suppliers,
        pagination: {
          totalCount,
          totalPages,
          currentPage: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}