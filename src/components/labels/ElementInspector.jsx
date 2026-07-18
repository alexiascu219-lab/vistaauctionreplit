import React from 'react';
import { Trash2, Copy, ChevronUp, ChevronDown, Upload, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react';
import { SYMBOLOGIES, LABEL_FONTS } from '../../config/labelsConfig';

const FIELD = 'w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const LAB = 'block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1';
const ICONBTN = 'rounded-lg border border-stone-200 bg-white p-1.5 text-slate-400 transition hover:border-stone-300 hover:text-slate-700';
const ROTATIONS = [{ v: 'N', d: '0°' }, { v: 'R', d: '90°' }, { v: 'I', d: '180°' }, { v: 'B', d: '270°' }];

const Num = ({ label, value, onChange, step = 1 }) => (
  <label className="block">
    <span className={LAB}>{label}</span>
    <input type="number" step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} className={FIELD} />
  </label>
);

const Rotation = ({ value, onChange }) => (
  <label className="block">
    <span className={LAB}>Rotation</span>
    <select value={value || 'N'} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      {ROTATIONS.map((r) => <option key={r.v} value={r.v}>{r.d}</option>)}
    </select>
  </label>
);

const ALIGNS = [
  { k: 'left', d: 'Left', Icon: AlignStartVertical },
  { k: 'hcenter', d: 'Center', Icon: AlignCenterVertical },
  { k: 'right', d: 'Right', Icon: AlignEndVertical },
  { k: 'top', d: 'Top', Icon: AlignStartHorizontal },
  { k: 'vcenter', d: 'Middle', Icon: AlignCenterHorizontal },
  { k: 'bottom', d: 'Bottom', Icon: AlignEndHorizontal },
];

const ElementInspector = ({ element: el, onChange, onDelete, onDuplicate, onReorder, onUploadImage, onAlign }) => {
  if (!el) return null;
  const set = (patch) => onChange(el.id, patch);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-lg bg-[#FBFBFA] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{el.type}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onReorder(el.id, 'up')} title="Bring forward" className={ICONBTN}><ChevronUp size={14} /></button>
          <button onClick={() => onReorder(el.id, 'down')} title="Send back" className={ICONBTN}><ChevronDown size={14} /></button>
          <button onClick={() => onDuplicate(el.id)} title="Duplicate (Ctrl/Cmd+D)" className={ICONBTN}><Copy size={14} /></button>
          <button onClick={() => onDelete(el.id)} title="Delete (Del)" className={`${ICONBTN} hover:border-red-200 hover:text-red-500`}><Trash2 size={14} /></button>
        </div>
      </div>

      {(el.type === 'text' || el.type === 'barcode') && (
        <label className="mb-3 block">
          <span className={LAB}>Value {el.type === 'barcode' ? '(data)' : ''}</span>
          <input value={el.value || ''} onChange={(e) => set({ value: e.target.value })} placeholder="Text or ${variable}" className={FIELD} />
          <span className="mt-1 block text-[10.5px] text-slate-400">Use <code className="text-orange-600">{'${name}'}</code> to insert a variable.</span>
        </label>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Num label="X (dots)" value={el.x} onChange={(v) => set({ x: v })} />
        <Num label="Y (dots)" value={el.y} onChange={(v) => set({ y: v })} />

        {el.type === 'text' && (
          <>
            <Num label="Font size" value={el.size} onChange={(v) => set({ size: v })} />
            <Rotation value={el.rotation} onChange={(v) => set({ rotation: v })} />
            <label className="block">
              <span className={LAB}>Font</span>
              <select value={el.font || '0'} onChange={(e) => set({ font: e.target.value })} className={FIELD}>
                {LABEL_FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={LAB}>Align</span>
              <select value={el.align || 'left'} onChange={(e) => set({ align: e.target.value })} className={FIELD}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="col-span-2 flex items-center gap-2 pt-1">
              <input type="checkbox" checked={!!el.inverse} onChange={(e) => set({ inverse: e.target.checked })} />
              <span className="text-[12px] font-semibold text-slate-600">Inverse (white on black)</span>
            </label>
          </>
        )}

        {el.type === 'image' && (
          <>
            <Num label="Width" value={el.w} onChange={(v) => set({ w: v })} />
            <Num label="Height" value={el.h} onChange={(v) => set({ h: v })} />
            <label className="col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-orange-300 bg-white py-2 text-[12px] font-bold text-orange-600 transition hover:bg-orange-50">
              <Upload size={14} /> {el.src ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUploadImage?.(el.id, e.target.files[0]); e.target.value = ''; }} />
            </label>
          </>
        )}

        {el.type === 'barcode' && (
          <>
            <label className="block">
              <span className={LAB}>Symbology</span>
              <select value={el.symbology || 'code128'} onChange={(e) => set({ symbology: e.target.value })} className={FIELD}>
                {SYMBOLOGIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <Num label="Height" value={el.height} onChange={(v) => set({ height: v })} />
            <Num label="Module" value={el.module} onChange={(v) => set({ module: v })} />
            <Rotation value={el.rotation} onChange={(v) => set({ rotation: v })} />
            <label className="col-span-2 flex items-center gap-2 pt-1">
              <input type="checkbox" checked={!!el.showText} onChange={(e) => set({ showText: e.target.checked })} />
              <span className="text-[12px] font-semibold text-slate-600">Show number under barcode</span>
            </label>
          </>
        )}

        {el.type === 'box' && (
          <>
            <Num label="Width" value={el.w} onChange={(v) => set({ w: v })} />
            <Num label="Height" value={el.h} onChange={(v) => set({ h: v })} />
            <Num label="Thickness" value={el.thickness} onChange={(v) => set({ thickness: v })} />
            <Num label="Rounding (0–8)" value={el.rounding} onChange={(v) => set({ rounding: Math.max(0, Math.min(8, v)) })} />
          </>
        )}

        {el.type === 'ellipse' && (
          <>
            <Num label="Width" value={el.w} onChange={(v) => set({ w: v })} />
            <Num label="Height" value={el.h} onChange={(v) => set({ h: v })} />
            <Num label="Thickness" value={el.thickness} onChange={(v) => set({ thickness: v })} />
          </>
        )}

        {el.type === 'arrow' && (
          <>
            <label className="block">
              <span className={LAB}>Direction</span>
              <select value={el.dir || 'up'} onChange={(e) => set({ dir: e.target.value })} className={FIELD}>
                <option value="up">Up ↑</option>
                <option value="down">Down ↓</option>
                <option value="left">Left ←</option>
                <option value="right">Right →</option>
              </select>
            </label>
            <Num label="Thickness" value={el.thickness} onChange={(v) => set({ thickness: v })} />
            <Num label="Width" value={el.w} onChange={(v) => set({ w: v })} />
            <Num label="Height" value={el.h} onChange={(v) => set({ h: v })} />
          </>
        )}

        {el.type === 'line' && (
          <>
            <label className="block">
              <span className={LAB}>Orientation</span>
              <select value={el.orient || 'h'} onChange={(e) => set({ orient: e.target.value })} className={FIELD}>
                <option value="h">Horizontal</option>
                <option value="v">Vertical</option>
              </select>
            </label>
            <Num label={el.orient === 'v' ? 'Length (h)' : 'Length (w)'} value={el.orient === 'v' ? el.h || el.w : el.w} onChange={(v) => set(el.orient === 'v' ? { h: v } : { w: v })} />
            <Num label="Thickness" value={el.thickness} onChange={(v) => set({ thickness: v })} />
          </>
        )}

        {onAlign && (
          <div className="col-span-2 pt-1">
            <span className={LAB}>Align on label</span>
            <div className="flex gap-1">
              {ALIGNS.map((a) => (
                <button key={a.k} onClick={() => onAlign(el.id, a.k)} title={a.d} className="flex-1 rounded-lg border border-stone-200 bg-white p-1.5 text-slate-500 transition hover:border-orange-200 hover:text-orange-600">
                  <a.Icon size={14} className="mx-auto" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElementInspector;
