import React, { useRef } from 'react';
import { resolveVars } from '../../lib/zpl';
import { qrMatrix } from '../../lib/qr';
import { fontCss } from '../../config/labelsConfig';
import { startPointerDrag, clamp } from '../carts/floorplan/planDrag';

// Estimated on-canvas bounding box of an element (dots), used for hit-testing,
// the selection outline, and the resize handle.
function bbox(el, values) {
  if (el.type === 'text') {
    if (el.align && el.w) return { x: el.x, y: el.y, w: el.w, h: el.size || 30 };
    const v = resolveVars(el.value, values) || ' ';
    return { x: el.x, y: el.y, w: Math.max(16, v.length * (el.size || 30) * 0.58), h: el.size || 30 };
  }
  if (el.type === 'barcode') {
    const v = resolveVars(el.value, values) || '0';
    if (el.symbology === 'qr') { const s = (el.module || 6) * qrMatrix(v).count; return { x: el.x, y: el.y, w: s, h: s }; }
    const w = Math.min(1200, (v.length * 11 + 35) * (el.module || 3));
    return { x: el.x, y: el.y, w, h: (el.height || 100) + (el.showText ? 26 : 0) };
  }
  if (el.type === 'line') {
    return el.orient === 'v'
      ? { x: el.x, y: el.y, w: el.thickness || 3, h: el.h || el.w || 40 }
      : { x: el.x, y: el.y, w: el.w || 40, h: el.thickness || 3 };
  }
  return { x: el.x, y: el.y, w: el.w || 40, h: el.h || 40 };
}

// Deterministic representative barcode bars (the real barcode is rendered by
// the Zebra from ZPL — this is just a faithful-looking preview).
function barPattern(value, w, h) {
  let s = 1;
  for (const ch of String(value || '0')) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const n = Math.max(24, Math.min(80, String(value || '0').length * 11 + 24));
  const unit = w / n;
  const rects = [];
  let cx = 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    if ((s >> 16) & 1) {
      const bw = unit * (((s >> 9) & 1) ? 1.5 : 0.8);
      rects.push({ x: cx, w: Math.max(unit * 0.55, bw) });
    }
    cx += unit;
  }
  return rects.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={h} fill="#111" />);
}

const ROT = { N: 0, R: 90, I: 180, B: 270 };

function ElementVisual({ el, values, W = 609 }) {
  const deg = ROT[el.rotation] || 0;
  const rot = deg ? ` rotate(${deg})` : '';
  if (el.type === 'text') {
    const v = resolveVars(el.value, values);
    const size = el.size || 30;
    let tx = el.x;
    let anchor = 'start';
    if (el.align === 'center' || el.align === 'right') {
      const blockW = el.w || W - 2 * el.x;
      tx = el.align === 'center' ? el.x + blockW / 2 : el.x + blockW;
      anchor = el.align === 'center' ? 'middle' : 'end';
    }
    return (
      <g transform={deg ? `rotate(${deg} ${el.x} ${el.y})` : undefined}>
        <text x={tx} y={el.y + size * 0.8} fontSize={size} textAnchor={anchor} fontWeight="700" fill="#0f172a" style={{ fontFamily: fontCss(el.font) }}>
          {v}
        </text>
      </g>
    );
  }
  if (el.type === 'barcode') {
    const v = resolveVars(el.value, values) || '0';
    const b = bbox(el, values);
    if (el.symbology === 'qr') {
      const m = qrMatrix(v);
      const cell = b.w / m.count;
      const dots = [];
      for (let yy = 0; yy < m.count; yy++)
        for (let xx = 0; xx < m.count; xx++)
          if (m.cells[yy][xx])
            dots.push(<rect key={`${xx}-${yy}`} x={xx * cell} y={yy * cell} width={cell + 0.4} height={cell + 0.4} fill="#111" />);
      return <g transform={`translate(${el.x},${el.y})${rot}`}>{dots}</g>;
    }
    return (
      <g transform={`translate(${el.x},${el.y})${rot}`}>
        {barPattern(v, b.w, el.height || 100)}
        {el.showText && (
          <text x={b.w / 2} y={(el.height || 100) + 20} fontSize={22} textAnchor="middle" fill="#0f172a" style={{ fontFamily: 'Arial, sans-serif' }}>
            {v}
          </text>
        )}
      </g>
    );
  }
  if (el.type === 'box') {
    return <rect x={el.x} y={el.y} width={el.w || 40} height={el.h || 40} fill="none" stroke="#0f172a" strokeWidth={el.thickness || 2} />;
  }
  // line
  const b = bbox(el, values);
  return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#0f172a" />;
}

const LabelSvg = ({ template, values = {}, interactive = false, selectedId, onSelect, onLiveChange, onCommit, className, style }) => {
  const svgRef = useRef(null);
  const start = useRef(null);
  const W = template.width || 609;
  const H = template.height || 406;

  const getScale = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect && rect.width ? W / rect.width : 1;
  };

  const beginMove = (e, el) => {
    if (!interactive) return;
    onSelect?.(el.id);
    const scale = getScale();
    start.current = { x: el.x, y: el.y };
    startPointerDrag(e, {
      onMove: (dxPx, dyPx) => {
        onLiveChange(el.id, {
          x: clamp(Math.round(start.current.x + dxPx * scale), 0, W),
          y: clamp(Math.round(start.current.y + dyPx * scale), 0, H),
        });
      },
      onEnd: (moved) => moved && onCommit?.(),
    });
  };

  const beginResize = (e, el) => {
    const scale = getScale();
    start.current = { size: el.size, height: el.height, w: el.w, h: el.h, module: el.module };
    startPointerDrag(e, {
      onMove: (dxPx, dyPx) => {
        const dx = dxPx * scale;
        const dy = dyPx * scale;
        let patch = {};
        if (el.type === 'text') patch = { size: clamp(Math.round(start.current.size + dy), 8, H) };
        else if (el.type === 'barcode') patch = { height: clamp(Math.round(start.current.height + dy), 20, H) };
        else if (el.type === 'line')
          patch = el.orient === 'v' ? { h: clamp(Math.round((start.current.h || start.current.w) + dy), 6, H) } : { w: clamp(Math.round(start.current.w + dx), 6, W) };
        else patch = { w: clamp(Math.round(start.current.w + dx), 6, W), h: clamp(Math.round(start.current.h + dy), 6, H) };
        onLiveChange(el.id, patch);
      },
      onEnd: (moved) => moved && onCommit?.(),
    });
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block', background: '#fff', ...style }}
      onPointerDown={interactive ? () => onSelect?.(null) : undefined}
    >
      <rect x="0" y="0" width={W} height={H} fill="#fff" />
      {(template.elements || []).map((el) => {
        const b = bbox(el, values);
        const selected = interactive && selectedId === el.id;
        return (
          <g key={el.id}>
            <ElementVisual el={el} values={values} W={W} />
            {interactive && (
              <rect
                x={b.x - 3}
                y={b.y - 3}
                width={b.w + 6}
                height={b.h + 6}
                fill="transparent"
                stroke={selected ? '#ea580c' : 'transparent'}
                strokeWidth={selected ? 2.5 : 1}
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => beginMove(e, el)}
              />
            )}
            {selected && (
              <rect
                x={b.x + b.w - 5}
                y={b.y + b.h - 5}
                width={18}
                height={18}
                rx={4}
                fill="#ea580c"
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: 'nwse-resize' }}
                onPointerDown={(e) => { e.stopPropagation(); beginResize(e, el); }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default LabelSvg;
