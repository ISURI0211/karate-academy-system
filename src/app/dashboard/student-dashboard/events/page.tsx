'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaTrophy, FaSearch, FaCalendarAlt, FaMapMarkerAlt, 
  FaUsers, FaCheckCircle, FaSpinner, FaTimesCircle,
  FaMedal, FaRegCalendarCheck, FaHourglassHalf, FaIdBadge, FaPaperPlane,
  FaUserCheck, FaUserTimes
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface EventItem {
  id: number;
  name: string;
  description: string;
  event_date: string;
  location: string;
  event_type: 'competition' | 'seminar' | 'social';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registration_id: number | null;
  role: 'competitor' | 'volunteer' | null;
  result_details: string | null;
  score: number | null;
  participant_count: number;
  has_pending_request: boolean;
  pending_role: string | null;
  participant_code: string | null;
  attendance_status: 'pending' | 'present' | 'absent' | null;
  registration_status: 'confirmed' | 'cancelled' | null;
  registration_cancel_reason: string | null;
}

export default function StudentEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'registered' | 'completed'>('all');
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<Record<number, 'competitor' | 'volunteer'>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
        const initialRoles: Record<number, 'competitor' | 'volunteer'> = {};
        (data.events || []).forEach((ev: EventItem) => {
          initialRoles[ev.id] = 'competitor';
        });
        setSelectedRole(initialRoles);
      } else {
        showToast('error', data.error || 'Failed to fetch events.');
      }
    } catch {
      showToast('error', 'Could not connect to the events service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  const handleRequestRegistration = async (eventId: number) => {
    setSubmittingId(eventId);
    const role = selectedRole[eventId] || 'competitor';
    try {
      const res = await fetch('/api/student/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, role })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Registration request submitted.');
        loadEvents();
      } else {
        showToast('error', data.error || 'Failed to submit request.');
      }
    } catch {
      showToast('error', 'Communication failure.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancelRegistration = async (eventId: number) => {
    if (!confirm('Cancel your registration/request for this event?')) return;
    setSubmittingId(eventId);
    try {
      const res = await fetch('/api/student/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Registration cancelled.');
        loadEvents();
      } else {
        showToast('error', data.error || 'Failed to cancel.');
      }
    } catch {
      showToast('error', 'Communication failure.');
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredEvents = events.filter(ev => {
    const matchesSearch =
      ev.name.toLowerCase().includes(search.toLowerCase()) ||
      ev.location.toLowerCase().includes(search.toLowerCase()) ||
      (ev.description && ev.description.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    
    const isConfirmed = ev.registration_id !== null && ev.registration_status === 'confirmed';
    if (filter === 'upcoming') return ev.status === 'upcoming' || ev.status === 'ongoing';
    if (filter === 'registered') return isConfirmed || ev.has_pending_request;
    if (filter === 'completed') return ev.status === 'completed';
    return true;
  });

  const totalRegistered = events.filter(e => e.registration_id !== null && e.registration_status === 'confirmed').length;
  const pendingCount = events.filter(e => e.has_pending_request).length;
  const medalsWon = events.filter(e => e.registration_id !== null && e.registration_status === 'confirmed' && e.result_details && e.result_details !== 'N/A').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ongoing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'competition': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'seminar': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'social': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
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
            {toast.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800">Dojo Events & Tournaments</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Request to join upcoming competitions and volunteer events. Your unique participant ID will be issued upon admin approval
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <FaRegCalendarCheck size={15} />
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-800 leading-none">{totalRegistered}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Confirmed</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <FaHourglassHalf size={14} />
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-800 leading-none">{pendingCount}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pending</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <FaMedal size={15} />
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-800 leading-none">{medalsWon}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Placements</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl flex-shrink-0">
          {([
            { key: 'all', label: 'All' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'registered', label: 'Mine' },
            { key: 'completed', label: 'Completed' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                filter === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events, locations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200/70 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all"
          />
        </div>
      </div>

      {/* Event Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <FaSpinner className="animate-spin text-xl" />
          <span className="text-xs font-semibold">Loading events calendar...</span>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map((ev, index) => {
            const isCancelled = ev.registration_id !== null && ev.registration_status === 'cancelled';
            const isConfirmed = ev.registration_id !== null && !isCancelled;
            const isPending = ev.has_pending_request;
            const isUpcoming = ev.status === 'upcoming';
            const isCompleted = ev.status === 'completed';
            const canRequest = isUpcoming && !isConfirmed && !isPending;

            // Determine left border accent
            const borderAccent = isCancelled
              ? 'border-l-rose-400'
              : isConfirmed
              ? 'border-l-emerald-500'
              : isPending
              ? 'border-l-amber-400'
              : 'border-l-slate-200/60';

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`bg-white border border-slate-200/60 border-l-[3px] ${borderAccent} rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.08)] transition-shadow duration-200 flex flex-col`}
              >
                <div className="p-5 flex-1 space-y-4">
                  {/* Badges row */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${getTypeBadge(ev.event_type)}`}>
                      {ev.event_type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Attendance Badge for confirmed registrations */}
                      {isConfirmed && ev.attendance_status && ev.attendance_status !== 'pending' && (
                        <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          ev.attendance_status === 'present'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-350'
                            : 'bg-rose-100 text-rose-800 border-rose-350'
                        }`}>
                          {ev.attendance_status === 'present' ? <FaUserCheck size={9} /> : <FaUserTimes size={9} />}
                          {ev.attendance_status === 'present' ? 'Attended' : 'Absent'}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${getStatusBadge(ev.status)}`}>
                        {ev.status}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">{ev.name}</h3>
                    {ev.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{ev.description}</p>
                    )}
                  </div>

                  {/* Info chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <FaCalendarAlt size={8} className="text-indigo-400" /> {formatDate(ev.event_date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <FaMapMarkerAlt size={8} className="text-indigo-400" /> {ev.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                      <FaUsers size={8} className="text-indigo-400" /> {ev.participant_count} registered
                    </span>
                  </div>

                  {/* Unique Participant ID — confirmed only */}
                  {isConfirmed && ev.participant_code && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200/60 rounded-xl">
                      <FaIdBadge className="text-indigo-500 flex-shrink-0" size={14} />
                      <div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">Your Participant ID</p>
                        <p className="text-sm font-extrabold text-indigo-700 font-mono tracking-widest">{ev.participant_code}</p>
                      </div>
                      <span className="ml-auto text-[9px] font-black uppercase text-indigo-500 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded">
                        {ev.role}
                      </span>
                    </div>
                  )}

                  {/* Cancellation notice */}
                  {isCancelled && (
                    <div className="flex flex-col gap-1 p-3 bg-rose-50 border border-rose-200/60 rounded-xl text-xs text-rose-800">
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">
                        <FaTimesCircle /> Registration Cancelled by Dojo Admin
                      </p>
                      <p className="font-semibold">
                        {ev.registration_cancel_reason ? `Reason: "${ev.registration_cancel_reason}"` : 'No cancellation reason provided.'}
                      </p>
                    </div>
                  )}

                  {/* Pending state */}
                  {isPending && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
                      <FaHourglassHalf className="text-amber-500 flex-shrink-0" size={12} />
                      <div>
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Awaiting Admin Approval</p>
                        <p className="text-[10px] font-semibold text-amber-700">
                          Requested as <span className="font-black uppercase">{ev.pending_role}</span>. You will receive a participant ID upon approval.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Completed results */}
                  {isCompleted && isConfirmed && ev.result_details && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Event Placement</p>
                        {ev.score !== null && (
                          <span className="text-[9px] font-black text-emerald-700">Score: {ev.score}/100</span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-emerald-800">{ev.result_details}</p>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                {isUpcoming && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="border-t border-slate-100 pt-4">
                      {canRequest ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">Role:</span>
                            <div className="flex gap-1">
                              {(['competitor', 'volunteer'] as const).map(r => (
                                <button
                                  key={r}
                                  onClick={() => setSelectedRole({ ...selectedRole, [ev.id]: r })}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    (selectedRole[ev.id] || 'competitor') === r
                                      ? r === 'competitor'
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-slate-700 text-white border-slate-700'
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRequestRegistration(ev.id)}
                            disabled={submittingId !== null}
                            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-bold tracking-wide transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            {submittingId === ev.id ? <FaSpinner className="animate-spin" size={9} /> : <FaPaperPlane size={9} />}
                            Request
                          </button>
                        </div>
                      ) : (isPending || isConfirmed) ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 italic">
                            {isConfirmed ? 'Registration confirmed.' : 'Request submitted.'}
                          </span>
                          <button
                            onClick={() => handleCancelRegistration(ev.id)}
                            disabled={submittingId !== null}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-xl text-[10px] font-bold transition-colors flex items-center gap-1.5"
                          >
                            {submittingId === ev.id ? <FaSpinner className="animate-spin" size={9} /> : <FaTimesCircle size={9} />}
                            Cancel
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
          <FaTrophy className="mx-auto text-2xl text-slate-300 mb-3" />
          <p className="text-xs font-semibold text-slate-400">
            {search || filter !== 'all' ? 'No events match your filters.' : 'No dojo events scheduled.'}
          </p>
        </div>
      )}
    </div>
  );
}
