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

// ---- Serialization (Zebra-Pro style counters + date/time) ------------------
// Format a Date with tokens: YYYY, YY, MM, DD, HH, mm, ss, MON (Jan), DAY (Mon).
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const p2 = (n) => String(n).padStart(2, '0');
export function formatStamp(date, fmt = 'YYYY-MM-DD') {
  const d = date || new Date();
  return String(fmt)
    .replace(/YYYY/g, d.getFullYear())
    .replace(/YY/g, p2(d.getFullYear() % 100))
    .replace(/MON/g, MON[d.getMonth()])
    .replace(/MM/g, p2(d.getMonth() + 1))
    .replace(/DAY/g, DAY[d.getDay()])
    .replace(/DD/g, p2(d.getDate()))
    .replace(/HH/g, p2(d.getHours()))
    .replace(/mm/g, p2(d.getMinutes()))
    .replace(/ss/g, p2(d.getSeconds()));
}

// Given a template's variables + a base values object, compute the resolved
// values for label instance `index` (0-based). Counter variables advance by
// `step` per instance (zero-padded to `pad`); date/time variables stamp now.
// Plain text variables pass through untouched. Pure — safe on client + server.
export function resolveDynamic(variables = [], baseValues = {}, index = 0, now = null) {
  const out = { ...baseValues };
  for (const v of variables || []) {
    if (!v || !v.key) continue;
    if (v.type === 'counter') {
      // Start from the entered value if given, else the variable's default.
      const start = parseInt(baseValues[v.key] ?? v.default, 10) || 0;
      const step = parseInt(v.step, 10) || 1;
      const pad = parseInt(v.pad, 10) || 0;
      let s = String(start + index * step);
      if (pad) s = s.padStart(pad, '0');
      out[v.key] = s;
    } else if (v.type === 'date') {
      out[v.key] = formatStamp(now || new Date(), v.format || 'YYYY-MM-DD');
    }
  }
  return out;
}

// Does this template serialize (has a counter/date variable)? Used to decide
// whether a print run must expand into one job per label so serials advance.
export function hasDynamicVars(variables = []) {
  return (variables || []).some((v) => v && (v.type === 'counter' || v.type === 'date'));
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

// Pull the label dimensions out of raw ZPL (^PW = print width, ^LL = label
// length), used when importing an existing ZebraDesigner/ZPL design.
export function zplDimensions(zpl) {
  const pw = String(zpl || '').match(/\^PW\s*(\d+)/i);
  const ll = String(zpl || '').match(/\^LL\s*(\d+)/i);
  return { width: pw ? parseInt(pw[1], 10) : 812, height: ll ? parseInt(ll[1], 10) : 609 };
}

export function templateToZpl(t, values = {}) {
  // Imported/raw-ZPL templates carry the printer code verbatim (with ${var}
  // placeholders) in a single 'rawzpl' element — print it exactly as designed.
  const raw = (t.elements || []).find((e) => e && e.type === 'rawzpl' && e.zpl);
  if (raw) return resolveVars(raw.zpl, values);

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
    } else if (el.type === 'image' || el.type === 'arrow') {
      if (el.gfHex && el.gfBpr && el.gfRows) {
        const total = el.gfBpr * el.gfRows;
        L.push(`^FO${x},${y}^GFA,${total},${total},${el.gfBpr},${el.gfHex}^FS`);
      }
    } else if (el.type === 'barcode') {
      const v = zplEscape(resolveVars(el.value, values)) || '0';
      const mod = Math.max(1, Math.round(el.module || 3));
      if (el.symbology === 'qr') {
        L.push(`^FO${x},${y}^BQN,2,${Math.max(1, Math.round(el.module || 6))}^FDLA,${v}^FS`);
      } else if (el.symbology === 'datamatrix') {
        // ^BX: module height, quality 200 (ECC 200), square aspect.
        L.push(`^FO${x},${y}^BXN,${Math.max(2, Math.round(el.module || 6))},200,0,0^FD${v}^FS`);
      } else if (el.symbology === 'pdf417') {
        // ^B7: row height (module), security level 5, auto columns.
        L.push(`^FO${x},${y}^B7${el.rotation || 'N'},${Math.max(2, Math.round(el.module || 3))},5,0,0,N^FD${v}^FS`);
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
