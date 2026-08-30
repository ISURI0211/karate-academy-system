'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserGraduate, FaSearch, FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';

export interface StudentRosterItem {
  id: number;
  first_name: string;
  last_name: string;
  belt_rank: string;
}

interface StudentSearchSelectProps {
  studentsList: StudentRosterItem[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  accentColor?: 'sky' | 'amber';
}

export default function StudentSearchSelect({
  studentsList,
  selectedStudentId,
  onSelectStudent,
  accentColor = 'sky'
}: StudentSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedStudent = studentsList.find((s) => String(s.id) === String(selectedStudentId)) || studentsList[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter students by ID, Name, or Belt Rank
  const filteredStudents = studentsList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const idStr = String(s.id);
    const beltStr = (s.belt_rank || '').toLowerCase();
    return (
      idStr.includes(q) ||
      fullName.includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      beltStr.includes(q)
    );
  });

  const isAmber = accentColor === 'amber';
  const ringColorClass = isAmber ? 'focus:ring-amber-500/20' : 'focus:ring-sky-500/20';
  const activeBgClass = isAmber ? 'bg-amber-50 text-amber-900' : 'bg-sky-50 text-sky-900';
  const badgeBgClass = isAmber ? 'bg-amber-100/70 text-amber-800' : 'bg-sky-100/70 text-sky-800';
  const checkColorClass = isAmber ? 'text-amber-600' : 'text-sky-600';

  return (
    <div className="relative flex-1 md:w-80" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-sm focus:outline-none"
      >
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <FaUserGraduate className="text-slate-400 flex-shrink-0" size={12} />
          {selectedStudent ? (
            <div className="flex items-center gap-2 truncate">
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase ${badgeBgClass}`}>
                ID #{selectedStudent.id}
              </span>
              <span className="truncate font-black">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold truncate hidden sm:inline">
                ({selectedStudent.belt_rank || 'White Belt'})
              </span>
            </div>
          ) : (
            <span className="text-slate-400">Select Athlete...</span>
          )}
        </div>
        <FaChevronDown
          size={9}
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-80"
          >
            {/* Search Input Box */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
              <FaSearch className="text-slate-400 ml-1 flex-shrink-0" size={11} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, name, or belt..."
                className={`w-full bg-white px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${ringColorClass}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>

            {/* Student Results List */}
            <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => {
                  const isSelected = String(s.id) === String(selectedStudent?.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelectStudent(String(s.id));
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left ${
                        isSelected ? activeBgClass : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/80 rounded-md text-[10px] font-black text-slate-600 flex-shrink-0">
                          #{s.id}
                        </span>
                        <div className="truncate">
                          <span className="block truncate">
                            {s.first_name} {s.last_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {s.belt_rank || 'White Belt'}
                          </span>
                        </div>
                      </div>
                      {isSelected && <FaCheck className={checkColorClass} size={11} />}
                    </button>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs font-semibold text-slate-400">
                  No athlete found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-400 font-bold text-center">
              Showing {filteredStudents.length} of {studentsList.length} Athletes
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
