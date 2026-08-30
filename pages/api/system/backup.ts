import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import mysql, { RowDataPacket } from 'mysql2/promise';

const execPromise = util.promisify(exec);

// Configuration
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'karate_academy_db'
};

// Define possible locations for mysqldump executable
const MYSQLDUMP_PATHS = [
  'mysqldump', // Use if in PATH
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Workbench 8.0\\mysqldump.exe',
  'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
  'C:\\xampp\\mysql\\bin\\mysqldump.exe'
];

// Change backup location to the specified path
const BACKUP_DIR = 'D:\\ebota erp backups';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    try {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create backup directory',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (req.method === 'POST') {
    try {
      // Check if this is an automatic backup
      const isAutoBackup = req.body?.type === 'auto';
      
      // Generate filename - for auto backups use fixed name, for manual use timestamp
      const date = new Date();
      let backupFilename;
      
      if (isAutoBackup) {
        // For auto backup, use fixed daily filename
        const dayStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
        backupFilename = `daily_backup_${dayStr}.sql`;
      } else {
        // For manual backup, use timestamp
        const formattedDate = date.toISOString().replace(/:/g, '-').replace(/\..+/, '');
        backupFilename = `manual_backup_${formattedDate}.sql`;
      }
      
      const backupPath = path.join(BACKUP_DIR, backupFilename);
      
      // Try to find mysqldump executable
      let mysqldumpPath = await findMysqldump();
      
      if (mysqldumpPath) {
        // Create backup using mysqldump
        console.log(`Using mysqldump at: ${mysqldumpPath}`);
        await createBackupWithMysqldump(backupPath, mysqldumpPath);
      } else {
        // Fall back to direct database connection
        console.log('mysqldump not found. Using direct database connection for backup');
        await createBackupWithDatabaseConnection(backupPath);
      }
      
      // Check if backup file was created successfully
      if (fs.existsSync(backupPath)) {
        const stats = fs.statSync(backupPath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        // Record backup in backup log
        const logPath = path.join(BACKUP_DIR, 'backup_log.json');
        let backupLog = [];
        
        if (fs.existsSync(logPath)) {
          backupLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        }
        
        // If auto backup is overwriting an existing entry in the log, remove it
        if (isAutoBackup) {
          interface BackupLogEntry {
            date: string;
            file: string;
            size: string;
            status: string;
            method: string;
            type: string;
          }

          backupLog = backupLog.filter((log: BackupLogEntry) => log.file !== backupFilename);
        }
        
        backupLog.push({
          date: date.toISOString(),
          file: backupFilename,
          size: fileSizeMB.toFixed(2) + ' MB',
          status: 'success',
          method: mysqldumpPath ? 'mysqldump' : 'direct',
          type: isAutoBackup ? 'auto' : 'manual'
        });
        
        fs.writeFileSync(logPath, JSON.stringify(backupLog, null, 2));
        
        // Only clean up manual backups (keep last 30)
        if (!isAutoBackup) {
          cleanupOldManualBackups();
        }

        // Clean up old backups
        cleanupOldManualBackups(); // Keep only last 30 manual backups
        cleanupOldAutomaticBackups(); // Delete automatic backups older than 30 days
        
        return res.status(200).json({ 
          success: true, 
          message: 'Backup created successfully',
          file: backupFilename,
          size: fileSizeMB.toFixed(2) + ' MB',
          method: mysqldumpPath ? 'mysqldump' : 'direct',
          type: isAutoBackup ? 'auto' : 'manual'
        });
      } else {
        throw new Error('Backup file was not created');
      }
    } catch (error) {
      console.error('Backup failed:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Backup failed', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'GET') {
    // List available backups
    try {
      const logPath = path.join(BACKUP_DIR, 'backup_log.json');
      
      if (fs.existsSync(logPath)) {
        const backupLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        return res.status(200).json({ success: true, backups: backupLog });
      } else {
        return res.status(200).json({ success: true, backups: [] });
      }
    } catch (error) {
      console.error('Failed to list backups:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to list backups', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

// Try to find mysqldump executable in various possible locations
async function findMysqldump() {
  for (const path of MYSQLDUMP_PATHS) {
    try {
      await execPromise(`"${path}" --version`);
      return path; // Found working mysqldump
    } catch (error) {
      // Continue to next path
    }
  }
  return null; // Not found
}

// Create backup using mysqldump executable
async function createBackupWithMysqldump(backupPath: string, mysqldumpPath: string): Promise<void> {
    const { stderr } = await execPromise(
        `"${mysqldumpPath}" --host=${DB_CONFIG.host} --user=${DB_CONFIG.user} --password=${DB_CONFIG.password} ${DB_CONFIG.database} > "${backupPath}"`
    );
    
    if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
    }
}

// Create backup using direct database connection
// Interface for database table row
interface TableRow extends RowDataPacket {
    [key: string]: any;
}

// Interface for create table query result
interface CreateTableRow extends RowDataPacket {
    Table: string;
    'Create Table': string;
}

// Interface for database data row
interface DatabaseRow extends RowDataPacket {
    [columnName: string]: any;
}

async function createBackupWithDatabaseConnection(backupPath: string): Promise<void> {
    const connection = await mysql.createConnection({
        host: DB_CONFIG.host,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database
    });

    try {
        // Get all tables
        const [tables] = await connection.query<TableRow[]>('SHOW TABLES');
        
        // Start SQL file with header
        let sql = `-- MySQL database backup\n`;
        sql += `-- Generated on ${new Date().toISOString()}\n`;
        sql += `-- Database: ${DB_CONFIG.database}\n\n`;
        sql += `SET FOREIGN_KEY_CHECKS=0;\n\n`;
        
        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            
            // Get table creation SQL
            const [createTable] = await connection.query<CreateTableRow[]>(`SHOW CREATE TABLE \`${tableName}\``);
            sql += `${createTable[0]['Create Table']};\n\n`;
            
            // Get table data
            const [rows] = await connection.query<DatabaseRow[]>(`SELECT * FROM \`${tableName}\``);
            
            if (rows.length > 0) {
                sql += `-- Dumping data for table ${tableName}\n`;
                sql += `INSERT INTO \`${tableName}\` VALUES\n`;
                
                const values = rows.map(row => {
                    const rowValues = Object.values(row).map(value => {
                        if (value === null) return 'NULL';
                        if (typeof value === 'number') return value;
                        if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        return `'${String(value).replace(/'/g, "''")}'`;
                    });
                    return `(${rowValues.join(', ')})`;
                });
                
                sql += `${values.join(',\n')};\n\n`;
            }
        }
        
        sql += `SET FOREIGN_KEY_CHECKS=1;\n`;
        
        // Write SQL to file
        fs.writeFileSync(backupPath, sql);
    } finally {
        await connection.end();
    }
}

// Keep only the 30 most recent MANUAL backups
function cleanupOldManualBackups() {
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
    if (files.length > 30) {
      files.slice(30).forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Deleted old manual backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('Failed to cleanup old manual backups:', error);
  }
}

// Add this function after cleanupOldManualBackups()
function cleanupOldAutomaticBackups() {
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
    
    if (oldFiles.length > 0) {
      oldFiles.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`Deleted old automatic backup: ${file.name} (from ${file.date.toISOString().slice(0, 10)})`);
      });
    }
  } catch (error) {
    console.error('Failed to cleanup old automatic backups:', error);
  }
}