import React from 'react';
import { Trash2 } from 'lucide-react';
import { SYMBOLOGIES } from '../../config/labelsConfig';

const FIELD = 'w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20';
const LAB = 'block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1';

const Num = ({ label, value, onChange, step = 1 }) => (
  <label className="block">
    <span className={LAB}>{label}</span>
    <input type="number" step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} className={FIELD} />
  </label>
);

const ElementInspector = ({ element: el, onChange, onDelete }) => {
  if (!el) return null;
  const set = (patch) => onChange(el.id, patch);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-lg bg-[#FBFBFA] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{el.type}</span>
        <button onClick={() => onDelete(el.id)} className="pk-press inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1 text-[12px] font-bold text-slate-400 hover:border-red-200 hover:text-red-500">
          <Trash2 size={13} /> Delete
        </button>
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

        {el.type === 'text' && <Num label="Font size" value={el.size} onChange={(v) => set({ size: v })} />}

        {el.type === 'barcode' && (
          <>
            <label className="block">
              <span className={LAB}>Symbology</span>
              <select value={el.symbology || 'code128'} onChange={(e) => set({ symbology: e.target.value })} className={FIELD}>
                {SYMBOLOGIES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
            <Num label="Height" value={el.height} onChange={(v) => set({ height: v })} />
            <Num label="Module" value={el.module} onChange={(v) => set({ module: v })} />
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
      </div>
    </div>
  );
};

export default ElementInspector;
