'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaCalendarAlt, FaSearch, FaPlus, FaEdit, FaTrash, 
  FaUsers, FaTimes, FaMapMarkerAlt, FaClock, FaSpinner, 
  FaCheckCircle, FaUserTie, FaUserPlus, FaUserMinus, FaShieldAlt
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface ClassData {
  id: number;
  name: string;
  description: string;
  class_date: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  instructor_id: number;
  instructor_name: string;
  enrolled_count: number;
}

interface Instructor {
  id: number;
  first_name: string;
  last_name: string;
}

interface EnrolledStudent {
  enrollment_id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
}

interface UnenrolledStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
}

export default function AdminClassesPage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassData[]>([]);
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
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [unenrolledStudents, setUnenrolledStudents] = useState<UnenrolledStudent[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState<string>('');

  // Form states
  const [formType, setFormType] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    class_date: '',
    start_time: '16:00',
    end_time: '17:30',
    location: 'Dojo A',
    capacity: 20,
    instructor_id: ''
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/classes');
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve classes.');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadInstructors = async () => {
    try {
      const res = await fetch('/api/admin/instructors');
      const data = await res.json();
      if (data.success) {
        setInstructors(data.instructors || []);
        if (data.instructors?.length > 0) {
          setFormData(prev => ({ ...prev, instructor_id: String(data.instructors[0].id) }));
        }
      }
    } catch (err) {
      console.error('Failed to load instructors', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadClasses();
    loadInstructors();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      description: '',
      class_date: '',
      start_time: '16:00',
      end_time: '17:30',
      location: 'Dojo A',
      capacity: 20,
      instructor_id: instructors.length > 0 ? String(instructors[0].id) : ''
    });
    setFormType('add');
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (cls: ClassData) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description || '',
      class_date: cls.class_date ? cls.class_date.slice(0, 10) : '',
      start_time: cls.start_time,
      end_time: cls.end_time,
      location: cls.location,
      capacity: cls.capacity,
      instructor_id: String(cls.instructor_id)
    });
    setFormType('edit');
    setEditModalOpen(true);
  };

  const handleOpenEnrollModal = async (cls: ClassData) => {
    setSelectedClass(cls);
    setEnrolledStudents([]);
    setUnenrolledStudents([]);
    setSelectedStudentToEnroll('');
    setEnrollModalOpen(true);
    loadEnrollments(cls.id);
  };

  const loadEnrollments = async (classId: number) => {
    setEnrollLoading(true);
    try {
      const res = await fetch(`/api/admin/enrollments?classId=${classId}`);
      const data = await res.json();
      if (data.success) {
        setEnrolledStudents(data.enrolled || []);
        setUnenrolledStudents(data.unenrolled || []);
        if (data.unenrolled?.length > 0) {
          setSelectedStudentToEnroll(String(data.unenrolled[0].student_id));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEdit = formType === 'edit';
      const endpoint = '/api/admin/classes';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit 
        ? { ...formData, id: selectedClass?.id } 
        : formData;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEdit ? 'Class updated successfully.' : 'Class scheduled successfully.');
        setAddModalOpen(false);
        setEditModalOpen(false);
        loadClasses();
      } else {
        setErrorMsg(data.error || 'Failed to process request.');
      }
    } catch (err) {
      setErrorMsg('Failed to save class.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (cls: ClassData) => {
    if (!confirm(`Are you sure you want to cancel and delete class "${cls.name}"? This will cancel all student enrollments associated with this class.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/classes?id=${cls.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Class deleted successfully.');
        loadClasses();
      } else {
        setErrorMsg(data.error || 'Failed to delete class.');
      }
    } catch (err) {
      setErrorMsg('Failed to process class deletion.');
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedStudentToEnroll) return;
    setEnrollSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass.id,
          student_id: selectedStudentToEnroll
        })
      });
      const data = await res.json();
      if (data.success) {
        loadEnrollments(selectedClass.id);
        loadClasses(); // Refresh counts on card grid
      } else {
        setErrorMsg(data.error || 'Failed to enroll student.');
      }
    } catch (err) {
      setErrorMsg('Failed to enroll student.');
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleCancelEnrollment = async (enrollmentId: number) => {
    if (!selectedClass) return;
    try {
      const res = await fetch(`/api/admin/enrollments?enrollmentId=${enrollmentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadEnrollments(selectedClass.id);
        loadClasses();
      } else {
        setErrorMsg(data.error || 'Failed to cancel enrollment.');
      }
    } catch (err) {
      setErrorMsg('Failed to cancel enrollment.');
    }
  };

  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(search.toLowerCase()) ||
    cls.location.toLowerCase().includes(search.toLowerCase()) ||
    cls.instructor_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaCalendarAlt className="text-sky-600" /> Class Scheduling
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage scheduled academy sessions, locations, capacities, and student enrollments</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <FaPlus /> Schedule Class
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
            placeholder="Search by class name, location, or instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-lg" />
          <span className="text-xs font-semibold">Loading classes...</span>
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const fillPercentage = Math.min((cls.enrolled_count / cls.capacity) * 100, 100);
            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="space-y-4">
                  {/* Title & Location */}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                      {cls.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-450 mt-1.5">
                      <FaMapMarkerAlt /> <span>{cls.location}</span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-4 text-[10px] text-slate-600 bg-slate-50 border border-slate-100/50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <FaCalendarAlt className="text-sky-500" />
                      <span>{cls.class_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaClock className="text-sky-500" />
                      <span>{cls.start_time} - {cls.end_time}</span>
                    </div>
                  </div>

                  {/* Instructor */}
                  <div className="flex items-center gap-2 text-[10px] text-slate-650">
                    <FaUserTie className="text-slate-400" />
                    <span>Instructor: <span className="font-bold text-slate-700">{cls.instructor_name}</span></span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span>Enrollment</span>
                      <span className="text-slate-700">{cls.enrolled_count} / {cls.capacity}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-350 ${
                          fillPercentage >= 90 
                            ? 'bg-rose-505' 
                            : fillPercentage >= 75 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEnrollModal(cls)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <FaUsers className="text-slate-400" /> Enrollments
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(cls)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Edit Class"
                    >
                      <FaEdit size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(cls)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete/Cancel Class"
                    >
                      <FaTrash size={11} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 bg-white rounded-xl border border-slate-100 text-center">
          <p className="text-xs font-semibold text-slate-450">No scheduled classes found.</p>
        </div>
      )}

      {/* Add / Edit Class Modal */}
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
                    {formType === 'add' ? 'Schedule New Class' : 'Modify Class Details'}
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
                      Class Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. Beginners Kata & Stances"
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
                      placeholder="Summary of class techniques..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Class Date
                    </label>
                    <input
                      type="date"
                      value={formData.class_date}
                      onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Times */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Location & Capacity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Location / Dojo Room
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required
                        placeholder="e.g. Dojo A"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Max Capacity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                        required
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Instructor selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Assigned Sensei
                    </label>
                    <select
                      value={formData.instructor_id}
                      onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white transition-all"
                    >
                      {instructors.map(i => (
                        <option key={i.id} value={i.id}>Sensei {i.first_name} {i.last_name}</option>
                      ))}
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
                        'Save Class'
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

      {/* Enrollments Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {enrollModalOpen && selectedClass && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[4px] transition-all">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[550px]"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Class Enrollment Manager</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedClass.name} ({selectedClass.location})</p>
                  </div>
                  <button
                    onClick={() => setEnrollModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  
                  {/* Enroll new student form */}
                  {selectedClass.enrolled_count < selectedClass.capacity ? (
                    unenrolledStudents.length > 0 ? (
                      <form onSubmit={handleEnrollStudent} className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FaUserPlus /> Enroll Dojo Student
                        </p>
                        <div className="flex gap-3">
                          <select
                            value={selectedStudentToEnroll}
                            onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          >
                            {unenrolledStudents.map(student => (
                              <option key={student.student_id} value={student.student_id}>
                                {student.first_name} {student.last_name} ({student.belt_rank})
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={enrollSubmitting}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                          >
                            {enrollSubmitting ? <FaSpinner className="animate-spin" size={8} /> : <FaPlus size={8} />} Enroll
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-450 italic bg-slate-50 p-3 rounded-lg text-center">
                        All active students are currently enrolled in this class.
                      </p>
                    )
                  ) : (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-700 font-semibold flex items-center gap-2">
                      <FaShieldAlt className="flex-shrink-0" />
                      Class has reached maximum capacity ({selectedClass.capacity}). Enrollment locked.
                    </div>
                  )}

                  {/* List of enrolled students */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FaUsers /> Enrolled Students ({enrolledStudents.length})
                    </p>
                    {enrollLoading ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <FaSpinner className="animate-spin text-xs" />
                        <span className="text-[9px] font-semibold">Loading enrollments...</span>
                      </div>
                    ) : enrolledStudents.length > 0 ? (
                      <div className="space-y-2">
                        {enrolledStudents.map((item) => (
                          <div 
                            key={item.student_id} 
                            className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-700">
                                {item.first_name} {item.last_name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                Belt: {item.belt_rank}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCancelEnrollment(item.enrollment_id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Cancel Enrollment"
                            >
                              <FaUserMinus size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-400 italic py-8 border border-dashed border-slate-200 rounded-xl">
                        No students enrolled in this class yet.
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
