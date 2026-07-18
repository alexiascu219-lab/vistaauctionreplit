import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, RotateCcw, X, Trash2, Printer, CheckCircle2, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { listTemplates } from '../../lib/labelsApi';
import LabelSvg from '../labels/LabelSvg';

const STATUS = {
  queued: { label: 'Queued', cls: 'text-amber-700 bg-amber-100/70 border-amber-200', Icon: Clock },
  printing: { label: 'Printing', cls: 'text-sky-700 bg-sky-100/70 border-sky-200', Icon: Loader2 },
  printed: { label: 'Printed', cls: 'text-emerald-700 bg-emerald-100/70 border-emerald-200', Icon: CheckCircle2 },
  error: { label: 'Error', cls: 'text-red-700 bg-red-100/70 border-red-200', Icon: AlertTriangle },
  canceled: { label: 'Canceled', cls: 'text-slate-500 bg-stone-100 border-stone-200', Icon: X },
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function StationQueue() {
  const [jobs, setJobs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const timer = useRef(null);

  const refresh = async () => {
    const { data } = await supabase.from('vista_print_jobs').select('*').order('created_at', { ascending: false }).limit(80);
    setJobs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {});
    refresh();
    timer.current = setInterval(refresh, 4000);
    return () => clearInterval(timer.current);
  }, []);

  const byName = useMemo(() => {
    const m = {};
    for (const t of templates) m[(t.name || '').toLowerCase()] = t;
    return m;
  }, [templates]);

  const previewFor = (job) => {
    const t = byName[(job.template || '').toLowerCase()];
    if (!t) return null;
    const values = {};
    for (const v of t.variables || []) values[v.key] = v.default ?? '';
    Object.assign(values, job.data || {});
    return { template: t, values };
  };

  const setStatus = async (id, status) => {
    await supabase.from('vista_print_jobs').update({ status, error: null }).eq('id', id);
    refresh();
  };
  const remove = async (id) => {
    await supabase.from('vista_print_jobs').delete().eq('id', id);
    if (sel === id) setSel(null);
    refresh();
  };

  const counts = useMemo(() => {
    const c = { queued: 0, printing: 0, error: 0 };
    for (const j of jobs) if (c[j.status] != null) c[j.status] += 1;
    return c;
  }, [jobs]);

  const selected = jobs.find((j) => j.id === sel);
  const selPreview = selected ? previewFor(selected) : null;

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_360px] gap-0">
      {/* List */}
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-stone-200/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.14em] text-slate-800">Print Queue</h2>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="rounded-md bg-amber-100/70 px-2 py-0.5 font-semibold text-amber-700">{counts.queued} queued</span>
              {counts.printing > 0 && <span className="rounded-md bg-sky-100/70 px-2 py-0.5 font-semibold text-sky-700">{counts.printing} printing</span>}
              {counts.error > 0 && <span className="rounded-md bg-red-100/70 px-2 py-0.5 font-semibold text-red-700">{counts.error} error</span>}
            </div>
          </div>
          <button onClick={refresh} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-500 transition hover:text-slate-800"><RefreshCw size={13} /> Refresh</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="animate-spin text-stone-300" /></div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Printer size={30} className="text-stone-300" />
              <p className="mt-3 text-[13px] font-semibold text-slate-400">No print jobs yet</p>
              <p className="mt-1 text-[12px] text-slate-400">Jobs from the designer, the cart board, or Siri land here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {jobs.map((job) => {
                const s = STATUS[job.status] || STATUS.queued;
                const active = sel === job.id;
                return (
                  <button key={job.id} onClick={() => setSel(job.id)} className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-orange-300 bg-orange-50/60 shadow-soft' : 'border-transparent hover:border-stone-200 hover:bg-white'}`}>
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] font-bold ${s.cls}`}>
                      <s.Icon size={11} className={job.status === 'printing' ? 'animate-spin' : ''} /> {s.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-slate-800">{job.title || job.template}</p>
                      <p className="truncate font-mono text-[11px] text-slate-400">{job.template} · ×{job.quantity} · {job.source}{job.error ? ` · ${job.error}` : ''}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10.5px] text-slate-400">{timeAgo(job.created_at)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex min-h-0 flex-col border-l border-stone-200/70 bg-[#fbfaf8]">
        {selected ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-stone-200/70 px-5 py-4">
              <p className="font-display text-[14px] font-bold uppercase tracking-[0.12em] text-slate-800">{selected.title || selected.template}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">{new Date(selected.created_at).toLocaleString()}</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-soft">
                {selPreview ? (
                  <LabelSvg template={selPreview.template} values={selPreview.values} />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg bg-stone-50 text-[12px] text-slate-400">No preview for “{selected.template}”</div>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[11.5px]">
                {Object.entries(selected.data || {}).filter(([k]) => k !== 'zpl').map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-slate-400">{k}</dt>
                    <dd className="truncate font-semibold text-slate-700">{String(v)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
            <div className="flex items-center gap-2 border-t border-stone-200/70 p-4">
              {(selected.status === 'error' || selected.status === 'canceled' || selected.status === 'printed') && (
                <button onClick={() => setStatus(selected.id, 'queued')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[12.5px] font-bold text-white transition hover:bg-slate-800"><RotateCcw size={14} /> Reprint</button>
              )}
              {(selected.status === 'queued' || selected.status === 'printing') && (
                <button onClick={() => setStatus(selected.id, 'canceled')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-600 transition hover:border-stone-300"><X size={14} /> Cancel</button>
              )}
              <button onClick={() => remove(selected.id)} title="Delete" className="rounded-lg border border-stone-200 bg-white p-2 text-slate-400 transition hover:border-red-200 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center text-slate-400">
            <Printer size={26} className="text-stone-300" />
            <p className="mt-3 text-[12.5px] font-semibold">Select a job to preview it</p>
          </div>
        )}
      </div>
    </div>
  );
}
