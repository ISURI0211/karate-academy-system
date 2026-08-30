'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FaClipboardCheck, FaCalendarAlt, FaCalendarCheck, FaSpinner, 
  FaCheckCircle, FaUserCheck, FaUserTimes, FaExclamationTriangle, FaTimes,
  FaTable, FaListUl, FaSearch
} from 'react-icons/fa';
import { motion } from 'framer-motion';

// Color Palette for Belt Ranks
const BELT_COLORS: Record<string, string> = {
  White: 'bg-slate-100 text-slate-700 border-slate-200',
  Yellow: 'bg-yellow-50 text-yellow-750 border-yellow-205',
  Orange: 'bg-orange-50 text-orange-755 border-orange-205',
  Green: 'bg-emerald-50 text-emerald-700 border-emerald-205',
  Blue: 'bg-blue-50 text-blue-700 border-blue-205',
  Purple: 'bg-purple-50 text-purple-700 border-purple-205',
  'Brown (3rd Kyu)': 'bg-amber-100 text-amber-800 border-amber-300',
  'Brown (2nd Kyu)': 'bg-amber-200 text-amber-900 border-amber-400',
  'Brown (1st Kyu)': 'bg-amber-300 text-amber-955 border-amber-500',
  'Black (1st Dan)': 'bg-slate-900 text-slate-50 border-slate-950',
  'Black (2nd Dan)': 'bg-slate-950 text-slate-100 border-slate-950',
  'Black (3rd Dan)': 'bg-black text-white border-black'
};

interface ClassData {
  id: number;
  name: string;
  location: string;
  class_date: string;
}

interface StudentAttendance {
  student_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
  attendance_status: 'present' | 'absent' | 'excused' | null;
  attendance_id: number | null;
}

interface MonthlyStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
}

interface MonthlyRecord {
  id: number;
  student_id: number;
  attendance_date: string;
  status: 'present' | 'absent' | 'excused';
}

// Local date helpers without timezone offset shifts
const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalMonthString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = parts[2] ? Number(parts[2]) : 1;
  return new Date(year, month - 1, day);
};

const formatWeekdayShort = (dateStr: string) => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatFullDateDisplay = (dateStr: string) => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export default function InstructorAttendancePage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Dates & Months (initialized to user's local date/month)
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthString());
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  // Daily Roster states
  const [roster, setRoster] = useState<StudentAttendance[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [markedCount, setMarkedCount] = useState({ present: 0, absent: 0, excused: 0, unmarked: 0 });

  // Monthly Matrix states
  const [monthlyStudents, setMonthlyStudents] = useState<MonthlyStudent[]>([]);
  const [monthlyDates, setMonthlyDates] = useState<string[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyRecord[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Load instructor scheduled classes
  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const res = await fetch('/api/instructor/classes');
      const data = await res.json();
      if (data.success) {
        setClasses(data.classes || []);
        if (data.classes?.length > 0) {
          setSelectedClassId(String(data.classes[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load instructor classes list', err);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // Recalculate daily status counters
  useEffect(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    let unmarked = 0;

    roster.forEach(r => {
      if (r.attendance_status === 'present') present++;
      else if (r.attendance_status === 'absent') absent++;
      else if (r.attendance_status === 'excused') excused++;
      else unmarked++;
    });

    setMarkedCount({ present, absent, excused, unmarked });
  }, [roster]);

  // Sync date picker with selected month if date falls outside
  useEffect(() => {
    if (selectedDate.slice(0, 7) !== selectedMonth) {
      const todayLocal = getLocalDateString();
      if (todayLocal.slice(0, 7) === selectedMonth) {
        setSelectedDate(todayLocal);
      } else {
        setSelectedDate(`${selectedMonth}-01`);
      }
    }
  }, [selectedMonth]);

  // Load daily roster
  const handleLoadRoster = async () => {
    if (!selectedClassId || !selectedDate) return;
    setLoadingRoster(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/attendance?classId=${selectedClassId}&date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setRoster(data.attendance || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve class roster.');
      }
    } catch (err) {
      setErrorMsg('Failed to load roster.');
    } finally {
      setLoadingRoster(false);
    }
  };

  // Load monthly matrix
  const handleLoadMonthlyMatrix = async () => {
    if (!selectedClassId || !selectedMonth) return;
    setLoadingMonthly(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/attendance?classId=${selectedClassId}&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setMonthlyStudents(data.students || []);
        setMonthlyDates(data.dates || []);
        setMonthlyRecords(data.monthlyRecords || []);
      } else {
        setErrorMsg(data.error || 'Failed to retrieve monthly ledger.');
      }
    } catch (err) {
      setErrorMsg('Failed to load monthly matrix.');
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Trigger loads when parameters change
  useEffect(() => {
    if (selectedClassId && selectedMonth) {
      handleLoadMonthlyMatrix();
    }
  }, [selectedClassId, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'daily') {
      handleLoadRoster();
    } else {
      handleLoadMonthlyMatrix();
    }
  }, [selectedClassId, selectedDate, activeTab]);

  // Set individual student status locally
  const handleSetStatus = (studentId: number, status: 'present' | 'absent' | 'excused') => {
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, attendance_status: status };
      }
      return s;
    }));
  };

  // Quick mark all present
  const handleMarkAllPresent = () => {
    setRoster(prev => prev.map(s => ({ ...s, attendance_status: 'present' })));
  };

  // Sync / Save attendance
  const handleSaveAttendance = async () => {
    if (roster.length === 0) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const records = roster.map(r => ({
      student_id: r.student_id,
      status: r.attendance_status || 'absent'
    }));

    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          attendance_date: selectedDate,
          records
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Attendance for ${formatFullDateDisplay(selectedDate)} saved successfully.`);
        handleLoadRoster();
        handleLoadMonthlyMatrix();
      } else {
        setErrorMsg(data.error || 'Failed to save attendance logs.');
      }
    } catch (err) {
      setErrorMsg('Failed to sync sheet with database.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to get a student's status on a specific date from monthly records
  const getMonthlyStatus = (studentId: number, dateStr: string) => {
    const rec = monthlyRecords.find(r => r.student_id === studentId && r.attendance_date === dateStr);
    return rec ? rec.status : null;
  };

  // Helper for monthly stats per student
  const getStudentMonthlyStats = (studentId: number) => {
    const studentRecs = monthlyRecords.filter(r => r.student_id === studentId);
    const present = studentRecs.filter(r => r.status === 'present').length;
    const absent = studentRecs.filter(r => r.status === 'absent').length;
    const excused = studentRecs.filter(r => r.status === 'excused').length;
    const totalSessions = monthlyDates.length;
    const rate = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;
    return { present, absent, excused, rate };
  };

  // Filter monthly students by search query
  const filteredMonthlyStudents = monthlyStudents.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(matrixSearch.toLowerCase()) ||
    s.belt_rank.toLowerCase().includes(matrixSearch.toLowerCase()) ||
    String(s.student_id).includes(matrixSearch)
  );

  const formatMonthTitle = (monthStr: string) => {
    if (!monthStr) return '';
    const date = parseLocalDate(`${monthStr}-01`);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <FaClipboardCheck className="text-amber-500" /> Attendance Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">Log class presenteeism and review monthly student attendance progress</p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'daily'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FaListUl size={11} /> Daily Roll Call
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'monthly'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FaTable size={11} /> Monthly Matrix
          </button>
        </div>
      </div>

      {/* Alert Boxes */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <FaTimes className="text-rose-500" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <FaCheckCircle className="text-emerald-500" /> {successMsg}
        </div>
      )}

      {/* Selection controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Class Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Class</label>
          <div className="relative">
            {loadingClasses ? (
              <div className="w-full h-9 bg-slate-50 animate-pulse rounded-xl border border-slate-200/60" />
            ) : classes.length > 0 ? (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.location})</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-450 italic">
                No assigned classes scheduled
              </div>
            )}
          </div>
        </div>

        {/* Month Selection */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Attendance Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none"
          />
        </div>

        {/* Date Selection (Daily Tab) or Filter Student (Monthly Tab) */}
        {activeTab === 'daily' ? (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Attendance Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-805 focus:outline-none"
            />
            {/* Quick Session Pills for Days Recorded in this Month */}
            {monthlyDates.length > 0 && (
              <div className="mt-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Sessions in {formatMonthTitle(selectedMonth)} ({monthlyDates.length}):
                </span>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {monthlyDates.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        selectedDate === d
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {d.slice(8, 10)} {formatWeekdayShort(d)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Filter Student</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FaSearch size={11} />
              </span>
              <input
                type="text"
                placeholder="Search matrix..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= DAILY ROLL CALL TAB ================= */}
      {activeTab === 'daily' && (
        loadingRoster ? (
          <div className="p-12 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-3">
            <FaSpinner className="animate-spin text-lg text-amber-500" />
            <span className="text-xs font-bold">Retrieving class roll...</span>
          </div>
        ) : roster.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Roster Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] overflow-hidden lg:col-span-3">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800">
                  Class Roll List -- {formatFullDateDisplay(selectedDate)}
                </h3>
                <button
                  onClick={handleMarkAllPresent}
                  className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-wider"
                >
                  Mark All Present
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-50/20">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Belt Rank</th>
                      <th className="px-6 py-4 text-center">Attendance Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map((student) => (
                      <tr key={student.student_id} className="hover:bg-slate-50/30 transition-colors">
                        {/* Name & Avatar */}
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 border border-slate-200">
                              {student.first_name.slice(0, 1)}{student.last_name.slice(0, 1)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 leading-tight">
                                {student.first_name} {student.last_name}
                              </p>
                              <span className="text-[11px] font-mono font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shadow-sm inline-block mt-1">
                                ID: #{student.student_id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Belt rank */}
                        <td className="px-6 py-3">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${BELT_COLORS[student.belt_rank] || 'bg-slate-100 border-slate-200'}`}>
                            {student.belt_rank}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSetStatus(student.student_id, 'present')}
                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                                student.attendance_status === 'present'
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-700 shadow-sm'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400'
                              }`}
                            >
                              <FaUserCheck size={9} /> Present
                            </button>
                            <button
                              onClick={() => handleSetStatus(student.student_id, 'absent')}
                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                                student.attendance_status === 'absent'
                                  ? 'bg-rose-50 border-rose-250 text-rose-700 shadow-sm'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400'
                              }`}
                            >
                              <FaUserTimes size={9} /> Absent
                            </button>
                            <button
                              onClick={() => handleSetStatus(student.student_id, 'excused')}
                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                                student.attendance_status === 'excused'
                                  ? 'bg-amber-50 border-amber-250 text-amber-700 shadow-sm'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400'
                              }`}
                            >
                              <FaExclamationTriangle size={8} /> Excused
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sync bar */}
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="px-6 py-2 bg-slate-900 hover:bg-amber-650 disabled:opacity-60 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2"
                >
                  {saving ? <FaSpinner className="animate-spin" size={10} /> : null} Sync Attendance
                </button>
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-2">
                <FaClipboardCheck className="text-slate-450" /> Sheet Stats
              </h3>
              
              <div className="space-y-3 font-semibold text-slate-600">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Present</span>
                  <span className="font-extrabold text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded text-[11px]">{markedCount.present}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Absent</span>
                  <span className="font-extrabold text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded text-[11px]">{markedCount.absent}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Excused</span>
                  <span className="font-extrabold text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded text-[11px]">{markedCount.excused}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50">
                  <span className="text-slate-450 font-bold">Unmarked</span>
                  <span className="font-extrabold text-red-650 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[11px]">{markedCount.unmarked}</span>
                </div>
              </div>

              {markedCount.unmarked > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-700 leading-normal font-semibold">
                  Note: {markedCount.unmarked} student{markedCount.unmarked !== 1 ? 's are' : ' is'} unmarked. Unmarked records default to Absent upon database sync.
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="p-12 bg-white rounded-xl border border-slate-100 text-center text-slate-400">
            <p className="text-xs font-semibold">Roster is empty.</p>
            <p className="text-[10px] text-slate-350 mt-1">Pick a scheduled class and date to log attendance sheets.</p>
          </div>
        )
      )}

      {/* ================= MONTHLY MATRIX LEDGER TAB ================= */}
      {activeTab === 'monthly' && (
        loadingMonthly ? (
          <div className="p-12 bg-white rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-3">
            <FaSpinner className="animate-spin text-lg text-amber-500" />
            <span className="text-xs font-bold">Generating monthly attendance matrix...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info bar */}
            <div className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Monthly Attendance Matrix -- {formatMonthTitle(selectedMonth)}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Overview of all recorded class sessions for {monthlyStudents.length} enrolled student{monthlyStudents.length !== 1 ? 's' : ''} in {monthlyDates.length} session{monthlyDates.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Present (P)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Absent (A)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Excused (E)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> Unmarked (-)</span>
              </div>
            </div>

            {/* Matrix Table */}
            {filteredMonthlyStudents.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)] overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-50/60">
                      <th className="px-4 py-3 sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#f1f5f9] z-10">Student</th>
                      <th className="px-3 py-3">Belt</th>
                      
                      {/* Dates as columns */}
                      {monthlyDates.length > 0 ? (
                        monthlyDates.map(d => (
                          <th key={d} className="px-3 py-3 text-center whitespace-nowrap min-w-[56px]">
                            <span className="block font-black text-slate-700">{d.slice(8, 10)}</span>
                            <span className="block text-[8px] text-slate-400 font-bold">{formatWeekdayShort(d)}</span>
                          </th>
                        ))
                      ) : (
                        <th className="px-4 py-3 text-center text-slate-400 italic">No Sessions Logged</th>
                      )}

                      <th className="px-4 py-3 text-center bg-slate-50/80 font-bold border-l border-slate-100">Monthly Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                    {filteredMonthlyStudents.map(student => {
                      const stats = getStudentMonthlyStats(student.student_id);
                      return (
                        <tr key={student.student_id} className="hover:bg-slate-50/40 transition-colors">
                          {/* Student Name */}
                          <td className="px-4 py-3 sticky left-0 bg-white shadow-[1px_0_0_0_#f1f5f9] z-10">
                            <p className="font-bold text-slate-800 text-xs">
                              {student.first_name} {student.last_name}
                            </p>
                            <span className="text-[11px] font-mono font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-1">
                              ID: #{student.student_id}
                            </span>
                          </td>

                          {/* Belt */}
                          <td className="px-3 py-3">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${BELT_COLORS[student.belt_rank] || 'bg-slate-100 border-slate-200'}`}>
                              {student.belt_rank}
                            </span>
                          </td>

                          {/* Status for each date */}
                          {monthlyDates.length > 0 ? (
                            monthlyDates.map(d => {
                              const st = getMonthlyStatus(student.student_id, d);
                              return (
                                <td key={d} className="px-2 py-3 text-center">
                                  {st === 'present' ? (
                                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center font-bold text-[10px]" title={`Present on ${formatFullDateDisplay(d)}`}>
                                      P
                                    </span>
                                  ) : st === 'absent' ? (
                                    <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center justify-center font-bold text-[10px]" title={`Absent on ${formatFullDateDisplay(d)}`}>
                                      A
                                    </span>
                                  ) : st === 'excused' ? (
                                    <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center justify-center font-bold text-[10px]" title={`Excused on ${formatFullDateDisplay(d)}`}>
                                      E
                                    </span>
                                  ) : (
                                    <span className="w-6 h-6 rounded-lg bg-slate-50 text-slate-350 border border-slate-200/50 inline-flex items-center justify-center font-bold text-[10px]">
                                      -
                                    </span>
                                  )}
                                </td>
                              );
                            })
                          ) : (
                            <td className="px-4 py-3 text-center text-slate-400 italic text-[11px]">
                              No class dates recorded in {selectedMonth}
                            </td>
                          )}

                          {/* Monthly Summary Rate */}
                          <td className="px-4 py-3 text-center bg-slate-50/40 border-l border-slate-100">
                            <div className="flex flex-col items-center">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                                stats.rate >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                stats.rate >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {stats.rate}%
                              </span>
                              <span className="text-[8px] text-slate-400 mt-0.5 font-medium">
                                {stats.present}/{monthlyDates.length} sessions
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-xl border border-slate-100 text-center text-slate-400">
                <p className="text-xs font-semibold">No students found in this monthly ledger.</p>
              </div>
            )}
          </div>
        )
      )}

    </div>
  );
}
