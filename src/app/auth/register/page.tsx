'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUser, FaEnvelope, FaLock, FaAddressCard, FaPhone, 
  FaExclamationTriangle, FaCheckCircle, FaArrowLeft, FaArrowRight, FaCalendarAlt, FaIdBadge
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentRegisterPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  // Form State
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    dob: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.username.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
        setError('Please fill in all credentials fields.');
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
    } else if (step === 2) {
      if (!form.first_name.trim() || !form.last_name.trim() || !form.dob) {
        setError('First name, last name, and date of birth are required.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.emergency_contact_name.trim() || !form.emergency_contact_phone.trim()) {
      setError('Emergency contact details are required for karate student enrollment.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          dob: form.dob,
          address: form.address.trim(),
          emergency_contact_name: form.emergency_contact_name.trim(),
          emergency_contact_phone: form.emergency_contact_phone.trim()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Student registration failed.');
      } else {
        setSuccess('Student account and training profile created! Redirecting to login...');
        setTimeout(() => router.push('/auth'), 2000);
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
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Back to login */}
        {step === 1 && (
          <button
            onClick={() => router.push('/auth')}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-sm group"
          >
            <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Login</span>
          </button>
        )}

        <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                Enroll Student
              </h2>
              {/* Step indicator */}
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
                Step {step} of 3
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-600 to-amber-500 h-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
            <p className="text-zinc-400 text-sm">
              {step === 1 && "Configure login details to securely access your student dashboard."}
              {step === 2 && "Enter personal information to set up your academy training card."}
              {step === 3 && "Specify emergency contact details for safety on the training mats."}
            </p>
          </div>

          {/* Feedback Messages */}
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

          {/* Form Wizard Pages */}
          <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()} className="space-y-5">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Username */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Username</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaUser size={16} />
                      </div>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => updateField('username', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Choose a unique username"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Email Address</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaEnvelope size={16} />
                      </div>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaLock size={16} />
                      </div>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Minimum 6 characters"
                        required
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Confirm Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaLock size={16} />
                      </div>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Re-enter password"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-zinc-300">First Name</label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => updateField('first_name', e.target.value)}
                        className="block w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Bruce"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-zinc-300">Last Name</label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => updateField('last_name', e.target.value)}
                        className="block w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Lee"
                        required
                      />
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Date of Birth</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaCalendarAlt size={16} />
                      </div>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => updateField('dob', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Phone Number (Optional)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaPhone size={14} />
                      </div>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Home Address (Optional)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 pt-3.5 pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaAddressCard size={16} />
                      </div>
                      <textarea
                        value={form.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Enter street address, city"
                        rows={2}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Emergency Contact Name */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Emergency Contact Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaIdBadge size={16} />
                      </div>
                      <input
                        type="text"
                        value={form.emergency_contact_name}
                        onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Full name of emergency contact"
                        required
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Phone */}
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-zinc-300">Emergency Contact Phone</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-red-500 transition-colors">
                        <FaPhone size={14} />
                      </div>
                      <input
                        type="tel"
                        value={form.emergency_contact_phone}
                        onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                        placeholder="Phone number"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Controls */}
            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 py-3.5 border border-zinc-850 bg-zinc-900/60 hover:bg-zinc-800 rounded-xl text-zinc-300 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  <FaArrowLeft size={12} />
                  <span>Previous</span>
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Next Step</span>
                  <FaArrowRight size={12} />
                </button>
              ) : (
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={isLoading}
                  className={`flex-1 flex justify-center items-center py-3.5 px-4 rounded-xl text-white font-semibold text-sm shadow-lg
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
                      <span>Creating Profile...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Complete Enrollment</span>
                    </div>
                  )}
                </motion.button>
              )}
            </div>
          </form>

          {step === 1 && (
            <div className="border-t border-zinc-800/80 pt-6 text-center text-xs text-zinc-500">
              Already registered?{' '}
              <a href="/auth" className="text-red-500 hover:underline hover:text-red-400 font-medium">
                Log in here
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
