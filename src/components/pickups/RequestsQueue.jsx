import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  ClipboardList,
  ScanLine,
  Check,
  X,
  MessageSquare,
  RefreshCw,
  Inbox,
  Send,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import Toast from '../Toast';
import { REQUEST_TYPES, TYPE_MAP, STATUS_STYLES, hasPerm, canViewType } from '../../config/pickupsConfig';

const ICONS = { UtensilsCrossed, ClipboardList, ScanLine };

const formatWhen = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const STATUS_TABS = ['Pending', 'Approved', 'Denied', 'Responded', 'All'];

const RequestsQueue = ({ session }) => {
  const managerName = session?.name || 'Manager';
  const viewableTypes = useMemo(() => REQUEST_TYPES.filter((t) => canViewType(session, t.id)), [session]);
  const viewableIds = useMemo(() => viewableTypes.map((t) => t.id), [viewableTypes]);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [respondingId, setRespondingId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('vista_pickups_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setToast({ message: 'Failed to load requests', type: 'error' });
    } else {
      // Only show request types this manager is allowed to see.
      setRequests((data || []).filter((r) => viewableIds.includes(r.type)));
    }
    setLoading(false);
  }, [viewableIds]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 20000); // keep the queue live
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const counts = useMemo(() => {
    const c = { Pending: 0, Approved: 0, Denied: 0, Responded: 0, All: requests.length };
    requests.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const statusOk = statusFilter === 'All' || r.status === statusFilter;
      const typeOk = typeFilter === 'all' || r.type === typeFilter;
      return statusOk && typeOk;
    });
  }, [requests, statusFilter, typeFilter]);

  const updateRequest = async (id, patch, successMsg) => {
    setBusyId(id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from('vista_pickups_requests').update(patch).eq('id', id);
    setBusyId(null);
    if (error) {
      setToast({ message: 'Update failed — refreshing', type: 'error' });
      fetchRequests();
    } else if (successMsg) {
      setToast({ message: successMsg, type: 'success' });
    }
  };

  const decide = (req, status) =>
    updateRequest(
      req.id,
      { status, responded_by: managerName, responded_at: new Date().toISOString() },
      `Request ${status.toLowerCase()}`,
    );

  const sendResponse = async (req) => {
    if (!responseText.trim()) {
      setToast({ message: 'Write a response first', type: 'error' });
      return;
    }
    const status = ['Approved', 'Denied'].includes(req.status) ? req.status : 'Responded';
    await updateRequest(
      req.id,
      {
        manager_response: responseText.trim(),
        status,
        responded_by: managerName,
        responded_at: new Date().toISOString(),
      },
      'Response sent',
    );
    setRespondingId(null);
    setResponseText('');
  };

  if (viewableTypes.length === 0) {
    return (
      <div className="pickups-card rounded-3xl p-16 text-center">
        <Inbox size={40} className="text-slate-300 mx-auto mb-4" />
        <p className="text-slate-400 font-bold">You don't have access to any request types yet.</p>
        <p className="text-slate-400 text-sm mt-1">Ask an admin to grant you permissions.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-slate-500 font-medium">
          Signed in as <span className="font-black text-slate-700">{managerName}</span>
        </p>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { key: 'Pending', label: 'Pending', color: 'text-amber-600', ring: 'ring-amber-200' },
          { key: 'Approved', label: 'Approved', color: 'text-emerald-600', ring: 'ring-emerald-200' },
          { key: 'Denied', label: 'Denied', color: 'text-red-600', ring: 'ring-red-200' },
          { key: 'All', label: 'Total', color: 'text-slate-900', ring: 'ring-slate-200' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`pickups-card rounded-2xl p-4 text-left transition-all ${
              statusFilter === s.key ? `ring-2 ${s.ring}` : 'hover:bg-white'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{counts[s.key] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                statusFilter === tab ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {viewableTypes.length > 1 && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                typeFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={13} /> All
            </button>
            {viewableTypes.map((t) => {
              const Icon = ICONS[t.icon];
              return (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    typeFilter === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon size={13} /> {t.short}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="pickups-card rounded-3xl p-16 flex justify-center">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-slate-200 border-t-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="pickups-card rounded-3xl p-16 text-center">
          <Inbox size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Nothing here. The queue is clear.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filtered.map((req) => {
              const type = TYPE_MAP[req.type];
              const Icon = ICONS[type?.icon] || ClipboardList;
              const status = STATUS_STYLES[req.status] || STATUS_STYLES.Pending;
              const details = req.details || {};
              const isResponding = respondingId === req.id;
              const isBusy = busyId === req.id;
              const canApprove = hasPerm(session, req.type, 'approve');
              const canDeny = hasPerm(session, req.type, 'deny');
              const canRespond = hasPerm(session, req.type, 'respond');

              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="pickups-card rounded-2xl p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${type?.gradient} flex items-center justify-center text-white shadow-md shrink-0`}
                    >
                      <Icon size={22} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900">{type?.title}</h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${status.soft}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-900 font-black">{req.requester_name}</span>
                        <span className="text-slate-400 inline-flex items-center gap-1">
                          <Clock size={12} /> {formatWhen(req.created_at)}
                        </span>
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(details)
                          .filter(([, v]) => v !== '' && v != null)
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <span className="font-black text-slate-400 uppercase tracking-wide text-[9px]">
                                {k.replace(/_/g, ' ')}
                              </span>
                              <span className="font-bold text-slate-700">{String(v)}</span>
                            </span>
                          ))}
                      </div>

                      {req.manager_response && (
                        <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-0.5">
                            Response · {req.responded_by}
                          </p>
                          <p className="text-sm text-slate-700 font-medium">{req.manager_response}</p>
                        </div>
                      )}

                      <AnimatePresence>
                        {isResponding && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                              <input
                                autoFocus
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendResponse(req)}
                                placeholder="Type a reply to the requester…"
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400"
                              />
                              <button
                                onClick={() => sendResponse(req)}
                                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all inline-flex items-center justify-center gap-1.5"
                              >
                                <Send size={14} /> Send
                              </button>
                              <button
                                onClick={() => {
                                  setRespondingId(null);
                                  setResponseText('');
                                }}
                                className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isResponding && (canApprove || canDeny || canRespond) && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {canApprove && req.status !== 'Approved' && (
                            <button
                              disabled={isBusy}
                              onClick={() => decide(req, 'Approved')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50"
                            >
                              <Check size={14} /> Approve
                            </button>
                          )}
                          {canDeny && req.status !== 'Denied' && (
                            <button
                              disabled={isBusy}
                              onClick={() => decide(req, 'Denied')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                              <X size={14} /> Deny
                            </button>
                          )}
                          {canRespond && (
                            <button
                              disabled={isBusy}
                              onClick={() => {
                                setRespondingId(req.id);
                                setResponseText(req.manager_response || '');
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                              <MessageSquare size={14} /> Respond
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default RequestsQueue;
