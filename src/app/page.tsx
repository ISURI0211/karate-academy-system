'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();

  useEffect(() => {
    // Skip if still loading
    if (status === 'loading') return;

    // Handle authenticated users
    if (status === 'authenticated' && session?.user) {
      const userRole = session.user.role;
      
      // Redirect based on role
      if (userRole === 'admin') {
        window.location.href = '/dashboard/admin-dashboard';
      } else if (userRole === 'instructor') {
        window.location.href = '/dashboard/instructor-dashboard';
      } else if (userRole === 'student') {
        window.location.href = '/dashboard/student-dashboard';
      } else {
        window.location.href = '/auth?error=InvalidRole';
      }
      return;
    }

    // Handle unauthenticated users
    window.location.href = '/auth';
  }, [session, status]);

  // Premium loading state during initial redirection check
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="flex flex-col items-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-t-red-600 border-r-yellow-500 border-b-zinc-800 border-l-zinc-800 rounded-full animate-spin"></div>
        </div>
        <p className="text-zinc-400 font-medium tracking-wide mt-4 animate-pulse">
          Entering Smart Karate Dojo...
        </p>
      </div>
    </div>
  );
}
