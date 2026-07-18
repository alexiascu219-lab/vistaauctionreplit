// Configuration for the Label Studio (design maker + quick print).

export const LABEL_ELEMENT_TYPES = [
  { type: 'text', label: 'Text', icon: 'Type' },
  { type: 'barcode', label: 'Barcode', icon: 'Barcode' },
  { type: 'box', label: 'Box', icon: 'Square' },
  { type: 'line', label: 'Line', icon: 'Minus' },
];

export const SYMBOLOGIES = [
  { key: 'code128', label: 'Code 128' },
  { key: 'code39', label: 'Code 39' },
  { key: 'qr', label: 'QR code' },
];

// Text fonts. `css` drives the on-screen preview; `zpl` is the printer-resident
// font the Zebra renders (only '0' is smoothly scalable, so the display faces
// map to it for print while staying distinct in the studio preview).
export const LABEL_FONTS = [
  { key: '0', label: 'Sans (default)', css: "'Inter', Arial, Helvetica, sans-serif", zpl: '0' },
  { key: 'archivo', label: 'Archivo — display', css: "'Archivo', 'Arial Narrow', sans-serif", zpl: '0' },
  { key: 'fraunces', label: 'Fraunces — serif', css: "'Fraunces', Georgia, 'Times New Roman', serif", zpl: '0' },
];

export function fontCss(key) {
  return (LABEL_FONTS.find((f) => f.key === key) || LABEL_FONTS[0]).css;
}

// Map an element font key to a valid Zebra font letter for ZPL output.
export function zplFont(key) {
  if (/^[0-9A-H]$/.test(key || '')) return key;
  return (LABEL_FONTS.find((f) => f.key === key) || LABEL_FONTS[0]).zpl;
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
      return { id, type: 'box', x: cx - 90, y: cy - 55, w: 180, h: 110, thickness: 3 };
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
    const v = el.value || '';
    const re = /\$\{(\w+)\}/g;
    let m;
    while ((m = re.exec(v))) set.add(m[1]);
  }
  return [...set];
}
