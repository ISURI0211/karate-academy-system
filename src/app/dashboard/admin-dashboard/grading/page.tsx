'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaGraduationCap, FaSearch, FaPlus, FaEdit, FaTrash, 
  FaUsers, FaTimes, FaCalendarAlt, FaSpinner, FaCheckCircle, 
  FaUserTie, FaAward, FaSlidersH, FaFileAlt, FaCheck, FaTimesCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface Exam {
  id: number;
  name: string;
  description: string;
  exam_date: string;
  examiner_id: number;
  examiner_name: string;
  fee: number;
}

interface Instructor {
  id: number;
  first_name: string;
  last_name: string;
}

interface RegisteredStudent {
  registration_id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  current_belt: string;
  target_belt: string;
  eligibility_status: 'eligible' | 'ineligible';
  exam_result: 'pending' | 'pass' | 'fail';
  score: number | null;
  examiner_feedback: string | null;
}

interface UnregisteredStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  current_belt: string;
}

// Belt list in order of progression
const BELT_PROGRESSION = [
  'White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple',
  'Brown (3rd Kyu)', 'Brown (2nd Kyu)', 'Brown (1st Kyu)',
  'Black (1st Dan)', 'Black (2nd Dan)', 'Black (3rd Dan)'
];

const BELT_COLORS: Record<string, string> = {
  White: 'bg-slate-100 text-slate-700 border-slate-200',
  Yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Orange: 'bg-orange-50 text-orange-700 border-orange-200',
  Green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Blue: 'bg-blue-50 text-blue-700 border-blue-200',
  Purple: 'bg-purple-50 text-purple-700 border-purple-200',
  'Brown (3rd Kyu)': 'bg-amber-100 text-amber-800 border-amber-300',
  'Brown (2nd Kyu)': 'bg-amber-200 text-amber-900 border-amber-400',
  'Brown (1st Kyu)': 'bg-amber-300 text-amber-955 border-amber-500',
  'Black (1st Dan)': 'bg-slate-900 text-slate-50 border-slate-950',
  'Black (2nd Dan)': 'bg-slate-950 text-slate-100 border-slate-950',
  'Black (3rd Dan)': 'bg-black text-white border-black'
};

export default function AdminGradingPage() {
  const { data: session } = useSession();
  const [exams, setExams] = useState<Exam[]>([]);
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
  const [rosterModalOpen, setRosterModalOpen] = useState(false);

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [registered, setRegistered] = useState<RegisteredStudent[]>([]);
  const [unregistered, setUnregistered] = useState<UnregisteredStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Form states (Exam)
  const [formType, setFormType] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exam_date: '',
    examiner_id: '',
    fee: 50.00
  });

  // Form states (Registration)
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [targetBelt, setTargetBelt] = useState('Yellow');
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  // Evaluation state
  const [evaluatingRegId, setEvaluatingRegId] = useState<number | null>(null);
  const [evalForm, setEvalForm] = useState({
    exam_result: 'pending',
    score: 80,
    examiner_feedback: ''
  });
  const [evalSubmitting, setEvalSubmitting] = useState(false);

  const loadExams = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/grading-exams');
      const data = await res.json();
      if (data.success) {
        setExams(data.exams || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve exams.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate with database.');
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
          setFormData(prev => ({ ...prev, examiner_id: String(data.instructors[0].id) }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadExams();
    loadInstructors();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      description: '',
      exam_date: '',
      examiner_id: instructors.length > 0 ? String(instructors[0].id) : '',
      fee: 50.00
    });
    setFormType('add');
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (ex: Exam) => {
    setSelectedExam(ex);
    setFormData({
      name: ex.name,
      description: ex.description || '',
      exam_date: ex.exam_date ? ex.exam_date.slice(0, 10) : '',
      examiner_id: String(ex.examiner_id),
      fee: Number(ex.fee)
    });
    setFormType('edit');
    setEditModalOpen(true);
  };

  const handleOpenRosterModal = async (ex: Exam) => {
    setSelectedExam(ex);
    setRegistered([]);
    setUnregistered([]);
    setSelectedStudentId('');
    setEvaluatingRegId(null);
    setRosterModalOpen(true);
    loadRoster(ex.id);
  };

  const loadRoster = async (examId: number) => {
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/admin/grading-registrations?examId=${examId}`);
      const data = await res.json();
      if (data.success) {
        setRegistered(data.registered || []);
        setUnregistered(data.unregistered || []);
        if (data.unregistered?.length > 0) {
          const firstStud = data.unregistered[0];
          setSelectedStudentId(String(firstStud.student_id));
          suggestTargetBelt(firstStud.current_belt);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRosterLoading(false);
    }
  };

  const suggestTargetBelt = (currBelt: string) => {
    const idx = BELT_PROGRESSION.indexOf(currBelt);
    if (idx !== -1 && idx < BELT_PROGRESSION.length - 1) {
      setTargetBelt(BELT_PROGRESSION[idx + 1]);
    } else {
      setTargetBelt('White');
    }
  };

  const handleStudentSelect = (studIdStr: string) => {
    setSelectedStudentId(studIdStr);
    const stud = unregistered.find(u => String(u.student_id) === studIdStr);
    if (stud) {
      suggestTargetBelt(stud.current_belt);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const isEdit = formType === 'edit';
      const endpoint = '/api/admin/grading-exams';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...formData, id: selectedExam?.id } : formData;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(isEdit ? 'Exam updated.' : 'Exam scheduled.');
        setAddModalOpen(false);
        setEditModalOpen(false);
        loadExams();
      } else {
        setErrorMsg(data.error || 'Failed to process exam.');
      }
    } catch (err) {
      setErrorMsg('Failed to process exam details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (ex: Exam) => {
    if (!confirm(`Are you sure you want to cancel and delete "${ex.name}"? This will cancel all student registrations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/grading-exams?id=${ex.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Grading exam deleted.');
        loadExams();
      } else {
        setErrorMsg(data.error || 'Failed to delete exam.');
      }
    } catch (err) {
      setErrorMsg('Failed to delete grading exam.');
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || !selectedStudentId) return;
    setRegisterSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/grading-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExam.id,
          student_id: selectedStudentId,
          target_belt: targetBelt
        })
      });
      const data = await res.json();
      if (data.success) {
        loadRoster(selectedExam.id);
      } else {
        setErrorMsg(data.error || 'Failed to register student.');
      }
    } catch (err) {
      setErrorMsg('Failed to register student.');
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const handleOpenEvaluate = (reg: RegisteredStudent) => {
    setEvaluatingRegId(reg.registration_id);
    setEvalForm({
      exam_result: reg.exam_result,
      score: reg.score || 80,
      examiner_feedback: reg.examiner_feedback || ''
    });
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || !evaluatingRegId) return;
    setEvalSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/grading-registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: evaluatingRegId,
          ...evalForm
        })
      });
      const data = await res.json();
      if (data.success) {
        setEvaluatingRegId(null);
        loadRoster(selectedExam.id);
      } else {
        setErrorMsg(data.error || 'Failed to save evaluation.');
      }
    } catch (err) {
      setErrorMsg('Failed to save evaluation.');
    } finally {
      setEvalSubmitting(false);
    }
  };

  const handleCancelRegistration = async (regId: number) => {
    if (!selectedExam) return;
    try {
      const res = await fetch(`/api/admin/grading-registrations?registrationId=${regId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadRoster(selectedExam.id);
      } else {
        setErrorMsg(data.error || 'Failed to cancel registration.');
      }
    } catch (err) {
      setErrorMsg('Failed to process cancellation.');
    }
  };

  const filteredExams = exams.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.examiner_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaGraduationCap className="text-purple-650" /> Belt Grading & Rank Promotions
          </h2>
          <p className="text-xs text-slate-500 mt-1">Schedule grading boards, assign examiners, register students, and finalize belt progression ranks</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <FaPlus /> Create Grading Board
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

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FaSearch size={12} />
          </span>
          <input
            type="text"
            placeholder="Search by board name or examiner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
          />
        </div>
      </div>

      {/* Boards Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FaSpinner className="animate-spin text-lg" />
          <span className="text-xs font-semibold">Loading grading boards...</span>
        </div>
      ) : filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((ex) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 leading-tight">
                    {ex.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {ex.description || 'No detailed syllabus criteria provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-slate-650 bg-slate-50 border border-slate-100/50 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <FaCalendarAlt className="text-purple-500" />
                    <span>{ex.exam_date}</span>
                  </div>
                  <div>
                    <span>Fee: <span className="font-bold text-slate-800">Rs. {Number(ex.fee).toLocaleString()}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-650">
                  <FaUserTie className="text-slate-400" />
                  <span>Examiner: <span className="font-bold text-slate-700">Sensei {ex.examiner_name}</span></span>
                </div>
              </div>

              {/* Card Footer Controls */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenRosterModal(ex)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <FaUsers className="text-slate-400" /> Roster & Finalize
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(ex)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit Board"
                  >
                    <FaEdit size={11} />
                  </button>
                  <button
                    onClick={() => handleDeleteExam(ex)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Board"
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
          <p className="text-xs font-semibold text-slate-450">No promotion boards scheduled.</p>
        </div>
      )}

      {/* Add / Edit Exam Modal */}
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
                    {formType === 'add' ? 'Create Promotion Board' : 'Edit Board Details'}
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

                <form onSubmit={handleCreateExam} className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Exam Board Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. Summer Rank Promotion Exam"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Syllabus Criteria
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Syllabus overview..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      value={formData.exam_date}
                      onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>

                  {/* Fee & Examiner */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Exam Fee (Rs.)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.fee}
                        onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
                        required
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Assigned Examiner
                      </label>
                      <select
                        value={formData.examiner_id}
                        onChange={(e) => setFormData({ ...formData, examiner_id: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-850 focus:outline-none focus:bg-white transition-all"
                      >
                        {instructors.map(i => (
                          <option key={i.id} value={i.id}>Sensei {i.first_name} {i.last_name}</option>
                        ))}
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
                      Save Board
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Roster & Finalize Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {rosterModalOpen && selectedExam && (
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
                    <h3 className="text-sm font-bold text-slate-800">Board Roster & Evaluations</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedExam.name} ({selectedExam.exam_date})</p>
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
                  
                  {/* Left Column: Register Student Form & Roster List */}
                  <div className="md:col-span-2 space-y-6">
                    
                    {/* Register student form */}
                    {unregistered.length > 0 ? (
                      <form onSubmit={handleRegisterStudent} className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4 text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FaAward /> Register Student for grading
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Student</label>
                            <select
                              value={selectedStudentId}
                              onChange={(e) => handleStudentSelect(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            >
                              {unregistered.map(student => (
                                <option key={student.student_id} value={student.student_id}>
                                  {student.first_name} {student.last_name} ({student.current_belt})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Target Belt</label>
                            <select
                              value={targetBelt}
                              onChange={(e) => setTargetBelt(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            >
                              {BELT_PROGRESSION.map(belt => (
                                <option key={belt} value={belt}>{belt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={registerSubmitting}
                            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1.5"
                          >
                            {registerSubmitting ? <FaSpinner className="animate-spin" size={8} /> : null} Register
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-slate-450 italic bg-slate-50 p-3 rounded-lg text-center">
                        All active students are registered.
                      </p>
                    )}

                    {/* Roster list */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FaUsers /> Exam Registry ({registered.length})
                      </p>
                      {rosterLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <FaSpinner className="animate-spin text-xs" />
                          <span className="text-[9px] font-semibold">Loading registry...</span>
                        </div>
                      ) : registered.length > 0 ? (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {registered.map((item) => (
                            <div 
                              key={item.student_id} 
                              className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
                            >
                              <div className="text-left space-y-0.5">
                                <p className="text-xs font-bold text-slate-700">
                                  {item.first_name} {item.last_name}
                                </p>
                                <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold">
                                  <span>{item.current_belt}</span>
                                  <span>&rarr;</span>
                                  <span className={`px-1.5 py-0.5 rounded border ${BELT_COLORS[item.target_belt]}`}>{item.target_belt}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenEvaluate(item)}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    item.exam_result === 'pass'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : item.exam_result === 'fail'
                                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  {item.exam_result === 'pass' ? (
                                    <>
                                      <FaCheck size={8} /> Pass ({item.score})
                                    </>
                                  ) : item.exam_result === 'fail' ? (
                                    <>
                                      <FaTimesCircle size={9} /> Fail ({item.score})
                                    </>
                                  ) : (
                                    <>
                                      <FaSlidersH size={8} /> Evaluate
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCancelRegistration(item.registration_id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Cancel Registration"
                                >
                                  <FaTrash size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-xs text-slate-400 italic py-8 border border-dashed border-slate-200 rounded-xl">
                          No students registered in this board yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Active Evaluation Form */}
                  <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl h-fit">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-4">
                      <FaFileAlt /> Finalize Result
                    </p>
                    
                    {evaluatingRegId ? (
                      <form onSubmit={handleSaveResult} className="space-y-4 text-left">
                        {/* Result state selection */}
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Result</label>
                          <select
                            value={evalForm.exam_result}
                            onChange={(e) => setEvalForm({ ...evalForm, exam_result: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="pass">Pass (Promote Rank)</option>
                            <option value="fail">Fail</option>
                          </select>
                        </div>

                        {/* Score (0-100) */}
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Score (0-100)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={evalForm.score}
                            onChange={(e) => setEvalForm({ ...evalForm, score: Number(e.target.value) })}
                            required
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        {/* Examiner Feedback */}
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Feedback Comments</label>
                          <textarea
                            rows={3}
                            placeholder="Add evaluation comments here..."
                            value={evalForm.examiner_feedback}
                            onChange={(e) => setEvalForm({ ...evalForm, examiner_feedback: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEvaluatingRegId(null)}
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
                        Select "Evaluate" next to a student registration to grade them and finalize their belt progression.
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
