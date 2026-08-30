'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaUserGraduate, FaSearch, FaEdit, FaTrash, 
  FaTimes, FaCheckCircle, FaSpinner, FaInfoCircle
} from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

interface Evaluation {
  id: number;
  student_id: number;
  student_name: string;
  belt_rank: string;
  evaluation_date: string;
  fitness_score: number;
  technique_score: number;
  spar_score: number;
  discipline_score: number;
  general_feedback: string | null;
}

interface StudentData {
  id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
}

const SCORE_CATEGORIES = [
  { key: 'fitness_score', label: 'Fitness & Conditioning', shortLabel: 'Fitness', description: 'Stamina, endurance, speed, and physical readiness' },
  { key: 'technique_score', label: 'Technique (Kata / Kihon)', shortLabel: 'Technique', description: 'Form accuracy, stance transitions, and kihon fundamentals' },
  { key: 'spar_score', label: 'Sparring (Kumite)', shortLabel: 'Kumite', description: 'Timing, distance management, and offensive-defensive balance' },
  { key: 'discipline_score', label: 'Discipline & Spirit', shortLabel: 'Discipline', description: 'Dojo etiquette, focus, respect, and perseverance' },
] as const;

export default function InstructorEvaluationsPage() {
  const { data: session } = useSession();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'logs' | 'create'>('logs');

  const [mounted, setMounted] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  const [formData, setFormData] = useState({
    student_id: '',
    fitness_score: 5,
    technique_score: 5,
    spar_score: 5,
    discipline_score: 5,
    general_feedback: ''
  });

  const [editFormData, setEditFormData] = useState({
    fitness_score: 5,
    technique_score: 5,
    spar_score: 5,
    discipline_score: 5,
    general_feedback: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/instructor/evaluations');
      const data = await res.json();
      if (data.success) {
        setEvaluations(data.evaluations || []);
        setStudents(data.students || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve evaluations data.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to evaluations database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) {
      setErrorMsg('Please select a student to evaluate.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/instructor/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Student performance evaluation logged successfully.');
        setFormData({
          student_id: '',
          fitness_score: 5,
          technique_score: 5,
          spar_score: 5,
          discipline_score: 5,
          general_feedback: ''
        });
        loadData();
        setActiveTab('logs');
      } else {
        setErrorMsg(data.error || 'Failed to submit evaluation.');
      }
    } catch (err) {
      setErrorMsg('Failed to sync performance logs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (evalItem: Evaluation) => {
    setSelectedEvaluation(evalItem);
    setEditFormData({
      fitness_score: evalItem.fitness_score,
      technique_score: evalItem.technique_score,
      spar_score: evalItem.spar_score,
      discipline_score: evalItem.discipline_score,
      general_feedback: evalItem.general_feedback || ''
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setSelectedEvaluation(null);
    setEditModalOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvaluation) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/instructor/evaluations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEvaluation.id,
          ...editFormData
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Evaluation details updated successfully.');
        setEditModalOpen(false);
        loadData();
      } else {
        setErrorMsg(data.error || 'Failed to update evaluation details.');
      }
    } catch (err) {
      setErrorMsg('Failed to sync evaluation updates.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (evalItem: Evaluation) => {
    if (!confirm(`Are you sure you want to delete the evaluation for "${evalItem.student_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/instructor/evaluations?id=${evalItem.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Evaluation removed.');
        loadData();
      } else {
        setErrorMsg(data.error || 'Failed to delete evaluation record.');
      }
    } catch (err) {
      setErrorMsg('Failed to process deletion.');
    }
  };

  // --- Helpers ---

  const getBeltColorBadge = (rank: string) => {
    const r = rank ? rank.toLowerCase() : '';
    if (r.includes('yellow')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (r.includes('orange')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (r.includes('green')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (r.includes('blue')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (r.includes('purple')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (r.includes('brown')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (r.includes('black')) return 'bg-slate-900 text-slate-50 border-slate-700';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 5) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-500';
    if (score >= 5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getAverageScore = (item: Evaluation) => {
    return ((item.fitness_score + item.technique_score + item.spar_score + item.discipline_score) / 4).toFixed(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const filteredEvaluations = evaluations.filter(e => {
    return e.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           e.belt_rank.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // --- Score Slider Component ---
  const ScoreSlider = ({ 
    label, description, value, onChange 
  }: { 
    label: string; description: string; value: number; onChange: (v: number) => void 
  }) => (
    <div className="p-4 bg-white border border-slate-200/60 rounded-xl space-y-3 hover:border-slate-300/80 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-slate-700">{label}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">{description}</p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border text-sm font-extrabold tabular-nums min-w-[52px] text-center ${getScoreColor(value)}`}>
          {value}
        </div>
      </div>
      <div className="space-y-1.5">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-1.5"
        />
        <div className="flex justify-between text-[8px] font-bold text-slate-300 px-0.5">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          <span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
              <FaUserGraduate className="text-amber-600 text-sm" />
            </span>
            Student Evaluations
          </h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Assess student performance across fitness, technique, sparring, and discipline
          </p>
        </div>

        {/* Summary Counters */}
        {!loading && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Evaluations</p>
              <p className="text-lg font-extrabold text-slate-800 tabular-nums">{evaluations.length}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Students Evaluated</p>
              <p className="text-lg font-extrabold text-slate-800 tabular-nums">
                {new Set(evaluations.map(e => e.student_id)).size}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <FaCheckCircle className="text-emerald-500 flex-shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <FaTimes className="text-rose-500 flex-shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)]">
        <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              activeTab === 'logs' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Evaluation Logs
          </button>
          <button
            onClick={() => { setActiveTab('create'); setSearchQuery(''); }}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 ${
              activeTab === 'create' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Log New Evaluation
          </button>
        </div>

        {activeTab === 'logs' && (
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <FaSearch size={11} />
            </span>
            <input
              type="text"
              placeholder="Search by student name or belt rank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
            />
          </div>
        )}
      </div>

      {/* ====================== LOGS TAB ====================== */}
      {activeTab === 'logs' ? (
        loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <FaSpinner className="animate-spin text-xl text-amber-500" />
            <span className="text-xs font-bold">Loading evaluations...</span>
          </div>
        ) : filteredEvaluations.length > 0 ? (
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-center">Fitness</th>
                    <th className="px-5 py-3.5 text-center">Technique</th>
                    <th className="px-5 py-3.5 text-center">Kumite</th>
                    <th className="px-5 py-3.5 text-center">Discipline</th>
                    <th className="px-5 py-3.5 text-center">Overall</th>
                    <th className="px-5 py-3.5">Feedback</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                  {filteredEvaluations.map((item) => {
                    const avg = getAverageScore(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {item.student_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-[11px] leading-tight">{item.student_name}</p>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-px rounded border mt-0.5 inline-block ${getBeltColorBadge(item.belt_rank)}`}>
                                {item.belt_rank}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium text-[11px]">
                          {formatDate(item.evaluation_date)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border font-bold text-[10px] tabular-nums ${getScoreColor(item.fitness_score)}`}>
                            {item.fitness_score}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border font-bold text-[10px] tabular-nums ${getScoreColor(item.technique_score)}`}>
                            {item.technique_score}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border font-bold text-[10px] tabular-nums ${getScoreColor(item.spar_score)}`}>
                            {item.spar_score}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border font-bold text-[10px] tabular-nums ${getScoreColor(item.discipline_score)}`}>
                            {item.discipline_score}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-extrabold text-slate-800 text-[11px] tabular-nums">{avg}</span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getScoreBarColor(parseFloat(avg))}`}
                                style={{ width: `${(parseFloat(avg) / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-[180px]">
                          <p className="text-slate-500 font-medium text-[10px] leading-relaxed truncate" title={item.general_feedback || ''}>
                            {item.general_feedback || <span className="italic text-slate-350">No notes</span>}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Evaluation"
                            >
                              <FaEdit size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Evaluation"
                            >
                              <FaTrash size={10} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-20 bg-white rounded-2xl border border-slate-200/60 text-center text-slate-400">
            <FaUserGraduate className="mx-auto text-2xl text-slate-300 mb-3" />
            <p className="text-xs font-bold text-slate-500">No evaluation logs found</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Switch to the "Log New Evaluation" tab to record your first assessment
            </p>
          </div>
        )
      ) : (
        /* ====================== CREATE TAB ====================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Form Area */}
          <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)] overflow-hidden">
            
            {/* Section Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/60">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Log Performance Metrics
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Evaluate student ability across the four core assessment areas
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
              {/* Student Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Student</label>
                <select
                  required
                  value={formData.student_id}
                  onChange={e => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-300 focus:border-amber-300 transition-all"
                >
                  <option value="">Select a student from your assigned classes</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} - {s.belt_rank} Belt</option>
                  ))}
                </select>
              </div>

              {/* Score Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SCORE_CATEGORIES.map(cat => (
                  <ScoreSlider
                    key={cat.key}
                    label={cat.label}
                    description={cat.description}
                    value={formData[cat.key as keyof typeof formData] as number}
                    onChange={v => setFormData(prev => ({ ...prev, [cat.key]: v }))}
                  />
                ))}
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Instructor Notes</label>
                <textarea
                  value={formData.general_feedback}
                  onChange={e => setFormData(prev => ({ ...prev, general_feedback: e.target.value }))}
                  placeholder="Observations on stance work, breathing patterns, sparring tendencies, areas for improvement..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-300 focus:border-amber-300 transition-all leading-relaxed"
                />
              </div>

              {/* Info Notice */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[10px] text-slate-500 leading-relaxed flex items-start gap-2.5 font-medium">
                <FaInfoCircle className="mt-0.5 flex-shrink-0 text-slate-400" />
                <span>Submitting this evaluation will update the student's progress dashboard. They will receive a notification and can view their scores immediately.</span>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm font-bold uppercase tracking-wider text-[10px]"
                >
                  {submitting && <FaSpinner className="animate-spin" size={10} />}
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>

          {/* Score Preview Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)]">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                Score Preview
              </h4>

              <div className="space-y-3">
                {SCORE_CATEGORIES.map(cat => {
                  const val = formData[cat.key as keyof typeof formData] as number;
                  return (
                    <div key={cat.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500">{cat.shortLabel}</span>
                        <span className={`text-[10px] font-bold tabular-nums ${val >= 8 ? 'text-emerald-600' : val >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>{val}/10</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${getScoreBarColor(val)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(val / 10) * 100}%` }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composite Score */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Composite Score</span>
                  <span className="text-lg font-extrabold text-slate-800 tabular-nums">
                    {((formData.fitness_score + formData.technique_score + formData.spar_score + formData.discipline_score) / 4).toFixed(1)}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <motion.div
                    className={`h-full rounded-full ${getScoreBarColor(
                      (formData.fitness_score + formData.technique_score + formData.spar_score + formData.discipline_score) / 4
                    )}`}
                    animate={{ width: `${(((formData.fitness_score + formData.technique_score + formData.spar_score + formData.discipline_score) / 4) / 10) * 100}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Score Legend */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)]">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                Score Guide
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-700">8 - 10: Excellent</p>
                    <p className="text-[9px] text-slate-400 font-medium">Exceeds expectations for current rank</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-700">5 - 7: Satisfactory</p>
                    <p className="text-[9px] text-slate-400 font-medium">Meets standard training benchmarks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-700">1 - 4: Needs Improvement</p>
                    <p className="text-[9px] text-slate-400 font-medium">Requires focused attention and practice</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ====================== EDIT MODAL ====================== */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {editModalOpen && selectedEvaluation && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200/60 overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                      Edit Evaluation
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {selectedEvaluation.student_name} -- {selectedEvaluation.belt_rank} Belt
                    </p>
                  </div>
                  <button
                    onClick={handleCloseEditModal}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <FaTimes size={10} />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SCORE_CATEGORIES.map(cat => {
                      const val = editFormData[cat.key as keyof typeof editFormData] as number;
                      return (
                        <div key={cat.key} className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-600">{cat.shortLabel}</span>
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tabular-nums ${getScoreColor(val)}`}>{val}</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={val}
                            onChange={e => setEditFormData(prev => ({ ...prev, [cat.key]: Number(e.target.value) }))}
                            className="w-full accent-amber-500 cursor-pointer h-1.5"
                          />
                          <div className="flex justify-between text-[7px] font-bold text-slate-300 px-0.5">
                            <span>1</span><span>5</span><span>10</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Instructor Notes</label>
                    <textarea
                      value={editFormData.general_feedback}
                      onChange={e => setEditFormData(prev => ({ ...prev, general_feedback: e.target.value }))}
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-300"
                    />
                  </div>

                  {/* Modal Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleCloseEditModal}
                      className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm font-bold text-xs"
                    >
                      {submitting && <FaSpinner className="animate-spin" size={10} />}
                      Update Evaluation
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
