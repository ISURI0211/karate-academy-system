'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaChalkboardTeacher, FaUser, FaEnvelope, FaLock, FaPhone, 
  FaExclamationTriangle, FaCheckCircle, FaArrowLeft, FaAward 
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstructorRegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    qualifications: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (
      !form.username.trim() || 
      !form.email.trim() || 
      !form.password || 
      !form.first_name.trim() || 
      !form.last_name.trim()
    ) {
      setError('Please fill in all required credentials and profile details.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/instructor-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          qualifications: form.qualifications.trim()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Instructor registration failed.');
      } else {
        setSuccess('Instructor account created successfully! Redirecting to login...');
        setTimeout(() => router.push('/auth'), 1800);
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-zinc-900/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        {/* Back Button */}
        <button
          onClick={() => router.push('/auth')}
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-sm group"
        >
          <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Login</span>
        </button>

        {/* Card Panel */}
        <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <FaChalkboardTeacher className="text-amber-500" /> Instructor Registration
            </h2>
            <p className="text-zinc-400 text-sm">Register your sensei account to manage classes, mark attendance, and evaluate students.</p>
          </div>

          {/* Messages */}
          <AnimatePresence mode="wait">
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

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded-xl flex items-start gap-3 text-sm"
              >
                <FaCheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Credentials Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-500 transition-colors">
                    <FaUser size={14} />
                  </div>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    className="block w-full pl-8 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                    placeholder="sensei_john"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-500 transition-colors">
                    <FaEnvelope size={14} />
                  </div>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="block w-full pl-8 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                    placeholder="john@academy.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Profile Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="block w-full px-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                  placeholder="John"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className="block w-full px-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            {/* Phone & Qualifications */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">Phone Number (Optional)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-500 transition-colors">
                    <FaPhone size={12} />
                  </div>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="block w-full pl-9 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">Qualifications (Optional)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 pt-3 pointer-events-none text-zinc-500 group-focus-within:text-amber-500 transition-colors">
                    <FaAward size={14} />
                  </div>
                  <textarea
                    value={form.qualifications}
                    onChange={(e) => updateField('qualifications', e.target.value)}
                    className="block w-full pl-9 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                    placeholder="e.g. 4th Dan Black Belt, Kyokushin, 8 years teaching experience."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-500 transition-colors">
                    <FaLock size={14} />
                  </div>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="block w-full pl-8 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-300">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-500 transition-colors">
                    <FaLock size={14} />
                  </div>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="block w-full pl-8 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Control */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-white font-semibold text-sm shadow-lg
                ${isLoading 
                  ? 'bg-zinc-800 cursor-not-allowed text-zinc-500 border border-zinc-700' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:from-amber-600 active:to-orange-700 border border-amber-500/20'
                } transition-all duration-150`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FaChalkboardTeacher />
                  <span>Register Instructor Profile</span>
                </div>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
