'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaCalendarAlt, FaSearch, FaClock, FaMapMarkerAlt, FaSpinner, 
  FaTimes, FaUserFriends, FaExclamationTriangle, FaClipboardCheck, FaAward, FaUserCheck, FaPhoneAlt
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Link from 'next/link';

interface ClassData {
  id: number;
  name: string;
  description: string | null;
  class_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  enrolled_count: number;
}

interface StudentRosterItem {
  enrollment_id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  enrollment_date: string;
}

export default function InstructorClassesPage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search and date filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'upcoming'>('all');

  // Modal / Roster state
  const [mounted, setMounted] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');

  const loadClasses = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/instructor/classes');
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve assigned classes.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with the schedules database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadClasses();
  }, []);

  const loadRoster = async (classId: number) => {
    try {
      setRosterLoading(true);
      setRosterError('');
      const res = await fetch(`/api/instructor/classes?classId=${classId}`);
      const data = await res.json();
      if (data.success) {
        setRoster(data.roster || []);
      } else {
        setRosterError(data.error || 'Failed to load class roster.');
      }
    } catch (err) {
      setRosterError('Failed to connect to enrollment services.');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleOpenRoster = (cls: ClassData) => {
    setSelectedClass(cls);
    setRosterModalOpen(true);
    loadRoster(cls.id);
  };

  const handleCloseRoster = () => {
    setSelectedClass(null);
    setRosterModalOpen(false);
    setRoster([]);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = Number(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const formattedHr = hr % 12 || 12;
    return `${formattedHr}:${minutes} ${ampm}`;
  };

  const getBeltColorBadge = (rank: string) => {
    const r = rank ? rank.toLowerCase() : '';
    if (r.includes('yellow')) return 'bg-yellow-50 text-yellow-750 border-yellow-205';
    if (r.includes('orange')) return 'bg-orange-50 text-orange-755 border-orange-205';
    if (r.includes('green')) return 'bg-emerald-50 text-emerald-700 border-emerald-205';
    if (r.includes('blue')) return 'bg-blue-50 text-blue-700 border-blue-205';
    if (r.includes('purple')) return 'bg-purple-50 text-purple-700 border-purple-205';
    if (r.includes('brown')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (r.includes('black')) return 'bg-slate-900 text-slate-50 border-slate-950';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Filter Logic
  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(search.toLowerCase()) ||
                          (cls.description && cls.description.toLowerCase().includes(search.toLowerCase())) ||
                          cls.location.toLowerCase().includes(search.toLowerCase());

    const classDateObj = new Date(cls.class_date + 'T00:00:00');
    const todayStr = new Date().toISOString().slice(0, 10);
    const classDateStr = cls.class_date;

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = classDateStr === todayStr;
    } else if (dateFilter === 'week') {
      const today = new Date();
      const endOfWeek = new Date();
      endOfWeek.setDate(today.getDate() + 7);
      matchesDate = classDateObj >= new Date(today.setHours(0,0,0,0)) && classDateObj <= endOfWeek;
    } else if (dateFilter === 'upcoming') {
      matchesDate = classDateStr >= todayStr;
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaCalendarAlt className="text-amber-500" /> Assigned Classes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            View your scheduled classes, review enrolled student list rosters, and track class occupancy limits
          </p>
        </div>
      </div>

      {/* Toolbar filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
        {/* Date Filters */}
        <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl w-full md:w-auto">
          {([
            { key: 'all', label: 'All Classes' },
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Next 7 Days' },
            { key: 'upcoming', label: 'Upcoming Only' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setDateFilter(tab.key)}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
                dateFilter === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FaSearch size={12} />
          </span>
          <input
            type="text"
            placeholder="Search by class name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>
      </div>

      {/* Error / Alert notice */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Classes Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-xl text-amber-500" />
          <span className="text-xs font-bold tracking-wider">Loading classes schedule...</span>
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls, idx) => {
            const occupancyRate = cls.capacity > 0 ? Math.round((cls.enrolled_count / cls.capacity) * 100) : 0;
            const isFull = cls.enrolled_count >= cls.capacity;
            const isNearFull = occupancyRate >= 85 && !isFull;
            const todayStr = new Date().toISOString().slice(0, 10);
            const isToday = cls.class_date === todayStr;

            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="space-y-4">
                  {/* Badges Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <FaCalendarAlt size={10} className="text-slate-400" /> {formatDate(cls.class_date)}
                    </span>
                    {isToday && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-250 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Header Title */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">{cls.name}</h3>
                    {cls.description && (
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                        {cls.description}
                      </p>
                    )}
                  </div>

                  {/* Class Meta */}
                  <div className="space-y-1.5 text-[10px] text-slate-500 font-semibold">
                    <div className="flex items-center gap-2">
                      <FaClock size={10} className="text-slate-400" />
                      <span>{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt size={10} className="text-slate-400" />
                      <span>{cls.location}</span>
                    </div>
                  </div>

                  {/* Occupancy Rate Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Class Occupancy</span>
                      <span className={isFull ? 'text-rose-600' : isNearFull ? 'text-amber-600' : 'text-slate-700'}>
                        {cls.enrolled_count} / {cls.capacity} Enrolled ({occupancyRate}%)
                      </span>
                    </div>
                    
                    {/* Progress Bar Container */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull ? 'bg-rose-500' : isNearFull ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                      />
                    </div>

                    {isFull && (
                      <div className="flex items-center gap-1 text-[9px] text-rose-700 font-bold bg-rose-50/50 px-2 py-0.5 border border-rose-100 rounded-md">
                        <FaExclamationTriangle size={8} /> Class is at maximum capacity limit.
                      </div>
                    )}
                    {isNearFull && (
                      <div className="flex items-center gap-1 text-[9px] text-amber-700 font-bold bg-amber-50/50 px-2 py-0.5 border border-amber-100 rounded-md">
                        <FaExclamationTriangle size={8} /> Class is filling up rapidly.
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-6 pt-3.5 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleOpenRoster(cls)}
                    className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FaUserFriends size={10} /> Roster
                  </button>
                  <Link
                    href={`/dashboard/instructor-dashboard/attendance`}
                    className="flex-1 px-3 py-2 bg-slate-900 hover:bg-amber-650 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FaClipboardCheck size={10} /> Attendance
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 bg-white rounded-2xl border border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-400">No assigned classes found matching current criteria.</p>
        </div>
      )}

      {/* Roster Overlay Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {rosterModalOpen && selectedClass && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-150 overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FaUserFriends className="text-amber-500" /> Student Roster
                    </h3>
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                      {selectedClass.name} &bull; {formatDate(selectedClass.class_date)} ({formatTime(selectedClass.start_time)} - {formatTime(selectedClass.end_time)})
                    </p>
                  </div>
                  <button 
                    onClick={handleCloseRoster}
                    className="text-slate-450 hover:text-slate-700 p-1"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                  {rosterLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <FaSpinner className="animate-spin text-xl text-amber-500" />
                      <span className="text-xs font-bold">Loading student enrollments...</span>
                    </div>
                  ) : rosterError ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold">
                      {rosterError}
                    </div>
                  ) : roster.length > 0 ? (
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <th className="px-4 py-3">Student</th>
                            <th className="px-4 py-3">Belt Rank</th>
                            <th className="px-4 py-3">Enrolled Date</th>
                            <th className="px-4 py-3">Emergency Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                          {roster.map((item) => (
                            <tr key={item.enrollment_id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3">
                                <p className="font-bold text-slate-800">{item.first_name} {item.last_name}</p>
                                {item.phone && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <FaPhoneAlt size={8} /> {item.phone}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${getBeltColorBadge(item.belt_rank)}`}>
                                  {item.belt_rank}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-450 font-medium">
                                {formatDate(item.enrollment_date)}
                              </td>
                              <td className="px-4 py-3">
                                {item.emergency_contact_name ? (
                                  <div>
                                    <p className="text-slate-700 font-bold text-[11px]">{item.emergency_contact_name}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{item.emergency_contact_phone}</p>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">None Provided</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 italic">
                      No students are currently enrolled in this dojo class.
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    onClick={handleCloseRoster}
                    className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all font-bold text-xs"
                  >
                    Close
                  </button>
                  <Link
                    href={`/dashboard/instructor-dashboard/attendance`}
                    className="px-4 py-2 bg-slate-900 hover:bg-amber-650 text-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold"
                  >
                    <FaClipboardCheck size={10} /> Register Class Attendance
                  </Link>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
