'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaUser, FaLock, FaSignInAlt, FaExclamationTriangle, FaCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

function LoginContent() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, data: session } = useSession();

  // Handle URL errors (like access denied, configuration, etc.)
  useEffect(() => {
    const errorType = searchParams?.get('error');
    if (errorType) {
      switch (errorType) {
        case 'Configuration':
          setError('System configuration error. Please contact the administrator.');
          break;
        case 'CredentialsSignin':
          setError('Invalid credentials. Double check your username/email and password.');
          break;
        case 'AccessDenied':
          setError('Access Denied. You do not have permission to view that section.');
          break;
        case 'InvalidRole':
          setError('Authenticated role is unrecognized. Please contact admin.');
          break;
        default:
          setError(`Authentication error: ${errorType}`);
      }
    }
  }, [searchParams]);

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = session.user.role;
      if (role === 'admin') {
        router.push('/dashboard/admin-dashboard');
      } else if (role === 'instructor') {
        router.push('/dashboard/instructor-dashboard');
      } else if (role === 'student') {
        router.push('/dashboard/student-dashboard');
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        identifier: identifier.trim(),
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid username/email or password.');
        setIsLoading(false);
      } else if (result?.ok) {
        // Redirection will be handled by the useEffect watching session status
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row text-white overflow-hidden font-sans">
      {/* Left side - Martial Arts Brand Hero */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-950 to-red-950 p-12 relative flex-col justify-between border-r border-zinc-800">
        {/* Subtle glowing lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Logo/Header info */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-2xl font-bold tracking-widest text-red-500">RYU JOKAN</span>
          <span className="h-4 w-px bg-zinc-700"></span>
          <span className="text-xs uppercase tracking-widest text-zinc-400">Karate Academy</span>
        </div>

        {/* Branding graphics and slogans */}
        <div className="relative z-10 my-auto space-y-8 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            {/* Beautiful SVG Enso Circle + Kick Silhouette */}
            <div className="w-48 h-48 mb-6 relative">
              <svg viewBox="0 0 200 200" className="w-full h-full text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                {/* Enso brush circle */}
                <path
                  d="M 100 20 A 80 80 0 1 1 90 20.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="450"
                  className="animate-[dash_3s_ease-in-out_infinite]"
                  style={{
                    strokeDashoffset: 0,
                    transformOrigin: 'center'
                  }}
                />
                {/* Silhouette Karate Kick */}
                <path
                  d="M95 125 L92 110 L94 95 L91 88 L85 86 L80 89 L76 85 L84 75 L95 82 L103 68 L111 65 L106 78 L122 75 L145 68 L162 60 L170 57 L163 68 L152 75 L135 88 L124 99 L115 110 L108 125 Z"
                  fill="white"
                />
              </svg>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Smart Karate Training <br/>& Academy Portal
            </h1>
            <p className="text-zinc-400 text-lg">
              Manage classes, monitor grading requirements, track attendance, and log belt progressions seamlessly.
            </p>
          </motion.div>

          <div className="space-y-4 text-sm text-zinc-400">
            <div className="flex items-center gap-3">
              <FaCircle className="text-red-500 text-[8px]" />
              <span>Dedicated student progress dashboards.</span>
            </div>
            <div className="flex items-center gap-3">
              <FaCircle className="text-amber-500 text-[8px]" />
              <span>Digital attendance marking and feedback.</span>
            </div>
            <div className="flex items-center gap-3">
              <FaCircle className="text-red-500 text-[8px]" />
              <span>Grading exams eligibility tracking.</span>
            </div>
            <div className="flex items-center gap-3">
              <FaCircle className="text-amber-500 text-[8px]" />
              <span>Automated fee ledger and billing.</span>
            </div>
          </div>
        </div>

        {/* Footer copyright */}
        <div className="text-xs text-zinc-500 relative z-10">
          &copy; {new Date().getFullYear()} Ryu Jokan Karate Academy. All rights reserved.
        </div>
      </div>

      {/* Right side - Glassmorphism Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-zinc-950 relative">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile branding */}
          <div className="md:hidden text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-red-500">RYU JOKAN KARATE</h1>
            <p className="text-zinc-400 text-sm">Academy Management System</p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <FaSignInAlt className="text-red-500" /> Welcome Back
              </h2>
              <p className="text-zinc-400 text-sm">Sign in to your karate profile</p>
            </div>

            {/* Error Message Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-red-950/50 border border-red-800 text-red-200 rounded-xl flex items-start gap-3 text-sm"
                >
                  <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username or Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-300">Username or Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                    <FaUser size={16} />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    placeholder="Enter your username or email"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-zinc-300">Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                    <FaLock size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Sign In Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={isLoading}
                className={`w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-white font-semibold text-sm shadow-lg
                  ${isLoading 
                    ? 'bg-zinc-800 cursor-not-allowed text-zinc-500 border border-zinc-700' 
                    : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:from-red-700 active:to-rose-800 border border-red-500/20'
                  } transition-all duration-150`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verifying details...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FaSignInAlt />
                    <span>Sign In</span>
                  </div>
                )}
              </motion.button>
            </form>

            <div className="border-t border-zinc-800/80 pt-6 text-center space-y-3">
              <p className="text-zinc-400 text-xs">
                New student?{' '}
                <a href="/auth/register" className="text-red-500 hover:text-red-400 hover:underline font-medium">
                  Register student profile here
                </a>
              </p>
              <p className="text-zinc-400 text-xs">
                New instructor?{' '}
                <a href="/auth/instructor-register" className="text-amber-500 hover:text-amber-400 hover:underline font-medium">
                  Register instructor profile here
                </a>
              </p>
              <p className="text-zinc-500 text-[10px]">
                Academy administrator?{' '}
                <a href="/auth/admin-register" className="text-zinc-400 hover:text-white hover:underline">
                  Register admin
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="animate-pulse">Loading login...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
