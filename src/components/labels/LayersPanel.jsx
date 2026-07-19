import React from 'react';
import { Type, Barcode, Square, Circle, Minus, ArrowUp, Image as ImageIcon, Eye, EyeOff, Lock, Unlock, ChevronsUp, ChevronsDown, Trash2, Layers } from 'lucide-react';

// The Objects / Layers panel — a live z-order list of every element on the
// label (top-most first, matching what prints on top). Select, rename, hide,
// lock, restack, and delete, the way a pro design app works.

const TYPE_ICON = { text: Type, barcode: Barcode, box: Square, ellipse: Circle, line: Minus, arrow: ArrowUp, image: ImageIcon };

const labelFor = (el) => {
  if (el.name) return el.name;
  if (el.type === 'text') return el.value || 'Text';
  if (el.type === 'barcode') return `${(el.symbology || 'code128').toUpperCase()} · ${el.value || ''}`.trim();
  return el.type.charAt(0).toUpperCase() + el.type.slice(1);
};

const IB = 'rounded-md p-1 text-slate-400 transition hover:text-slate-700';

export default function LayersPanel({ elements = [], selIds = [], onSelect, onChange, onReorder, onToEdge, onDelete }) {
  // Render top-most (last painted) first.
  const ordered = [...elements].map((el, i) => ({ el, i })).reverse();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-soft">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700"><Layers size={14} /> Objects</span>
        <span className="text-[11px] font-semibold text-slate-400">{elements.length}</span>
      </div>

      {elements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-[11.5px] text-slate-400">No objects yet. Add one from the toolbar.</p>
      ) : (
        <ul className="max-h-[280px] space-y-1 overflow-y-auto pr-0.5">
          {ordered.map(({ el }) => {
            const Icon = TYPE_ICON[el.type] || Type;
            const sel = selIds.includes(el.id);
            return (
              <li
                key={el.id}
                onPointerDown={(e) => onSelect?.(el.id, e.shiftKey)}
                className={`group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition ${sel ? 'border-orange-300 bg-orange-50' : 'border-transparent hover:border-stone-200 hover:bg-stone-50'} ${el.hidden ? 'opacity-50' : ''}`}
              >
                <Icon size={13} className={sel ? 'text-orange-600' : 'text-slate-400'} />
                <span className={`min-w-0 flex-1 truncate text-[12px] font-semibold ${sel ? 'text-orange-800' : 'text-slate-700'}`}>{labelFor(el)}</span>
                <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100" onPointerDown={(e) => e.stopPropagation()}>
                  <button onClick={() => onToEdge?.(el.id, 'front')} title="Bring to front" className={IB}><ChevronsUp size={13} /></button>
                  <button onClick={() => onToEdge?.(el.id, 'back')} title="Send to back" className={IB}><ChevronsDown size={13} /></button>
                  <button onClick={() => onDelete?.(el.id)} title="Delete" className={`${IB} hover:text-red-500`}><Trash2 size={13} /></button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onChange?.(el.id, { locked: !el.locked }); }} title={el.locked ? 'Unlock' : 'Lock'} className={`${IB} ${el.locked ? 'text-orange-600' : ''}`}>
                  {el.locked ? <Lock size={13} /> : <Unlock size={13} className="opacity-0 group-hover:opacity-100" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onChange?.(el.id, { hidden: !el.hidden }); }} title={el.hidden ? 'Show' : 'Hide'} className={`${IB} ${el.hidden ? 'text-orange-600' : ''}`}>
                  {el.hidden ? <EyeOff size={13} /> : <Eye size={13} className="opacity-0 group-hover:opacity-100" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
