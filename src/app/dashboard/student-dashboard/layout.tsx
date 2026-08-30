'use client';

import React from 'react';
import StudentSidebar from '@/app/components/StudentSidebar';
import Topbar from '@/app/components/Topbar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-slate-50 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <StudentSidebar />

      {/* Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Centralized Topbar */}
        <Topbar
          title="Student Dashboard"
          role="student"
          roleLabel="Dojo Member"
          mobileToggleId="student-mobile-sidebar-toggle"
          accentColor="sky"
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
