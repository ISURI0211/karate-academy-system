'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FaTachometerAlt, FaUsers, FaChalkboardTeacher, FaCalendarAlt,
  FaClipboardCheck, FaGraduationCap, FaMoneyBillWave, FaTrophy,
  FaBook, FaChartBar, FaSignOutAlt, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

const navigationGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', icon: FaTachometerAlt, href: '/dashboard/admin-dashboard' },
      { name: 'Reports', icon: FaChartBar, href: '/dashboard/admin-dashboard/reports' },
    ]
  },
  {
    title: 'Directory',
    items: [
      { name: 'Students', icon: FaUsers, href: '/dashboard/admin-dashboard/students' },
      { name: 'Instructors', icon: FaChalkboardTeacher, href: '/dashboard/admin-dashboard/instructors' },
    ]
  },
  {
    title: 'Training',
    items: [
      { name: 'Classes & Schedules', icon: FaCalendarAlt, href: '/dashboard/admin-dashboard/classes' },
      { name: 'Attendance', icon: FaClipboardCheck, href: '/dashboard/admin-dashboard/attendance' },
      { name: 'Belt Grading', icon: FaGraduationCap, href: '/dashboard/admin-dashboard/grading' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Fees & Payments', icon: FaMoneyBillWave, href: '/dashboard/admin-dashboard/fees' },
      { name: 'Events & Tournaments', icon: FaTrophy, href: '/dashboard/admin-dashboard/events' },
      { name: 'Resources', icon: FaBook, href: '/dashboard/admin-dashboard/resources' },
    ]
  }
];

export default function AdminSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const username = session?.user?.username ?? 'Admin';
  const initials = username.slice(0, 2).toUpperCase();

  const ToriiIcon = () => (
    <svg className="w-5 h-5 text-red-600 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M6 6v14" />
      <path d="M18 6v14" />
      <path d="M8 11h8" />
      <path d="M5 3h14" />
    </svg>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-50/50 backdrop-blur-md">
      {/* Header / Brand */}
      <div className={`flex items-center gap-3 px-6 py-6 border-b border-slate-100/80 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <ToriiIcon />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-800 leading-none">Ryu Jokan</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-600 mt-1 leading-none">Academy Portal</span>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            {!collapsed ? (
              <p className="px-3.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                {group.title}
              </p>
            ) : (
              <div className="border-t border-slate-200/50 my-3.5 first:hidden" />
            )}
            <nav className="space-y-2">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard/admin-dashboard' && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 relative
                      ${isActive
                        ? 'bg-white text-slate-900 border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-red-600 rounded-r-full"></span>
                    )}
                    <Icon className={`flex-shrink-0 text-base transition-colors duration-200 ${isActive ? 'text-red-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Session profile area */}
      <div className="p-4 border-t border-slate-100 bg-white/70">
        <div className={`flex items-center justify-between gap-3 ${collapsed ? 'flex-col' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">{username}</p>
                <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Admin</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: '/auth' })}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <FaSignOutAlt className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200/70 transition-all duration-300 ${collapsed ? 'w-[78px]' : 'w-64'} flex-shrink-0 relative z-30`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 z-40 w-6 h-6 bg-white border border-slate-200/80 rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:bg-slate-50 transition-colors"
        >
          {collapsed
            ? <FaChevronRight className="text-slate-400 text-[8px]" />
            : <FaChevronLeft className="text-slate-400 text-[8px]" />
          }
        </button>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/20 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Toggle Button */}
      <button
        id="admin-mobile-sidebar-toggle"
        className="hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      />
    </>
  );
}
