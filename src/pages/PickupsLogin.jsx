import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Mail, User, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import PickupsHeader from '../components/PickupsHeader';
import Toast from '../components/Toast';
import { MANAGER_SESSION_KEY } from '../config/pickupsConfig';

const PickupsLogin = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', invite: '' });
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip straight to the queue.
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem(MANAGER_SESSION_KEY) || 'null');
      if (session?.authed) navigate('/pickups/manager', { replace: true });
    } catch {
      /* ignore */
    }
  }, [navigate]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const startSession = (account) => {
    localStorage.setItem(
      MANAGER_SESSION_KEY,
      JSON.stringify({ authed: true, id: account.id, name: account.name, email: account.email, at: Date.now() }),
    );
    navigate('/pickups/manager', { replace: true });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.rpc('pickups_manager_login', {
          p_email: form.email,
          p_password: form.password,
        });
        if (error) throw error;
        if (data?.error) {
          setToast({ message: data.error, type: 'error' });
          return;
        }
        startSession(data);
      } else {
        const { data, error } = await supabase.rpc('pickups_manager_signup', {
          p_name: form.name,
          p_email: form.email,
          p_password: form.password,
          p_invite: form.invite,
        });
        if (error) throw error;
        if (data?.error) {
          setToast({ message: data.error, type: 'error' });
          return;
        }
        setToast({ message: 'Account created — welcome!', type: 'success' });
        startSession(data);
      }
    } catch (err) {
      console.error('Pickups manager auth error:', err);
      setToast({ message: 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <PickupsHeader />
      <div className="max-w-md mx-auto px-5 pt-36 pb-20">
        <button
          onClick={() => navigate('/pickups')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to request hub
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pickups-card rounded-[2rem] p-8 sm:p-10"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <ShieldCheck size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-display">
              {mode === 'signin' ? 'Manager Sign-In' : 'Create Manager Account'}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1.5">Pickups Department</p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-6">
            {[
              { id: 'signin', label: 'Sign in' },
              { id: 'signup', label: 'Create account' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  mode === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="Full name"
                      className={inputCls}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="Work email"
                className={inputCls}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                placeholder={mode === 'signin' ? 'Password' : 'Create a password (min 6 chars)'}
                className={inputCls}
              />
            </div>

            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      value={form.invite}
                      onChange={(e) => setField('invite', e.target.value)}
                      placeholder="Department invite code"
                      className={inputCls}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-60"
            >
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 font-medium mt-6">
            {mode === 'signin'
              ? 'New manager? Create an account with your department invite code.'
              : 'A department invite code is required to create an account.'}
          </p>
        </motion.div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default PickupsLogin;
