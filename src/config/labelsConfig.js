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

// Common Zebra label stock, in dots at 203 dpi.
export const PRESET_SIZES = [
  { label: '3" × 2"', w: 609, h: 406 },
  { label: '2" × 1"', w: 406, h: 203 },
  { label: '2.25" × 1.25"', w: 457, h: 254 },
  { label: '4" × 2"', w: 812, h: 406 },
  { label: '4" × 3"', w: 812, h: 609 },
  { label: '4" × 6"', w: 812, h: 1218 },
];

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
