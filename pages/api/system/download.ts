import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    // Get filename from query parameters
    const { filename } = req.query;
    
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, message: 'Filename is required' });
    }
    
    // Validate filename to prevent directory traversal attacks
    if (filename.includes('..') || !filename.startsWith('backup_') || !filename.endsWith('.sql')) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }
    
    const filePath = path.join(BACKUP_DIR, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }
    
    // Set response headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/sql');
    
    // Stream the file as response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading backup:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error downloading backup', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}