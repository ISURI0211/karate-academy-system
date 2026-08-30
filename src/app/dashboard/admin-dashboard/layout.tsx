'use client';

import React from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import Topbar from '@/app/components/Topbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-slate-50 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Centralized Topbar */}
        <Topbar
          title="Admin Dashboard"
          role="admin"
          roleLabel="Administrator"
          mobileToggleId="admin-mobile-sidebar-toggle"
          accentColor="red"
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
