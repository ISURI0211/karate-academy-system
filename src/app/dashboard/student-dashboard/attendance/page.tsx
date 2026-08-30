'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaCalendarCheck, FaSearch, FaCheckCircle, FaTimesCircle, 
  FaInfoCircle, FaSpinner, FaCalendarAlt, FaUserTie, FaPercent
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceRecord {
  id: number;
  attendance_date: string;
  status: 'present' | 'absent' | 'excused';
  class_name: string;
  instructor_name: string;
  marked_by_name: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  excused: number;
  total: number;
}

export default function StudentAttendancePage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ present: 0, absent: 0, excused: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'excused'>('all');
  const [errorMsg, setErrorMsg] = useState('');

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/student/attendance');
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        setStats(data.stats || { present: 0, absent: 0, excused: 0, total: 0 });
      } else {
        setErrorMsg(data.error || 'Failed to load attendance logs.');
      }
    } catch {
      setErrorMsg('Failed to connect to the attendance service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const filteredRecords = records.filter(rec => {
    const matchesSearch = 
      rec.class_name.toLowerCase().includes(search.toLowerCase()) ||
      rec.instructor_name.toLowerCase().includes(search.toLowerCase()) ||
      (rec.marked_by_name && rec.marked_by_name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: 'present' | 'absent' | 'excused') => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-250 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
            <FaCheckCircle size={10} /> Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
            <FaTimesCircle size={10} /> Absent
          </span>
        );
      case 'excused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
            <FaInfoCircle size={10} /> Excused
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <FaCalendarCheck className="text-indigo-650" /> Attendance Ledger
        </h2>
        <p className="text-xs text-slate-500 mt-1">Review your overall attendance records, training participation rate, and absence logs</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <FaPercent className="text-indigo-500" size={8} /> Attendance Rate
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{attendanceRate}%</span>
            <span className="text-[10px] text-slate-400 font-medium">overall</span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                attendanceRate >= 90 ? 'bg-emerald-500' : attendanceRate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Present Days */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
            <FaCheckCircle className="text-emerald-500" size={8} /> Present Days
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.present}</span>
            <span className="text-[10px] text-slate-400 font-medium">classes</span>
          </div>
          <p className="text-[9px] text-slate-400 font-medium mt-3">Active training sessions completed</p>
        </div>

        {/* Excused Days */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
            <FaInfoCircle className="text-indigo-500" size={8} /> Excused
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.excused}</span>
            <span className="text-[10px] text-slate-400 font-medium">classes</span>
          </div>
          <p className="text-[9px] text-slate-400 font-medium mt-3">Approved excused absences</p>
        </div>

        {/* Absent Days */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <span className="text-[10px] font-black text-rose-605 uppercase tracking-widest flex items-center gap-1">
            <FaTimesCircle className="text-rose-500" size={8} /> Absent Days
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.absent}</span>
            <span className="text-[10px] text-slate-400 font-medium">classes</span>
          </div>
          <p className="text-[9px] text-slate-400 font-medium mt-3">Unexcused training sessions missed</p>
        </div>
      </div>

      {/* Toolbar: Filters and Search */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Filter Buttons */}
        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl w-full md:w-auto">
          {(['all', 'present', 'excused', 'absent'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setStatusFilter(type)}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === type
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <FaSearch size={11} />
          </span>
          <input
            type="text"
            placeholder="Search classes or instructors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>
      </div>

      {/* List Layout */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-xl" />
          <span className="text-xs font-semibold">Loading attendance logs...</span>
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)]">
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((rec) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/40 transition-colors"
              >
                {/* Left: Date, Class & Instructor */}
                <div className="flex items-center gap-4">
                  <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-center min-w-[80px]">
                    <span className="block text-[10px] font-black text-slate-400 uppercase leading-none">Date</span>
                    <span className="block text-xs font-extrabold text-slate-700 mt-1.5">{formatDate(rec.attendance_date).split(',')[1]}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">{rec.class_name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                      <FaUserTie size={9} /> Sensei {rec.instructor_name}
                    </p>
                  </div>
                </div>

                {/* Right: Status and Marked By info */}
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  {rec.marked_by_name && (
                    <div className="text-right hidden sm:block">
                      <span className="block text-[8px] font-black text-slate-400 uppercase leading-none">Verified By</span>
                      <span className="block text-[9px] text-slate-500 font-semibold mt-1">{rec.marked_by_name}</span>
                    </div>
                  )}
                  <div>
                    {getStatusBadge(rec.status)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-16 bg-white rounded-2xl border border-slate-100 text-center">
          <p className="text-xs font-semibold text-slate-450">No attendance logs found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
