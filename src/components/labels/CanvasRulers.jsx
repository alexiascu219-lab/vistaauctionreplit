import React from 'react';

// Pro-style dot rulers framing the canvas. Ticks are in printer dots (203 dpi)
// and scale with the displayed width so they line up with the artwork.
// `dispW` is the on-screen canvas width in px; height is derived from aspect.
export default function CanvasRulers({ width = 609, height = 406, dispW = 480, children }) {
  const dispH = Math.round(dispW * (height / width));
  const GUT = 18; // ruler thickness in px
  const px = (dots) => (dots / width) * dispW;
  const py = (dots) => (dots / height) * dispH;

  // Tick every ~50 dots (≈0.25"), a bolder tick + number every 200 dots (≈1").
  const step = 50;
  const xs = [];
  for (let d = 0; d <= width; d += step) xs.push(d);
  const ys = [];
  for (let d = 0; d <= height; d += step) ys.push(d);

  const tickCol = '#cbd5e1';
  const majorCol = '#94a3b8';
  const isMajor = (d) => d % 200 === 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${GUT}px ${dispW}px`, gridTemplateRows: `${GUT}px ${dispH}px` }}>
      <div style={{ width: GUT, height: GUT, background: '#f8fafc', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }} />
      {/* Top ruler */}
      <div style={{ position: 'relative', height: GUT, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {xs.map((d) => (
          <div key={d} style={{ position: 'absolute', left: px(d), top: 0, bottom: 0 }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 1, height: isMajor(d) ? GUT : GUT * 0.45, background: isMajor(d) ? majorCol : tickCol }} />
            {isMajor(d) && d > 0 && <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 8, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{d}</span>}
          </div>
        ))}
      </div>
      {/* Left ruler */}
      <div style={{ position: 'relative', width: GUT, background: '#f8fafc', borderRight: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {ys.map((d) => (
          <div key={d} style={{ position: 'absolute', top: py(d), left: 0, right: 0 }}>
            <div style={{ position: 'absolute', right: 0, top: 0, height: 1, width: isMajor(d) ? GUT : GUT * 0.45, background: isMajor(d) ? majorCol : tickCol }} />
            {isMajor(d) && d > 0 && <span style={{ position: 'absolute', left: 1, top: 2, fontSize: 8, color: '#64748b', fontVariantNumeric: 'tabular-nums', writingMode: 'vertical-rl' }}>{d}</span>}
          </div>
        ))}
      </div>
      {/* Canvas cell */}
      <div style={{ width: dispW, height: dispH }}>{children}</div>
    </div>
  );
}
