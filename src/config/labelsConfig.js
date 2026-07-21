// Configuration for the Label Studio (design maker + quick print).

export const LABEL_ELEMENT_TYPES = [
  { type: 'text', label: 'Text', icon: 'Type' },
  { type: 'barcode', label: 'Barcode', icon: 'Barcode' },
  { type: 'box', label: 'Box', icon: 'Square' },
  { type: 'ellipse', label: 'Circle', icon: 'Circle' },
  { type: 'line', label: 'Line', icon: 'Minus' },
  { type: 'arrow', label: 'Arrow', icon: 'ArrowUp' },
  { type: 'image', label: 'Image', icon: 'Image' },
];

export const SYMBOLOGIES = [
  { key: 'code128', label: 'Code 128' },
  { key: 'code39', label: 'Code 39' },
  { key: 'qr', label: 'QR code' },
  { key: 'datamatrix', label: 'Data Matrix' },
  { key: 'pdf417', label: 'PDF417' },
];

// 2D symbologies size by module (not a bar height); the inspector hides the
// height control for these.
export const MATRIX_SYMBOLOGIES = new Set(['qr', 'datamatrix', 'pdf417']);

// Variable data sources. `text` = a value you type/merge; `counter` = an
// auto-incrementing serial across a print run; `date` = a stamped date/time.
export const VARIABLE_TYPES = [
  { key: 'text', label: 'Text' },
  { key: 'counter', label: 'Counter' },
  { key: 'date', label: 'Date / time' },
];

// Ready-made date/time patterns (tokens: YYYY YY MON MM DAY DD HH mm ss).
export const DATE_FORMATS = [
  { key: 'YYYY-MM-DD', label: '2026-07-19' },
  { key: 'MM/DD/YYYY', label: '07/19/2026' },
  { key: 'DD MON YYYY', label: '19 Jul 2026' },
  { key: 'YYYY-MM-DD HH:mm', label: '2026-07-19 14:30' },
  { key: 'MON DD, YYYY', label: 'Jul 19, 2026' },
  { key: 'DAY DD MON', label: 'Mon 19 Jul' },
];

// Text fonts. `css` drives the on-screen preview AND the rasteriser.
// - `native:true` (only 'Zebra default') prints with the printer's built-in
//   scalable font (^A0) — small ZPL, but only that one face.
// - every other font prints PIXEL-EXACT by rasterising the real typeface to a
//   1-bit graphic at print time, so the label matches the preview exactly.
// `weight` sets both the preview weight and the rasterised weight.
export const LABEL_FONTS = [
  { key: '0', label: 'Zebra default (native)', css: "'Inter', Arial, Helvetica, sans-serif", zpl: '0', weight: 700, native: true },
  { key: 'arial', label: 'Arial', css: "Arial, Helvetica, sans-serif", zpl: '0', weight: 700 },
  { key: 'arial-bold', label: 'Arial Bold', css: "Arial, Helvetica, sans-serif", zpl: '0', weight: 800 },
  { key: 'arial-black', label: 'Arial Black (heavy)', css: "'Arial Black', 'Arial Bold', Arial, sans-serif", zpl: '0', weight: 900 },
  { key: 'archivo', label: 'Archivo', css: "'Archivo', 'Arial Narrow', sans-serif", zpl: '0', weight: 700 },
  { key: 'archivo-black', label: 'Archivo Black', css: "'Archivo Black', 'Arial Black', sans-serif", zpl: '0', weight: 900 },
  { key: 'oswald', label: 'Oswald (condensed)', css: "'Oswald', 'Arial Narrow', sans-serif", zpl: '0', weight: 700 },
  { key: 'roboto-condensed', label: 'Roboto Condensed', css: "'Roboto Condensed', 'Arial Narrow', sans-serif", zpl: '0', weight: 700 },
  { key: 'mono', label: 'Monospace', css: "'Roboto Mono', 'Courier New', monospace", zpl: '0', weight: 600 },
  { key: 'fraunces', label: 'Fraunces (serif)', css: "'Fraunces', Georgia, 'Times New Roman', serif", zpl: '0', weight: 500 },
];

const fontDef = (key) => LABEL_FONTS.find((f) => f.key === key) || LABEL_FONTS[0];
export function fontCss(key) { return fontDef(key).css; }
export function fontWeight(key) { return fontDef(key).weight || 700; }
// A font prints pixel-exact (rasterised) unless it's the native Zebra font.
export function isRasterFont(key) {
  if (!key || key === '0' || /^[A-H]$/.test(key)) return false;
  return !fontDef(key).native;
}

// Map an element font key to a valid Zebra font letter for ZPL output.
export function zplFont(key) {
  if (/^[0-9A-H]$/.test(key || '')) return key;
  return fontDef(key).zpl;
}

// Common Zebra label stock, in dots at 203 dpi (w × h).
export const PRESET_SIZES = [
  { label: '1.5" × 0.5"', w: 305, h: 102 },
  { label: '2" × 1"', w: 406, h: 203 },
  { label: '2.25" × 1.25"', w: 457, h: 254 },
  { label: '3" × 1"', w: 609, h: 203 },
  { label: '3" × 2"', w: 609, h: 406 },
  { label: '4" × 1" (long)', w: 812, h: 203 },
  { label: '4" × 2"', w: 812, h: 406 },
  { label: '4" × 3"', w: 812, h: 609 },
  { label: '4" × 6" (long)', w: 812, h: 1218 },
  { label: '4" × 8" (long)', w: 812, h: 1624 },
  { label: '6" × 4"', w: 1218, h: 812 },
  { label: '8.5" × 2" (long)', w: 1726, h: 406 },
];

// Swap width/height (portrait ⇄ landscape).
export function rotateSize({ width, height }) {
  return { width: height, height: width };
}

export const DEFAULT_LABEL = {
  name: 'New label',
  description: '',
  width: 609,
  height: 406,
  dpi: 203,
  variables: [{ key: 'cart_number', label: 'Number', default: '12' }],
  elements: [],
};

const rid = () => `e${Math.random().toString(36).slice(2, 7)}`;

// A sensible starter element of `type`, centred on the current label.
export function newElement(type, t) {
  const cx = Math.round((t.width || 609) / 2);
  const cy = Math.round((t.height || 406) / 2);
  const id = rid();
  switch (type) {
    case 'barcode':
      return { id, type: 'barcode', x: cx - 90, y: cy - 55, height: 100, module: 3, symbology: 'code128', showText: true, value: '${cart_number}' };
    case 'box':
      return { id, type: 'box', x: cx - 90, y: cy - 55, w: 180, h: 110, thickness: 3, rounding: 0 };
    case 'ellipse':
      return { id, type: 'ellipse', x: cx - 70, y: cy - 70, w: 140, h: 140, thickness: 3 };
    case 'image':
      return { id, type: 'image', x: cx - 80, y: cy - 80, w: 160, h: 160, src: null };
    case 'arrow':
      return { id, type: 'arrow', x: cx - 30, y: cy - 70, w: 60, h: 140, thickness: 10, dir: 'up' };
    case 'line':
      return { id, type: 'line', x: cx - 110, y: cy, w: 220, thickness: 3, orient: 'h' };
    case 'text':
    default:
      return { id, type: 'text', x: cx - 110, y: cy - 25, size: 48, value: 'Text' };
  }
}

// Pull ${variables} referenced anywhere in the elements (so the designer can
// offer to declare any that aren't yet in the variables list).
export function referencedVars(elements = []) {
  const set = new Set();
  for (const el of elements) {
    const v = el.type === 'rawzpl' ? (el.zpl || '') : (el.value || '');
    const re = /\$\{(\w+)\}/g;
    let m;
    while ((m = re.exec(v))) set.add(m[1]);
  }
  return [...set];
}
