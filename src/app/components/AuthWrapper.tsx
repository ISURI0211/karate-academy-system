'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || status === 'loading') return;

    const isAuthPath = pathname === '/auth' || pathname?.startsWith('/auth/');
    const isApiPath = pathname?.startsWith('/api/');
    
    const handleRouting = async () => {
      if (!session && !isAuthPath && !isApiPath) {
        setIsRedirecting(true);
        router.push('/auth');
      } else if (session) {
        if (isAuthPath) {
          setIsRedirecting(true);
          const userRole = session.user.role;
          // Route based on user role
          if (userRole === 'admin') {
            router.push('/dashboard/admin-dashboard');
          } else if (userRole === 'instructor') {
            router.push('/dashboard/instructor-dashboard');
          } else if (userRole === 'student') {
            router.push('/dashboard/student-dashboard');
          } else {
            router.push('/auth?error=InvalidRole');
          }
        } else {
          const userRole = session.user.role;
          
          // Protect dashboard routes based on roles
          if (pathname?.startsWith('/dashboard/admin-dashboard') && userRole !== 'admin') {
            setIsRedirecting(true);
            router.push('/auth?error=AccessDenied');
          } else if (pathname?.startsWith('/dashboard/instructor-dashboard') && userRole !== 'instructor') {
            setIsRedirecting(true);
            router.push('/auth?error=AccessDenied');
          } else if (pathname?.startsWith('/dashboard/student-dashboard') && userRole !== 'student') {
            setIsRedirecting(true);
            router.push('/auth?error=AccessDenied');
          } else {
            setIsRedirecting(false);
          }
        }
      } else {
        setIsRedirecting(false);
      }
    };

    handleRouting();
  }, [mounted, session, status, pathname, router]);

  // Show premium loading state
  if (!mounted || status === 'loading' || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20">
            {/* Spinning martial arts themed ring */}
            <div className="absolute inset-0 border-4 border-t-red-600 border-r-yellow-500 border-b-zinc-800 border-l-zinc-800 rounded-full animate-spin"></div>
            {/* Center fist/yin-yang icon or placeholder logo */}
            <div className="absolute inset-2 bg-zinc-900 rounded-full flex items-center justify-center font-bold text-lg text-red-500">
              K
            </div>
          </div>
          <p className="text-zinc-400 font-medium tracking-wide mt-6 animate-pulse">
            {!mounted || status === 'loading' 
              ? "Checking training session..." 
              : "Stepping onto the dojo mat..."}
          </p>
        </div>
      </div>
    );
  }

  // Authentication check is complete and no redirect needed, render children
  return children;
}