import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Printer, Pencil, Plus, Save, Trash2, Type, Barcode, Square, Minus,
  Tag, Hash, Loader2, Check, ArrowRight, Layers, Sparkles, Wand2, Database, ImagePlus, X, RotateCw,
} from 'lucide-react';
import Toast from '../components/Toast';
import LabelSvg from '../components/labels/LabelSvg';
import ElementInspector from '../components/labels/ElementInspector';
import DataPanel from '../components/labels/DataPanel';
import { LABEL_ELEMENT_TYPES, PRESET_SIZES, DEFAULT_LABEL, newElement, referencedVars } from '../config/labelsConfig';
import { expandNumbers } from '../lib/zpl';
import { listTemplates, saveTemplate, archiveTemplate, queueLabelPrints } from '../lib/labelsApi';
import { generateLabelDesign, enqueueClaudeDesign, fetchAiRequest, templateFromRequest } from '../lib/labelsAi';

const TOOL_ICONS = { Type, Barcode, Square, Minus };
const clone = (o) => JSON.parse(JSON.stringify(o));

// Decode a picked file to something drawable. createImageBitmap handles
// JPEG/PNG/WebP (and HEIC on Safari); for HEIC the browser can't decode we fall
// back to the heic2any decoder, then a plain <img> as a last resort.
async function decodeImage(file) {
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || '');
  if (!isHeic && 'createImageBitmap' in window) {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  if (isHeic) {
    try {
      const heic2any = (await import('heic2any')).default;
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
      const jpeg = Array.isArray(out) ? out[0] : out;
      return await createImageBitmap(jpeg);
    } catch { /* fall through to <img> */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image format could not be read — try a screenshot or JPEG')); };
    img.src = url;
  });
}

// Re-encode a picked image to a downscaled JPEG data URL — normalises iPhone
// HEIC (which vision APIs reject) to JPEG and keeps the payload small enough for
// the model, the two things that make raw phone photos fail.
async function prepImage(file, maxDim = 1024, quality = 0.85) {
  const src = await decodeImage(file);
  const iw = src.width;
  const ih = src.height;
  if (!iw || !ih) throw new Error('That image could not be read');
  const s = Math.min(1, maxDim / Math.max(iw, ih));
  const w = Math.round(iw * s);
  const h = Math.round(ih * s);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(src, 0, 0, w, h);
  if (src.close) src.close();
  return canvas.toDataURL('image/jpeg', quality);
}

const Header = () => (
  <header className="fixed inset-x-0 top-0 z-50">
    <div className="border-b border-stone-200/80 bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center px-5 sm:px-8">
        <Link to="/carts" className="group flex items-center gap-3" aria-label="Vista Auction — Cart Yard">
          <img src="/assets/logo-tag.png" alt="Vista Auction" className="h-12 w-auto transition-transform group-hover:scale-[1.03]" />
          <span className="flex flex-col leading-none">
            <span className="font-fraunces text-[19px] font-medium tracking-tight text-slate-900">Label Studio</span>
            <span className="mt-1 text-[10px] font-semibold tracky text-slate-400">VISTA AUCTION</span>
          </span>
        </Link>
        <Link to="/carts" className="ml-auto text-[12.5px] font-semibold text-slate-400 hover:text-slate-700">← Cart Yard</Link>
      </div>
    </div>
  </header>
);

const btn = 'pk-press inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition';

const Labels = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('print');
  const [selectedId, setSelectedId] = useState(null);
  const [work, setWork] = useState(null); // working template copy
  const [dirty, setDirty] = useState(false);
  const [selEl, setSelEl] = useState(null);
  const [values, setValues] = useState({});
  const [batch, setBatch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState('mistral');
  const [aiImage, setAiImage] = useState(null); // data URL reference image (vision)
  const [aiBusy, setAiBusy] = useState(false);
  const [claudeReq, setClaudeReq] = useState(null);
  const [claudeStatus, setClaudeStatus] = useState('idle'); // idle | pending

  // Watch a queued Claude request until the Routine fills it in.
  useEffect(() => {
    if (!claudeReq) return undefined;
    let stop = false;
    let tries = 0;
    const tick = async () => {
      if (stop) return;
      tries += 1;
      try {
        const r = await fetchAiRequest(claudeReq);
        if (r.status === 'done' && r.result) {
          setWork({ ...templateFromRequest(r), id: undefined });
          setSelectedId(null);
          setSelEl(null);
          setDirty(true);
          setClaudeStatus('idle');
          setClaudeReq(null);
          setToast({ message: 'Claude designed your label — tweak, then Save', type: 'success' });
          return;
        }
        if (r.status === 'error') {
          setClaudeStatus('idle');
          setClaudeReq(null);
          setToast({ message: r.error || 'Claude could not design that one', type: 'error' });
          return;
        }
      } catch {
        /* keep waiting */
      }
      if (tries < 600) setTimeout(tick, 2000); // poll fast (~20 min) while the page is open
      else setClaudeStatus('idle');
    };
    const h = setTimeout(tick, 1200);
    return () => {
      stop = true;
      clearTimeout(h);
    };
  }, [claudeReq]);

  const load = useCallback(async (keepId) => {
    try {
      const list = await listTemplates();
      setTemplates(list);
      const pick = list.find((t) => t.id === keepId) || list[0] || null;
      if (pick) selectTemplate(pick);
    } catch (err) {
      setToast({ message: err.message || 'Could not load templates', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function selectTemplate(t) {
    setSelectedId(t.id);
    setWork(clone(t));
    setSelEl(null);
    setDirty(false);
    const v = {};
    (t.variables || []).forEach((vv) => (v[vv.key] = vv.default ?? ''));
    setValues(v);
    setBatch('');
  }

  const newTemplate = () => {
    const t = { ...clone(DEFAULT_LABEL), name: 'New label', elements: [] };
    setSelectedId(null);
    setWork(t);
    setSelEl(null);
    setDirty(true);
    setMode('design');
    const v = {};
    (t.variables || []).forEach((vv) => (v[vv.key] = vv.default ?? ''));
    setValues(v);
  };

  // ---- Design editing ------------------------------------------------------
  const patchWork = (patch) => { setWork((w) => ({ ...w, ...patch })); setDirty(true); };
  const addEl = (type) => {
    setWork((w) => {
      const el = newElement(type, w);
      setSelEl(el.id);
      return { ...w, elements: [...(w.elements || []), el] };
    });
    setDirty(true);
  };
  const updateEl = (id, patch) => { setWork((w) => ({ ...w, elements: w.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) })); setDirty(true); };
  const deleteEl = (id) => { setWork((w) => ({ ...w, elements: w.elements.filter((e) => e.id !== id) })); setSelEl(null); setDirty(true); };
  const duplicateEl = (id) => {
    setWork((w) => {
      const el = w.elements.find((e) => e.id === id);
      if (!el) return w;
      const copy = { ...el, id: `e${Math.random().toString(36).slice(2, 7)}`, x: Math.min((w.width || 609) - 4, (el.x || 0) + 16), y: Math.min((w.height || 406) - 4, (el.y || 0) + 16) };
      setSelEl(copy.id);
      return { ...w, elements: [...w.elements, copy] };
    });
    setDirty(true);
  };
  const reorderEl = (id, dir) => {
    setWork((w) => {
      const i = w.elements.findIndex((e) => e.id === id);
      if (i === -1) return w;
      const j = dir === 'up' ? i + 1 : i - 1;
      if (j < 0 || j >= w.elements.length) return w;
      const arr = [...w.elements];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...w, elements: arr };
    });
    setDirty(true);
  };

  // Keyboard: nudge / delete / duplicate the selected element in Design mode.
  useEffect(() => {
    if (mode !== 'design' || !selEl) return undefined;
    const onKey = (e) => {
      const t = (e.target.tagName || '').toLowerCase();
      if (t === 'input' || t === 'textarea' || t === 'select' || e.target.isContentEditable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteEl(selEl); return; }
      if ((e.key === 'd' || e.key === 'D') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); duplicateEl(selEl); return; }
      const step = e.shiftKey ? 10 : 1;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        setWork((w) => ({ ...w, elements: w.elements.map((el) => (el.id === selEl ? { ...el, x: Math.max(0, (el.x || 0) + dx), y: Math.max(0, (el.y || 0) + dy) } : el)) }));
        setDirty(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selEl]);

  const selectedElement = useMemo(() => (work?.elements || []).find((e) => e.id === selEl) || null, [work, selEl]);

  // Variables
  const setVar = (i, patch) => patchWork({ variables: work.variables.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });
  const addVar = () => patchWork({ variables: [...(work.variables || []), { key: `var${(work.variables?.length || 0) + 1}`, label: 'Variable', default: '' }] });
  const removeVar = (i) => patchWork({ variables: work.variables.filter((_, idx) => idx !== i) });
  const missingVars = useMemo(() => {
    if (!work) return [];
    const have = new Set((work.variables || []).map((v) => v.key));
    return referencedVars(work.elements).filter((k) => !have.has(k));
  }, [work]);

  const save = async () => {
    setBusy(true);
    try {
      const saved = await saveTemplate(work, 'Label Studio');
      setDirty(false);
      const list = await listTemplates();
      setTemplates(list);
      setSelectedId(saved.id);
      setWork(clone(saved));
      setToast({ message: 'Template saved', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Could not save', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!work?.id) return;
    setBusy(true);
    try {
      await archiveTemplate(work.id);
      setToast({ message: 'Template deleted', type: 'info' });
      await load();
    } catch (err) {
      setToast({ message: err.message || 'Could not delete', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // ---- Printing ------------------------------------------------------------
  const primaryKey = work?.variables?.[0]?.key || 'cart_number';
  const batchList = useMemo(() => (batch.trim() ? expandNumbers(batch) : []), [batch]);
  const previewValues = useMemo(() => (batchList.length ? { ...values, [primaryKey]: batchList[0] } : values), [values, batchList, primaryKey]);

  const doPrint = async () => {
    if (!work) return;
    setBusy(true);
    try {
      const jobs = batchList.length
        ? batchList.map((n) => ({ values: { ...values, [primaryKey]: n }, title: `${work.name} · ${n}` }))
        : [{ values, title: work.name }];
      await queueLabelPrints({ template: work, jobs, quantity: Math.max(1, quantity | 0 || 1), by: 'Label Studio', source: 'web' });
      setToast({ message: `Queued ${jobs.length * Math.max(1, quantity | 0 || 1)} label${jobs.length === 1 && quantity <= 1 ? '' : 's'}`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Could not queue print', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (file) => {
    if (!file) return;
    try {
      setAiImage(await prepImage(file));
    } catch (e) {
      setToast({ message: e.message || 'Could not read that image', type: 'error' });
    }
  };

  const generate = async () => {
    if (!aiPrompt.trim() && !aiImage) return;
    const base = { width: work?.width || 609, height: work?.height || 406 };

    // Claude runs through the async Routine (uses your claude.ai subscription).
    if (aiProvider === 'claude') {
      setClaudeStatus('pending');
      try {
        const req = await enqueueClaudeDesign({ prompt: aiPrompt.trim(), base, by: 'Label Studio', image: aiImage });
        setClaudeReq(req.id);
        setToast({ message: aiImage ? 'Sent to Claude with your image — the Routine will draft it' : 'Sent to Claude — your Routine will draft it', type: 'info' });
      } catch (err) {
        setClaudeStatus('idle');
        setToast({ message: err.message || 'Could not reach the Claude queue', type: 'error' });
      }
      return;
    }

    // Mistral / Pixtral is instant via the /api/ai proxy.
    setAiBusy(true);
    try {
      const t = await generateLabelDesign({ prompt: aiPrompt.trim(), base, provider: aiProvider, image: aiImage });
      setWork({ ...t, id: undefined });
      setSelectedId(null);
      setSelEl(null);
      setDirty(true);
      setToast({ message: 'Mistral designed your label — tweak, then Save', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'AI generation failed', type: 'error' });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="pickups-atelier min-h-screen font-sans text-slate-900 antialiased">
      <div className="pickups-grid-veil" />
      <Header />

      <main className="relative z-10 mx-auto max-w-[1240px] px-5 pb-24 pt-28 sm:px-8">
        {/* Hero */}
        <section className="pk-rise pt-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 py-1.5 pl-2.5 pr-3.5 shadow-soft">
            <Tag size={13} className="text-orange-600" />
            <span className="text-[11.5px] font-semibold tracky text-slate-900/70">LABEL STUDIO</span>
          </span>
          <h1 className="mt-6 font-fraunces text-[clamp(2.4rem,6vw,4rem)] font-normal leading-[0.98] tracking-[-0.03em] text-slate-900">
            Design &amp; print{' '}
            <span className="relative inline-block">stickers<span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-orange-600/90" /></span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-500">
            Type a number to print, or open the maker to design a label — every job goes to the same Zebra print queue.
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-soft">
            {[{ k: 'print', label: 'Print', icon: Printer }, { k: 'design', label: 'Design', icon: Pencil }, { k: 'data', label: 'Data', icon: Database }].map((m) => {
              const Icon = m.icon;
              const active = mode === m.k;
              return (
                <button key={m.k} onClick={() => setMode(m.k)} className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors ${active ? 'text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                  {active && <motion.span layoutId="label-mode" className="absolute inset-0 rounded-xl bg-slate-900" transition={{ type: 'spring', damping: 26, stiffness: 300 }} />}
                  <span className="relative flex items-center gap-2"><Icon size={15} /> {m.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-32"><div className="h-9 w-9 animate-spin rounded-full border-2 border-stone-200 border-t-orange-500" /></div>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            {/* Template rail */}
            <aside className="pk-rise">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-fraunces text-[18px] font-medium tracking-tight text-slate-900">Templates</h2>
                <button onClick={newTemplate} className={`${btn} border border-stone-200 bg-white text-slate-700 hover:border-stone-300`}><Plus size={14} /> New</button>
              </div>
              <div className="flex flex-col gap-2">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => selectTemplate(t)} className={`rounded-2xl border p-2.5 text-left transition ${selectedId === t.id ? 'border-slate-900 bg-white shadow-lift' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                    <div className="overflow-hidden rounded-lg border border-stone-100 bg-white">
                      <LabelSvg template={t} values={(t.variables || []).reduce((a, v) => ((a[v.key] = v.default), a), {})} />
                    </div>
                    <p className="mt-2 truncate text-[13px] font-bold text-slate-900">{t.name}</p>
                    <p className="truncate text-[11px] text-slate-400">{t.width}×{t.height} dots</p>
                  </button>
                ))}
                {templates.length === 0 && <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-[12.5px] text-slate-400">No templates yet.</p>}
              </div>
            </aside>

            {/* Content */}
            <div className="pk-rise" style={{ animationDelay: '.05s' }}>
              {!work ? (
                <p className="rounded-3xl border border-dashed border-stone-300 p-16 text-center text-slate-400">Pick a template on the left, or make a new one.</p>
              ) : mode === 'data' ? (
                /* ---- DATA MODE ---- */
                <DataPanel template={work} onToast={(m, t) => setToast({ message: m, type: t })} />
              ) : mode === 'print' ? (
                /* ---- PRINT MODE ---- */
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-soft">
                      <div className="rounded-lg border border-stone-100" style={{ background: '#f5f5f4' }}>
                        <LabelSvg template={work} values={previewValues} />
                      </div>
                    </div>
                    <p className="mt-2 text-center text-[11.5px] text-slate-400">Live preview · barcode shown representative</p>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
                    <h3 className="font-fraunces text-[19px] font-medium tracking-tight text-slate-900">{work.name}</h3>
                    <div className="mt-4 space-y-3">
                      {(work.variables || []).map((v) => (
                        <label key={v.key} className="block">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{v.label || v.key}</span>
                          <input value={values[v.key] ?? ''} onChange={(e) => setValues((s) => ({ ...s, [v.key]: e.target.value }))} className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[15px] font-semibold text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/15" />
                        </label>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-stone-200 bg-[#FBFBFA] p-3.5">
                      <label className="block">
                        <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><Hash size={12} /> Batch numbers / ranges</span>
                        <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. 397-432, 500, 502" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[14px] font-semibold text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                      </label>
                      <p className="mt-1.5 text-[11.5px] text-slate-400">
                        {batchList.length ? `Prints ${batchList.length} labels, filling “${primaryKey}”.` : `One label from the fields above. Fills the first variable when set.`}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
                        Copies
                        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-16 rounded-lg border border-stone-200 px-2 py-1.5 text-[14px] font-semibold" />
                      </label>
                      <button onClick={doPrint} disabled={busy} className={`${btn} ml-auto bg-orange-600 px-5 py-3 text-white shadow-glow hover:bg-orange-700 disabled:opacity-50`}>
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                        Print {batchList.length > 1 ? `${batchList.length}×` : ''}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ---- DESIGN MODE ---- */
                <div>
                  {/* Toolbar */}
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2.5 shadow-soft">
                    <span className="ml-1 text-[11px] font-bold tracky text-slate-400">ADD</span>
                    {LABEL_ELEMENT_TYPES.map((t) => {
                      const Icon = TOOL_ICONS[t.icon] || Type;
                      return (
                        <button key={t.type} onClick={() => addEl(t.type)} className={`${btn} border border-stone-200 bg-[#FBFBFA] text-slate-700 hover:border-orange-200 hover:text-orange-600`}>
                          <Icon size={14} /> {t.label}
                        </button>
                      );
                    })}
                    <div className="ml-auto flex items-center gap-2">
                      {dirty && <span className="text-[11.5px] font-semibold text-amber-600">Unsaved</span>}
                      {work.id && <button onClick={del} disabled={busy} className={`${btn} border border-stone-200 bg-white text-slate-400 hover:border-red-200 hover:text-red-500`}><Trash2 size={14} /></button>}
                      <button onClick={save} disabled={busy || !dirty} className={`${btn} bg-slate-900 px-4 text-white hover:bg-slate-800 disabled:opacity-40`}>
                        {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
                    {/* Canvas */}
                    <div>
                      <div className="rounded-2xl border border-stone-200 p-4 shadow-soft" style={{ background: 'repeating-conic-gradient(#f5f5f4 0% 25%, #fff 0% 50%) 50% / 22px 22px' }}>
                        <div className="mx-auto overflow-hidden rounded-lg shadow-lift" style={{ maxWidth: Math.min(560, work.width) }}>
                          <LabelSvg
                            template={work}
                            values={(work.variables || []).reduce((a, v) => ((a[v.key] = v.default), a), {})}
                            interactive
                            selectedId={selEl}
                            onSelect={setSelEl}
                            onLiveChange={updateEl}
                            onCommit={() => setDirty(true)}
                          />
                        </div>
                      </div>

                      {/* Name + size */}
                      <div className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-soft sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Template name</span>
                          <input value={work.name} onChange={(e) => patchWork({ name: e.target.value })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[14px] font-bold" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Width (dots)</span>
                          <input type="number" value={work.width} onChange={(e) => patchWork({ width: Number(e.target.value) })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[14px] font-semibold" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Height (dots)</span>
                          <input type="number" value={work.height} onChange={(e) => patchWork({ height: Number(e.target.value) })} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[14px] font-semibold" />
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
                          {PRESET_SIZES.map((s) => (
                            <button key={s.label} onClick={() => patchWork({ width: s.w, height: s.h })} className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition ${work.width === s.w && work.height === s.h ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-stone-200 bg-white text-slate-500 hover:border-stone-300'}`}>{s.label}</button>
                          ))}
                          <button onClick={() => patchWork({ width: work.height, height: work.width })} title="Swap width & height" className="ml-auto inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11.5px] font-bold text-slate-500 transition hover:border-stone-300"><RotateCw size={13} /> Rotate</button>
                        </div>
                      </div>
                    </div>

                    {/* Right: AI + inspector + variables */}
                    <div className="space-y-4">
                      {/* AI generator */}
                      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-soft">
                        <div className="mb-2.5 flex items-center gap-2">
                          <Sparkles size={15} className="text-violet-600" />
                          <span className="text-[12.5px] font-bold text-slate-800">Generate with AI</span>
                        </div>
                        <div className="mb-2 flex gap-1.5">
                          {[{ k: 'mistral', label: 'Mistral' }, { k: 'claude', label: 'Claude' }].map((p) => (
                            <button
                              key={p.k}
                              onClick={() => setAiProvider(p.k)}
                              className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition ${
                                aiProvider === p.k ? 'border-violet-300 bg-violet-100 text-violet-700' : 'border-stone-200 bg-white text-slate-500 hover:border-violet-300'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          rows={3}
                          disabled={aiBusy || claudeStatus === 'pending'}
                          placeholder={aiImage ? 'Optional: describe changes to the reference image…' : 'e.g. A bin tag with a big cart number and a QR code'}
                          className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60"
                        />

                        {(
                          aiImage ? (
                            <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-violet-200 bg-white p-2">
                              <img src={aiImage} alt="Reference" className="h-12 w-12 rounded-lg border border-stone-200 object-cover" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11.5px] font-bold text-slate-700">Reference image attached</p>
                                <p className="text-[10.5px] text-violet-600">{aiProvider === 'claude' ? 'Claude will look at this' : 'Pixtral vision will look at this'}</p>
                              </div>
                              <button onClick={() => setAiImage(null)} title="Remove image" className="rounded-lg p-1.5 text-slate-400 hover:bg-stone-100 hover:text-red-500"><X size={15} /></button>
                            </div>
                          ) : (
                            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-white py-2 text-[12px] font-bold text-violet-600 transition hover:bg-violet-50">
                              <ImagePlus size={15} /> Add reference image
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { onPickImage(e.target.files?.[0]); e.target.value = ''; }} />
                            </label>
                          )
                        )}

                        {claudeStatus === 'pending' ? (
                          <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-[12px] font-semibold text-violet-700">
                            <Loader2 size={15} className="animate-spin" /> Claude is drafting via your Routine…
                          </div>
                        ) : (
                          <button
                            onClick={generate}
                            disabled={aiBusy || (!aiPrompt.trim() && !aiImage)}
                            className="pk-press mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-[13px] font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
                          >
                            {aiBusy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                            {aiBusy ? 'Designing…' : aiProvider === 'claude' ? (aiImage ? 'Send image to Claude' : 'Send to Claude') : aiImage ? 'Generate from image' : 'Generate design'}
                          </button>
                        )}
                        <p className="mt-1.5 text-[10.5px] text-slate-400">
                          {aiProvider === 'claude'
                            ? 'Claude drafts via your Routine, then loads here. Attach an image and Claude will see it.'
                            : aiImage
                              ? 'Uses Pixtral vision to design from your reference image.'
                              : 'Creates a new unsaved template you can tweak. Add an image to design from a reference.'}
                        </p>
                      </div>

                      {selectedElement ? (
                        <ElementInspector element={selectedElement} onChange={updateEl} onDelete={deleteEl} onDuplicate={duplicateEl} onReorder={reorderEl} />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-[12.5px] text-slate-400">Tap an element to edit it, or add one above.</div>
                      )}

                      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700"><Layers size={14} /> Variables</span>
                          <button onClick={addVar} className="text-[12px] font-bold text-orange-600 hover:text-orange-700">+ Add</button>
                        </div>
                        {missingVars.length > 0 && (
                          <button onClick={() => patchWork({ variables: [...(work.variables || []), ...missingVars.map((k) => ({ key: k, label: k, default: '' }))] })} className="mb-2 w-full rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-[11.5px] font-semibold text-orange-700">
                            Declare {missingVars.map((v) => `\${${v}}`).join(', ')}
                          </button>
                        )}
                        <div className="space-y-2">
                          {(work.variables || []).map((v, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <input value={v.key} onChange={(e) => setVar(i, { key: e.target.value })} placeholder="key" className="w-[38%] rounded-lg border border-stone-200 px-2 py-1.5 text-[12px] font-bold text-slate-900" />
                              <input value={v.default ?? ''} onChange={(e) => setVar(i, { default: e.target.value })} placeholder="default" className="flex-1 rounded-lg border border-stone-200 px-2 py-1.5 text-[12px] font-semibold text-slate-600" />
                              <button onClick={() => removeVar(i)} className="rounded-lg p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          {(work.variables || []).length === 0 && <p className="text-[11.5px] text-slate-400">No variables. Use <code className="text-orange-600">{'${name}'}</code> in text/barcode values, then declare them here.</p>}
                        </div>
                      </div>

                      <button onClick={() => setMode('print')} className={`${btn} w-full justify-center border border-stone-200 bg-white text-slate-700 hover:border-stone-300`}>
                        Go to Print <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="mt-16">
          <div className="pk-hairline" />
          <p className="mt-6 text-[13px] text-slate-500">Vista Auction · Label Studio · prints to the Zebra queue</p>
        </footer>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Labels;
