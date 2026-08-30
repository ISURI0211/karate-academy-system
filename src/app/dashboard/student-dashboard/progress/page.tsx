'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaShieldAlt, FaStar, FaSpinner, FaCalendarAlt,
  FaCheckCircle, FaTimesCircle, FaClock, FaUserTie, FaTrophy, FaHistory
} from 'react-icons/fa';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts';

// ─── Belt Metadata ──────────────────────────────────────────────────────────────
const BELT_ORDER = [
  'White', 'Yellow', 'Orange', 'Green', 'Blue',
  'Purple', 'Brown (3rd Kyu)', 'Brown (2nd Kyu)', 'Brown (1st Kyu)',
  'Black (1st Dan)', 'Black (2nd Dan)', 'Black (3rd Dan)'
];

const BELT_COLORS: Record<string, { bg: string; ring: string; text: string; stripe?: string }> = {
  'White':           { bg: '#f8fafc', ring: '#cbd5e1', text: '#475569' },
  'Yellow':          { bg: '#fef9c3', ring: '#fbbf24', text: '#92400e' },
  'Orange':          { bg: '#fff7ed', ring: '#f97316', text: '#c2410c' },
  'Green':           { bg: '#f0fdf4', ring: '#22c55e', text: '#166534' },
  'Blue':            { bg: '#eff6ff', ring: '#3b82f6', text: '#1d4ed8' },
  'Purple':          { bg: '#faf5ff', ring: '#a855f7', text: '#7e22ce' },
  'Brown (3rd Kyu)': { bg: '#fdf8f0', ring: '#92400e', text: '#78350f' },
  'Brown (2nd Kyu)': { bg: '#fdf4e8', ring: '#78350f', text: '#6b2d0e' },
  'Brown (1st Kyu)': { bg: '#fdf2e0', ring: '#6b2d0e', text: '#5a1e08' },
  'Black (1st Dan)': { bg: '#1e293b', ring: '#0f172a', text: '#f8fafc' },
  'Black (2nd Dan)': { bg: '#0f172a', ring: '#1e293b', text: '#e2e8f0' },
  'Black (3rd Dan)': { bg: '#020617', ring: '#334155', text: '#cbd5e1' },
};

const BELT_HEX: Record<string, string> = {
  'White':           '#e2e8f0',
  'Yellow':          '#fbbf24',
  'Orange':          '#f97316',
  'Green':           '#22c55e',
  'Blue':            '#3b82f6',
  'Purple':          '#a855f7',
  'Brown (3rd Kyu)': '#92400e',
  'Brown (2nd Kyu)': '#78350f',
  'Brown (1st Kyu)': '#6b2d0e',
  'Black (1st Dan)': '#1e293b',
  'Black (2nd Dan)': '#0f172a',
  'Black (3rd Dan)': '#020617',
};

// ─── Belt Visual ─────────────────────────────────────────────────────────────
function BeltVisual({ belt }: { belt: string }) {
  const color = BELT_HEX[belt] || '#e2e8f0';
  const isBlack = belt.startsWith('Black');
  const danNum = belt === 'Black (1st Dan)' ? 1 : belt === 'Black (2nd Dan)' ? 2 : belt === 'Black (3rd Dan)' ? 3 : 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      {/* Outer glow ring */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full opacity-30"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      />
      {/* Belt circle */}
      <div
        className="relative flex items-center justify-center rounded-full shadow-xl border-4"
        style={{
          width: 120, height: 120,
          background: isBlack
            ? `linear-gradient(135deg, ${color}, #334155)`
            : `linear-gradient(135deg, ${color}dd, ${color}88)`,
          borderColor: color,
        }}
      >
        {/* Belt knot simulation */}
        <div
          className="w-10 h-16 rounded-lg shadow-inner flex items-center justify-center"
          style={{ background: isBlack ? '#0f172a' : `${color}cc`, border: `2px solid ${color}55` }}
        >
          {/* Dan stripes */}
          {danNum > 0 && (
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: danNum }).map((_, i) => (
                <div key={i} className="w-6 h-0.5 bg-yellow-400 rounded-full" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rank Progress Orbs ────────────────────────────────────────────────────────
function BeltProgressTrack({ currentBelt }: { currentBelt: string }) {
  const currentIdx = BELT_ORDER.indexOf(currentBelt);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center min-w-max px-2">
        {BELT_ORDER.map((belt, idx) => {
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;
          const color = BELT_HEX[belt];

          return (
            <React.Fragment key={belt}>
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  initial={false}
                  animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="relative flex items-center justify-center rounded-full border-2 transition-all"
                  style={{
                    width: isActive ? 36 : 28,
                    height: isActive ? 36 : 28,
                    background: isDone || isActive ? color : '#f1f5f9',
                    borderColor: isDone || isActive ? color : '#e2e8f0',
                    boxShadow: isActive ? `0 0 12px ${color}99` : 'none',
                  }}
                >
                  {isDone && <FaCheckCircle size={12} className="text-white" />}
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </motion.div>
                <span className="text-[8px] font-bold text-slate-500 text-center max-w-[40px] leading-tight">
                  {belt.replace(' (', '\n(').split('\n')[0]}
                </span>
              </div>
              {idx < BELT_ORDER.length - 1 && (
                <div
                  className="h-0.5 flex-1 min-w-[16px] mx-1 rounded-full transition-all"
                  style={{ background: idx < currentIdx ? BELT_HEX[BELT_ORDER[idx + 1]] : '#e2e8f0' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
interface ProgressData {
  student: { first_name: string; last_name: string; belt_rank: string; joining_date: string };
  trainingHistory: Array<{ id: number; action_type: string; details: string; action_date: string }>;
  gradingHistory: Array<{
    id: number; exam_name: string; exam_date: string; target_belt: string;
    eligibility_status: string; exam_result: string; score: number | null;
    examiner_feedback: string | null; examiner_name: string;
  }>;
  performanceHistory: Array<{
    id: number; evaluation_date: string; fitness_score: number; technique_score: number;
    spar_score: number; discipline_score: number; general_feedback: string | null; instructor_name: string;
  }>;
}

export default function StudentProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/student/progress')
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        else setError(d.error || 'Failed to load progress data.');
      })
      .catch(() => setError('Could not connect to progress service.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <FaSpinner className="animate-spin text-2xl" />
        <p className="text-xs font-semibold">Loading your belt journey...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-semibold">
        {error || 'No data available.'}
      </div>
    );
  }

  const { student, trainingHistory, gradingHistory, performanceHistory } = data;
  const currentIdx = BELT_ORDER.indexOf(student.belt_rank);
  const nextBelt = currentIdx < BELT_ORDER.length - 1 ? BELT_ORDER[currentIdx + 1] : null;
  const progressPct = Math.round(((currentIdx + 1) / BELT_ORDER.length) * 100);
  const beltMeta = BELT_COLORS[student.belt_rank] || BELT_COLORS['White'];
  const latestPerf = performanceHistory[0] || null;

  const radarData = latestPerf ? [
    { subject: 'Fitness', value: latestPerf.fitness_score * 10 },
    { subject: 'Technique', value: latestPerf.technique_score * 10 },
    { subject: 'Sparring', value: latestPerf.spar_score * 10 },
    { subject: 'Discipline', value: latestPerf.discipline_score * 10 },
  ] : [];

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800">Belt Progression</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Your martial arts journey — current rank, grading history, and performance evaluations
        </p>
      </div>

      {/* ── Hero Belt Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]"
        style={{ background: `linear-gradient(135deg, ${beltMeta.bg}, white)` }}
      >
        {/* Background orb */}
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: BELT_HEX[student.belt_rank] }}
        />

        <div className="p-6 flex flex-col md:flex-row items-center gap-8">
          {/* Belt Visual */}
          <div className="flex-shrink-0">
            <BeltVisual belt={student.belt_rank} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Rank</p>
              <h3
                className="text-3xl font-black tracking-tight"
                style={{ color: beltMeta.text }}
              >
                {student.belt_rank}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Training since {formatDate(student.joining_date)}
              </p>
            </div>

            {/* Journey progress bar */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                <span>Journey Progress</span>
                <span>{currentIdx + 1} of {BELT_ORDER.length} ranks</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${BELT_HEX[BELT_ORDER[0]]}, ${BELT_HEX[student.belt_rank]})` }}
                />
              </div>
              {nextBelt && (
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  Next target: <span className="font-bold text-slate-600">{nextBelt}</span>
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <div className="px-3 py-2 bg-white/70 border border-slate-200/60 rounded-xl text-center">
                <p className="text-base font-black text-slate-800">{gradingHistory.filter(g => g.exam_result === 'pass').length}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Exams Passed</p>
              </div>
              <div className="px-3 py-2 bg-white/70 border border-slate-200/60 rounded-xl text-center">
                <p className="text-base font-black text-slate-800">{trainingHistory.length}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Milestones</p>
              </div>
              {latestPerf && (
                <div className="px-3 py-2 bg-white/70 border border-slate-200/60 rounded-xl text-center">
                  <p className="text-base font-black text-slate-800">
                    {Math.round((latestPerf.fitness_score + latestPerf.technique_score + latestPerf.spar_score + latestPerf.discipline_score) / 4 * 10)}%
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Score</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Belt Progress Track ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)]"
      >
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <FaShieldAlt size={10} /> Rank Progression Path
        </p>
        <BeltProgressTrack currentBelt={student.belt_rank} />
      </motion.div>

      {/* ── Bottom 2-col Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Grading Exam History */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <FaTrophy size={10} className="text-amber-500" /> Grading Exam History
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {gradingHistory.length > 0 ? gradingHistory.map((exam, i) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="p-4 flex items-start gap-3"
              >
                {/* Status icon */}
                <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  exam.exam_result === 'pass' ? 'bg-emerald-100' :
                  exam.exam_result === 'fail' ? 'bg-rose-100' : 'bg-amber-100'
                }`}>
                  {exam.exam_result === 'pass' ? <FaCheckCircle size={12} className="text-emerald-600" /> :
                   exam.exam_result === 'fail' ? <FaTimesCircle size={12} className="text-rose-600" /> :
                   <FaClock size={12} className="text-amber-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-bold text-slate-700 leading-tight">{exam.exam_name}</h4>
                    {exam.score !== null && (
                      <span className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg flex-shrink-0">
                        {exam.score}/100
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="text-[9px] font-black px-2 py-0.5 rounded-md border"
                      style={{
                        background: BELT_COLORS[exam.target_belt]?.bg || '#f8fafc',
                        color: BELT_COLORS[exam.target_belt]?.text || '#475569',
                        borderColor: BELT_HEX[exam.target_belt] + '55' || '#e2e8f0',
                      }}
                    >
                      Target: {exam.target_belt}
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                      <FaCalendarAlt size={8} /> {formatDate(exam.exam_date)}
                    </span>
                  </div>
                  {exam.examiner_feedback && (
                    <p className="text-[10px] text-slate-500 mt-1.5 italic leading-relaxed line-clamp-2">
                      "{exam.examiner_feedback}"
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                    <FaUserTie size={8} /> {exam.examiner_name}
                  </p>
                </div>
              </motion.div>
            )) : (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                No grading exams recorded yet.
              </div>
            )}
          </div>
        </motion.div>

        {/* Right column: Performance + Timeline */}
        <div className="space-y-5">

          {/* Performance Radar */}
          {latestPerf && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-slate-100 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FaStar size={10} className="text-indigo-500" /> Latest Performance Evaluation
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {formatDate(latestPerf.evaluation_date)} — by {latestPerf.instructor_name}
                </p>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke={BELT_HEX[student.belt_rank] || '#6366f1'}
                      fill={BELT_HEX[student.belt_rank] || '#6366f1'}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                    <Tooltip
                      formatter={(v: any) => [`${v}%`, 'Score']}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>

                {/* Score breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: 'Fitness', val: latestPerf.fitness_score },
                    { label: 'Technique', val: latestPerf.technique_score },
                    { label: 'Sparring', val: latestPerf.spar_score },
                    { label: 'Discipline', val: latestPerf.discipline_score },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.val * 10}%`,
                            background: BELT_HEX[student.belt_rank] || '#6366f1',
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 w-14">{s.label} {s.val}/10</span>
                    </div>
                  ))}
                </div>

                {latestPerf.general_feedback && (
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[10px] text-slate-600 leading-relaxed italic">"{latestPerf.general_feedback}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Training Milestone Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white border border-slate-100 rounded-2xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)] overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FaHistory size={10} /> Training Milestones
              </p>
            </div>
            <div className="p-4">
              {trainingHistory.length > 0 ? (
                <div className="relative space-y-4">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-1 bottom-1 w-px bg-slate-100" />

                  {trainingHistory.map((event, i) => {
                    const isBeltUpgrade = event.action_type === 'Belt Upgrade';
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.06 }}
                        className="flex gap-3 relative"
                      >
                        {/* Dot */}
                        <div
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 border-white"
                          style={{
                            background: isBeltUpgrade ? BELT_HEX[student.belt_rank] : '#f1f5f9',
                            boxShadow: isBeltUpgrade ? `0 0 0 3px ${BELT_HEX[student.belt_rank]}33` : 'none',
                          }}
                        >
                          {isBeltUpgrade
                            ? <FaShieldAlt size={9} className="text-white" />
                            : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          }
                        </div>

                        <div className="pb-1">
                          <p className="text-[11px] font-bold text-slate-700">{event.action_type}</p>
                          {event.details && (
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{event.details}</p>
                          )}
                          <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                            <FaCalendarAlt size={8} /> {formatDate(event.action_date)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs font-semibold text-slate-400 text-center py-4">No milestones recorded yet.</p>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
