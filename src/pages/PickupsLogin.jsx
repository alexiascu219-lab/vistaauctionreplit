import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import PickupsHeader from '../components/PickupsHeader';
import Toast from '../components/Toast';
import { getSession, login as apiLogin } from '../lib/pickupsApi';

const PickupsLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip straight to the dashboard.
  useEffect(() => {
    if (getSession()?.token) navigate('/pickups/manager', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      setToast({ message: 'Enter your username and password', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await apiLogin(username, password);
      navigate('/pickups/manager', { replace: true });
    } catch (err) {
      setToast({ message: err.message || 'Something went wrong. Please try again.', type: 'error' });
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
            <h1 className="text-2xl font-black text-slate-900 font-display">Manager Sign-In</h1>
            <p className="text-sm text-slate-500 font-medium mt-1.5">Pickups Department · review queue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className={inputCls}
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        </motion.div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default PickupsLogin;
