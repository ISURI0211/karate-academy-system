'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaChartLine, FaArrowLeft, FaSpinner, FaUserGraduate,
  FaCalendarAlt, FaChevronDown, FaLightbulb, FaBullseye
} from 'react-icons/fa';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import StudentSearchSelect from '@/app/components/StudentSearchSelect';

interface StudentRosterItem {
  id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
}

interface SmartProgressPayload {
  studentsList: StudentRosterItem[];
  student: {
    id: number;
    first_name: string;
    last_name: string;
    belt_rank: string;
    enrollment_status: string;
    joining_date: string;
  } | null;
  period: string;
  mlAnalysis: {
    overallProgress: number;
    statusText: string;
    statusColor: string;
    subScores: {
      attendance: number;
      performance: number;
      grading: number;
    };
    indicators: {
      attendance: { val: string; trend: string };
      performance: { val: string; trend: string };
      beltProgression: { val: string; trend: string };
    };
    trendData: Array<{ month: string; score: number; isForecast?: boolean }>;
    developmentAreas: Array<{ label: string; status: string; type: 'strength' | 'risk' }>;
    summaryRationale: string;
    recommendation: string;
  } | null;
}

function AdminSmartProgressContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const studentIdParam = searchParams?.get('studentId') || '';
  const periodParam = searchParams?.get('period') || '3m';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<SmartProgressPayload | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState(studentIdParam);
  const [selectedPeriod, setSelectedPeriod] = useState(periodParam);

  const fetchProgressData = async (sId: string, p: string) => {
    try {
      setLoading(true);
      setError('');
      const q = sId ? `?studentId=${sId}&period=${p}` : `?period=${p}`;
      const res = await fetch(`/api/admin/student-progress${q}`);
      const d = await res.json();
      if (d.success) {
        setData(d);
        if (d.student) {
          setSelectedStudentId(String(d.student.id));
        }
      } else {
        setError(d.error || 'Failed to retrieve progress data.');
      }
    } catch (err) {
      setError('Failed to connect to Smart Progress Tracking service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData(studentIdParam, selectedPeriod);
  }, [studentIdParam, selectedPeriod]);

  const handleSelectStudent = (val: string) => {
    setSelectedStudentId(val);
    router.push(`/dashboard/admin-dashboard/students/progress?studentId=${val}&period=${selectedPeriod}`);
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPeriod(val);
    if (selectedStudentId) {
      router.push(`/dashboard/admin-dashboard/students/progress?studentId=${selectedStudentId}&period=${val}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <FaSpinner className="animate-spin text-2xl text-sky-600" />
        <p className="text-xs font-semibold">Running ML Preprocessing & Predictive Pattern Pipeline...</p>
      </div>
    );
  }

  if (error || !data || !data.mlAnalysis || !data.student) {
    return (
      <div className="space-y-4 w-full max-w-7xl mx-auto">
        <Link
          href="/dashboard/admin-dashboard/students"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
        >
          <FaArrowLeft size={10} /> Back to Student Directory
        </Link>
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-semibold">
          {error || 'No athlete data available for progress analysis.'}
        </div>
      </div>
    );
  }

  const { student, studentsList, mlAnalysis } = data;
  const { overallProgress, statusText, statusColor, subScores, indicators, trendData, developmentAreas, summaryRationale, recommendation } = mlAnalysis;

  return (
    <div className="space-y-5 w-full">
      {/* ─── FULL WIDTH STUDENT SUMMARY BANNER CARD ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        {/* Left Info: Back Button, Student Name, Belt Rank, Attendance Rate */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/dashboard/admin-dashboard/students"
            className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"
            title="Back to Students Directory"
          >
            <FaArrowLeft size={12} />
          </Link>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {student.first_name} {student.last_name}
              </h2>
              <span className="px-2.5 py-0.5 bg-sky-50 border border-sky-100 text-sky-700 rounded-full text-[11px] font-black uppercase tracking-wider">
                {student.belt_rank || 'White Belt'}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[11px] font-black">
                {indicators.attendance.val} Attendance Rate
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
              <FaChartLine className="text-sky-600" /> Smart Progress Tracking & Athlete Growth Trajectory
            </p>
          </div>
        </div>

        {/* Right Controls: Athlete & Period Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Athlete Searchable Selector */}
          <StudentSearchSelect
            studentsList={studentsList}
            selectedStudentId={selectedStudentId}
            onSelectStudent={handleSelectStudent}
            accentColor="sky"
          />

          {/* Period Selector */}
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 flex-shrink-0">
              <FaCalendarAlt className="text-slate-400" /> Period:
            </span>
            <div className="relative flex-1 md:w-36">
              <select
                value={selectedPeriod}
                onChange={handlePeriodChange}
                className="w-full appearance-none px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 pr-8 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm"
              >
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months</option>
                <option value="all">All Time</option>
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={9} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── MAIN DASHBOARD GRID (3-COLUMN: LEFT, MIDDLE PROGRESS INDICATORS, RIGHT) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: OVERALL PROGRESS & ATHLETE PROGRESS TREND */}
        <div className="space-y-6">
          {/* CARD: OVERALL PROGRESS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                OVERALL PROGRESS
              </h3>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border ${statusColor}`}>
                {statusText}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Score Badge */}
              <div className="text-center sm:text-left flex-shrink-0">
                <div className="text-5xl font-black text-slate-900 tracking-tight tabular-nums">{overallProgress}%</div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Overall Progress Index</p>
              </div>

              {/* Progress Bars */}
              <div className="space-y-2.5 flex-1 w-full border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="w-24 text-slate-600 font-semibold flex-shrink-0">Attendance</span>
                  <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${subScores.attendance}%` }} />
                  </div>
                  <span className="w-10 text-right text-slate-800 tabular-nums font-black">{subScores.attendance}%</span>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="w-24 text-slate-600 font-semibold flex-shrink-0">Performance</span>
                  <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${subScores.performance}%` }} />
                  </div>
                  <span className="w-10 text-right text-slate-800 tabular-nums font-black">{subScores.performance}%</span>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="w-24 text-slate-600 font-semibold flex-shrink-0">Grading</span>
                  <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${subScores.grading}%` }} />
                  </div>
                  <span className="w-10 text-right text-slate-800 tabular-nums font-black">{subScores.grading}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CARD: ATHLETE PROGRESS TREND LINE CHART */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 flex items-center gap-2">
                <FaChartLine className="text-sky-600" /> ATHLETE PROGRESS TREND
              </h3>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Progress Score Trend
              </span>
            </div>

            <div className="h-[240px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[50, 100]} ticks={[60, 70, 80, 90, 100]} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Progress Score']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#0284c7"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#0284c7', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* MIDDLE COLUMN: PROGRESS INDICATORS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-full flex flex-col"
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">PROGRESS INDICATORS</h3>
          </div>
          <div className="divide-y divide-slate-100 p-6 flex-1 flex flex-col justify-around space-y-4">
            <div className="space-y-1 text-center py-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ATTENDANCE</p>
              <p className="text-4xl font-black text-slate-900 tabular-nums">{indicators.attendance.val}</p>
              <p className="text-xs font-bold text-emerald-600">{indicators.attendance.trend}</p>
            </div>
            <div className="space-y-1 text-center pt-6 py-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">PERFORMANCE</p>
              <p className="text-4xl font-black text-slate-900 tabular-nums">{indicators.performance.val}</p>
              <p className="text-xs font-bold text-emerald-600">{indicators.performance.trend}</p>
            </div>
            <div className="space-y-1 text-center pt-6 py-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">BELT PROGRESSION</p>
              <p className="text-3xl font-black text-slate-900">{indicators.beltProgression.val}</p>
              <p className="text-xs font-bold text-emerald-600">{indicators.beltProgression.trend}</p>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: DEVELOPMENT AREAS & TRAINING RECOMMENDATION */}
        <div className="space-y-6">
          {/* CARD: DEVELOPMENT AREAS */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 border-b border-slate-100 pb-3">
              DEVELOPMENT AREAS
            </h3>
            <div className="space-y-3 font-bold text-xs">
              {developmentAreas.map((area, idx) => {
                const isStrength = area.type === 'strength';
                return (
                  <div key={idx} className="flex items-center gap-3">
                    {isStrength ? (
                      <span className="w-5 text-emerald-600 font-extrabold text-sm flex-shrink-0">✓</span>
                    ) : (
                      <span className="w-5 text-amber-500 font-extrabold text-sm flex-shrink-0">⚠</span>
                    )}
                    <span className="text-slate-800">
                      {area.label} – <span className={isStrength ? 'text-emerald-700' : 'text-amber-700'}>{area.status}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* CARD: TRAINING RECOMMENDATION (MODERN HIGH-IMPACT AI THEME) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-slate-950/20 p-6 space-y-4 text-white relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-sky-400 flex items-center gap-2">
                <FaLightbulb className="text-amber-400 animate-pulse" /> TRAINING RECOMMENDATION
              </h3>
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                AI Insight
              </span>
            </div>

            {/* Content Rationale */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <p className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-slate-200">
                {summaryRationale}
              </p>

              {/* Highlight Action Recommendation */}
              <div className="space-y-1.5 pt-1">
                <p className="font-black text-sky-400 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                  <FaBullseye className="text-rose-400" /> Recommended Action:
                </p>
                <div className="bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-500/20 p-4 rounded-xl border border-sky-400/30 text-white font-bold text-xs shadow-inner">
                  {recommendation}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

export default function AdminSmartProgressPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <FaSpinner className="animate-spin text-2xl text-sky-600" />
        <p className="text-xs font-semibold">Running ML Preprocessing & Predictive Pattern Pipeline...</p>
      </div>
    }>
      <AdminSmartProgressContent />
    </Suspense>
  );
}
