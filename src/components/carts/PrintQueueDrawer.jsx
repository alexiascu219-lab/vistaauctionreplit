import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  RefreshCw,
  Mic,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { formatTimeAgo } from '../../config/cartsConfig';

const STATUS_PILL = {
  queued: { label: 'Queued', cls: 'border-amber-200 bg-amber-50 text-amber-700', icon: Clock },
  printing: { label: 'Printing', cls: 'border-blue-200 bg-blue-50 text-blue-700', icon: Loader2, spin: true },
  printed: { label: 'Printed', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  error: { label: 'Error', cls: 'border-red-200 bg-red-50 text-red-700', icon: AlertTriangle },
  canceled: { label: 'Canceled', cls: 'border-stone-200 bg-stone-50 text-slate-500', icon: Ban },
};

const SOURCE = {
  siri: { label: 'Siri', icon: Mic },
  web: { label: 'Web', icon: Globe },
  cart: { label: 'Cart board', icon: Printer },
  api: { label: 'API', icon: Globe },
};

const PrintQueueDrawer = ({ open, onClose, jobs = [], loading, onRefresh, onReprint, onCancel }) => {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Print queue"
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-900">
                <Printer size={19} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-fraunces text-[19px] font-medium leading-none tracking-tight text-slate-900">Print Queue</h2>
                <p className="mt-1 text-[11.5px] font-medium text-slate-400">Zebra sticker jobs</p>
              </div>
              <button
                onClick={onRefresh}
                title="Refresh"
                className="pk-press grid h-8 w-8 place-items-center rounded-full border border-stone-200 bg-white text-slate-400 hover:border-stone-300 hover:text-slate-700"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>

            {/* Jobs */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {jobs.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-[#FBFBFA] text-slate-300">
                    <Printer size={22} />
                  </span>
                  <p className="mt-3 text-[13.5px] font-medium text-slate-400">No print jobs yet.</p>
                  <p className="mt-1 text-[12px] text-slate-400">Print a cart sticker, or say it to Siri.</p>
                </div>
              ) : (
                jobs.map((job) => {
                  const pill = STATUS_PILL[job.status] || STATUS_PILL.queued;
                  const Pi = pill.icon;
                  const src = SOURCE[job.source] || SOURCE.web;
                  const Si = src.icon;
                  return (
                    <div key={job.id} className="rounded-2xl p-3 transition-colors hover:bg-[#FBFBFA]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-stone-200 bg-white text-slate-900">
                          <Printer size={17} strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[14px] font-bold text-slate-900">{job.title || job.template}</p>
                            <span
                              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${pill.cls}`}
                            >
                              <Pi size={11} className={pill.spin ? 'animate-spin' : ''} /> {pill.label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Si size={11} /> {src.label}
                            </span>
                            {job.quantity > 1 && <span>×{job.quantity}</span>}
                            {job.requested_by && <span>· {job.requested_by}</span>}
                            <span className="tnum">· {formatTimeAgo(job.created_at)}</span>
                          </div>
                          {job.status === 'error' && job.error && (
                            <p className="mt-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[11.5px] font-medium text-red-600">
                              {job.error}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {job.status === 'queued' && (
                              <button
                                onClick={() => onCancel(job)}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-500 hover:border-red-200 hover:text-red-500"
                              >
                                <Ban size={12} /> Cancel
                              </button>
                            )}
                            {['printed', 'error', 'canceled'].includes(job.status) && (
                              <button
                                onClick={() => onReprint(job)}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-500 hover:border-orange-200 hover:text-orange-600"
                              >
                                <RotateCcw size={12} /> Print again
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Siri help */}
            <div className="shrink-0 border-t border-stone-200 bg-[#FBFBFA]">
              <button
                onClick={() => setHelpOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-5 py-3.5 text-left"
              >
                <Mic size={15} className="text-orange-600" />
                <span className="text-[12.5px] font-bold text-slate-700">Print with Siri</span>
                <ChevronDown size={15} className={`ml-auto text-slate-400 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {helpOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-[12.5px] leading-relaxed text-slate-500">
                      <p>
                        Say <span className="font-semibold text-slate-700">“Hey Siri, print cart sticker.”</span> Siri asks which
                        cart, then queues the job here. The Zebra PC picks it up and prints within a few seconds.
                      </p>
                      <p className="mt-2">
                        One-time setup lives in <span className="font-mono text-[11.5px] text-slate-600">print-agent/README.md</span> —
                        install the print agent on the Zebra computer and build the Siri Shortcut.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrintQueueDrawer;
