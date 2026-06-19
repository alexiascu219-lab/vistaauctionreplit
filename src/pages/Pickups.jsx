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
  ArrowRightLeft,
  Clock,
  RefreshCw,
  Search,
  UserRound,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import Toast from '../components/Toast';
import TimePicker12 from '../components/pickups/TimePicker12';
import { fetchLunchSlotsPublic } from '../lib/pickupsApi';
import { REQUEST_TYPES, TYPE_MAP, summarizeRequest } from '../config/pickupsConfig';

const ICONS = { UtensilsCrossed, ClipboardList, ScanLine };

// Shared kiosk: forget who's submitting after this much inactivity.
const IDENTITY_TIMEOUT_MS = 90 * 1000;

const STATUS_PILL = {
  Pending: { cls: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  Approved: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Denied: { cls: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  Responded: { cls: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
};

const formatTimeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

// ---- Lunch time helpers: compute the end time from a start + duration -------
const parseTimeToMinutes = (s) => {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
};
const formatMinutes = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  let h = Math.floor(min / 60);
  const mm = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
};
const durationToMinutes = (d) => {
  if (!d) return 30;
  if (/hour/i.test(d)) return 60;
  const m = String(d).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 30;
};
// "11:00 AM" + "45 min" -> "11:00 AM – 11:45 AM"
const computeRange = (start, duration) => {
  const sm = parseTimeToMinutes(start);
  if (sm == null) return start || '';
  return `${start} – ${formatMinutes(sm + durationToMinutes(duration))}`;
};

const fieldCls =
  'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/15 transition';
const labelCls = 'block text-[10.5px] font-semibold tracky text-slate-400 mb-1.5';

const StatusPill = ({ status }) => {
  const p = STATUS_PILL[status] || STATUS_PILL.Pending;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${p.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
      {status}
    </span>
  );
};

const Pickups = () => {
  // Identity is in-memory only — intentionally NOT persisted, so a reload (or
  // inactivity timeout) clears it for the next person at the shared station.
  const [identity, setIdentity] = useState(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState([]);
  const [pendingType, setPendingType] = useState(null);

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
  const openForm = useCallback(async (type) => {
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
  }, []);

  const openChooser = (forType) => {
    setPendingType(forType || null);
    setSearch('');
    setChooserOpen(true);
  };

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

  const requestForm = (type) => {
    if (!identity) {
      openChooser(type);
      return;
    }
    openForm(type);
  };

  const suggestions = (() => {
    const q = search.trim().toLowerCase();
    return (q ? roster.filter((e) => e.name.toLowerCase().includes(q)) : roster).slice(0, 8);
  })();

  // ---- Request form --------------------------------------------------------
  const closeForm = () => {
    if (submitting) return;
    setActiveType(null);
    setConfirming(false);
    setForm({});
  };

  const setField = (name, value) =>
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Lunch: keep the displayed slot range in sync with start time + duration.
      if (activeType?.id === 'lunch') {
        if (name === 'slot_start') next.slot = computeRange(value, next.duration);
        else if (name === 'duration' && next.slot_start) next.slot = computeRange(next.slot_start, value);
      }
      return next;
    });

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
        { type: activeType.id, requester_name: identity.name, details: form, status: 'Pending' },
      ]);
      if (error) throw error;
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ['#ea580c', '#f97316', '#fbbf24'] });
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

  return (
    <div className="pickups-atelier min-h-screen font-sans text-slate-900 antialiased">
      <div className="pickups-grid-veil" />

      <main className="relative z-10 mx-auto max-w-[1240px] px-5 sm:px-8 pt-28 pb-28">
        {/* Hero */}
        <section className="pt-6 sm:pt-10 pk-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 pl-2.5 pr-3.5 py-1.5 shadow-soft">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-orange-500/10">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
            </span>
            <span className="text-[11.5px] font-semibold tracky text-slate-900/70">PICKUPS DEPARTMENT</span>
          </span>

          <h1 className="font-fraunces mt-7 text-[clamp(2.9rem,7vw,5rem)] font-normal leading-[0.96] tracking-[-0.03em] text-slate-900">
            Request{' '}
            <span className="relative inline-block">
              Hub
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-orange-600/90" />
            </span>
          </h1>
        </section>

        {/* Identity bar */}
        <section className="mt-10 sm:mt-12 pk-rise" style={{ animationDelay: '.06s' }}>
          {identity ? (
            <div className="group relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lift">
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-orange-500/5 blur-2xl" />
              <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative shrink-0">
                    <span className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-stone-200 to-stone-100" />
                    <span className="relative grid h-16 w-16 sm:h-[68px] sm:w-[68px] place-items-center rounded-[1.25rem] bg-slate-900 text-white shadow-soft ring-1 ring-slate-900/10">
                      <span className="font-fraunces text-[28px] font-medium leading-none">
                        {identity.name.charAt(0).toUpperCase()}
                      </span>
                    </span>
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white ring-2 ring-white shadow-soft">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-semibold tracky text-slate-400">SUBMITTING AS</p>
                    <p className="mt-1.5 font-fraunces text-[26px] sm:text-[30px] font-medium leading-none tracking-tight text-slate-900 truncate">
                      {identity.name}
                    </p>
                    <p className="mt-2 text-[13px] text-slate-500">Submissions from this station are filed under this name.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2.5">
                  <p className="hidden sm:block text-[11px] text-slate-400">Not you? Hand off the station.</p>
                  <button
                    onClick={() => openChooser(null)}
                    className="pk-press inline-flex h-12 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 text-[14.5px] font-semibold text-slate-900 shadow-soft hover:border-stone-300 hover:shadow-lift"
                  >
                    <ArrowRightLeft size={18} className="text-orange-600" />
                    Switch
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openChooser(null)}
              className="group pk-press relative w-full overflow-hidden rounded-3xl border border-stone-200 bg-white text-left shadow-lift hover:border-stone-300"
            >
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-orange-500/5 blur-2xl" />
              <div className="relative flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
                <span className="grid h-16 w-16 place-items-center rounded-[1.25rem] border border-stone-200 bg-[#FBFBFA] text-slate-400">
                  <UserRound size={30} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-semibold tracky text-slate-400">GET STARTED</p>
                  <p className="mt-1.5 font-fraunces text-[24px] sm:text-[28px] font-medium leading-none tracking-tight text-slate-900">
                    Choose your name
                  </p>
                  <p className="mt-2 text-[13px] text-slate-500">Tap to pick who's submitting from this station.</p>
                </div>
                <span className="hidden sm:inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-[14.5px] font-semibold text-white shadow-soft group-hover:bg-slate-800">
                  Choose <ArrowRight size={16} className="pk-nudge" />
                </span>
              </div>
            </button>
          )}
        </section>

        {/* Actions (stacked) + recent requests (side panel) */}
        <section className="mt-12 grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,380px)]">
          {/* Left: stacked request actions */}
          <div>
            <div className="flex items-end justify-between gap-4 pk-rise" style={{ animationDelay: '.1s' }}>
              <h2 className="font-fraunces text-[24px] sm:text-[28px] font-medium tracking-tight text-slate-900">
                Start a request
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-400">
                <span className="tnum">3</span> available
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {REQUEST_TYPES.map((type, i) => {
                const Icon = ICONS[type.icon];
                return (
                  <button
                    key={type.id}
                    onClick={() => requestForm(type)}
                    className="group pk-lift pk-rise relative flex items-center gap-4 overflow-hidden rounded-3xl border border-stone-200 bg-white p-5 text-left shadow-soft hover:border-stone-300 hover:shadow-lift focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/30 sm:gap-5 sm:p-6"
                    style={{ animationDelay: `${0.14 + i * 0.06}s` }}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-200/80 to-transparent" />
                    <span className="pk-icon-tile grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-900">
                      <Icon size={26} strokeWidth={1.6} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-fraunces text-[20px] font-medium tracking-tight text-slate-900">{type.title}</h3>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500">{type.blurb}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-[13px] font-semibold text-slate-900 md:inline">New request</span>
                      <span className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-slate-400 transition group-hover:border-orange-200 group-hover:text-orange-600">
                        <ArrowRight size={16} className="pk-nudge" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: recent requests panel */}
          <aside className="pk-rise lg:sticky lg:top-24" style={{ animationDelay: '.2s' }}>
            <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <h2 className="font-fraunces text-[19px] font-medium tracking-tight text-slate-900">Recent Requests</h2>
                {identity && (
                  <button
                    onClick={fetchMyRequests}
                    title="Refresh"
                    className="pk-press grid h-8 w-8 place-items-center rounded-full border border-stone-200 bg-white text-slate-400 hover:border-stone-300 hover:text-slate-700"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>

              {!identity ? (
                <div className="px-5 py-12 text-center">
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-300">
                    <Clock size={20} />
                  </span>
                  <p className="mt-3 text-[13.5px] font-medium text-slate-400">Choose your name to see your requests here.</p>
                </div>
              ) : myRequests.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-[13.5px] font-medium text-slate-400">No requests yet.</p>
                </div>
              ) : (
                <div className="max-h-[62vh] overflow-y-auto p-2">
                  {myRequests.map((req) => {
                    const type = TYPE_MAP[req.type];
                    const Icon = ICONS[type?.icon] || ClipboardList;
                    return (
                      <div key={req.id} className="rounded-2xl p-3 transition-colors hover:bg-[#FBFBFA]">
                        <div className="flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-stone-200 bg-[#FBFBFA] text-slate-900">
                            <Icon size={18} strokeWidth={1.7} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-[14px] font-semibold text-slate-900">{type?.title}</p>
                              <StatusPill status={req.status} />
                            </div>
                            <p className="mt-0.5 truncate text-[12.5px] text-slate-500 tnum">{summarizeRequest(req)}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400 tnum">{formatTimeAgo(req.created_at)}</p>
                            {req.type === 'floor_wave' && req.responded_by && ['Approved', 'Denied'].includes(req.status) && (
                              <p className="mt-1 text-[11.5px] font-medium text-slate-500">
                                {req.status} by <span className="font-semibold text-slate-700">{req.responded_by}</span>
                              </p>
                            )}
                            {req.manager_response && (
                              <div className="mt-2 rounded-xl border border-stone-200 bg-[#FBFBFA] px-3 py-2">
                                <p className="text-[10px] font-semibold tracky text-slate-400">
                                  {(req.responded_by || 'Manager').toUpperCase()}
                                </p>
                                <p className="mt-0.5 text-[12.5px] leading-snug text-slate-700">
                                  &ldquo;{req.manager_response}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11.5px] text-slate-400">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Pending</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Approved</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Denied</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Responded</span>
            </div>
          </aside>
        </section>

        {/* Footer */}
        <footer className="mt-20">
          <div className="pk-hairline" />
          <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-[13px] text-slate-500">Vista Auction · Pickups Department</p>
            <p className="text-[12px] text-slate-400 tnum">Shared station · resets after inactivity</p>
          </div>
        </footer>
      </main>

      {/* Name chooser overlay */}
      <AnimatePresence>
        {chooserOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChooserOpen(false)}
            className="fixed inset-0 z-[65] flex items-start justify-center bg-slate-900/40 p-4 pt-24 backdrop-blur-sm sm:items-center sm:pt-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
            >
              <div className="border-b border-stone-100 p-6 pb-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-fraunces text-[26px] font-medium tracking-tight text-slate-900">Who's submitting?</h2>
                  <button onClick={() => setChooserOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-stone-100">
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
                    className="w-full rounded-2xl border border-stone-200 bg-white py-4 pl-12 pr-4 text-[17px] font-semibold text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/15"
                  />
                </div>
              </div>

              <div className="overflow-y-auto p-3">
                {suggestions.length > 0 ? (
                  suggestions.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => chooseName(e.name)}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-[#FBFBFA]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 font-fraunces text-[17px] font-medium text-white">
                        {e.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate font-semibold text-slate-800">{e.name}</span>
                      {e.position && <span className="ml-auto truncate text-xs text-slate-400">{e.position}</span>}
                    </button>
                  ))
                ) : (
                  <p className="py-6 text-center text-[14px] font-medium text-slate-400">
                    {roster.length ? 'No matches.' : 'No roster yet — type your name to continue.'}
                  </p>
                )}
                {search.trim() && (
                  <button
                    onClick={() => chooseName(search)}
                    className="pk-press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-4 text-[14px] font-semibold text-white shadow-soft hover:bg-slate-800"
                  >
                    Continue as &ldquo;{search.trim()}&rdquo; <ArrowRight size={16} />
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
            className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
            >
              {/* Light header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-6 py-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-900">
                  {React.createElement(ICONS[activeType.icon], { size: 22, strokeWidth: 1.7 })}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-fraunces text-[20px] font-medium leading-none tracking-tight text-slate-900">
                    {activeType.title}
                  </h2>
                  <p className="mt-1.5 text-[12px] font-medium text-slate-400">
                    {confirming ? 'Confirm & submit' : 'New request'} · {identity?.name}
                  </p>
                </div>
                <button onClick={closeForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-stone-100">
                  <X size={18} />
                </button>
              </div>

              {!confirming ? (
                <>
                  <div className="grid grid-cols-2 gap-4 overflow-y-auto p-6">
                    {activeType.fields.map((field) => (
                      <div key={field.name} className={field.full ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
                        <label className={labelCls}>
                          {field.label} {field.required && <span className="text-orange-600">*</span>}
                        </label>
                        {field.type === 'lunch_slot' ? (
                          <select
                            value={form.slot_start || ''}
                            onChange={(e) => setField('slot_start', e.target.value)}
                            className={fieldCls}
                          >
                            <option value="">{lunchSlots.length ? 'Select a start time…' : 'Loading slots…'}</option>
                            {lunchSlots.map((s) => (
                              <option key={s.id} value={s.label} disabled={s.left <= 0}>
                                {computeRange(s.label, form.duration)} — {s.left > 0 ? `${s.left} slot${s.left === 1 ? '' : 's'} left` : 'Full'}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'select' ? (
                          <select value={form[field.name] || ''} onChange={(e) => setField(field.name, e.target.value)} className={fieldCls}>
                            <option value="">Select…</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'time12' ? (
                          <TimePicker12 value={form[field.name] || ''} onChange={(v) => setField(field.name, v)} />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={form[field.name] || ''}
                            onChange={(e) => setField(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            className={`${fieldCls} resize-none`}
                          />
                        ) : (
                          <input
                            type={field.type}
                            min={field.min}
                            value={form[field.name] || ''}
                            onChange={(e) => setField(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            className={fieldCls}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="shrink-0 border-t border-stone-200 p-5">
                    <button
                      onClick={goToConfirm}
                      className="pk-press flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-[14.5px] font-semibold text-white shadow-soft hover:bg-slate-800"
                    >
                      Review request <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="overflow-y-auto p-7 text-center sm:p-8">
                    <p className="text-[16px] font-medium leading-relaxed text-slate-600">
                      Are you sure you'd like to submit this request as
                    </p>
                    <button onClick={() => openChooser(null)} className="mt-2 inline-block" title="Tap to change who this is from">
                      <span className="font-fraunces relative text-[34px] font-medium leading-none text-orange-600">
                        {identity?.name}
                        <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-orange-500/40" />
                      </span>
                    </button>
                    <p className="mt-2 text-[16px] font-medium text-slate-600">?</p>

                    {/* Hint bubble */}
                    <div className="relative mx-auto mt-6 max-w-[19rem]">
                      <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-stone-200 bg-[#FBFBFA]" />
                      <div className="relative rounded-2xl border border-stone-200 bg-[#FBFBFA] px-4 py-3">
                        <p className="text-[13.5px] font-medium leading-snug text-slate-600">
                          If this isn't you, tap the <span className="font-semibold text-orange-600">highlighted name</span> to change it.
                        </p>
                      </div>
                    </div>

                    {/* Recap */}
                    <div className="mt-7 rounded-2xl border border-stone-200 bg-[#FBFBFA] p-4 text-left">
                      <p className="mb-2 text-[10.5px] font-semibold tracky text-slate-400">{activeType.title.toUpperCase()}</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(form)
                          .filter(([k, v]) => v !== '' && v != null && k !== 'slot_start')
                          .map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs">
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{k.replace(/_/g, ' ')}</span>
                              <span className="font-semibold text-slate-700">{String(v)}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 border-t border-stone-200 p-5">
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={submitting}
                      className="pk-press inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-[14px] font-semibold text-slate-700 shadow-soft hover:border-stone-300 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} /> Back
                    </button>
                    <button
                      onClick={submitRequest}
                      disabled={submitting}
                      className="pk-press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 text-[14.5px] font-semibold text-white shadow-glow hover:bg-orange-700 disabled:opacity-60"
                    >
                      {submitting ? (
                        'Sending…'
                      ) : (
                        <>
                          <Check size={17} /> Yes, submit
                        </>
                      )}
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
