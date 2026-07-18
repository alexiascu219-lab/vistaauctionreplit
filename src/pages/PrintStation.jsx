import React, { useEffect, useState } from 'react';
import { PenTool, ListChecks, SlidersHorizontal, Tag, CircleDot } from 'lucide-react';
import Labels from './Labels';
import StationQueue from '../components/station/StationQueue';
import StationPrinters from '../components/station/StationPrinters';

// Vista Print Station — a bespoke, industrial workspace shell (a modernized take
// on ZebraDesigner Professional). Dark tool-rail + a bright precision canvas.
// Runs as the desktop app's window and as a pro web console.

const NAV = [
  { k: 'design', label: 'Design', sub: 'Build & print labels', Icon: PenTool },
  { k: 'queue', label: 'Queue', sub: 'Live print jobs', Icon: ListChecks },
  { k: 'printers', label: 'Printers', sub: 'Zebra & engine', Icon: SlidersHorizontal },
];

const SCOPED_CSS = `
.vps { --ink:#12151b; --rail:#14181f; --rail2:#1b212b; --line:#e7e5e4; --accent:#ea580c; }
.vps .font-display { font-family:'Archivo','Archivo Expanded',system-ui,sans-serif; }
.vps ::-webkit-scrollbar { width:10px; height:10px; }
.vps ::-webkit-scrollbar-thumb { background:#d6d3d1; border-radius:8px; border:2px solid transparent; background-clip:content-box; }
.vps ::-webkit-scrollbar-thumb:hover { background:#a8a29e; background-clip:content-box; }
.vps-rail-btn::before { content:''; position:absolute; left:0; top:50%; height:0; width:3px; border-radius:0 3px 3px 0; background:var(--accent); transform:translateY(-50%); transition:height .18s ease; }
.vps-rail-btn[data-active="true"]::before { height:26px; }
.vps-canvas { background:
  radial-gradient(circle at 1px 1px, rgba(15,23,42,0.05) 1px, transparent 0) 0 0 / 22px 22px,
  linear-gradient(#faf9f7,#f4f2ee); }
`;

export default function PrintStation() {
  const [view, setView] = useState('design');
  const [engine, setEngine] = useState(null); // null=web, {running}
  const bridge = typeof window !== 'undefined' && !!window.api;

  useEffect(() => {
    if (!bridge) return;
    window.api.getConfig?.().then((c) => setEngine({ running: !!c.running }));
    window.api.onStatus?.((s) => setEngine({ running: !!s.running }));
  }, [bridge]);

  const current = NAV.find((n) => n.k === view) || NAV[0];

  return (
    <div className="vps flex h-screen w-full overflow-hidden bg-[#f4f2ee] font-sans text-slate-900 antialiased">
      <style>{SCOPED_CSS}</style>

      {/* Tool rail */}
      <nav className="flex w-[76px] shrink-0 flex-col items-center bg-[var(--rail)] py-4 text-white/70">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent)] text-white shadow-[0_6px_20px_-6px_rgba(234,88,12,0.8)]">
          <Tag size={20} />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {NAV.map((n) => {
            const active = view === n.k;
            return (
              <button
                key={n.k}
                data-active={active}
                onClick={() => setView(n.k)}
                title={n.label}
                className={`vps-rail-btn relative flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl transition ${active ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/80'}`}
              >
                <n.Icon size={20} />
                <span className="font-display text-[9px] font-bold uppercase tracking-[0.08em]">{n.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-col items-center gap-1 text-white/30">
          <CircleDot size={12} className={engine?.running ? 'text-emerald-400' : 'text-white/25'} />
          <span className="font-mono text-[8px] uppercase tracking-wider">{bridge ? (engine?.running ? 'live' : 'idle') : 'web'}</span>
        </div>
      </nav>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-[var(--line)] bg-white/80 px-6 py-3 backdrop-blur">
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="font-display text-[16px] font-extrabold uppercase tracking-[0.16em] text-slate-900">Vista Print Station</h1>
              <span className="font-mono text-[11px] text-slate-400">/ {current.label}</span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-400">{current.sub}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold ${bridge ? (engine?.running ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-slate-500') : 'border-stone-200 bg-white text-slate-500'}`}>
              <CircleDot size={10} className={engine?.running ? 'text-emerald-500' : 'text-slate-400'} />
              {bridge ? (engine?.running ? 'Engine live' : 'Engine idle') : 'Web console'}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-hidden">
          {view === 'design' && (
            <div className="vps-canvas h-full overflow-y-auto">
              <Labels embedded />
            </div>
          )}
          {view === 'queue' && <div className="h-full bg-white"><StationQueue /></div>}
          {view === 'printers' && <div className="h-full bg-[#faf9f7]"><StationPrinters /></div>}
        </main>
      </div>
    </div>
  );
}
