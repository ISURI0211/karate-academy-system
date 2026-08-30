'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaTrophy, FaSearch, FaPlus, FaEdit, FaTrash, 
  FaUsers, FaTimes, FaTimesCircle, FaCalendarAlt, FaMapMarkerAlt, FaSpinner, 
  FaCheckCircle, FaUserPlus, FaUserMinus, FaSlidersH, FaFileAlt, FaCheck, FaUserTag
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface EventData {
  id: number;
  name: string;
  description: string;
  event_date: string;
  location: string;
  event_type: 'competition' | 'seminar' | 'social';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  participant_count: number;
}

interface Participant {
  participant_id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
  role: 'competitor' | 'spectator' | 'volunteer';
  result_details: string | null;
  score: number | null;
  registration_date: string;
  attendance_status: 'pending' | 'present' | 'absent';
  status: 'confirmed' | 'cancelled';
  cancel_reason: string | null;
}

interface UnregisteredStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
}

interface PendingRequest {
  notification_id: number;
  student_id: number;
  student_name: string;
  belt_rank: string;
  role: string;
  requested_at: string;
}

export default function AdminEventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'events' | 'requests'>('events');

  // All requests state
  const [allRequests, setAllRequests] = useState<Array<{
    notification_id: number;
    student_id: number;
    student_name: string;
    belt_rank: string;
    role: string;
    event_id: number;
    event_name: string;
    event_date: string;
    event_type: string;
    requested_at: string;
    already_confirmed: boolean;
    status: 'pending' | 'approved' | 'declined';
    participant_id?: number | null;
  }>>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actionSubmittingId, setActionSubmittingId] = useState<number | null>(null);

  // Search state
  const [search, setSearch] = useState('');

  // Modals state
  const [mounted, setMounted] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [unregistered, setUnregistered] = useState<UnregisteredStudent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [approveSubmittingId, setApproveSubmittingId] = useState<number | null>(null);

  // Advanced management states
  const [cancellingParticipantId, setCancellingParticipantId] = useState<number | null>(null);
  const [cancellationReasonText, setCancellationReasonText] = useState<string>('');
  const [cancellingRequestNotifId, setCancellingRequestNotifId] = useState<number | null>(null);
  const [requestCancelReasonText, setRequestCancelReasonText] = useState<string>('');

  // Requests Tab states
  const [requestsHistoryMode, setRequestsHistoryMode] = useState<boolean>(false);
  const [requestsPage, setRequestsPage] = useState<number>(1);
  const [requestsTotalPages, setRequestsTotalPages] = useState<number>(1);

  // Form states (Event)
  const [formType, setFormType] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    location: 'Main Dojo Hall',
    event_type: 'competition',
    status: 'upcoming'
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  // Registration form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'competitor' | 'spectator' | 'volunteer'>('competitor');
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  // Evaluation form state
  const [evaluatingParticipantId, setEvaluatingParticipantId] = useState<number | null>(null);
  const [evalForm, setEvalForm] = useState({
    role: 'competitor' as 'competitor' | 'spectator' | 'volunteer',
    result_details: '',
    score: 0
  });
  const [evalSubmitting, setEvalSubmitting] = useState(false);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve events.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with the server.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllRequests = async (hMode = requestsHistoryMode, pageNum = requestsPage) => {
    try {
      setRequestsLoading(true);
      const res = await fetch(`/api/admin/event-requests?history=${hMode}&page=${pageNum}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setAllRequests(data.requests || []);
        if (data.pagination) {
          setRequestsTotalPages(data.pagination.pages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load event requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleToggleHistoryMode = (mode: boolean) => {
    setRequestsHistoryMode(mode);
    setRequestsPage(1);
    loadAllRequests(mode, 1);
  };

  const handleRequestsPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > requestsTotalPages) return;
    setRequestsPage(newPage);
    loadAllRequests(requestsHistoryMode, newPage);
  };

  const handleApproveAllRequest = async (req: typeof allRequests[0]) => {
    setActionSubmittingId(req.notification_id);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/event-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: req.notification_id,
          student_id: req.student_id,
          event_id: req.event_id,
          role: req.role,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Request approved.');
        loadAllRequests(requestsHistoryMode, requestsPage);
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to approve request.');
      }
    } catch {
      setErrorMsg('Failed to approve request.');
    } finally {
      setActionSubmittingId(null);
    }
  };

  const handleRejectAllRequest = async (req: typeof allRequests[0]) => {
    if (!confirm(`Decline ${req.student_name}'s request for "${req.event_name}"?`)) return;
    setActionSubmittingId(req.notification_id);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/event-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: req.notification_id,
          student_id: req.student_id,
          event_id: req.event_id,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Request declined. Student has been notified.');
        loadAllRequests(requestsHistoryMode, requestsPage);
      } else {
        setErrorMsg(data.error || 'Failed to decline request.');
      }
    } catch {
      setErrorMsg('Failed to decline request.');
    } finally {
      setActionSubmittingId(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadEvents();
    loadAllRequests(false, 1);
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      description: '',
      event_date: '',
      location: 'Main Dojo Hall',
      event_type: 'competition',
      status: 'upcoming'
    });
    setFormType('add');
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (ex: EventData) => {
    setSelectedEvent(ex);
    setFormData({
      name: ex.name,
      description: ex.description || '',
      event_date: ex.event_date ? ex.event_date.slice(0, 10) : '',
      location: ex.location,
      event_type: ex.event_type,
      status: ex.status
    });
    setFormType('edit');
    setEditModalOpen(true);
  };

  const handleOpenRosterModal = async (ex: EventData) => {
    setSelectedEvent(ex);
    setParticipants([]);
    setUnregistered([]);
    setSelectedStudentId('');
    setSelectedRole('competitor');
    setEvaluatingParticipantId(null);
    setRosterModalOpen(true);
    loadRoster(ex.id);
  };

  const loadRoster = async (eventId: number) => {
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/admin/event-participants?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants || []);
        setUnregistered(data.unregistered || []);
        setPendingRequests(data.pendingRequests || []);
        if (data.unregistered?.length > 0) {
          setSelectedStudentId(String(data.unregistered[0].student_id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleMarkAttendance = async (partId: number, attStatus: 'pending' | 'present' | 'absent') => {
    if (!selectedEvent) return;
    try {
      const res = await fetch('/api/admin/event-participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: partId,
          attendance_status: attStatus,
          role: participants.find(p => p.participant_id === partId)?.role || 'competitor'
        })
      });
      const data = await res.json();
      if (data.success) {
        loadRoster(selectedEvent.id);
      } else {
        setErrorMsg(data.error || 'Failed to mark attendance.');
      }
    } catch {
      setErrorMsg('Failed to update attendance.');
    }
  };

  const handleCancelCandidateRegistration = async (partId: number) => {
    if (!selectedEvent) return;
    try {
      const res = await fetch('/api/admin/event-participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: partId,
          status: 'cancelled',
          cancel_reason: cancellationReasonText,
          role: participants.find(p => p.participant_id === partId)?.role || 'competitor'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCancellingParticipantId(null);
        setCancellationReasonText('');
        loadRoster(selectedEvent.id);
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to cancel registration.');
      }
    } catch {
      setErrorMsg('Failed to process cancellation.');
    }
  };

  const handleRestoreCandidateRegistration = async (partId: number) => {
    if (!selectedEvent) return;
    try {
      const res = await fetch('/api/admin/event-participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: partId,
          status: 'confirmed',
          cancel_reason: '',
          role: participants.find(p => p.participant_id === partId)?.role || 'competitor'
        })
      });
      const data = await res.json();
      if (data.success) {
        loadRoster(selectedEvent.id);
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to restore registration.');
      }
    } catch {
      setErrorMsg('Failed to restore candidate.');
    }
  };

  const handleCancelGlobalRegistration = async (partId: number) => {
    try {
      const res = await fetch('/api/admin/event-participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: partId,
          status: 'cancelled',
          cancel_reason: requestCancelReasonText,
          role: 'competitor'
        })
      });
      const data = await res.json();
      if (data.success) {
        setCancellingRequestNotifId(null);
        setRequestCancelReasonText('');
        loadAllRequests(requestsHistoryMode, requestsPage);
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to cancel registration.');
      }
    } catch {
      setErrorMsg('Failed to process cancellation.');
    }
  };

  const handleApproveRequest = async (req: PendingRequest) => {
    if (!selectedEvent) return;
    setApproveSubmittingId(req.notification_id);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/event-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          student_id: req.student_id,
          role: req.role,
          approve_notification_id: req.notification_id
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Approved. Participant code: ${data.participant_code}`);
        loadRoster(selectedEvent.id);
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to approve request.');
      }
    } catch {
      setErrorMsg('Failed to approve request.');
    } finally {
      setApproveSubmittingId(null);
    }
  };

  const handleRejectRequest = async (req: PendingRequest) => {
    if (!selectedEvent) return;
    // Mark the notification as read to dismiss the request
    setApproveSubmittingId(req.notification_id);
    try {
      await fetch('/api/admin/event-participants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      // Just reload roster to reflect dismissal after a brief wait
      loadRoster(selectedEvent.id);
    } finally {
      setApproveSubmittingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEdit = formType === 'edit';
      const endpoint = '/api/admin/events';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...formData, id: selectedEvent?.id } : formData;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEdit ? 'Event details updated.' : 'Event scheduled successfully.');
        setAddModalOpen(false);
        setEditModalOpen(false);
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to process event.');
      }
    } catch (err) {
      setErrorMsg('Failed to save event.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (ex: EventData) => {
    if (!confirm(`Are you sure you want to cancel and delete the event "${ex.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/events?id=${ex.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Event cancelled and deleted.');
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to cancel event.');
      }
    } catch (err) {
      setErrorMsg('Failed to process event deletion.');
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedStudentId) return;
    setRegisterSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/event-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          student_id: selectedStudentId,
          role: selectedRole
        })
      });
      const data = await res.json();
      if (data.success) {
        loadRoster(selectedEvent.id);
        loadEvents(); // Sync participant counts on cards
      } else {
        setErrorMsg(data.error || 'Failed to register student.');
      }
    } catch (err) {
      setErrorMsg('Failed to register student.');
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const handleOpenEvaluate = (part: Participant) => {
    setEvaluatingParticipantId(part.participant_id);
    setEvalForm({
      role: part.role,
      result_details: part.result_details || '',
      score: part.score || 0
    });
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !evaluatingParticipantId) return;
    setEvalSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/event-participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: evaluatingParticipantId,
          ...evalForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setEvaluatingParticipantId(null);
        loadRoster(selectedEvent.id);
      } else {
        setErrorMsg(data.error || 'Failed to save achievements.');
      }
    } catch (err) {
      setErrorMsg('Failed to save record.');
    } finally {
      setEvalSubmitting(false);
    }
  };

  const handleCancelRegistration = async (partId: number) => {
    if (!selectedEvent) return;
    try {
      const res = await fetch(`/api/admin/event-participants?participantId=${partId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadRoster(selectedEvent.id);
        loadEvents();
      } else {
        setErrorMsg(data.error || 'Failed to cancel registration.');
      }
    } catch (err) {
      setErrorMsg('Failed to cancel registration.');
    }
  };

  const filteredEvents = events.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.location.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ongoing':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'cancelled':
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'competition':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'seminar':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'social':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-100';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'competitor':
        return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'spectator':
        return 'text-slate-500 bg-slate-50 border-slate-150';
      case 'volunteer':
      default:
        return 'text-sky-600 bg-sky-50 border-sky-100';
    }
  };

  const pendingCount = allRequests.filter(r => !r.already_confirmed).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaTrophy className="text-rose-600" /> Events & Tournaments
          </h2>
          <p className="text-xs text-slate-500 mt-1">Schedule competitions, seminars, and social gatherings, register participants, and post achievements</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'events' && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <FaPlus /> Create Event
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
            activeTab === 'events' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          All Events
        </button>
        <button
          onClick={() => { setActiveTab('requests'); handleToggleHistoryMode(false); }}
          className={`relative px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
            activeTab === 'requests' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Enrollment Requests
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <FaCheckCircle /> {successMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FaSearch size={12} />
          </span>
          <input
            type="text"
            placeholder="Search by event name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>
      </div>

      {/* ─── Enrollment Requests Tab ─── */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Sub-tabs Toggle for History vs Pending */}
          <div className="flex gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => handleToggleHistoryMode(false)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                !requestsHistoryMode
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-350'
              }`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => handleToggleHistoryMode(true)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                requestsHistoryMode
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-350'
              }`}
            >
              Request History
            </button>
          </div>

          {requestsLoading ? (
            <div className="p-16 flex flex-col items-center gap-3 text-slate-400">
              <FaSpinner className="animate-spin text-xl" />
              <span className="text-xs font-semibold">Loading enrollment requests...</span>
            </div>
          ) : allRequests.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)]">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>Student</span>
                  <span>Event</span>
                  <span>Role</span>
                  <span>Requested</span>
                  <span>Type</span>
                  <span>{requestsHistoryMode ? 'Status' : 'Actions'}</span>
                </div>
                <div className="divide-y divide-slate-100/80">
                  {allRequests.map((req, i) => {
                    const typeColors: Record<string, string> = {
                      competition: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      seminar: 'bg-purple-50 text-purple-700 border-purple-200',
                      social: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    };
                    const roleColors: Record<string, string> = {
                      competitor: 'bg-purple-50 text-purple-700 border-purple-200',
                      volunteer: 'bg-sky-50 text-sky-700 border-sky-100',
                    };
                    const reqDate = new Date(req.requested_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    });
                    const evDate = new Date(req.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric'
                    });

                    return (
                      <React.Fragment key={req.notification_id}>
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Student */}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-800">{req.student_name}</p>
                              {req.status === 'approved' && req.participant_id && (
                                <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono">
                                  EVT-{String(req.participant_id).padStart(6, '0')}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{req.belt_rank}</p>
                          </div>

                        {/* Event */}
                        <div>
                          <p className="text-xs font-semibold text-slate-700 leading-tight">{req.event_name}</p>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{evDate}</p>
                        </div>

                        {/* Role */}
                        <div>
                          <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${roleColors[req.role] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {req.role}
                          </span>
                        </div>

                        {/* Requested date */}
                        <p className="text-[10px] text-slate-500 font-medium">{reqDate}</p>

                        {/* Event type */}
                        <div>
                          <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${typeColors[req.event_type] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {req.event_type}
                          </span>
                        </div>

                        {/* Action / Status */}
                        <div>
                          {requestsHistoryMode ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                                req.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-705 border-rose-200'
                              }`}>
                                {req.status}
                              </span>
                              {req.status === 'approved' && req.already_confirmed && req.participant_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancellingRequestNotifId(req.notification_id);
                                    setRequestCancelReasonText('');
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-250 rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApproveAllRequest(req)}
                                disabled={actionSubmittingId !== null}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm"
                              >
                                {actionSubmittingId === req.notification_id
                                  ? <FaSpinner className="animate-spin" size={8} />
                                  : <FaCheckCircle size={8} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectAllRequest(req)}
                                disabled={actionSubmittingId !== null}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                              >
                                {actionSubmittingId === req.notification_id
                                  ? <FaSpinner className="animate-spin" size={8} />
                                  : <FaUserMinus size={8} />}
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                      {cancellingRequestNotifId === req.notification_id && req.participant_id && (
                        <div className="px-5 pb-4 pt-1.5 bg-rose-50/40 border-b border-rose-100 flex items-center justify-between gap-4 text-[10px]">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[9px] font-black text-rose-700 uppercase whitespace-nowrap">Reason to Cancel:</span>
                            <input
                              type="text"
                              placeholder="e.g. Schedule conflict, student requested..."
                              value={requestCancelReasonText}
                              onChange={(e) => setRequestCancelReasonText(e.target.value)}
                              className="w-full max-w-md px-2.5 py-1 bg-white border border-rose-200 rounded-lg focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCancellingRequestNotifId(null)}
                              className="px-2.5 py-1 bg-white border border-rose-200 text-rose-700 rounded-lg text-[9px] font-bold"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelGlobalRegistration(req.participant_id!)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold"
                            >
                              Confirm Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                </div>
              </div>

              {/* Pagination Controls */}
              {requestsTotalPages > 1 && (
                <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-sm text-xs font-semibold text-slate-500">
                  <button
                    onClick={() => handleRequestsPageChange(requestsPage - 1)}
                    disabled={requestsPage === 1}
                    className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Previous
                  </button>
                  <span>Page {requestsPage} of {requestsTotalPages}</span>
                  <button
                    onClick={() => handleRequestsPageChange(requestsPage + 1)}
                    disabled={requestsPage === requestsTotalPages}
                    className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
              <FaCheckCircle className="mx-auto text-2xl text-emerald-400 mb-3" />
              <p className="text-xs font-bold text-slate-500">
                {requestsHistoryMode ? 'No request history logged.' : 'All caught up — no pending enrollment requests.'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {requestsHistoryMode ? 'History of approved and declined requests will appear here.' : 'Student requests will appear here awaiting your approval.'}
              </p>
            </div>
          )
        }
        </div>
      )}

      {/* ─── Events Tab ─── */}
      {activeTab === 'events' && (loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-lg" />
          <span className="text-xs font-semibold">Loading events...</span>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((ex) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Header & badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getTypeBadge(ex.event_type)}`}>
                    {ex.event_type}
                  </span>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getStatusBadge(ex.status)}`}>
                    {ex.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-800 leading-tight">
                    {ex.name}
                  </h3>
                  <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">
                    {ex.description || 'No description provided.'}
                  </p>
                </div>

                {/* Location & Date */}
                <div className="flex items-center gap-4 text-[10px] text-slate-650 bg-slate-50 border border-slate-100/50 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <FaCalendarAlt className="text-rose-500" />
                    <span>{ex.event_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FaMapMarkerAlt className="text-rose-500" />
                    <span>{ex.location}</span>
                  </div>
                </div>

                {/* Registration Count */}
                <div className="flex items-center gap-2 text-[10px] text-slate-650">
                  <FaUsers className="text-slate-400" />
                  <span>Participants: <span className="font-bold text-slate-700">{ex.participant_count}</span></span>
                </div>
              </div>

              {/* Card Footer Controls */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenRosterModal(ex)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <FaUsers className="text-slate-400" /> Roster & Placements
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(ex)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit Event"
                  >
                    <FaEdit size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(ex)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Event"
                  >
                    <FaTrash size={11} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-12 bg-white rounded-xl border border-slate-100 text-center">
          <p className="text-xs font-semibold text-slate-450">No dojo events scheduled.</p>
        </div>
      ))}

      {/* Add / Edit Event Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(addModalOpen || editModalOpen) && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    {formType === 'add' ? 'Schedule New Event' : 'Modify Event Details'}
                  </h3>
                  <button
                    onClick={() => {
                      setAddModalOpen(false);
                      setEditModalOpen(false);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. Annual Kumite Tournament"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Summary details..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Location / Arena
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Event Type & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Event Type
                      </label>
                      <select
                        value={formData.event_type}
                        onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white transition-all"
                      >
                        <option value="competition">Competition</option>
                        <option value="seminar">Seminar</option>
                        <option value="social">Social</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Dojo Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white transition-all"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Panel */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAddModalOpen(false);
                        setEditModalOpen(false);
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                    >
                      Save Event
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Roster & Placements Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {rosterModalOpen && selectedEvent && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[550px]"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Event Roster & Placements</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedEvent.name} ({selectedEvent.location})</p>
                  </div>
                  <button
                    onClick={() => setRosterModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left Column: Register Student Form & Participant List */}
                  <div className="md:col-span-2 space-y-6">
                    
                    {/* Register student form */}
                    {unregistered.length > 0 ? (
                      <form onSubmit={handleRegisterStudent} className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4 text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FaUserPlus /> Register Dojo Candidate
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Student</label>
                            <select
                              value={selectedStudentId}
                              onChange={(e) => setSelectedStudentId(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            >
                              {unregistered.map(student => (
                                <option key={student.student_id} value={student.student_id}>
                                  {student.first_name} {student.last_name} ({student.belt_rank})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Assigned Role</label>
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            >
                              <option value="competitor">Competitor</option>
                              <option value="volunteer">Volunteer</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={registerSubmitting}
                            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                          >
                            {registerSubmitting ? <FaSpinner className="animate-spin" size={8} /> : null} Register Candidate
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-450 italic bg-slate-50 p-3 rounded-lg text-center">
                        All active students are registered.
                      </p>
                    )}

                    {/* Pending Requests Section */}
                    {pendingRequests.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                          <FaCheck size={9} /> Pending Enrollment Requests ({pendingRequests.length})
                        </p>
                        <div className="space-y-2">
                          {pendingRequests.map((req) => (
                            <div
                              key={req.notification_id}
                              className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl"
                            >
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-slate-700">{req.student_name}</p>
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                                  <span>{req.belt_rank}</span>
                                  <span>&bull;</span>
                                  <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${getRoleBadgeColor(req.role)}`}>
                                    {req.role}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleApproveRequest(req)}
                                  disabled={approveSubmittingId !== null}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                >
                                  {approveSubmittingId === req.notification_id
                                    ? <FaSpinner className="animate-spin" size={8} />
                                    : <FaCheck size={8} />}
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(req)}
                                  disabled={approveSubmittingId !== null}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Dismiss Request"
                                >
                                  <FaTimes size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Participant roster list */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                        <FaUsers /> Confirmed Roster ({participants.filter(p => p.status !== 'cancelled').length})
                      </p>
                      {rosterLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <FaSpinner className="animate-spin text-xs" />
                          <span className="text-[9px] font-semibold">Loading roster...</span>
                        </div>
                      ) : participants.filter(p => p.status !== 'cancelled').length > 0 ? (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {participants.filter(p => p.status !== 'cancelled').map((item) => (
                            <div 
                              key={item.student_id} 
                              className="p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="text-left space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-slate-700">
                                      {item.first_name} {item.last_name}
                                    </p>
                                    <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono shadow-sm">
                                      EVT-{String(item.participant_id).padStart(6, '0')}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                                    <span>{item.belt_rank}</span>
                                    <span>&bull;</span>
                                    <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${getRoleBadgeColor(item.role)}`}>
                                      {item.role}
                                    </span>
                                    {item.score !== null && item.score > 0 && (
                                      <>
                                        <span>&bull;</span>
                                        <span>Score: {item.score}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEvaluate(item)}
                                    className={`px-2 py-1 rounded-lg border text-[9px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 ${
                                      item.result_details
                                        ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    {item.result_details ? <FaTrophy size={8} /> : <FaSlidersH size={8} />}
                                    {item.result_details ? 'Evaluated' : 'Evaluate'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCancellingParticipantId(item.participant_id);
                                      setCancellationReasonText('');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                    title="Cancel Registration"
                                  >
                                    <FaUserMinus size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Attendance capsules and cancellation input */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-50 pt-2 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Attendance:</span>
                                  <div className="flex gap-0.5">
                                    {(['pending', 'present', 'absent'] as const).map(statusOpt => {
                                      const isActive = item.attendance_status === statusOpt;
                                      const colors: Record<string, string> = {
                                        pending: isActive ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50',
                                        present: isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600',
                                        absent: isActive ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-600',
                                      };
                                      return (
                                        <button
                                          key={statusOpt}
                                          type="button"
                                          onClick={() => handleMarkAttendance(item.participant_id, statusOpt)}
                                          className={`px-2 py-0.5 border rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${colors[statusOpt]}`}
                                        >
                                          {statusOpt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {cancellingParticipantId === item.participant_id && (
                                <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded-lg space-y-2 text-left">
                                  <label className="block text-[8px] font-bold text-rose-700 uppercase">Cancellation Reason</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Injury, conflict of schedule..."
                                    value={cancellationReasonText}
                                    onChange={(e) => setCancellationReasonText(e.target.value)}
                                    className="w-full px-2 py-1 bg-white border border-rose-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setCancellingParticipantId(null)}
                                      className="px-2 py-1 bg-white border border-rose-200 text-rose-700 rounded text-[9px] font-bold"
                                    >
                                      Back
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelCandidateRegistration(item.participant_id)}
                                      className="px-2 py-1 bg-rose-650 hover:bg-rose-700 text-white rounded text-[9px] font-bold"
                                    >
                                      Confirm Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-xs text-slate-400 italic py-8 border border-dashed border-slate-200 rounded-xl">
                          No active participants yet.
                        </p>
                      )}
                    </div>

                    {/* Cancelled Registrations Registry */}
                    <div className="space-y-4 pt-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 flex items-center gap-1.5 border-b border-rose-100 pb-1">
                        <FaTimesCircle /> Cancelled Registrations ({participants.filter(p => p.status === 'cancelled').length})
                      </p>
                      {participants.filter(p => p.status === 'cancelled').length > 0 ? (
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {participants.filter(p => p.status === 'cancelled').map((item) => (
                            <div
                              key={item.student_id}
                              className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-100 rounded-xl"
                            >
                              <div className="text-left space-y-0.5">
                                <p className="text-xs font-bold text-slate-700">
                                  {item.first_name} {item.last_name}
                                </p>
                                <p className="text-[9px] text-rose-700 font-semibold italic">
                                  Reason: {item.cancel_reason || 'No reason specified.'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRestoreCandidateRegistration(item.participant_id)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-xs text-slate-400 italic py-6 border border-dashed border-slate-200 rounded-xl">
                          No cancelled candidates registry.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Active Evaluation Form */}
                  <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl h-fit">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-4">
                      <FaFileAlt /> Post Achievements
                    </p>
                    
                    {evaluatingParticipantId ? (
                      <form onSubmit={handleSaveResult} className="space-y-4 text-left">
                        {/* Event role selection */}
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Dojo Role</label>
                          <select
                            value={evalForm.role}
                            onChange={(e) => setEvalForm({ ...evalForm, role: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                          >
                            <option value="competitor">Competitor</option>
                            <option value="volunteer">Volunteer</option>
                          </select>
                        </div>

                        {/* Result Placement */}
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Result / Placement</label>
                          <input
                            type="text"
                            placeholder="e.g. Gold Medal, 1st Place"
                            value={evalForm.result_details}
                            onChange={(e) => setEvalForm({ ...evalForm, result_details: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        {/* Score (0-100) */}
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Evaluation Score (0-100)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={evalForm.score}
                            onChange={(e) => setEvalForm({ ...evalForm, score: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEvaluatingParticipantId(null)}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={evalSubmitting}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5"
                          >
                            {evalSubmitting ? <FaSpinner className="animate-spin" size={8} /> : null} Save Result
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic text-center py-12">
                        Select "Evaluate" next to a registered participant to update their dojo role and log scores/placements.
                      </p>
                    )}
                  </div>

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
