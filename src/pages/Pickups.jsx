import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PackageCheck,
  Search,
  UserRound,
  ChevronLeft,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Toast from '../components/Toast';
import { fetchLunchSlotsPublic } from '../lib/pickupsApi';
import { REQUEST_TYPES, TYPE_MAP, STATUS_STYLES, summarizeRequest } from '../config/pickupsConfig';

const ICONS = { UtensilsCrossed, ClipboardList, ScanLine };

// Shared kiosk: forget who's submitting after this much inactivity.
const IDENTITY_TIMEOUT_MS = 90 * 1000;

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
  // Identity is in-memory only — it is intentionally NOT persisted, so a reload
  // (or inactivity timeout) clears it for the next person at the shared station.
  const [identity, setIdentity] = useState(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState([]);
  const [pendingType, setPendingType] = useState(null); // open this form after choosing a name

  const [activeType, setActiveType] = useState(null);
  const [form, setForm] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [lunchSlots, setLunchSlots] = useState([]);

  const timerRef = useRef(null);

  // ---- Inactivity auto-reset ----------------------------------------------
  const clearIdentity = useCallback((silent) => {
    setIdentity(null);
    setMyRequests([]);
    setActiveType(null);
    setConfirming(false);
    if (!silent) setToast({ message: 'Reset for the next person', type: 'info' });
  }, []);

  const bumpActivity = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => clearIdentity(false), IDENTITY_TIMEOUT_MS);
  }, [clearIdentity]);

  useEffect(() => {
    if (!identity) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    bumpActivity();
    const onActivity = () => bumpActivity();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [identity, bumpActivity]);

  // ---- Data ----------------------------------------------------------------
  useEffect(() => {
    supabase
      .rpc('pickups_roster')
      .then(({ data }) => Array.isArray(data) && setRoster(data))
      .catch(() => {});
  }, []);

  const fetchMyRequests = useCallback(async () => {
    if (!identity?.name) return;
    const { data, error } = await supabase
      .from('vista_pickups_requests')
      .select('*')
      .eq('requester_name', identity.name)
      .order('created_at', { ascending: false })
      .limit(15);
    if (!error) setMyRequests(data || []);
  }, [identity]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  // ---- Identity selection --------------------------------------------------
  const chooseName = (name) => {
    const finalName = (name || '').trim();
    if (!finalName) return;
    setIdentity({ name: finalName });
    setChooserOpen(false);
    setSearch('');
    if (pendingType) {
      const t = pendingType;
      setPendingType(null);
      setTimeout(() => openForm(t), 50);
    }
  };

  const openChooser = (forType) => {
    setPendingType(forType || null);
    setSearch('');
    setChooserOpen(true);
  };

  const suggestions = (() => {
    const q = search.trim().toLowerCase();
    return (q ? roster.filter((e) => e.name.toLowerCase().includes(q)) : roster).slice(0, 8);
  })();

  // ---- Request form --------------------------------------------------------
  const openForm = async (type) => {
    if (!identity) {
      openChooser(type);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const initial = {};
    type.fields.forEach((f) => {
      if (f.type === 'date') initial[f.name] = today;
    });
    setForm(initial);
    setConfirming(false);
    setActiveType(type);
    if (type.id === 'lunch') {
      setLunchSlots([]);
      try {
        const slots = await fetchLunchSlotsPublic();
        setLunchSlots(Array.isArray(slots) ? slots : []);
      } catch {
        setLunchSlots([]);
      }
    }
  };

  const closeForm = () => {
    if (submitting) return;
    setActiveType(null);
    setConfirming(false);
    setForm({});
  };

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const goToConfirm = () => {
    const missing = activeType.fields.filter((f) => f.required && !form[f.name]);
    if (missing.length) {
      setToast({ message: `Please fill in: ${missing.map((f) => f.label).join(', ')}`, type: 'error' });
      return;
    }
    setConfirming(true);
  };

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('vista_pickups_requests').insert([
        {
          type: activeType.id,
          requester_name: identity.name,
          details: form,
          status: 'Pending',
        },
      ]);
      if (error) throw error;
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#f97316', '#fbbf24', '#2563eb'] });
      setToast({ message: 'Request sent to your managers!', type: 'success' });
      setActiveType(null);
      setConfirming(false);
      setForm({});
      fetchMyRequests();
    } catch (err) {
      console.error('Pickups submit error:', err);
      setToast({ message: 'Could not send request. Try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const gradientName = 'bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-4">
              <PackageCheck size={14} className="text-orange-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Pickups Department</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 font-display tracking-tight leading-none">
              Request Hub
            </h1>
          </div>
        </motion.div>

        {/* Prominent identity bar (kiosk) */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => openChooser(null)}
          className={`w-full mb-10 rounded-3xl p-5 sm:p-6 flex items-center gap-4 text-left transition-all ${
            identity
              ? 'pickups-card hover:shadow-xl'
              : 'bg-gradient-to-r from-orange-500 to-blue-600 text-white shadow-xl hover:shadow-2xl'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl ${
              identity ? 'bg-gradient-to-br from-orange-500 to-blue-600 text-white shadow-lg' : 'bg-white/20 text-white'
            }`}
          >
            {identity ? identity.name.charAt(0).toUpperCase() : <UserRound size={28} />}
          </div>
          <div className="flex-1 min-w-0">
            {identity ? (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Submitting as</p>
                <p className="text-2xl font-black text-slate-900 truncate">{identity.name}</p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Start here</p>
                <p className="text-2xl font-black">Tap to choose your name</p>
              </>
            )}
          </div>
          <span
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
              identity ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            {identity ? 'Switch' : 'Choose'}
          </span>
        </motion.button>

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
                className="group relative text-left pickups-card rounded-[2rem] p-7 overflow-hidden hover:shadow-2xl transition-shadow"
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
        {identity && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-slate-400" />
                {identity.name.split(' ')[0]}'s Recent Requests
              </h2>
              <button
                onClick={fetchMyRequests}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {myRequests.length === 0 ? (
              <div className="pickups-card rounded-3xl p-10 text-center">
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
                      className="pickups-card rounded-2xl p-4 sm:p-5 flex items-start gap-4"
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
          </>
        )}
      </div>

      {/* Name chooser overlay */}
      <AnimatePresence>
        {chooserOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChooserOpen(false)}
            className="fixed inset-0 z-[65] bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-24 sm:pt-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-slate-900">Who's submitting?</h2>
                  <button onClick={() => setChooserOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search.trim() && chooseName(search)}
                    placeholder="Type your name…"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="overflow-y-auto p-3">
                {suggestions.length > 0 ? (
                  suggestions.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => chooseName(e.name)}
                      className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-orange-50 transition-colors flex items-center gap-3"
                    >
                      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-blue-600 text-white flex items-center justify-center font-black shrink-0">
                        {e.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-black text-slate-800 truncate">{e.name}</span>
                      {e.position && <span className="text-xs text-slate-400 ml-auto truncate">{e.position}</span>}
                    </button>
                  ))
                ) : (
                  <p className="text-center text-slate-400 font-semibold py-6 text-sm">
                    {roster.length ? 'No matches.' : 'No roster yet — type your name to continue.'}
                  </p>
                )}
                {search.trim() && (
                  <button
                    onClick={() => chooseName(search)}
                    className="w-full mt-2 px-4 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    Continue as “{search.trim()}” <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request form / confirmation modal */}
      <AnimatePresence>
        {activeType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeForm}
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
              {/* Header */}
              <div className={`relative px-6 py-6 bg-gradient-to-br ${activeType.gradient} text-white shrink-0`}>
                <button
                  onClick={closeForm}
                  className="absolute top-5 right-5 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3">
                  {React.createElement(ICONS[activeType.icon], { size: 28 })}
                  <div>
                    <h2 className="text-xl font-black leading-none">{activeType.title}</h2>
                    <p className="text-white/80 text-xs font-semibold mt-1">
                      {confirming ? 'Confirm & submit' : 'New request'} · {identity?.name}
                    </p>
                  </div>
                </div>
              </div>

              {!confirming ? (
                <>
                  {/* Form body */}
                  <div className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
                    {activeType.fields.map((field) => (
                      <div key={field.name} className={field.full ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                          {field.label} {field.required && <span className="text-orange-500">*</span>}
                        </label>
                        {field.type === 'lunch_slot' ? (
                          <select
                            value={form[field.name] || ''}
                            onChange={(e) => setField(field.name, e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold bg-white text-slate-900 focus:outline-none focus:ring-4 ${activeType.ring}`}
                          >
                            <option value="">{lunchSlots.length ? 'Select a slot…' : 'Loading slots…'}</option>
                            {lunchSlots.map((s) => (
                              <option key={s.id} value={s.label} disabled={s.left <= 0}>
                                {s.label} — {s.left > 0 ? `${s.left} slot${s.left === 1 ? '' : 's'} left` : 'Full'}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'select' ? (
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
                  <div className="p-5 border-t border-slate-100 shrink-0">
                    <button
                      onClick={goToConfirm}
                      className={`w-full py-4 rounded-xl bg-gradient-to-r ${activeType.gradient} text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg transition-all`}
                    >
                      Review <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Confirmation body */}
                  <div className="p-6 sm:p-8 overflow-y-auto text-center">
                    <p className="text-lg font-bold text-slate-700 leading-relaxed">
                      Are you sure you'd like to submit this request as
                    </p>
                    <button
                      onClick={() => openChooser(null)}
                      className="inline-block mt-1 mb-2"
                      title="Click to change who this is from"
                    >
                      <span className={`text-3xl font-black ${gradientName} underline decoration-2 decoration-orange-300/60 underline-offset-4`}>
                        {identity?.name}
                      </span>
                    </button>
                    <p className="text-lg font-bold text-slate-700">?</p>

                    {/* Hint bubble pointing at the name */}
                    <div className="relative mx-auto mt-5 max-w-xs">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-50 border-l border-t border-blue-200 rotate-45" />
                      <div className="relative bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
                        <p className="text-sm font-semibold text-blue-700">
                          If this isn't you, click on the highlighted name to change it!
                        </p>
                      </div>
                    </div>

                    {/* Quick recap */}
                    <div className="mt-6 text-left bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">{activeType.title}</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(form)
                          .filter(([, v]) => v !== '' && v != null)
                          .map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs">
                              <span className="font-black text-slate-400 uppercase tracking-wide text-[9px]">{k.replace(/_/g, ' ')}</span>
                              <span className="font-bold text-slate-700">{String(v)}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border-t border-slate-100 shrink-0 flex gap-3">
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={submitting}
                      className="px-5 py-4 rounded-xl bg-slate-100 text-slate-600 font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all inline-flex items-center gap-1.5"
                    >
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      onClick={submitRequest}
                      disabled={submitting}
                      className={`flex-1 py-4 rounded-xl bg-gradient-to-r ${activeType.gradient} text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60`}
                    >
                      {submitting ? 'Sending…' : <><Send size={16} /> Yes, submit</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Pickups;
