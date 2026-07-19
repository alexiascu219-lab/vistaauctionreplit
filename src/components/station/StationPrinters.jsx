import React, { useEffect, useRef, useState } from 'react';
import { Power, Wifi, Usb, FolderCog, Play, Printer, Download, Terminal, CircleDot, RefreshCw, Search, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

const hasBridge = () => typeof window !== 'undefined' && !!window.api;

const MODES = [
  { k: 'network', label: 'Network (IP)', Icon: Wifi, hint: 'Send raw ZPL to the printer over the network (port 9100).' },
  { k: 'windows', label: 'Windows driver', Icon: Usb, hint: 'Print through an installed Windows printer by name.' },
  { k: 'zebradesigner', label: 'ZebraDesigner', Icon: FolderCog, hint: 'Drop data files into a watched folder for ZebraDesigner Automation.' },
];

const FIELD = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const LAB = 'mb-1 block font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400';

export default function StationPrinters() {
  const bridge = hasBridge();
  const [cfg, setCfg] = useState(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [testCart, setTestCart] = useState('00');
  const [status, setStatus] = useState(null); // { online, detail }
  const [discovered, setDiscovered] = useState(null); // installed Windows printers
  const [discovering, setDiscovering] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (!bridge) return;
    window.api.getConfig().then((c) => { setCfg(c); setRunning(!!c.running); });
    window.api.onStatus((s) => setRunning(!!s.running));
    window.api.onLog((line) => setLog((l) => [...l.slice(-200), line]));
  }, [bridge]);

  // Poll live printer status (feature-detected — older app builds simply skip).
  const refreshStatus = React.useCallback(() => {
    if (!bridge || !window.api.printerStatus) return;
    window.api.printerStatus().then(setStatus).catch(() => setStatus({ online: false, detail: 'Unavailable' }));
  }, [bridge]);
  useEffect(() => {
    if (!bridge || !window.api.printerStatus) return undefined;
    refreshStatus();
    const t = setInterval(refreshStatus, 6000);
    return () => clearInterval(t);
  }, [bridge, refreshStatus, cfg?.mode, cfg?.host, cfg?.printerName, cfg?.watchFolder]);

  const discover = async () => {
    if (!window.api.discoverPrinters) return;
    setDiscovering(true);
    try { setDiscovered(await window.api.discoverPrinters()); } finally { setDiscovering(false); }
  };

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const patch = async (p) => { const next = await window.api.setConfig(p); setCfg(next); };

  if (!bridge) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="pk-icon-tile mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-stone-200 bg-white text-orange-600 shadow-soft"><Printer size={24} /></div>
        <h2 className="font-display text-[18px] font-bold uppercase tracking-[0.1em] text-slate-800">Printer control is desktop-only</h2>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-slate-500">
          Designing and the queue work anywhere, but talking to the Zebra runs inside the Vista Print Station desktop app on the PC beside the printer.
        </p>
        <a href="https://github.com/alexiascu219-lab/vistaauctionreplit/releases/latest" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-slate-800"><Download size={15} /> Download the desktop app</a>
      </div>
    );
  }

  if (!cfg) return <div className="grid h-full place-items-center text-stone-300">Loading…</div>;

  const mode = MODES.find((m) => m.k === cfg.mode) || MODES[0];

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-h-0 overflow-y-auto px-6 py-6">
        {/* Engine switch */}
        <div className={`flex items-center justify-between rounded-2xl border p-4 shadow-soft transition ${running ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-200 bg-white'}`}>
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${running ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-slate-500'}`}><Power size={20} /></span>
            <div>
              <p className="font-display text-[14px] font-bold uppercase tracking-[0.1em] text-slate-800">Printing {running ? 'active' : 'stopped'}</p>
              <p className="font-mono text-[11px] text-slate-400">{running ? 'Claiming jobs from the queue' : 'The engine is idle'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-bold ${status.online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`} title={status.detail}>
                {status.online ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} {status.detail || (status.online ? 'Ready' : 'Offline')}
              </span>
            )}
            <button onClick={() => window.api.toggleEngine(!running)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white transition ${running ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              <Power size={15} /> {running ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>

        {/* Mode */}
        <p className="mb-2 mt-6 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Connection</p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button key={m.k} onClick={() => patch({ mode: m.k })} className={`rounded-xl border p-3 text-left transition ${cfg.mode === m.k ? 'border-orange-300 bg-orange-50/60 shadow-soft' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
              <m.Icon size={17} className={cfg.mode === m.k ? 'text-orange-600' : 'text-slate-400'} />
              <p className="mt-2 text-[12.5px] font-bold text-slate-800">{m.label}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-slate-400">{mode.hint}</p>

        {/* Mode-specific settings */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {cfg.mode === 'network' && (
            <>
              <label className="block"><span className={LAB}>Printer IP</span><input value={cfg.host || ''} onChange={(e) => patch({ host: e.target.value })} placeholder="192.168.1.50" className={FIELD} /></label>
              <label className="block"><span className={LAB}>Port</span><input value={cfg.port || 9100} onChange={(e) => patch({ port: Number(e.target.value) || 9100 })} className={FIELD} /></label>
              {window.api.printerStatus && (
                <div className="col-span-2">
                  <button onClick={refreshStatus} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"><RefreshCw size={13} /> Test connection</button>
                </div>
              )}
            </>
          )}
          {cfg.mode === 'windows' && (
            <>
              <div className="col-span-2 flex items-end gap-2">
                <label className="block flex-1"><span className={LAB}>Windows printer name</span><input value={cfg.printerName || ''} onChange={(e) => patch({ printerName: e.target.value })} placeholder="ZDesigner ZD621" className={FIELD} /></label>
                {window.api.discoverPrinters && (
                  <button onClick={discover} disabled={discovering} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-600 disabled:opacity-50"><Search size={13} /> {discovering ? 'Scanning…' : 'Discover'}</button>
                )}
              </div>
              {discovered && (
                <div className="col-span-2 -mt-1 flex flex-wrap gap-1.5">
                  {discovered.length === 0 && <span className="text-[12px] text-slate-400">No installed printers found.</span>}
                  {discovered.map((p) => (
                    <button key={p.name} onClick={() => patch({ printerName: p.name })} className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition ${cfg.printerName === p.name ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-stone-200 bg-white text-slate-600 hover:border-stone-300'}`}>
                      {p.zebra && <span className="mr-1 text-orange-500">◆</span>}{p.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {cfg.mode === 'zebradesigner' && (
            <>
              <div className="col-span-2 flex items-end gap-2">
                <label className="block flex-1"><span className={LAB}>Watched folder</span><input value={cfg.watchFolder || ''} readOnly placeholder="Choose a folder…" className={FIELD} /></label>
                <button onClick={async () => { const f = await window.api.pickFolder(); if (f) patch({ watchFolder: f }); }} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-600">Browse</button>
              </div>
              <label className="col-span-2 block"><span className={LAB}>Default .nlbl label file</span><input value={cfg.labelFile || ''} onChange={(e) => patch({ labelFile: e.target.value })} placeholder="cart-tag.nlbl" className={FIELD} /></label>
              <div className="col-span-2 rounded-xl border border-stone-200 bg-[#FBFBFA] p-3 text-[12px] leading-relaxed text-slate-500">
                <p className="mb-1 font-bold text-slate-700">Bridge to ZebraDesigner official</p>
                Jobs land here as <code className="text-orange-600">job-*.csv</code> (one row per number) plus a rolling <code className="text-orange-600">vista-data.csv</code>.
                Point a <b>ZebraDesigner Automation</b> file trigger at this folder for hands-off printing, or bind a <b>ZebraDesigner Professional</b> label to <code className="text-orange-600">vista-data.csv</code> and Print all records.
                {window.api.bridgeTest && (
                  <div className="mt-2">
                    <button onClick={async () => { const r = await window.api.bridgeTest(); if (r?.error) alert(r.error); }} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"><Send size={13} /> Write bridge test (3 rows)</button>
                  </div>
                )}
              </div>
            </>
          )}
          <label className="block"><span className={LAB}>Poll every (sec)</span><input value={cfg.pollSeconds || 4} onChange={(e) => patch({ pollSeconds: Math.max(1, Number(e.target.value) || 4) })} className={FIELD} /></label>
          <label className="col-span-2 mt-1 flex items-center gap-2"><input type="checkbox" checked={!!cfg.autoStart} onChange={(e) => patch({ autoStart: e.target.checked })} /> <span className="text-[12.5px] font-semibold text-slate-600">Start printing automatically on launch</span></label>
        </div>

        {/* Test */}
        <p className="mb-2 mt-6 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Test print</p>
        <div className="flex items-center gap-2">
          <input value={testCart} onChange={(e) => setTestCart(e.target.value)} className={`${FIELD} max-w-[140px]`} />
          <button onClick={() => window.api.testPrint(testCart)} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-[12.5px] font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"><Play size={14} /> Send test label</button>
        </div>
      </div>

      {/* Live log */}
      <div className="flex min-h-0 flex-col border-l border-stone-200/70 bg-[#0e1216]">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <Terminal size={14} className="text-emerald-400" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">Activity</span>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10.5px] text-white/40"><CircleDot size={9} className={running ? 'text-emerald-400' : 'text-white/30'} /> {running ? 'live' : 'idle'}</span>
        </div>
        <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 font-mono text-[11.5px] leading-relaxed text-emerald-300/90">
          {log.length === 0 ? <p className="text-white/30">Waiting for activity…</p> : log.map((l, i) => <div key={i} className="whitespace-pre-wrap">{l}</div>)}
        </div>
      </div>
    </div>
  );
}
