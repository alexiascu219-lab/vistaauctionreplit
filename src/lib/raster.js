// Rasterize an image (data URL) to a 1-bit Zebra graphic (^GF) at a target
// size in dots. We compute this in the browser at design time and store the
// result on the element, so ZPL generation stays synchronous and works both in
// the browser and server-side (the Siri print path).

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
      const px = ctx.getImageData(0, 0, cw, ch).data;
      const bpr = Math.ceil(cw / 8);
      const hexParts = [];
      for (let y = 0; y < ch; y++) {
        const row = new Uint8Array(bpr);
        for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4;
          const alpha = px[i + 3];
          const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          if (alpha > 128 && lum < 128) row[x >> 3] |= 0x80 >> (x & 7); // dark → black dot
        }
        for (let b = 0; b < bpr; b++) hexParts.push(row[b].toString(16).padStart(2, '0').toUpperCase());
      }
      resolve({ gfHex: hexParts.join(''), gfBpr: bpr, gfRows: ch });
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = src;
  });
}
