const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// We'll use dynamic import for node-fetch
let fetchApi;

// Initialize fetch first
(async () => {
  const { default: nodeFetch } = await import('node-fetch');
  fetchApi = nodeFetch;
  
  // Now check for missed backups after fetch is available
  checkMissedBackups();
})();

// Check if we've already backed up today
function hasBackedUpToday() {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    const markerFile = path.join(logDir, 'last_backup_date.txt');
    
    if (!fs.existsSync(markerFile)) {
      return false;
    }
    
    const lastBackupDate = fs.readFileSync(markerFile, 'utf8').trim();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    return lastBackupDate === today;
  } catch (error) {
    console.error('Error checking backup status:', error);
    return false;
  }
}

// Record that we've backed up today
function recordBackupDate() {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    fs.writeFileSync(path.join(logDir, 'last_backup_date.txt'), today);
  } catch (error) {
    console.error('Error recording backup date:', error);
  }
}

// Run backup function
async function runBackup() {
  console.log('Running scheduled backup...');
  
  try {
    // Make sure fetchApi is initialized
    if (!fetchApi) {
      console.error('Fetch API not initialized yet');
      return false;
    }
    
    // Specifically request an auto backup that will overwrite the daily file
    const response = await fetchApi('http://localhost:3000/api/system/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'auto' })
    });
    
    const result = await response.json();
    
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    if (result.success) {
      console.log('Scheduled backup completed successfully:', result.file);
      
      const logMessage = `[${new Date().toISOString()}] Backup successful: ${result.file} (${result.size})\n`;
      fs.appendFileSync(path.join(logDir, 'backup_cron.log'), logMessage);
      
      // Record that we backed up today
      recordBackupDate();
      
      return true;
    } else {
      console.error('Scheduled backup failed:', result.message);
      
      const logMessage = `[${new Date().toISOString()}] Backup failed: ${result.message}\n`;
      fs.appendFileSync(path.join(logDir, 'backup_cron.log'), logMessage);
      
      return false;
    }
  } catch (error) {
    console.error('Failed to run scheduled backup:', error);
    
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logMessage = `[${new Date().toISOString()}] Backup error: ${error.message}\n`;
    fs.appendFileSync(path.join(logDir, 'backup_cron.log'), logMessage);
    
    return false;
  }
}

// Add this function
async function cleanupOldBackups() {
  console.log('Running scheduled backup cleanup...');
  
  try {
    // Make sure fetchApi is initialized
    if (!fetchApi) {
      console.error('Fetch API not initialized yet');
      return false;
    }
    
    // Call a special endpoint just for cleanup
    const response = await fetchApi('http://localhost:3000/api/system/backup/cleanup', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`Backup cleanup completed: ${result.deleted} old backups removed`);
      return true;
    } else {
      console.error('Backup cleanup failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('Failed to run backup cleanup:', error);
    return false;
  }
}

// Schedule backups to run daily at 2:00 AM
cron.schedule('0 2 * * *', runBackup);

// Run cleanup weekly on Sunday at 3:00 AM
cron.schedule('0 3 * * 0', cleanupOldBackups);

// Function to check for missed backups
function checkMissedBackups() {
  // Check on startup if we missed today's backup (if server was off at 2 AM)
  if (!hasBackedUpToday()) {
    const now = new Date();
    const twoAM = new Date(now);
    twoAM.setHours(2, 0, 0, 0);
    
    // If it's after 2 AM and we haven't backed up today, do it now
    if (now > twoAM) {
      console.log('System was likely off at 2 AM. Running missed backup now...');
      runBackup();
    } else {
      console.log('Today\'s backup will run at 2:00 AM');
    }
  }
}

console.log('Backup scheduler started');