import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    let deletedCount = 0;
    
    // Cleanup old automatic backups
    deletedCount += cleanupOldAutomaticBackups();
    
    // Cleanup excess manual backups
    deletedCount += cleanupExcessManualBackups();
    
    return res.status(200).json({
      success: true,
      message: 'Backup cleanup completed successfully',
      deleted: deletedCount
    });
  } catch (error) {
    console.error('Backup cleanup failed:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Backup cleanup failed', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function cleanupOldAutomaticBackups(): number {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('daily_backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        // Extract date from filename (daily_backup_YYYY-MM-DD.sql)
        date: new Date(file.substring(13, 23))
      }));
    
    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find files older than 30 days
    const oldFiles = files.filter(file => file.date < thirtyDaysAgo);
    
    oldFiles.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`Deleted old automatic backup: ${file.name}`);
    });
    
    return oldFiles.length;
  } catch (error) {
    console.error('Failed to cleanup old automatic backups:', error);
    return 0;
  }
}

function cleanupExcessManualBackups(): number {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('manual_backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        created: fs.statSync(path.join(BACKUP_DIR, file)).birthtime
      }))
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    // Delete all but the 30 most recent manual backups
    const filesToDelete = files.slice(30);
    
    filesToDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`Deleted excess manual backup: ${file.name}`);
    });
    
    return filesToDelete.length;
  } catch (error) {
    console.error('Failed to cleanup excess manual backups:', error);
    return 0;
  }
}