'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaCalendarAlt, FaClipboardCheck, FaUserTie, FaBell, FaClock, 
  FaSpinner, FaMapMarkerAlt, FaAward, FaBookOpen, FaUserCheck, FaChevronRight 
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip 
} from 'recharts';

interface InstructorProfile {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  specialization: string;
}

interface AssignedClass {
  id: number;
  name: string;
  class_date: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface AttendanceStat {
  status: 'present' | 'absent' | 'excused';
  count: number;
}

interface RecentEvaluation {
  registration_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
  exam_name: string;
  exam_date: string;
  target_belt: string;
  exam_result: 'pass' | 'fail' | 'pending';
  score: number;
}

export default function InstructorDashboardPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStat[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentEvaluations, setRecentEvaluations] = useState<RecentEvaluation[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/instructor/dashboard');
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setAssignedClasses(data.assignedClasses || []);
        setAttendanceStats(data.attendanceStats || []);
        setPendingCount(data.pendingCount || 0);
        setRecentEvaluations(data.recentEvaluations || []);
        setTodayCount(data.todayCount || 0);
      } else {
        setErrorMsg(data.error || 'Failed to load Sensei portal details.');
      }
    } catch (err) {
      setErrorMsg('Could not establish connection to instructor API services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  // Compute stats
  const totalCheckIns = attendanceStats.reduce((sum, item) => sum + item.count, 0);
  const presentCount = attendanceStats.find(a => a.status === 'present')?.count || 0;
  const absentCount = attendanceStats.find(a => a.status === 'absent')?.count || 0;
  const excusedCount = attendanceStats.find(a => a.status === 'excused')?.count || 0;
  const attendanceRate = totalCheckIns > 0 ? Math.round((presentCount / totalCheckIns) * 100) : 0;

  // Chart configuration
  const chartData = attendanceStats.map(item => ({
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
    if (r.includes('yellow')) return 'bg-yellow-50 text-yellow-750 border-yellow-200';
    if (r.includes('orange')) return 'bg-orange-50 text-orange-755 border-orange-200';
    if (r.includes('green')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (r.includes('blue')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (r.includes('purple')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (r.includes('brown')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (r.includes('black')) return 'bg-slate-900 text-slate-50 border-slate-950';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hr = Number(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const formattedHr = hr % 12 || 12;
    return `${formattedHr}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="p-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <FaSpinner className="animate-spin text-2xl text-amber-600" />
        <span className="text-xs font-bold tracking-wider">Loading instructor portal details...</span>
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
        className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-amber-200 text-xs font-black uppercase tracking-widest mb-1">Instructor Portal</p>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Osu, Sensei {profile ? `${profile.first_name} ${profile.last_name}` : session?.user?.username}!
            </h2>
            <p className="text-slate-350 mt-1.5 max-w-lg text-xs leading-relaxed">
              Review your teaching schedule, track class check-in patterns, manage student development, and log grading evaluations.
            </p>
          </div>
          {profile?.specialization && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 w-fit">
              <div className="w-10 h-10 bg-amber-650 rounded-xl flex items-center justify-center font-bold text-white text-lg">
                <FaBookOpen />
              </div>
              <div>
                <p className="text-[9px] text-amber-200 font-bold uppercase tracking-wider">Specialization</p>
                <p className="text-xs font-extrabold mt-0.5">{profile.specialization}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Assigned Classes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-650 text-xl">
            <FaCalendarAlt />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Classes</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{assignedClasses.length} Scheduled</p>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block">
              {todayCount} classes scheduled today
            </span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-650 text-xl">
            <FaClipboardCheck />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Attendance</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{attendanceRate}% Average</p>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block">
              {presentCount} Present / {totalCheckIns} Total Logged
            </span>
          </div>
        </div>

        {/* Pending Evaluations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 text-xl">
            <FaUserTie />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Gradings</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{pendingCount} Awaiting</p>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block">
              Needs rank technique evaluation
            </span>
          </div>
        </div>
      </div>

      {/* Charts & Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Assigned Classes (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 flex items-center gap-1.5">
              <FaCalendarAlt className="text-amber-500" /> Teaching Schedule
            </h3>
            
            {assignedClasses.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {assignedClasses.map((cls) => {
                  const isToday = new Date().toISOString().slice(0, 10) === cls.class_date;
                  return (
                    <div key={cls.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800">{cls.name}</p>
                          {isToday && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-250 uppercase rounded">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1"><FaClock /> {formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1"><FaCalendarAlt /> {formatDate(cls.class_date)}</span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1"><FaMapMarkerAlt /> {cls.location}</span>
                        </div>
                      </div>
                      <a
                        href="/dashboard/instructor-dashboard/attendance"
                        className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                        title="Mark Attendance"
                      >
                        <FaChevronRight size={12} />
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 italic py-6 text-center">
                No classes assigned to you on schedule.
              </p>
            )}
          </div>

          {/* Recent Evaluations list */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 flex items-center gap-1.5">
              <FaAward className="text-amber-500" /> Recent Ranks Evaluated
            </h3>

            {recentEvaluations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentEvaluations.map((item) => (
                  <div key={item.registration_id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        {item.first_name} {item.last_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-400 font-semibold">
                        <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${getBeltColorBadge(item.target_belt)}`}>
                          {item.target_belt} Target
                        </span>
                        <span>&bull;</span>
                        <span>{item.exam_name}</span>
                        <span>&bull;</span>
                        <span>{formatDate(item.exam_date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.score > 0 && (
                        <span className="text-[10px] font-extrabold text-slate-650">Score: {item.score}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${
                        item.exam_result === 'pass'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                          : item.exam_result === 'fail'
                          ? 'bg-rose-50 text-rose-700 border-rose-250'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {item.exam_result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 italic py-6 text-center">
                No grading registrations evaluated yet.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Attendance Distribution Pie Chart & Announcements */}
        <div className="space-y-6">
          
          {/* Attendance distribution */}
          {mounted && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 flex items-center gap-1.5">
                <FaUserCheck className="text-amber-500" /> Class Distribution
              </h3>

              {totalCheckIns > 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-2">
                  <div className="w-36 h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getChartColor(entry.name)} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div className="w-full space-y-2 text-[10px] font-semibold text-slate-650 pt-2 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 block" /> Present
                      </span>
                      <span>{presentCount} check-ins</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 block" /> Absent
                      </span>
                      <span>{absentCount} times</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500 block" /> Excused
                      </span>
                      <span>{excusedCount} times</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-400 italic py-8 text-center">
                  No attendance records logged.
                </p>
              )}
            </div>
          )}

          {/* Announcements Mock Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-50 flex items-center gap-1.5">
              <FaBell className="text-amber-500" /> Instructor Bulletin
            </h3>
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-left">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Dojo Board</p>
                <p className="text-xs font-bold text-slate-700 mt-1">Sensei Grading Examiner Seminar</p>
                <p className="text-[10px] text-slate-450 mt-1">Upcoming session scheduled for June 28th at 09:00 AM.</p>
              </div>
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-left">
                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Dojo Policy</p>
                <p className="text-xs font-bold text-slate-700 mt-1">First Aid Qualifications Refreshers</p>
                <p className="text-[10px] text-slate-455 mt-1">Instructors must renew certifications before summer semester.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
