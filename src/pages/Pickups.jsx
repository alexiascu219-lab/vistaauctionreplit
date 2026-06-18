import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  UtensilsCrossed,
  ClipboardList,
  ScanLine,
  X,
  Send,
  ArrowRight,
  Clock,
  RefreshCw,
  ShieldCheck,
  Pencil,
  PackageCheck,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { REQUEST_TYPES, TYPE_MAP, STATUS_STYLES, summarizeRequest } from '../config/pickupsConfig';

const ICONS = { UtensilsCrossed, ClipboardList, ScanLine };

const formatTimeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const Pickups = () => {
  const [identity, setIdentity] = useState({ name: '', email: '' });
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [activeType, setActiveType] = useState(null); // request type object
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [myRequests, setMyRequests] = useState([]);

  // Load saved identity
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pickups_identity') || 'null');
      if (saved?.name) setIdentity(saved);
      else setEditingIdentity(true);
    } catch {
      setEditingIdentity(true);
    }
  }, []);

  const fetchMyRequests = useCallback(async () => {
    if (!identity.name) return;
    let query = supabase
      .from('vista_pickups_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);
    if (identity.email) query = query.eq('requester_email', identity.email.toLowerCase());
    else query = query.eq('requester_name', identity.name);
    const { data, error } = await query;
    if (!error) setMyRequests(data || []);
  }, [identity.name, identity.email]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const saveIdentity = () => {
    if (!identity.name.trim()) {
      setToast({ message: 'Please enter your name', type: 'error' });
      return;
    }
    const clean = { name: identity.name.trim(), email: identity.email.trim() };
    localStorage.setItem('pickups_identity', JSON.stringify(clean));
    setIdentity(clean);
    setEditingIdentity(false);
    setToast({ message: `You're set, ${clean.name.split(' ')[0]}!`, type: 'success' });
  };

  const openForm = (type) => {
    if (!identity.name) {
      setEditingIdentity(true);
      setToast({ message: 'Add your name before submitting requests', type: 'error' });
      return;
    }
    // Pre-fill date fields with today
    const today = new Date().toISOString().split('T')[0];
    const initial = {};
    type.fields.forEach((f) => {
      if (f.type === 'date') initial[f.name] = today;
    });
    setForm(initial);
    setActiveType(type);
  };

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const submitRequest = async () => {
    // Validate required fields
    const missing = activeType.fields.filter((f) => f.required && !form[f.name]);
    if (missing.length) {
      setToast({ message: `Please fill in: ${missing.map((f) => f.label).join(', ')}`, type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('vista_pickups_requests').insert([
        {
          type: activeType.id,
          requester_name: identity.name,
          requester_email: identity.email ? identity.email.toLowerCase() : null,
          details: form,
          status: 'Pending',
        },
      ]);
      if (error) throw error;

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#f97316', '#fbbf24', '#10b981'] });
      setToast({ message: 'Request sent to your managers!', type: 'success' });
      setActiveType(null);
      setForm({});
      fetchMyRequests();
    } catch (err) {
      console.error('Pickups submit error:', err);
      setToast({ message: 'Could not send request. Try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-4">
              <PackageCheck size={14} className="text-orange-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Pickups Department</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 font-display tracking-tight leading-none">
              Request Hub
            </h1>
            <p className="text-slate-500 font-medium mt-3 max-w-lg">
              Reservations, floor logs and Zebra tracking — submitted in seconds, straight to your managers. No more
              waiting on the old spreadsheet.
            </p>
          </div>

          {/* Identity card */}
          <div className="glass-panel rounded-3xl p-5 min-w-[260px]">
            {editingIdentity ? (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Who are you?</p>
                <input
                  autoFocus
                  value={identity.name}
                  onChange={(e) => setIdentity((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && saveIdentity()}
                  placeholder="Full name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400"
                />
                <input
                  value={identity.email}
                  onChange={(e) => setIdentity((p) => ({ ...p, email: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && saveIdentity()}
                  placeholder="Work email (optional)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400"
                />
                <button
                  onClick={saveIdentity}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/30">
                  {identity.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Submitting as</p>
                  <p className="font-black text-slate-900 truncate">{identity.name}</p>
                </div>
                <button
                  onClick={() => setEditingIdentity(true)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Change"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* The 3 main buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {REQUEST_TYPES.map((type, i) => {
            const Icon = ICONS[type.icon];
            return (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openForm(type)}
                className="group relative text-left glass-panel rounded-[2rem] p-7 overflow-hidden border border-white/70 hover:shadow-2xl transition-shadow"
              >
                <div
                  className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${type.gradient} opacity-10 group-hover:opacity-20 blur-2xl transition-opacity`}
                />
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${type.gradient} flex items-center justify-center text-white shadow-lg mb-6`}
                >
                  <Icon size={30} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1.5">{type.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">{type.blurb}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-900">
                  New request
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* My recent requests */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-slate-400" />
            My Recent Requests
          </h2>
          <button
            onClick={fetchMyRequests}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {myRequests.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center">
            <p className="text-slate-400 font-semibold">No requests yet. Tap a button above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => {
              const type = TYPE_MAP[req.type];
              const status = STATUS_STYLES[req.status] || STATUS_STYLES.Pending;
              const Icon = ICONS[type?.icon] || ClipboardList;
              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel rounded-2xl p-4 sm:p-5 flex items-start gap-4"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${type?.soft}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">{type?.title}</span>
                      <span className="text-[11px] text-slate-400 font-semibold">· {formatTimeAgo(req.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium truncate">{summarizeRequest(req)}</p>
                    {req.manager_response && (
                      <div className="mt-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-slate-600">
                        <span className="font-black text-slate-700">Manager:</span> {req.manager_response}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${status.soft}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Manager link */}
        <div className="mt-12 flex justify-center">
          <Link
            to="/pickups/manager"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ShieldCheck size={15} />
            Manager view
          </Link>
        </div>
      </div>

      {/* Request form modal */}
      <AnimatePresence>
        {activeType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && setActiveType(null)}
            className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Modal header */}
              <div className={`relative px-6 py-6 bg-gradient-to-br ${activeType.gradient} text-white shrink-0`}>
                <button
                  onClick={() => !submitting && setActiveType(null)}
                  className="absolute top-5 right-5 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3">
                  {React.createElement(ICONS[activeType.icon], { size: 28 })}
                  <div>
                    <h2 className="text-xl font-black leading-none">{activeType.title}</h2>
                    <p className="text-white/80 text-xs font-semibold mt-1">New request · {identity.name}</p>
                  </div>
                </div>
              </div>

              {/* Modal body */}
              <div className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
                {activeType.fields.map((field) => (
                  <div key={field.name} className={field.full ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                      {field.label} {field.required && <span className="text-orange-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={form[field.name] || ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold bg-white text-slate-900 focus:outline-none focus:ring-4 ${activeType.ring}`}
                      >
                        <option value="">Select…</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={form[field.name] || ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold resize-none focus:outline-none focus:ring-4 ${activeType.ring}`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        min={field.min}
                        value={form[field.name] || ''}
                        onChange={(e) => setField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 ${activeType.ring}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Modal footer */}
              <div className="p-5 border-t border-slate-100 shrink-0">
                <button
                  onClick={submitRequest}
                  disabled={submitting}
                  className={`w-full py-4 rounded-xl bg-gradient-to-r ${activeType.gradient} text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60`}
                >
                  {submitting ? (
                    'Sending…'
                  ) : (
                    <>
                      <Send size={16} /> Submit Request
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Pickups;
