'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  FaUserGraduate, FaChalkboardTeacher, FaCalendarAlt, FaMoneyBillWave,
  FaBell, FaDatabase, FaShieldAlt, FaPlus, FaCalendarCheck, FaSyncAlt,
  FaFistRaised, FaAward, FaDumbbell, FaBalanceScale, FaChartBar, FaLightbulb,
  FaSlidersH, FaChartPie, FaCheckCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Color Palette for Belt Ranks
const BELT_COLORS: Record<string, string> = {
  White: '#cbd5e1',
  Yellow: '#fef08a',
  Orange: '#fed7aa',
  Green: '#86efac',
  Blue: '#93c5fd',
  Purple: '#c084fc',
  'Brown (3rd Kyu)': '#b45309',
  'Brown (2nd Kyu)': '#92400e',
  'Brown (1st Kyu)': '#78350f',
  'Black (1st Dan)': '#1e293b',
  'Black (2nd Dan)': '#0f172a',
  'Black (3rd Dan)': '#020617',
  Brown: '#d7ccc8',
  Black: '#1e293b'
};

interface AlertLog {
  title: string;
  time: string;
  desc: string;
  type: string;
}

interface DashboardStats {
  totalStudents: number;
  totalInstructors: number;
  totalClasses: number;
  totalRevenue: number;
}

interface SkillStats {
  avgTechnique: number;
  avgSparring: number;
  avgFitness: number;
  avgDiscipline: number;
  totalEvaluations: number;
  overallIndex: number;
  radarData: Array<{ subject: string; score: number; fullMark: number }>;
  tierData: Array<{ tier: string; Technique: number; Sparring: number; Fitness: number; Discipline: number }>;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'radar' | 'tier'>('radar');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalInstructors: 0,
    totalClasses: 0,
    totalRevenue: 0
  });
  const [beltData, setBeltData] = useState<any[]>([]);
  const [skillStats, setSkillStats] = useState<SkillStats>({
    avgTechnique: 8.2,
    avgSparring: 7.6,
    avgFitness: 8.5,
    avgDiscipline: 9.0,
    totalEvaluations: 0,
    overallIndex: 8.3,
    radarData: [
      { subject: 'Kihon & Kata', score: 8.2, fullMark: 10 },
      { subject: 'Kumite (Sparring)', score: 7.6, fullMark: 10 },
      { subject: 'Conditioning', score: 8.5, fullMark: 10 },
      { subject: 'Reigi (Discipline)', score: 9.0, fullMark: 10 },
    ],
    tierData: [
      { tier: 'Beginner', Technique: 7.2, Sparring: 6.8, Fitness: 7.5, Discipline: 8.4 },
      { tier: 'Intermediate', Technique: 8.1, Sparring: 7.6, Fitness: 8.3, Discipline: 8.9 },
      { tier: 'Advanced', Technique: 9.2, Sparring: 8.8, Fitness: 9.1, Discipline: 9.6 },
    ]
  });
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/dashboard-stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        
        const mappedBelts = data.beltData.map((item: any) => ({
          ...item,
          color: BELT_COLORS[item.name] || '#64748b'
        }));
        setBeltData(mappedBelts);
        if (data.skillStats) {
          setSkillStats(data.skillStats);
        }
        setFinancialData(data.financialData);
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  const statsCards = [
    { label: 'Total Active Students', value: stats.totalStudents, subtext: 'In Dojo registry', icon: FaUserGraduate, iconColor: 'text-rose-600', bg: 'bg-rose-50/60' },
    { label: 'Instructors', value: stats.totalInstructors, subtext: 'Assigned Senseis', icon: FaChalkboardTeacher, iconColor: 'text-amber-600', bg: 'bg-amber-50/60' },
    { label: 'Sessions Scheduled', value: stats.totalClasses, subtext: 'Total catalog classes', icon: FaCalendarAlt, iconColor: 'text-sky-600', bg: 'bg-sky-50/60' },
    { label: 'Total Dojo Revenue', value: `Rs. ${Number(stats.totalRevenue).toLocaleString()}`, subtext: 'Aggregate payments received', icon: FaMoneyBillWave, iconColor: 'text-emerald-600', bg: 'bg-emerald-50/60' },
  ];

  const pillarsConfig = [
    {
      title: 'Kihon & Kata',
      sub: 'Technique & Form Precision',
      score: skillStats.avgTechnique,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50/70',
      borderColor: 'border-indigo-100',
      icon: FaAward
    },
    {
      title: 'Kumite (Sparring)',
      sub: 'Combat Timing & Adaptability',
      score: skillStats.avgSparring,
      color: 'bg-rose-500',
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-50/70',
      borderColor: 'border-rose-100',
      icon: FaFistRaised
    },
    {
      title: 'Physical Conditioning',
      sub: 'Endurance, Speed & Core Power',
      score: skillStats.avgFitness,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-100',
      icon: FaDumbbell
    },
    {
      title: 'Dojo Etiquette (Reigi)',
      sub: 'Mental Focus & Respect Protocol',
      score: skillStats.avgDiscipline,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-100',
      icon: FaBalanceScale
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            Welcome back, {session?.user?.username ?? 'Admin'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Academy management system status: <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> All modules operational</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            title="Reload Data"
            disabled={loading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-sm">
            <FaCalendarCheck className="text-slate-400" />
            Class Schedule
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-semibold text-white transition-colors shadow-sm shadow-slate-900/10">
            <FaPlus />
            New Entry
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="bg-white rounded-xl p-5 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.03)] flex justify-between items-center"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                {loading ? (
                  <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-md mt-1" />
                ) : (
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                )}
                <p className="text-[10px] text-slate-500 font-medium">{stat.subtext}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`text-base ${stat.iconColor}`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Insights Section: Premium SaaS Redesigned Karate Martial Proficiency Component */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modern SaaS Redesigned Karate Martial Arts Skill Component */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] lg:col-span-2 space-y-6 flex flex-col justify-between">
          {/* Component Header with View Toggle & Overall Index Chip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold text-xs">
                  <FaFistRaised />
                </span>
                <h3 className="text-sm font-extrabold tracking-tight text-slate-800">
                  Academy Martial Proficiency Benchmark
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Aggregate Sensei evaluations across 4 core karate pillars evaluated on a 1–10 scale
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Switcher Pills */}
              <div className="flex p-0.5 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-500">
                <button
                  onClick={() => setViewMode('radar')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    viewMode === 'radar' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'hover:text-slate-700'
                  }`}
                >
                  Radar Polygon
                </button>
                <button
                  onClick={() => setViewMode('tier')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    viewMode === 'tier' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'hover:text-slate-700'
                  }`}
                >
                  Belt Tiers
                </button>
              </div>

              {/* Overall Rating Chip */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-xl border border-amber-200/60">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-700">Dojo Index</span>
                  <span className="text-xs font-black text-amber-900 tabular-nums">{skillStats.overallIndex} <span className="text-[10px] text-amber-600 font-bold">/ 10</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Visual Content (Radar or Tier Bar + SaaS Metric Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-1">
            {/* Chart Column (7 cols) */}
            <div className="md:col-span-7 h-[250px] w-full relative flex items-center justify-center">
              {mounted && !loading ? (
                viewMode === 'radar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={skillStats.radarData}>
                      <defs>
                        <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#d97706" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 10, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#cbd5e1" fontSize={8} />
                      <Radar name="Academy Benchmark" dataKey="score" stroke="#d97706" fill="url(#radarFill)" strokeWidth={2.5} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillStats.tierData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="tier" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} domain={[0, 10]} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }} />
                      <Bar dataKey="Technique" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Sparring" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Fitness" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Discipline" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div className="h-full w-full bg-slate-50/70 animate-pulse rounded-2xl" />
              )}
            </div>

            {/* Metric Pillar Progress Cards Column (5 cols) */}
            <div className="md:col-span-5 space-y-3">
              {pillarsConfig.map((pillar, idx) => {
                const Icon = pillar.icon;
                const percentage = Math.min(100, Math.max(0, (pillar.score / 10) * 100));
                return (
                  <div key={idx} className="p-3 bg-slate-50/60 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg ${pillar.bgColor} ${pillar.textColor} flex items-center justify-center font-bold text-xs flex-shrink-0`}>
                          <Icon />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{pillar.title}</p>
                          <p className="text-[9px] text-slate-400 font-medium truncate">{pillar.sub}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-black tabular-nums ${pillar.textColor} flex-shrink-0 ml-2`}>
                        {pillar.score} <span className="text-[9px] text-slate-400 font-normal">/ 10</span>
                      </span>
                    </div>

                    {/* Clean Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className={`h-full ${pillar.color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Premium Manager Actionable Takeaway Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/70 rounded-xl flex items-center gap-3 text-xs text-amber-950 font-medium">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
              <FaLightbulb />
            </div>
            <div className="flex-1 leading-snug">
              <span className="font-extrabold text-amber-900 block text-[11px]">Academy Manager Insights:</span>
              <span className="text-[11px] text-amber-900/80">
                Kumite (Sparring) is currently the focus opportunity ({skillStats.avgSparring}/10). Dojo Etiquette ({skillStats.avgDiscipline}/10) & Kihon technique ({skillStats.avgTechnique}/10) maintain high excellence.
              </span>
            </div>
          </div>
        </div>

        {/* Belt Distribution Pie Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <FaChartPie className="text-indigo-500" /> Belt Distribution
              </h3>
              <p className="text-[11px] text-slate-400">Total student base breakdown</p>
            </div>
          </div>
          <div className="h-[200px] w-full flex items-center justify-center relative">
            {mounted && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={beltData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {beltData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#f1f5f9" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-slate-50/70 animate-pulse rounded-2xl" />
            )}
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-slate-800">{stats.totalStudents}</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Active</span>
            </div>
          </div>
          <div className="h-[90px] overflow-y-auto pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
            {beltData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-[9px] font-bold text-slate-600 truncate">{entry.name}</span>
                <span className="text-[8px] text-slate-400 ml-auto">({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financials & Action logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Flow Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Fee Billings Overview</h3>
              <p className="text-[11px] text-slate-400">Comparing collected dues vs. overdue invoices</p>
            </div>
          </div>
          <div className="h-[220px] w-full">
            {mounted && !loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }}
                  />
                  <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Overdue" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-slate-50/70 animate-pulse rounded-2xl" />
            )}
          </div>
        </div>

        {/* System Alerts log */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <FaBell className="text-rose-500" /> Notifications & Alerts
            </h3>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="space-y-4 max-h-[140px] overflow-y-auto pr-1">
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 truncate">{alert.title}</span>
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap ml-auto">{alert.time}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] truncate">{alert.desc}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No recent alerts found.</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-semibold flex items-center gap-2">
                <FaDatabase className="text-slate-400" /> DB Connection
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                CONNECTED
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-semibold flex items-center gap-2">
                <FaShieldAlt className="text-slate-400" /> Auth Service
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                JWT SECURED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
