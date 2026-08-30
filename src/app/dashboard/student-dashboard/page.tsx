'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaAward, FaClipboardCheck, FaMoneyBillWave, FaClock, 
  FaBookOpen, FaCalendarAlt, FaFileAlt, FaVideo, 
  FaSpinner, FaExternalLinkAlt, FaTimesCircle, FaCheckCircle, FaUserTie, FaMapMarkerAlt
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts';

interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
  enrollment_status: string;
}

interface AttendanceStat {
  status: 'present' | 'absent' | 'excused';
  count: number;
}

interface EnrolledClass {
  id: number;
  name: string;
  class_date: string;
  start_time: string;
  end_time: string;
  location: string;
  instructor_name: string;
}

interface GradingHistoryItem {
  exam_name: string;
  exam_date: string;
  target_belt: string;
  exam_result: 'pass' | 'fail' | 'pending';
  score: number;
}

interface TrainingResource {
  id: number;
  title: string;
  description: string;
  resource_type: 'video' | 'document' | 'link';
  file_url: string;
  class_name: string | null;
}

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceStat[]>([]);
  const [latestBill, setLatestBill] = useState<{ amount: number; status: string; due_date: string; billing_month: string } | null>(null);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [grading, setGrading] = useState<GradingHistoryItem[]>([]);
  const [resources, setResources] = useState<TrainingResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/student/dashboard');
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setAttendance(data.attendanceStats || []);
        setLatestBill(data.latestBill);
        setClasses(data.enrolledClasses || []);
        setGrading(data.gradingHistory || []);
        setResources(data.resources || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve portal data.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect with student portal services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  // Calculate stats
  const totalClasses = attendance.reduce((sum, item) => sum + item.count, 0);
  const presentCount = attendance.find(a => a.status === 'present')?.count || 0;
  const absentCount = attendance.find(a => a.status === 'absent')?.count || 0;
  const excusedCount = attendance.find(a => a.status === 'excused')?.count || 0;
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  // Chart configuration
  const attendanceChartData = attendance.map(item => ({
    name: item.status.toUpperCase(),
    value: item.count
  }));

  const COLORS = {
    PRESENT: '#10b981', // emerald-500
    ABSENT: '#f43f5e',  // rose-500
    EXCUSED: '#64748b'  // slate-500
  };

  const getChartColor = (name: string) => {
    if (name === 'PRESENT') return COLORS.PRESENT;
    if (name === 'ABSENT') return COLORS.ABSENT;
    return COLORS.EXCUSED;
  };

  const getBeltColorBadge = (rank: string) => {
    const r = rank ? rank.toLowerCase() : '';
    if (r.includes('yellow')) return 'bg-yellow-50 text-yellow-700 border-yellow-250';
    if (r.includes('orange')) return 'bg-orange-50 text-orange-700 border-orange-250';
    if (r.includes('green')) return 'bg-emerald-50 text-emerald-700 border-emerald-250';
    if (r.includes('blue')) return 'bg-blue-50 text-blue-700 border-blue-250';
    if (r.includes('purple')) return 'bg-purple-50 text-purple-700 border-purple-250';
    if (r.includes('brown')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (r.includes('black')) return 'bg-slate-900 text-slate-50 border-slate-950';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <FaVideo className="text-red-500" />;
      case 'document':
        return <FaFileAlt className="text-sky-500" />;
      case 'link':
      default:
        return <FaLink className="text-emerald-500" />;
    }
  };

  // Safe wrapper helper for FaLink fallback
  function FaLink(props: any) {
    return <span className="text-emerald-500 font-bold">L</span>;
  }

  if (loading) {
    return (
      <div className="p-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <FaSpinner className="animate-spin text-2xl text-indigo-650" />
        <span className="text-xs font-bold tracking-wider">Loading student portal details...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold">
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Student Portal</p>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Osu, {profile ? `${profile.first_name} ${profile.last_name}` : session?.user?.username}!
            </h2>
            <p className="text-slate-350 mt-1.5 max-w-lg text-xs leading-relaxed">
              Track check-ins, verify rank promotion exam grades, review billing slips, and access specific dojo syllabus guidelines.
            </p>
          </div>
          {profile && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 w-fit">
              <div className="w-10 h-10 bg-indigo-650 rounded-xl flex items-center justify-center font-bold text-white text-lg">
                <FaAward />
              </div>
              <div>
                <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">Current Belt Rank</p>
                <p className="text-xs font-extrabold mt-0.5">{profile.belt_rank}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Belt Rank Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-650 text-xl">
            <FaAward />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belt Rank Status</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{profile?.belt_rank || 'White Belt'}</p>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Active Candidate</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-650 text-xl">
            <FaClipboardCheck />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{attendanceRate}%</p>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block">
              {presentCount} Present / {totalClasses} Classes
            </span>
          </div>
        </div>

        {/* Latest Bill */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-650 text-xl">
            <FaMoneyBillWave />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Month Fee</p>
            {latestBill ? (
              <>
                <p className="text-sm font-black text-slate-800 mt-0.5">Rs. {Number(latestBill.amount).toLocaleString()}</p>
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border mt-1.5 inline-block ${
                  latestBill.status === 'paid' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : latestBill.status === 'overdue' 
                    ? 'bg-rose-50 text-rose-700 border-rose-100' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {latestBill.status}
                </span>
              </>
            ) : (
              <>
                <p className="text-sm font-black text-slate-805 mt-0.5">Settled</p>
                <span className="text-[9px] font-semibold text-slate-400 mt-1 block">No outstanding invoice</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Panels */}
      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Stats Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
              Attendance Distribution
            </h3>
            {totalClasses > 0 ? (
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {attendanceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getChartColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Labels legend */}
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                    <span>Present: {presentCount} class check-ins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                    <span>Absent: {absentCount} times</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500 block" />
                    <span>Excused: {excusedCount} times</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs py-16">
                No attendance logs found in this dojo yet.
              </div>
            )}
          </div>

          {/* Grading Promotion Scores Progress Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
              Grading Scores Progression
            </h3>
            {grading.length > 0 ? (
              <div className="flex-1 min-h-[180px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={grading}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="exam_date" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#scoreColor)" 
                      name="Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs py-16">
                No grading boards records available yet.
              </div>
            )}
          </div>

          {/* Belt Progression Journey Card */}
          {(() => {
            const BELT_RANKS = [
              { name: 'White', color: '#e2e8f0', border: '#cbd5e1', text: '#475569', bg: 'bg-slate-100' },
              { name: 'Yellow', color: '#fef08a', border: '#fde047', text: '#854d0e', bg: 'bg-yellow-100' },
              { name: 'Orange', color: '#fed7aa', border: '#fdba74', text: '#9a3412', bg: 'bg-orange-100' },
              { name: 'Green', color: '#bbf7d0', border: '#86efac', text: '#166534', bg: 'bg-emerald-100' },
              { name: 'Blue', color: '#bfdbfe', border: '#93c5fd', text: '#1e40af', bg: 'bg-blue-100' },
              { name: 'Purple', color: '#e9d5ff', border: '#c084fc', text: '#6b21a8', bg: 'bg-purple-100' },
              { name: 'Brown (3rd Kyu)', color: '#d4a574', border: '#b8860b', text: '#78350f', bg: 'bg-amber-200' },
              { name: 'Brown (2nd Kyu)', color: '#c4956a', border: '#a0784a', text: '#78350f', bg: 'bg-amber-300' },
              { name: 'Brown (1st Kyu)', color: '#b0825e', border: '#8b6e4e', text: '#451a03', bg: 'bg-amber-400' },
              { name: 'Black (1st Dan)', color: '#1e293b', border: '#0f172a', text: '#f8fafc', bg: 'bg-slate-800' },
              { name: 'Black (2nd Dan)', color: '#0f172a', border: '#020617', text: '#f1f5f9', bg: 'bg-slate-900' },
              { name: 'Black (3rd Dan)', color: '#020617', border: '#000000', text: '#e2e8f0', bg: 'bg-slate-950' },
            ];

            const currentRank = profile?.belt_rank || 'White';
            const currentIdx = BELT_RANKS.findIndex(b =>
              currentRank.toLowerCase().includes(b.name.toLowerCase().split(' ')[0]) &&
              (b.name.includes('(') ? currentRank.toLowerCase().includes(b.name.split('(')[1].replace(')', '').toLowerCase().trim()) : !currentRank.includes('('))
            );
            const resolvedIdx = currentIdx >= 0 ? currentIdx : 0;

            return (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Belt Progression
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">Your rank journey through the dojo</p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-5" style={{ maxHeight: '320px' }}>
                  <div className="relative">
                    {/* Vertical progress line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
                    <div
                      className="absolute left-[15px] top-2 w-px bg-gradient-to-b from-indigo-500 to-indigo-300 transition-all duration-700"
                      style={{ height: `${((resolvedIdx + 1) / BELT_RANKS.length) * 100}%` }}
                    />

                    <div className="space-y-0.5">
                      {BELT_RANKS.map((belt, idx) => {
                        const isAchieved = idx <= resolvedIdx;
                        const isCurrent = idx === resolvedIdx;
                        const isNext = idx === resolvedIdx + 1;
                        return (
                          <div
                            key={belt.name}
                            className={`relative flex items-center gap-3 py-1.5 pl-1 pr-2 rounded-lg transition-all duration-200 ${
                              isCurrent ? 'bg-indigo-50/70' : ''
                            }`}
                          >
                            {/* Node */}
                            <div className="relative z-10 flex-shrink-0">
                              {isCurrent ? (
                                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center" style={{ backgroundColor: belt.color, border: `2.5px solid ${belt.border}` }}>
                                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                                </div>
                              ) : (
                                <div
                                  className={`w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center transition-all ${
                                    isAchieved ? 'opacity-100' : 'opacity-40'
                                  }`}
                                  style={{
                                    backgroundColor: isAchieved ? belt.color : '#f1f5f9',
                                    borderColor: isAchieved ? belt.border : '#e2e8f0'
                                  }}
                                >
                                  {isAchieved && (
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke={belt.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-bold leading-tight truncate ${
                                isCurrent
                                  ? 'text-indigo-700'
                                  : isAchieved
                                  ? 'text-slate-700'
                                  : 'text-slate-400'
                              }`}>
                                {belt.name}
                              </p>
                              {isCurrent && (
                                <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-px">Current Rank</p>
                              )}
                              {isNext && (
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-px">Next Target</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Progress Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Progress</span>
                    <span className="text-[9px] font-extrabold text-slate-700 tabular-nums">
                      {resolvedIdx + 1} / {BELT_RANKS.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${((resolvedIdx + 1) / BELT_RANKS.length) * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Enrolled Classes & Syllabus Library */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] lg:col-span-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
            <FaCalendarAlt className="text-indigo-500" /> Enrolled Training Schedule
          </h3>
          {classes.length > 0 ? (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div key={cls.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 border border-slate-100/60 rounded-xl hover:border-slate-200 transition-colors gap-3">
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700">{cls.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 mt-1 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1"><FaClock size={9} /> {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}</span>
                      <span>&bull;</span>
                      <span>Date: {cls.class_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold self-start sm:self-center">
                    <div className="flex items-center gap-1.5">
                      <FaUserTie className="text-slate-400" />
                      <span>{cls.instructor_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaMapMarkerAlt className="text-slate-400" />
                      <span>{cls.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-450 italic">
              You are not registered in any training class programs.
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
            <FaBookOpen className="text-indigo-500" /> Syllabus Materials
          </h3>
          {resources.length > 0 ? (
            <div className="space-y-3">
              {resources.map((res) => (
                <a
                  key={res.id}
                  href={res.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100/60 rounded-xl hover:bg-slate-100 hover:border-slate-200 transition-all group"
                >
                  <div className="text-left max-w-[80%]">
                    <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-650 transition-colors truncate">
                      {res.title}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate uppercase tracking-widest font-black">
                      {res.resource_type} {res.class_name ? `• ${res.class_name}` : ''}
                    </p>
                  </div>
                  {getResourceTypeIcon(res.resource_type)}
                </a>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-450 italic">
              No training library materials uploaded yet.
            </div>
          )}
        </div>
      </div>

      {/* Grading timeline table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
          <FaAward className="text-indigo-500" /> Grading & Promotions Timeline
        </h3>
        {grading.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Board Exam</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Target Belt</th>
                  <th className="pb-3">Result</th>
                  <th className="pb-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                {grading.map((g, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40">
                    <td className="py-3 font-bold text-slate-700">{g.exam_name}</td>
                    <td className="py-3">{g.exam_date}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${getBeltColorBadge(g.target_belt)}`}>
                        {g.target_belt}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`uppercase font-black tracking-widest text-[8px] ${
                        g.exam_result === 'pass' 
                          ? 'text-emerald-650' 
                          : g.exam_result === 'fail' 
                          ? 'text-rose-650' 
                          : 'text-slate-550'
                      }`}>
                        {g.exam_result}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-slate-800">{g.score ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-450 italic">
            No rank grading events recorded.
          </div>
        )}
      </div>

    </div>
  );
}
