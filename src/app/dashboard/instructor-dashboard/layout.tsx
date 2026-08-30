'use client';

import React from 'react';
import InstructorSidebar from '@/app/components/InstructorSidebar';
import Topbar from '@/app/components/Topbar';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-slate-50 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <InstructorSidebar />

      {/* Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Centralized Topbar */}
        <Topbar
          title="Instructor Panel"
          role="instructor"
          roleLabel="Sensei Instructor"
          mobileToggleId="instructor-mobile-sidebar-toggle"
          accentColor="amber"
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
