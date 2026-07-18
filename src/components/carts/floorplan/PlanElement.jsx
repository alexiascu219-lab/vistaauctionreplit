import React, { useRef } from 'react';
import { ELEMENT_COLORS, MIN_ELEMENT_SIZE } from '../../../config/cartsConfig';
import { startPointerDrag, clamp } from './planDrag';

// One floor-plan element. Draggable + resizable in edit mode; a passive
// backdrop in operate mode. Types: aisle, rack, area/zone, path, door,
// caution (no-enter), arrow, wall, label.
const PlanElement = ({ el, editMode, selected, onSelect, getRect, onLiveChange, onCommit }) => {
  const startRef = useRef(null);
  const color = ELEMENT_COLORS[el.color] || ELEMENT_COLORS.slate;

  const beginMove = (e) => {
    if (!editMode) return;
    onSelect(el.id);
    const rect = getRect();
    if (!rect) return;
    startRef.current = { x: el.x, y: el.y };
    startPointerDrag(e, {
      onMove: (dxPx, dyPx) => {
        const dx = (dxPx / rect.width) * 100;
        const dy = (dyPx / rect.height) * 100;
        onLiveChange(el.id, { x: clamp(startRef.current.x + dx, 0, 100 - el.w), y: clamp(startRef.current.y + dy, 0, 100 - el.h) });
      },
      onEnd: (moved) => moved && onCommit(),
    });
  };

  const beginResize = (e) => {
    const rect = getRect();
    if (!rect) return;
    startRef.current = { w: el.w, h: el.h };
    startPointerDrag(e, {
      onMove: (dxPx, dyPx) => {
        const dw = (dxPx / rect.width) * 100;
        const dh = (dyPx / rect.height) * 100;
        onLiveChange(el.id, { w: clamp(startRef.current.w + dw, MIN_ELEMENT_SIZE, 100 - el.x), h: clamp(startRef.current.h + dh, MIN_ELEMENT_SIZE, 100 - el.y) });
      },
      onEnd: (moved) => moved && onCommit(),
    });
  };

  const box = { left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` };
  const ring = selected ? 'outline outline-2 outline-offset-2 outline-orange-500' : '';
  const cursor = editMode ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none';
  const rot = el.rotation ? { transform: `rotate(${el.rotation}deg)` } : undefined;

  let body;
  if (el.type === 'aisle') {
    body = (
      <div className={`flex h-full w-full items-center justify-start rounded-md px-2 shadow-soft ${ring}`} style={{ background: color.accent, ...rot }}>
        <span className="truncate text-left text-[clamp(9px,1.4vw,14px)] font-extrabold tracking-tight text-slate-900">{el.label}</span>
      </div>
    );
  } else if (el.type === 'path') {
    body = <div className={`h-full w-full rounded-[3px] bg-[#111] ${ring}`} style={rot} title={el.label || 'Walk path'} />;
  } else if (el.type === 'caution') {
    body = (
      <div
        className={`h-full w-full rounded ${ring}`}
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#0a0a0a 0 12px,#facc15 12px 24px)', ...rot }}
        title={el.label || 'No entry'}
      />
    );
  } else if (el.type === 'arrow') {
    body = (
      <div className={`h-full w-full ${ring}`} style={rot}>
        <svg viewBox="0 0 40 100" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
          <line x1="20" y1="14" x2="20" y2="94" stroke="#0f172a" strokeWidth="7" />
          <polygon points="20,2 5,30 35,30" fill="#0f172a" />
        </svg>
      </div>
    );
  } else if (el.type === 'area') {
    body = (
      <div className={`h-full w-full rounded-xl ${ring}`} style={{ background: `${color.accent}24`, border: `2px solid ${color.accent}`, ...rot }}>
        <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-soft" style={{ background: color.accent, color: '#fff' }}>{el.label}</span>
      </div>
    );
  } else if (el.type === 'label') {
    body = (
      <div className={`grid h-full w-full place-items-center rounded-lg ${editMode ? 'border border-dashed border-stone-300' : ''} ${ring}`} style={rot}>
        <span className="px-1 text-center font-fraunces text-[clamp(12px,2.2vw,20px)] font-medium leading-tight tracking-tight" style={{ color: color.text }}>{el.label}</span>
      </div>
    );
  } else if (el.type === 'wall') {
    body = <div className={`h-full w-full rounded-[3px] ${ring}`} style={{ background: color.accent, ...rot }} title={el.label || 'Wall'} />;
  } else if (el.type === 'door') {
    body = (
      <div className={`grid h-full w-full place-items-center rounded-full shadow-soft ${ring}`} style={{ background: color.accent, ...rot }}>
        <span className="truncate px-1 text-[clamp(8px,1.2vw,12px)] font-bold text-slate-900">{el.label || 'Door'}</span>
      </div>
    );
  } else {
    // rack
    body = (
      <div className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg shadow-soft ${ring}`} style={{ background: color.fill, border: `1.5px solid ${color.border}`, ...rot }}>
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent 14px, ${color.border} 14px, ${color.border} 15px)` }} />
        <span className="relative z-10 truncate px-1.5 text-[clamp(10px,1.6vw,14px)] font-bold" style={{ color: color.text }}>{el.label}</span>
      </div>
    );
  }

  return (
    <div className={`absolute select-none ${cursor}`} style={box} onPointerDown={beginMove}>
      {body}
      {editMode && selected && (
        <span onPointerDown={beginResize} className="absolute -bottom-2 -right-2 z-20 h-5 w-5 cursor-se-resize rounded-full border-2 border-white bg-orange-500 shadow-lift" title="Drag to resize" />
      )}
    </div>
  );
};

export default PlanElement;
