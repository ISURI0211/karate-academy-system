import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'instructor')) {
    return res.status(403).json({ error: 'Access denied: Admin or Instructor credentials required.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 15 * 1024 * 1024, // 15MB max file size
    });

    const { files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Handle single or multiple files array depending on Formidable v3 parser outcomes
    const fileData = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!fileData) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const newFilename = fileData.newFilename;
    const fileUrl = `/uploads/${newFilename}`;

    return res.status(200).json({ 
      success: true, 
      fileUrl, 
      originalFilename: fileData.originalFilename 
    });
  } catch (error: any) {
    console.error('File upload controller failure:', error);
    return res.status(500).json({ error: 'Upload process failed: ' + error.message });
  }
}
