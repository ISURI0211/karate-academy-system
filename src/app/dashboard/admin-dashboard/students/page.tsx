'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  FaUserGraduate, FaSearch, FaFilter, FaPlus, FaEdit, 
  FaTrash, FaHistory, FaTimes, FaEnvelope, FaPhone, 
  FaIdCard, FaSpinner, FaChevronDown, FaCheckCircle, FaUserShield, FaChartLine
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// Color Palette for Belt Ranks
const BELT_COLORS: Record<string, string> = {
  White: 'bg-slate-100 text-slate-700 border-slate-200',
  Yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Orange: 'bg-orange-50 text-orange-700 border-orange-200',
  Green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Blue: 'bg-blue-50 text-blue-700 border-blue-200',
  Purple: 'bg-purple-50 text-purple-700 border-purple-200',
  'Brown (3rd Kyu)': 'bg-amber-100 text-amber-800 border-amber-300',
  'Brown (2nd Kyu)': 'bg-amber-200 text-amber-900 border-amber-400',
  'Brown (1st Kyu)': 'bg-amber-300 text-amber-950 border-amber-500',
  'Black (1st Dan)': 'bg-slate-900 text-slate-50 border-slate-950',
  'Black (2nd Dan)': 'bg-slate-950 text-slate-100 border-slate-950',
  'Black (3rd Dan)': 'bg-black text-white border-black'
};

const BELT_OPTIONS = [
  'White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple',
  'Brown (3rd Kyu)', 'Brown (2nd Kyu)', 'Brown (1st Kyu)',
  'Black (1st Dan)', 'Black (2nd Dan)', 'Black (3rd Dan)'
];

interface Student {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  address: string;
  belt_rank: string;
  enrollment_status: 'active' | 'suspended' | 'graduated' | 'inactive';
  joining_date: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  username: string;
  email: string;
  user_status: 'active' | 'inactive';
}

interface HistoryItem {
  id: number;
  action_type: string;
  details: string;
  action_date: string;
}

export default function AdminStudentsPage() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedBelt, setSelectedBelt] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [formType, setFormType] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    dob: '',
    address: '',
    belt_rank: 'White',
    enrollment_status: 'active',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  const [mounted, setMounted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load students
  const loadStudents = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve students.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadStudents();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      dob: '',
      address: '',
      belt_rank: 'White',
      enrollment_status: 'active',
      emergency_contact_name: '',
      emergency_contact_phone: ''
    });
    setFormType('add');
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      username: student.username,
      email: student.email,
      password: '', // blank password unless we update user reset
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone || '',
      dob: student.dob ? student.dob.slice(0, 10) : '',
      address: student.address || '',
      belt_rank: student.belt_rank,
      enrollment_status: student.enrollment_status,
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_phone: student.emergency_contact_phone || ''
    });
    setFormType('edit');
    setEditModalOpen(true);
  };

  const handleOpenHistoryModal = async (student: Student) => {
    setSelectedStudent(student);
    setHistoryList([]);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/student-history?studentId=${student.id}`);
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit Student registration or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEdit = formType === 'edit';
      const endpoint = '/api/admin/students';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit 
        ? { ...formData, id: selectedStudent?.id, user_id: selectedStudent?.user_id } 
        : formData;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEdit ? 'Student updated successfully.' : 'Student registered successfully.');
        setAddModalOpen(false);
        setEditModalOpen(false);
        loadStudents();
      } else {
        setErrorMsg(data.error || 'Failed to process request.');
      }
    } catch (err) {
      setErrorMsg('Server error. Failed to save student profile.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete student
  const handleDelete = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete student ${student.first_name} ${student.last_name}? This will permanently remove their records, histories, grades, and connection logs.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/students?id=${student.id}&user_id=${student.user_id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Student profile deleted.');
        loadStudents();
      } else {
        setErrorMsg(data.error || 'Failed to delete student.');
      }
    } catch (err) {
      setErrorMsg('Failed to process deletion.');
    }
  };

  // Search filter implementation
  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || 
                          student.username.toLowerCase().includes(search.toLowerCase()) ||
                          student.email.toLowerCase().includes(search.toLowerCase());
    const matchesBelt = selectedBelt === 'All' || student.belt_rank === selectedBelt;
    const matchesStatus = selectedStatus === 'All' || student.enrollment_status === selectedStatus;

    return matchesSearch && matchesBelt && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'suspended':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'graduated':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'inactive':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaUserGraduate className="text-red-600" /> Student Registry
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage enrollments, belt progressions, emergency logs, and training histories</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <FaPlus /> Add Student
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
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FaSearch size={12} />
          </span>
          <input
            type="text"
            placeholder="Search by student name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Belt Filter */}
          <div className="relative flex-1 md:flex-initial">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <FaFilter size={10} />
            </span>
            <select
              value={selectedBelt}
              onChange={(e) => setSelectedBelt(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-650 appearance-none focus:outline-none focus:bg-white transition-all"
            >
              <option value="All">All Belts</option>
              {BELT_OPTIONS.map(belt => (
                <option key={belt} value={belt}>{belt}</option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <FaChevronDown size={8} />
            </span>
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 md:flex-initial">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <FaFilter size={10} />
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-650 appearance-none focus:outline-none focus:bg-white transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <FaChevronDown size={8} />
            </span>
          </div>
        </div>
      </div>

      {/* Student List Content */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <FaSpinner className="animate-spin text-lg" />
            <span className="text-xs font-semibold">Loading student directory...</span>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Belt Rank</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Joining Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                    {/* Name / User Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs flex-shrink-0">
                          {student.first_name.slice(0, 1)}{student.last_name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">
                            {student.first_name} {student.last_name}
                          </p>
                          <span className="text-[10px] font-medium text-slate-400">
                            @{student.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Belt rank with badges */}
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${BELT_COLORS[student.belt_rank] || 'bg-slate-100 border-slate-200'}`}>
                        {student.belt_rank}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusStyle(student.enrollment_status)}`}>
                        {student.enrollment_status}
                      </span>
                    </td>

                    {/* Contact columns */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-650">
                        <FaEnvelope className="text-slate-400 flex-shrink-0" size={10} />
                        <span className="truncate max-w-[150px]">{student.email}</span>
                      </div>
                      {student.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-650">
                          <FaPhone className="text-slate-400 flex-shrink-0" size={10} />
                          <span>{student.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Joining Date */}
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {student.joining_date ? student.joining_date.slice(0, 10) : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/admin-dashboard/students/progress?studentId=${student.id}`}
                          title="Smart Progress Tracking"
                          className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-[10px]"
                        >
                          <FaChartLine size={12} />
                          <span className="hidden xl:inline">Progress</span>
                        </Link>
                        <button
                          onClick={() => handleOpenHistoryModal(student)}
                          title="Training History Log"
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <FaHistory size={11} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          title="Edit Profile"
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <FaEdit size={11} />
                        </button>
                        <button
                          onClick={() => handleDelete(student)}
                          title="Delete Student"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <FaTrash size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-xs font-semibold text-slate-450">No students found matching current filters.</p>
            <p className="text-[10px] text-slate-350 mt-1">Try modifying your search text or filter selections above.</p>
          </div>
        )}
      </div>

      {/* History Log Timeline Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {historyModalOpen && selectedStudent && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[500px]"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Training History Log</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                  </div>
                  <button
                    onClick={() => setHistoryModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {historyLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FaSpinner className="animate-spin text-base" />
                      <span className="text-[10px] font-semibold">Retrieving database log...</span>
                    </div>
                  ) : historyList.length > 0 ? (
                    <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-6 py-2">
                      {historyList.map((log) => (
                        <div key={log.id} className="relative">
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white ring-2 ring-slate-100" />
                          <div className="space-y-0.5 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wide bg-slate-150 px-2 py-0.5 rounded">
                                {log.action_type}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold">{log.action_date}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-normal pt-1">
                              {log.details}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400 italic py-8">No training history logs found.</p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Add / Edit Student Profile Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {(addModalOpen || editModalOpen) && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] overflow-y-auto transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col my-8"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    {formType === 'add' ? 'Add New Student Profile' : 'Edit Student Profile'}
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

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                  
                  {/* section: account details */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-50 pb-1">
                      <FaUserShield /> Account Credentials
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Username */}
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
                          placeholder="e.g. bruce_li"
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all disabled:opacity-60"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          placeholder="e.g. student@karate.com"
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
                  </div>

                  {/* section: profile details */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-50 pb-1">
                      <FaIdCard /> Personal Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* First Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                        />
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* DOB */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                        />
                      </div>

                      {/* Phone */}
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
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Residential Address
                      </label>
                      <input
                        type="text"
                        placeholder="Street, City, Postal Code"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Belt Rank */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Belt Rank
                        </label>
                        <select
                          value={formData.belt_rank}
                          onChange={(e) => setFormData({ ...formData, belt_rank: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                        >
                          {BELT_OPTIONS.map(belt => (
                            <option key={belt} value={belt}>{belt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Enrollment Status */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Enrollment Status
                        </label>
                        <select
                          value={formData.enrollment_status}
                          onChange={(e) => setFormData({ ...formData, enrollment_status: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="graduated">Graduated</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* section: safety contacts */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-50 pb-1">
                      <FaPhone /> Emergency Contact Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contact Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Guardian/Contact Name
                        </label>
                        <input
                          type="text"
                          placeholder="Full name of relation"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                        />
                      </div>

                      {/* Contact Phone */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Emergency Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="Primary safety phone"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-350 transition-all"
                        />
                      </div>
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
                      disabled={formSubmitting}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-65 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                    >
                      {formSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin" size={10} /> Saving...
                        </>
                      ) : (
                        'Save Student'
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
    </div>
  );
}
