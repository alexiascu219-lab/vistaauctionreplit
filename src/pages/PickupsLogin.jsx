import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import PickupsHeader from '../components/PickupsHeader';
import Toast from '../components/Toast';
import { MANAGER_ACCESS_CODE, MANAGER_SESSION_KEY } from '../config/pickupsConfig';

const PickupsLogin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
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

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      setToast({ message: 'Enter your name', type: 'error' });
      return;
    }
    if (code.trim().toLowerCase() !== MANAGER_ACCESS_CODE.toLowerCase()) {
      setToast({ message: 'Incorrect access code', type: 'error' });
      return;
    }
    setSubmitting(true);
    localStorage.setItem(
      MANAGER_SESSION_KEY,
      JSON.stringify({ authed: true, name: name.trim(), at: Date.now() }),
    );
    navigate('/pickups/manager', { replace: true });
  };

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
          className="glass-panel rounded-[2rem] p-8 sm:p-10"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <ShieldCheck size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-display">Manager Sign-In</h1>
            <p className="text-sm text-slate-500 font-medium mt-1.5">Pickups Department · review queue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                Your Name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan M."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                Access Code
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Manager access code"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-60"
            >
              Enter Queue <ArrowRight size={16} />
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 font-medium mt-6">
            Managers only. Ask a department lead for the access code.
          </p>
        </motion.div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default PickupsLogin;
