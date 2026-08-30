'use client';

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDatabase, 
  faCloudArrowUp,
  faSpinner, 
  faCheckCircle,
  faTriangleExclamation,
  faCalendarDays,
  faShieldHalved,
  faClock,
  faChevronLeft,
  faDownload,
  faInfoCircle,
  faCircleNotch,
  faFolderOpen,
  faLock,
  faSun,
  faMoon,
  faServer,
  faCloudArrowDown
} from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface BackupRecord {
  date: string;
  file: string;
  size: string;
  status: string;
  method?: string;
}

export default function BackupPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/backup');
      const data = await response.json();
      
      if (data.success) {
        setBackups(data.backups || []);
      } else {
        setMessage({ text: 'Failed to load backups: ' + data.message, type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      setMessage({ text: 'Error loading backups. Check console for details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setBackupInProgress(true);
      setMessage({ text: 'Creating backup...', type: 'info' });
      
      const response = await fetch('/api/system/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          text: `Backup created successfully (${data.size}) using ${data.method || 'default'} method`, 
          type: 'success' 
        });
        fetchBackups(); // Refresh the list
      } else {
        setMessage({ text: 'Backup failed: ' + data.message, type: 'error' });
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setMessage({ text: 'Error creating backup. Check console for details.', type: 'error' });
    } finally {
      setBackupInProgress(false);
    }
  };

  const goBack = () => {
    router.push('\\dashboard\\admin-dashboard');
  };

  const createAutomaticBackup = async () => {
    try {
      setBackupInProgress(true);
      setMessage({ text: 'Creating automatic backup...', type: 'info' });
      
      const response = await fetch('/api/system/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'auto' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          text: `Automatic backup created successfully (${data.size}) using ${data.method || 'default'} method`, 
          type: 'success' 
        });
        fetchBackups(); // Refresh the list
      } else {
        setMessage({ text: 'Automatic backup failed: ' + data.message, type: 'error' });
      }
    } catch (error) {
      console.error('Error creating automatic backup:', error);
      setMessage({ text: 'Error creating automatic backup. Check console for details.', type: 'error' });
    } finally {
      setBackupInProgress(false);
    }
  };

  const downloadBackup = (filename: string) => {
    try {
      setMessage({ text: `Preparing download for ${filename}...`, type: 'info' });
      
      const link = document.createElement('a');
      link.href = `/api/system/download?filename=${encodeURIComponent(filename)}`;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ text: 'Download initiated. If it doesn\'t start automatically, check your browser settings.', type: 'success' });
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ text: 'Failed to initiate download. Check console for details.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 text-gray-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <button 
            onClick={goBack}
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-200 mb-4 font-medium"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Database Backup</h1>
              <p className="mt-1 text-blue-300">Protect your valuable business data with secure backups</p>
            </div>

            {/* Message Alert */}
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
                  message.type === 'success' ? 'bg-blue-900/60 text-green-300 border border-green-500/30' :
                  message.type === 'error' ? 'bg-blue-900/60 text-rose-300 border border-rose-500/30' :
                  'bg-blue-900/60 text-blue-300 border border-blue-500/30'
                }`}
              >
                <FontAwesomeIcon 
                  icon={
                    message.type === 'success' ? faCheckCircle :
                    message.type === 'error' ? faTriangleExclamation :
                    faInfoCircle
                  } 
                  className="h-4 w-4" 
                />
                <span>{message.text}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="xl:col-span-1 space-y-6"
          >
            {/* Quick Actions Card */}
            <div className="bg-blue-900/30 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-blue-800/50">
              <div className="p-5 border-b border-blue-700/50">
                <h2 className="font-semibold text-lg text-white">Quick Actions</h2>
              </div>
              <div className="p-5">
                <button
                  onClick={createBackup}
                  disabled={backupInProgress}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                >
                  {backupInProgress ? (
                    <>
                      <FontAwesomeIcon icon={faCircleNotch} className="animate-spin h-4 w-4 mr-2" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCloudArrowUp} className="h-4 w-4 mr-2" />
                      Create Manual Backup
                    </>
                  )}
                </button>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div 
                    onClick={() => setActiveTab('history')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all ${
                      activeTab === 'history' 
                        ? 'border-blue-500 bg-blue-800/40 text-blue-300' 
                        : 'border-blue-700/50 hover:border-blue-600 hover:bg-blue-800/20 text-blue-300 hover:text-blue-300'
                    }`}
                  >
                    <FontAwesomeIcon icon={faClock} className="h-5 w-5 mb-2" />
                    <span className="text-sm font-medium">History</span>
                  </div>
                  <div 
                    onClick={() => setActiveTab('settings')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all ${
                      activeTab === 'settings' 
                        ? 'border-blue-500 bg-blue-800/40 text-blue-300' 
                        : 'border-blue-700/50 hover:border-blue-600 hover:bg-blue-800/20 text-blue-300 hover:text-blue-300'
                    }`}
                  >
                    <FontAwesomeIcon icon={faServer} className="h-5 w-5 mb-2" />
                    <span className="text-sm font-medium">Settings</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Schedule Overview Card */}
            <div className="bg-blue-900/30 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-blue-800/50">
              <div className="p-5 border-b border-blue-700/50">
                <h2 className="font-semibold text-lg text-white">Schedule Overview</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-inner">
                      <FontAwesomeIcon icon={faCalendarDays} className="text-blue-200 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Daily Backup</h3>
                      <p className="text-xs text-blue-300">
                        <FontAwesomeIcon icon={faSun} className="mr-1" /> Every day at 2:00 AM
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-green-900/30 text-green-300 border border-green-500/30 text-xs font-medium rounded-full shadow-sm">
                    Active
                  </span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-blue-700/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-300">Retention Policy</span>
                    <span className="font-medium text-white">Last 30 days</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Main Content Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="xl:col-span-3"
          >
            <div className="bg-blue-900/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-800/50 h-full">
              {activeTab === 'history' ? (
                <>
                  <div className="p-5 border-b border-blue-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-inner">
                        <FontAwesomeIcon icon={faClock} className="text-blue-200 h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg text-white">Backup History</h2>
                        <p className="text-xs text-blue-300">View and manage your database backups</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-sm text-blue-300 mr-3">
                        {backups.length} total backups
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    {loading ? (
                      <div className="flex justify-center items-center py-20">
                        <div className="flex flex-col items-center">
                          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-4 shadow-inner">
                            <FontAwesomeIcon icon={faCircleNotch} className="text-blue-200 text-xl animate-spin" />
                          </div>
                          <p className="text-blue-300">Loading backup history...</p>
                        </div>
                      </div>
                    ) : backups.length === 0 ? (
                      <div className="rounded-2xl bg-blue-800/20 p-10 text-center border border-blue-700/30">
                        <div className="flex flex-col items-center">
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-4 shadow-inner">
                            <FontAwesomeIcon icon={faFolderOpen} className="text-blue-200 text-2xl" />
                          </div>
                          <h3 className="text-lg font-medium text-white mb-2">No backups found</h3>
                          <p className="text-blue-300 max-w-sm mb-6">
                            You haven't created any backups yet. Create your first backup or wait for the scheduled backup to run.
                          </p>
                          <button
                            onClick={createBackup}
                            disabled={backupInProgress}
                            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                          >
                            <FontAwesomeIcon icon={faCloudArrowUp} className="h-4 w-4 mr-2" />
                            Create First Backup
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-blue-700/40 overflow-hidden">
                        {/* Fixed table header */}
                        <div className="bg-blue-800/30 backdrop-blur-sm">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-xs font-medium text-blue-300">
                                <th className="px-4 py-3">Date & Time</th>
                                <th className="px-4 py-3">File Name</th>
                                <th className="px-4 py-3">Size</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                          </table>
                        </div>
                        
                        {/* Scrollable table body with custom scrollbar styling */}
                        <div className="
                          overflow-y-auto overflow-x-auto max-h-[400px]
                          
                          [&::-webkit-scrollbar]:w-2
                          [&::-webkit-scrollbar]:h-2
                          
                          [&::-webkit-scrollbar-track]:bg-blue-900/20
                          [&::-webkit-scrollbar-track]:rounded-full
                          
                          [&::-webkit-scrollbar-thumb]:bg-gradient-to-r
                          [&::-webkit-scrollbar-thumb]:from-blue-600
                          [&::-webkit-scrollbar-thumb]:to-blue-800
                          [&::-webkit-scrollbar-thumb]:rounded-full
                          [&::-webkit-scrollbar-thumb]:border
                          [&::-webkit-scrollbar-thumb]:border-blue-700/60
                          
                          [&::-webkit-scrollbar-thumb:hover]:bg-gradient-to-r
                          [&::-webkit-scrollbar-thumb:hover]:from-blue-500
                          [&::-webkit-scrollbar-thumb:hover]:to-blue-700
                          [&::-webkit-scrollbar-thumb:hover]:shadow-[0_0_5px_rgba(37,99,235,0.5)]
                          
                          [&::-webkit-scrollbar-corner]:bg-transparent
                        ">
                          <table className="w-full">
                            <tbody className="divide-y divide-blue-700/30">
                              {backups
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((backup, index) => (
                                  <tr key={index} className="hover:bg-blue-800/20 transition-colors">
                                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                                      <div className="font-medium text-white">
                                        {new Date(backup.date).toLocaleDateString()}
                                      </div>
                                      <div className="text-xs text-blue-300">
                                        {new Date(backup.date).toLocaleTimeString()}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className="font-mono text-xs text-blue-300">
                                        {backup.file}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className="text-sm text-blue-200 font-medium">
                                        {backup.size}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                                        backup.status === 'success' 
                                          ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                                          : 'bg-red-900/30 text-rose-300 border border-rose-500/30'
                                      }`}>
                                        <FontAwesomeIcon icon={backup.status === 'success' ? faCheckCircle : faTriangleExclamation} className="h-3 w-3" />
                                        {backup.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <span className="px-2.5 py-1 bg-blue-800/40 text-blue-300 border border-blue-500/30 text-xs font-medium rounded-full">
                                        {backup.method || 'Manual'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-right">
                                      <button 
                                        onClick={() => downloadBackup(backup.file)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-800 hover:bg-blue-700 rounded-lg text-blue-200 text-xs font-medium transition-colors shadow-sm"
                                      >
                                        <FontAwesomeIcon icon={faCloudArrowDown} className="h-3 w-3" />
                                        Download
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-5 border-b border-blue-700/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-inner">
                        <FontAwesomeIcon icon={faServer} className="text-blue-200 h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg text-white">Backup Settings</h2>
                        <p className="text-xs text-blue-300">Configure your backup preferences</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {/* Security Card */}
                      <div className="bg-blue-800/30 backdrop-blur-sm rounded-xl p-5 border border-blue-700/50 hover:shadow-lg transition-all duration-300 hover:border-blue-600/70">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-inner">
                            <FontAwesomeIcon icon={faShieldHalved} className="text-blue-200 h-5 w-5" />
                          </div>
                          <h3 className="font-medium text-white">Security</h3>
                        </div>
                        
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2 text-blue-200">
                            <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-blue-400" />
                            <span>End-to-end encryption</span>
                          </li>
                          <li className="flex items-center gap-2 text-blue-200">
                            <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-blue-400" />
                            <span>Admin-only access control</span>
                          </li>
                          <li className="flex items-center gap-2 text-blue-200">
                            <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-blue-400" />
                            <span>Secure storage protocols</span>
                          </li>
                          <li className="flex items-center gap-2 text-blue-200">
                            <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-blue-400" />
                            <span>Integrity verification</span>
                          </li>
                        </ul>
                      </div>
                      
                      {/* Schedule Card */}
                      <div className="bg-blue-800/30 backdrop-blur-sm rounded-xl p-5 border border-blue-700/50 hover:shadow-lg transition-all duration-300 hover:border-blue-600/70">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-inner">
                            <FontAwesomeIcon icon={faCalendarDays} className="text-blue-200 h-5 w-5" />
                          </div>
                          <h3 className="font-medium text-white">Schedule</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-200">Daily Backup</span>
                            <div className="px-2.5 py-1 bg-green-900/30 text-green-300 border border-green-500/30 text-xs font-medium rounded-full shadow-sm">
                              <p>Always Enabled</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      <div className="mt-12 py-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <img 
            src="/logo2.png" 
            alt="Ebota Logo" 
            className="h-40 w-auto filter brightness-0 invert opacity-80 hover:opacity-100 transition-opacity duration-300" 
          />
          <p className="text-xl font-semibold text-blue-300">
            Powered by Ebota Security
          </p>
        </div>
      </div>

      {/* Add glassmorphism blur effect */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-blue-950/30 backdrop-blur-sm -z-10"></div>
    </div>
  );
}