'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaChalkboardTeacher, FaSearch, FaPlus, FaEdit, FaTrash, 
  FaCalendarAlt, FaTimes, FaEnvelope, FaPhone, FaAward, 
  FaSpinner, FaCheckCircle, FaUserShield, FaClock
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface Instructor {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  qualifications: string;
  joining_date: string;
  username: string;
  email: string;
  user_status: 'active' | 'inactive';
}

interface ScheduleItem {
  id: number;
  instructor_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminInstructorsPage() {
  const { data: session } = useSession();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search state
  const [search, setSearch] = useState('');

  // Modals state
  const [mounted, setMounted] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Form states
  const [formType, setFormType] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    qualifications: '',
    user_status: 'active'
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  // Schedule entry state
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 'Monday',
    start_time: '16:00',
    end_time: '18:00'
  });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/instructors');
      const data = await res.json();
      if (data.success) {
        setInstructors(data.instructors || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve instructors.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadInstructors();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      qualifications: '',
      user_status: 'active'
    });
    setFormType('add');
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (inst: Instructor) => {
    setSelectedInstructor(inst);
    setFormData({
      username: inst.username,
      email: inst.email,
      password: '',
      first_name: inst.first_name,
      last_name: inst.last_name,
      phone: inst.phone || '',
      qualifications: inst.qualifications || '',
      user_status: inst.user_status
    });
    setFormType('edit');
    setEditModalOpen(true);
  };

  const handleOpenScheduleModal = async (inst: Instructor) => {
    setSelectedInstructor(inst);
    setSchedules([]);
    setScheduleModalOpen(true);
    loadSchedules(inst.id);
  };

  const loadSchedules = async (instId: number) => {
    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/admin/instructor-schedules?instructorId=${instId}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEdit = formType === 'edit';
      const endpoint = '/api/admin/instructors';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit 
        ? { ...formData, id: selectedInstructor?.id, user_id: selectedInstructor?.user_id } 
        : formData;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEdit ? 'Instructor profile updated.' : 'Instructor added successfully.');
        setAddModalOpen(false);
        setEditModalOpen(false);
        loadInstructors();
      } else {
        setErrorMsg(data.error || 'Failed to process request.');
      }
    } catch (err) {
      setErrorMsg('Failed to save instructor profile.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (inst: Instructor) => {
    if (!confirm(`Are you sure you want to delete Sensei ${inst.first_name} ${inst.last_name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/instructors?id=${inst.id}&user_id=${inst.user_id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Instructor profile removed.');
        loadInstructors();
      } else {
        setErrorMsg(data.error || 'Failed to delete instructor.');
      }
    } catch (err) {
      setErrorMsg('Failed to complete deletion request.');
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstructor) return;
    setScheduleSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/instructor-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSchedule,
          instructor_id: selectedInstructor.id
        })
      });
      const data = await res.json();
      if (data.success) {
        loadSchedules(selectedInstructor.id);
      } else {
        setErrorMsg(data.error || 'Failed to add schedule.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with schedule service.');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (schedId: number) => {
    if (!selectedInstructor) return;
    try {
      const res = await fetch(`/api/admin/instructor-schedules?id=${schedId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadSchedules(selectedInstructor.id);
      } else {
        setErrorMsg(data.error || 'Failed to remove schedule.');
      }
    } catch (err) {
      setErrorMsg('Failed to remove schedule slot.');
    }
  };

  const filteredInstructors = instructors.filter(inst => {
    const fullName = `${inst.first_name} ${inst.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
           inst.username.toLowerCase().includes(search.toLowerCase()) ||
           inst.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaChalkboardTeacher className="text-amber-600" /> Instructor Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage Sensei records, qualifications, schedules, and active dojo classes</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <FaPlus /> Add Instructor
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
            placeholder="Search by instructor name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>
      </div>

      {/* Instructor Cards Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-lg" />
          <span className="text-xs font-semibold">Loading instructors...</span>
        </div>
      ) : filteredInstructors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstructors.map((inst) => (
            <motion.div
              key={inst.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center font-black text-amber-700 text-sm flex-shrink-0">
                    {inst.first_name.slice(0, 1)}{inst.last_name.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 leading-tight">
                      Sensei {inst.first_name} {inst.last_name}
                    </h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
                      Instructor
                    </span>
                  </div>
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded ml-auto border ${
                    inst.user_status === 'active' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`}>
                    {inst.user_status}
                  </span>
                </div>

                {/* Qualifications */}
                <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-xl min-h-[70px]">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <FaAward /> Qualifications
                  </p>
                  <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3">
                    {inst.qualifications || 'No qualifications specified.'}
                  </p>
                </div>

                {/* Contact points */}
                <div className="space-y-1.5 pt-1 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <FaEnvelope size={10} className="text-slate-400" />
                    <span>{inst.email}</span>
                  </div>
                  {inst.phone && (
                    <div className="flex items-center gap-2">
                      <FaPhone size={10} className="text-slate-400" />
                      <span>{inst.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenScheduleModal(inst)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <FaCalendarAlt className="text-slate-400" /> View Schedule
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(inst)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit Profile"
                  >
                    <FaEdit size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(inst)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Instructor"
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
          <p className="text-xs font-semibold text-slate-450">No instructors found.</p>
        </div>
      )}

      {/* Add / Edit Instructor Modal */}
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
                    {formType === 'add' ? 'Add New Sensei Instructor' : 'Edit Instructor Profile'}
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
                  {/* Credentials (only if adding) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Username
                      </label>
                      <input
                        type="text"
                        disabled={formType === 'edit'}
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                        placeholder="e.g. sensei_doe"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="e.g. name@academy.com"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                      />
                    </div>
                  </div>

                  {formType === 'add' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        placeholder="Temporary portal password"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                      />
                    </div>
                  )}

                  {/* Profile Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="Contact number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                    />
                  </div>

                  {/* Qualifications */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Qualifications & Ranks
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. 5th Dan Black Belt, 12 years teaching experience..."
                      value={formData.qualifications}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all resize-none"
                    />
                  </div>

                  {/* Status selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      System Status
                    </label>
                    <select
                      value={formData.user_status}
                      onChange={(e) => setFormData({ ...formData, user_status: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Submit actions */}
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
                      disabled={formSubmitting}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-65 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                    >
                      {formSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin" size={10} /> Saving...
                        </>
                      ) : (
                        'Save Profile'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Schedule Manager Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {scheduleModalOpen && selectedInstructor && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[550px]"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Weekly Schedule Manager</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sensei {selectedInstructor.first_name} {selectedInstructor.last_name}</p>
                  </div>
                  <button
                    onClick={() => setScheduleModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  
                  {/* Create schedule slot form */}
                  <form onSubmit={handleAddSchedule} className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FaPlus /> Add Schedule Slot
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Day</label>
                        <select
                          value={newSchedule.day_of_week}
                          onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: e.target.value })}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                        >
                          {DAYS_OF_WEEK.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Start Time</label>
                        <input
                          type="time"
                          value={newSchedule.start_time}
                          onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                          required
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">End Time</label>
                        <input
                          type="time"
                          value={newSchedule.end_time}
                          onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                          required
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={scheduleSubmitting}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5"
                      >
                        {scheduleSubmitting ? <FaSpinner className="animate-spin" size={8} /> : <FaPlus size={8} />} Add Slot
                      </button>
                    </div>
                  </form>

                  {/* List of existing schedule slots */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FaClock /> Current Weekly Slots
                    </p>
                    {scheduleLoading ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <FaSpinner className="animate-spin text-xs" />
                        <span className="text-[9px] font-semibold">Loading schedules...</span>
                      </div>
                    ) : schedules.length > 0 ? (
                      <div className="space-y-2">
                        {schedules.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-slate-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                                {item.day_of_week}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {item.start_time} - {item.end_time}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteSchedule(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete Slot"
                            >
                              <FaTrash size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-400 italic py-8 border border-dashed border-slate-200 rounded-xl">
                        No schedule entries assigned to this instructor.
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
