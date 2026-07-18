// Render a label template model to ZPL (Zebra Programming Language).
// The web app renders here so a print job can carry finished ZPL that the print
// agent/exe sends to the Zebra verbatim — no template lookup needed printer-side.

// Replace ${var} placeholders from a values object.
// Supports a zero-pad width: ${cart_number#4} turns 302 into "0302".
export function resolveVars(str, values = {}) {
  return String(str == null ? '' : str).replace(/\$\{(\w+)(?:#(\d+))?\}/g, (_, k, pad) => {
    let v = values[k] != null ? String(values[k]) : '';
    if (pad) v = v.padStart(parseInt(pad, 10), '0');
    return v;
  });
}

// ^ and ~ are ZPL command prefixes; neutralize them inside field data.
export function zplEscape(s) {
  return String(s == null ? '' : s).replace(/[\^~]/g, ' ');
}

// Only '0' and 'A'..'H' are valid Zebra font selectors; anything else
// (e.g. a preview display-font key) falls back to the scalable font '0'.
function zplFont(f) {
  return /^[0-9A-H]$/.test(f || '') ? f : '0';
}

export function templateToZpl(t, values = {}) {
  const w = Math.round(t.width || 609);
  const h = Math.round(t.height || 406);
  const L = ['^XA', '^CI28', `^PW${w}`, `^LL${h}`, '^LH0,0'];

  for (const el of t.elements || []) {
    const x = Math.round(el.x || 0);
    const y = Math.round(el.y || 0);

    if (el.type === 'text') {
      const v = zplEscape(resolveVars(el.value, values));
      const size = Math.round(el.size || 30);
      const font = `^A${zplFont(el.font)}${el.rotation || 'N'},${size},${size}`;
      // Inverse = white text on a solid black block. Draw the block, then the
      // text with ^FR (field reverse) so the glyphs knock out to white.
      if (el.inverse) {
        const blockW = Math.round(el.w || Math.max(size, String(v).length * size * 0.62));
        const blockH = Math.round(size * 1.3);
        const pad = Math.round(size * 0.15);
        L.push(`^FO${x},${y}^GB${blockW},${blockH},${blockH}^FS`);
        const just = el.align === 'center' ? 'C' : el.align === 'right' ? 'R' : 'L';
        L.push(`^FO${x},${y + pad}^FR${font}^FB${blockW},2,0,${just}^FD${v}^FS`);
      } else if (el.align === 'center' || el.align === 'right') {
        const blockW = Math.round(el.w || w - 2 * x);
        const just = el.align === 'center' ? 'C' : 'R';
        L.push(`^FO${x},${y}${font}^FB${blockW},2,0,${just}^FD${v}^FS`);
      } else {
        L.push(`^FO${x},${y}${font}^FD${v}^FS`);
      }
    } else if (el.type === 'image') {
      if (el.gfHex && el.gfBpr && el.gfRows) {
        const total = el.gfBpr * el.gfRows;
        L.push(`^FO${x},${y}^GFA,${total},${total},${el.gfBpr},${el.gfHex}^FS`);
      }
    } else if (el.type === 'barcode') {
      const v = zplEscape(resolveVars(el.value, values)) || '0';
      const mod = Math.max(1, Math.round(el.module || 3));
      if (el.symbology === 'qr') {
        L.push(`^FO${x},${y}^BQN,2,${Math.max(1, Math.round(el.module || 6))}^FDLA,${v}^FS`);
      } else {
        const code = el.symbology === 'code39' ? 'B3' : 'BC';
        L.push(`^FO${x},${y}^BY${mod}^${code}${el.rotation || 'N'},${Math.round(el.height || 100)},${el.showText ? 'Y' : 'N'},N,N^FD${v}^FS`);
      }
    } else if (el.type === 'box') {
      const th = Math.max(1, Math.round(el.thickness || 2));
      const round = Math.max(0, Math.min(8, Math.round(el.rounding || 0)));
      L.push(`^FO${x},${y}^GB${Math.round(el.w || 40)},${Math.round(el.h || 40)},${th},B,${round}^FS`);
    } else if (el.type === 'ellipse') {
      const th = Math.max(1, Math.round(el.thickness || 3));
      L.push(`^FO${x},${y}^GE${Math.round(el.w || 60)},${Math.round(el.h || 60)},${th},B^FS`);
    } else if (el.type === 'line') {
      const th = Math.max(1, Math.round(el.thickness || 3));
      if (el.orient === 'v') L.push(`^FO${x},${y}^GB${th},${Math.round(el.h || el.w || 40)},${th}^FS`);
      else L.push(`^FO${x},${y}^GB${Math.round(el.w || 40)},${th},${th}^FS`);
    }
  }

  L.push('^XZ');
  return L.join('\n');
}

// Expand "397-432, 500, 502" -> ['397', … , '432', '500', '502'] (capped).
export function expandNumbers(input, cap = 300) {
  const out = [];
  for (const partRaw of String(input || '').split(/[,\n]/)) {
    const part = partRaw.trim();
    if (!part) continue;
    const m = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      const step = a <= b ? 1 : -1;
      for (let n = a; step > 0 ? n <= b : n >= b; n += step) {
        out.push(String(n));
        if (out.length >= cap) return out;
      }
    } else {
      out.push(part);
      if (out.length >= cap) return out;
    }
  }
  return out;
}
