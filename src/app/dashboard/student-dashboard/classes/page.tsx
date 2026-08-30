'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaCalendarAlt, FaSearch, FaClock, FaMapMarkerAlt, 
  FaUserTie, FaCheckCircle, FaSpinner, 
  FaPaperPlane, FaHourglassHalf, FaBan, FaUsers, FaLayerGroup
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface DojoClass {
  id: number;
  name: string;
  description: string;
  class_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  instructor_name: string;
  current_enrollment: number;
  enrollment_status: string | null;
  has_pending_request: boolean;
}

/* Circular capacity ring rendered with SVG */
function CapacityRing({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 100 ? '#f43f5e' : pct > 75 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-extrabold text-slate-700 leading-none">{current}</span>
        <span className="text-[8px] text-slate-400 font-semibold leading-none mt-0.5">/{max}</span>
      </div>
    </div>
  );
}

export default function StudentClassesPage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<DojoClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'available' | 'pending'>('all');
  const [actionSubmittingId, setActionSubmittingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/classes');
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
      } else {
        showToast('error', data.error || 'Failed to retrieve class schedule.');
      }
    } catch {
      showToast('error', 'Could not connect to the class schedule service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClasses(); }, []);

  const handleRequestEnrollment = async (classId: number) => {
    setActionSubmittingId(classId);
    try {
      const res = await fetch('/api/student/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Enrollment request submitted successfully.');
        loadClasses();
      } else {
        showToast('error', data.error || 'Failed to submit enrollment request.');
      }
    } catch {
      showToast('error', 'Communication failure. Please try again.');
    } finally {
      setActionSubmittingId(null);
    }
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch =
      cls.name.toLowerCase().includes(search.toLowerCase()) ||
      cls.instructor_name.toLowerCase().includes(search.toLowerCase()) ||
      cls.location.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'enrolled') return cls.enrollment_status === 'enrolled';
    if (filter === 'pending') return cls.has_pending_request;
    if (filter === 'available') return cls.enrollment_status !== 'enrolled' && !cls.has_pending_request;
    return true;
  });

  const enrolledCount = classes.filter(c => c.enrollment_status === 'enrolled').length;
  const pendingCount = classes.filter(c => c.has_pending_request).length;

  const formatTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  /* Accent color per card state */
  const getAccent = (cls: DojoClass) => {
    if (cls.enrollment_status === 'enrolled') return { border: 'border-l-emerald-500', bg: 'bg-emerald-50/40' };
    if (cls.has_pending_request) return { border: 'border-l-amber-400', bg: 'bg-amber-50/30' };
    if (cls.current_enrollment >= cls.capacity) return { border: 'border-l-slate-300', bg: 'bg-slate-50/40' };
    return { border: 'border-l-indigo-500', bg: 'bg-white' };
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All', count: classes.length },
    { key: 'enrolled' as const, label: 'Enrolled', count: enrolledCount },
    { key: 'pending' as const, label: 'Pending', count: pendingCount },
    { key: 'available' as const, label: 'Available', count: classes.filter(c => c.enrollment_status !== 'enrolled' && !c.has_pending_request).length },
  ];

  return (
    <div className="space-y-5">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-5 left-1/2 z-[9999] px-5 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <FaCheckCircle /> : <FaBan />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Class Schedule</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Browse dojo sessions and submit enrollment requests for instructor approval
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <FaCheckCircle className="text-emerald-500" size={10} />
            <span className="text-[11px] font-bold text-emerald-700">{enrolledCount} Enrolled</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
            <FaHourglassHalf className="text-amber-500" size={10} />
            <span className="text-[11px] font-bold text-amber-700">{pendingCount} Pending</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                filter === tab.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-[10px] text-slate-400">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search classes, instructors, or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200/70 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all"
          />
        </div>
      </div>

      {/* Class Cards */}
      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-xl" />
          <span className="text-xs font-semibold">Loading class schedule...</span>
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClasses.map((cls, index) => {
            const isFull = cls.current_enrollment >= cls.capacity;
            const canRequest = cls.enrollment_status !== 'enrolled' && !cls.has_pending_request && !isFull;
            const accent = getAccent(cls);

            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                className={`group relative rounded-2xl border border-slate-200/70 ${accent.bg} border-l-[3px] ${accent.border} overflow-hidden hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300`}
              >
                <div className="p-5">
                  {/* Top row: Title + Capacity ring */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-bold text-slate-800 leading-tight group-hover:text-indigo-700 transition-colors duration-200">
                        {cls.name}
                      </h3>
                      {cls.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{cls.description}</p>
                      )}
                    </div>
                    <CapacityRing current={cls.current_enrollment} max={cls.capacity} />
                  </div>

                  {/* Info chips row */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <FaCalendarAlt size={9} className="text-indigo-400" />
                      {formatDate(cls.class_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <FaClock size={9} className="text-indigo-400" />
                      {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <FaMapMarkerAlt size={9} className="text-indigo-400" />
                      {cls.location}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="my-4 border-t border-dashed border-slate-200/80" />

                  {/* Bottom: Instructor + Action */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                        <FaUserTie size={10} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700">{cls.instructor_name}</p>
                        <p className="text-[9px] text-slate-400 font-medium">Instructor</p>
                      </div>
                    </div>

                    {/* Action */}
                    {canRequest ? (
                      <button
                        onClick={() => handleRequestEnrollment(cls.id)}
                        disabled={actionSubmittingId !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.97]"
                      >
                        {actionSubmittingId === cls.id ? (
                          <FaSpinner className="animate-spin" size={10} />
                        ) : (
                          <FaPaperPlane size={9} />
                        )}
                        Request Enrollment
                      </button>
                    ) : cls.enrollment_status === 'enrolled' ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold">
                        <FaCheckCircle size={10} /> Enrolled
                      </span>
                    ) : cls.has_pending_request ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-bold">
                        <FaHourglassHalf size={10} /> Awaiting Approval
                      </span>
                    ) : isFull ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-bold">
                        <FaBan size={10} /> Class Full
                      </span>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
          <FaLayerGroup className="mx-auto text-2xl text-slate-300 mb-3" />
          <p className="text-xs font-semibold text-slate-400">
            {search || filter !== 'all' ? 'No classes match your current filters.' : 'No classes are currently scheduled.'}
          </p>
        </div>
      )}
    </div>
  );
}
