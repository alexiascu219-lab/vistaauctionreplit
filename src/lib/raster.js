// Rasterize an image (data URL) to a 1-bit Zebra graphic (^GF) at a target
// size in dots. We compute this in the browser at design time and store the
// result on the element, so ZPL generation stays synchronous and works both in
// the browser and server-side (the Siri print path).

// Pack a canvas (already drawn) into a 1-bit ^GFA payload.
function canvasToGF(canvas) {
  const cw = canvas.width;
  const ch = canvas.height;
  const px = canvas.getContext('2d').getImageData(0, 0, cw, ch).data;
  const bpr = Math.ceil(cw / 8);
  const hexParts = [];
  for (let y = 0; y < ch; y++) {
    const row = new Uint8Array(bpr);
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const alpha = px[i + 3];
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (alpha > 128 && lum < 128) row[x >> 3] |= 0x80 >> (x & 7);
    }
    for (let b = 0; b < bpr; b++) hexParts.push(row[b].toString(16).padStart(2, '0').toUpperCase());
  }
  return { gfHex: hexParts.join(''), gfBpr: bpr, gfRows: ch };
}

// Draw a solid arrow (shaft + head) and pack it to ^GF, so it prints exactly
// as previewed. dir: up | down | left | right.
export function rasterizeArrowGF(dir, w, h, thickness) {
  const cw = Math.max(4, Math.round(w));
  const ch = Math.max(4, Math.round(h));
  const t = Math.max(2, Math.round(thickness || 8));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = t;
  ctx.lineCap = 'butt';
  const vertical = dir === 'up' || dir === 'down';
  const head = Math.min(vertical ? cw : ch, (vertical ? ch : cw) * 0.45);
  ctx.beginPath();
  if (dir === 'up') { ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); }
  else if (dir === 'down') { ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); }
  else { ctx.moveTo(0, ch / 2); ctx.lineTo(cw, ch / 2); }
  ctx.stroke();
  ctx.beginPath();
  if (dir === 'up') { ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2 - head / 2, head); ctx.lineTo(cw / 2 + head / 2, head); }
  else if (dir === 'down') { ctx.moveTo(cw / 2, ch); ctx.lineTo(cw / 2 - head / 2, ch - head); ctx.lineTo(cw / 2 + head / 2, ch - head); }
  else if (dir === 'left') { ctx.moveTo(0, ch / 2); ctx.lineTo(head, ch / 2 - head / 2); ctx.lineTo(head, ch / 2 + head / 2); }
  else { ctx.moveTo(cw, ch / 2); ctx.lineTo(cw - head, ch / 2 - head / 2); ctx.lineTo(cw - head, ch / 2 + head / 2); }
  ctx.closePath();
  ctx.fill();
  return canvasToGF(canvas);
}

// Render a line of text with a real typeface to a 1-bit ^GF graphic, so the
// printed label matches the on-screen font pixel-for-pixel (any TrueType face,
// still driven by a variable). Rendered at 1:1 printer dots.
// Returns { gfHex, gfBpr, gfRows, x, y, w, h } — x/y are the top-left origin to
// place the graphic so it lines up with where the text sat.
export function rasterizeTextGF({ text, fontCss, size, weight = 700, align = 'left', boxW, inverse = false, elX = 0, elY = 0 }) {
  const s = Math.max(6, Math.round(size));
  const face = `${weight} ${s}px ${fontCss}`;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = face;
  const textW = Math.ceil(meas.measureText(String(text)).width) + 6;
  const block = align === 'center' || align === 'right' ? Math.max(textW, Math.round(boxW || textW)) : textW;
  const asc = Math.ceil(s * 0.82);
  const desc = Math.ceil(s * 0.34);
  const h = asc + desc;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, block);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (inverse) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#fff'; }
  else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000'; }
  ctx.font = face;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const tx = align === 'center' ? canvas.width / 2 : align === 'right' ? canvas.width - 3 : 3;
  ctx.fillText(String(text), tx, asc);
  // The SVG preview draws the glyph top ~= elY; keep the graphic origin there.
  return { ...canvasToGF(canvas), x: Math.round(elX), y: Math.round(elY), w: canvas.width, h: canvas.height };
}

// Returns { gfHex, gfBpr, gfRows } — hex-packed monochrome bitmap for ^GFA.
export function rasterizeToGF(src, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cw = Math.max(1, Math.round(w));
      const ch = Math.max(1, Math.round(h));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      resolve(canvasToGF(canvas));
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = src;
  });
}
