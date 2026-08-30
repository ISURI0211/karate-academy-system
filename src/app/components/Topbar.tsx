'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { FaBars, FaBell, FaCalendarCheck, FaAward, FaBullhorn, FaCheck, FaTimes } from 'react-icons/fa';

interface TopbarProps {
  title: string;
  role: 'admin' | 'instructor' | 'student';
  roleLabel: string;
  mobileToggleId: string;
  accentColor: 'red' | 'amber' | 'sky';
}

interface NotificationItem {
  id: number;
  type: 'class_reminder' | 'grading_exam' | 'announcement';
  title: string;
  message: string;
  is_read: boolean;
  time: string;
}

const COLOR_MAPS = {
  red: {
    avatar: 'from-red-500 to-rose-600 shadow-red-200',
    dot: 'bg-red-500',
    label: 'text-red-500'
  },
  amber: {
    avatar: 'from-amber-500 to-orange-500 shadow-amber-200',
    dot: 'bg-amber-500',
    label: 'text-amber-600'
  },
  sky: {
    avatar: 'from-sky-500 to-indigo-600 shadow-sky-200',
    dot: 'bg-sky-500',
    label: 'text-sky-600'
  }
};

export default function Topbar({
  title,
  role,
  roleLabel,
  mobileToggleId,
  accentColor
}: TopbarProps) {
  const { data: session } = useSession();
  const username = session?.user?.username ?? role.toUpperCase();
  const initials = username.slice(0, 2).toUpperCase();
  const currentColors = COLOR_MAPS[accentColor] || COLOR_MAPS.red;

  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchNotifications();
      // Poll notifications every 45 seconds
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Click outside to close panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [panelOpen]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markSingleAsRead = async (id: number) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerMobileToggle = () => {
    const el = document.getElementById(mobileToggleId);
    if (el) el.click();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'class_reminder':
        return <FaCalendarCheck className="text-sky-600" />;
      case 'grading_exam':
        return <FaAward className="text-amber-600" />;
      case 'announcement':
      default:
        return <FaBullhorn className="text-rose-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'class_reminder':
        return 'bg-sky-50 border-sky-100';
      case 'grading_exam':
        return 'bg-amber-50 border-amber-100';
      case 'announcement':
      default:
        return 'bg-rose-50 border-rose-100';
    }
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex items-center justify-between px-6 flex-shrink-0 z-20 relative">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={triggerMobileToggle}
          className="md:hidden w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 flex items-center justify-center transition-colors"
          aria-label="Open Navigation Menu"
        >
          <FaBars className="text-slate-500 text-sm" />
        </button>
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-none">{title}</h1>
          <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">Ryu Jokan Karate Academy</p>
        </div>
      </div>

      <div className="flex items-center gap-3" ref={panelRef}>
        {/* Notifications Button */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-200 ${
            panelOpen 
              ? 'bg-slate-100 border-slate-200 text-slate-700' 
              : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/80 text-slate-400'
          }`}
          aria-label="View notifications"
        >
          <FaBell className="text-sm transition-colors" />
          {unreadCount > 0 && (
            <span className={`absolute top-2 right-2 w-2 h-2 ${currentColors.dot} rounded-full ring-2 ring-white`} />
          )}
        </button>

        {/* Notifications Panel Dropdown */}
        {panelOpen && (
          <div className="absolute right-20 top-[60px] w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 flex flex-col max-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <FaCheck size={8} /> Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && markSingleAsRead(item.id)}
                    className={`p-3 rounded-xl border transition-all text-left flex gap-3 cursor-pointer ${
                      item.is_read
                        ? 'bg-white border-transparent hover:bg-slate-50/50'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${getNotificationBg(item.type)}`}>
                      {getNotificationIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate ${item.is_read ? 'font-medium text-slate-600' : 'font-bold text-slate-800'}`}>
                          {item.title}
                        </p>
                        {!item.is_read && (
                          <span className={`w-1.5 h-1.5 rounded-full ${currentColors.dot} flex-shrink-0`} />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5 break-words line-clamp-2">
                        {item.message}
                      </p>
                      <span className="text-[8px] text-slate-350 font-medium block mt-1">{item.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <FaBell className="text-2xl text-slate-200 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">All caught up!</p>
                  <p className="text-[10px] text-slate-300">No new alerts to review.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User profile capsule */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-100">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentColors.avatar} flex items-center justify-center shadow-sm flex-shrink-0 text-white font-bold text-xs`}>
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-700 leading-none">{username}</p>
            <p className={`text-[9px] ${currentColors.label} font-semibold uppercase tracking-wider mt-0.5`}>
              {roleLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
