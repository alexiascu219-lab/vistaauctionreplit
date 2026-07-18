// Shared configuration for the Cart Location Tracking board.
//
// Two AREAS hold every cart: the INSIDE area and the OUTSIDE carts area.
// Each zone carries its own atmosphere (warm/enclosed vs. cool/open-air) so
// staff can read a cart's location at a glance. Both the board (Carts.jsx) and
// the print helpers read from this single source of truth.

// LocalStorage key: remembers who is moving carts at a shared station so we can
// prefill "moved by" without asking every time. Cleared on switch / inactivity.
export const CART_IDENTITY_KEY = 'vista_cart_operator';

// The two areas. `key` matches the DB `zone` column.
export const ZONES = [
  {
    key: 'inside',
    label: 'Inside',
    tagline: 'Inside area',
    // lucide icon name (resolved in the page)
    icon: 'Warehouse',
    // Warm, enclosed palette
    accent: 'amber',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    // Panel atmosphere (applied to the zone column header glow)
    glow: 'rgba(234,88,12,0.06)',
    hairline: 'rgba(234,88,12,0.35)',
    spots: ['Staging', 'Register lane', 'Back aisle', 'Office'],
  },
  {
    key: 'outside',
    label: 'Outside',
    tagline: 'Outside carts area',
    icon: 'CloudSun',
    // Cool, open-air palette
    accent: 'sky',
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    glow: 'rgba(14,165,233,0.07)',
    hairline: 'rgba(14,165,233,0.4)',
    spots: ['By the ramp', 'Loading dock', 'Front lot', 'Return corral'],
  },
];

export const ZONE_MAP = ZONES.reduce((acc, z) => {
  acc[z.key] = z;
  return acc;
}, {});

export const otherZone = (key) => (key === 'inside' ? 'outside' : 'inside');

// Cart condition/status shown as a corner dot + label.
export const CART_STATUS = {
  active: { label: 'Ready', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  attention: { label: 'Needs attention', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  out_of_service: { label: 'Out of service', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200' },
};

export const STATUS_OPTIONS = [
  { key: 'active', label: 'Ready to use' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'out_of_service', label: 'Out of service' },
];

// ---- Floor-plan editor -----------------------------------------------------
// Element types you can drop onto an area's plan. Sizes are % of the canvas.
export const ELEMENT_TYPES = [
  { type: 'rack', label: 'Rack', icon: 'Rows3', defaults: { w: 24, h: 10 } },
  { type: 'area', label: 'Zone', icon: 'SquareDashedBottom', defaults: { w: 30, h: 24 } },
  { type: 'wall', label: 'Wall', icon: 'BrickWall', defaults: { w: 2.5, h: 30 } },
  { type: 'door', label: 'Door', icon: 'DoorOpen', defaults: { w: 12, h: 5 } },
  { type: 'label', label: 'Label', icon: 'Type', defaults: { w: 22, h: 7 } },
];

// Colour tokens for plan elements (fills that sit on the paper canvas).
export const ELEMENT_COLORS = {
  slate: { name: 'Slate', fill: '#f1f5f9', border: '#cbd5e1', text: '#334155', accent: '#64748b' },
  rose: { name: 'Rose', fill: '#fff1f2', border: '#fecdd3', text: '#9f1239', accent: '#f43f5e' },
  orange: { name: 'Orange', fill: '#fff7ed', border: '#fed7aa', text: '#9a3412', accent: '#ea580c' },
  amber: { name: 'Amber', fill: '#fffbeb', border: '#fde68a', text: '#92400e', accent: '#f59e0b' },
  lime: { name: 'Lime', fill: '#f7fee7', border: '#d9f99d', text: '#3f6212', accent: '#84cc16' },
  emerald: { name: 'Emerald', fill: '#ecfdf5', border: '#a7f3d0', text: '#065f46', accent: '#10b981' },
  sky: { name: 'Sky', fill: '#f0f9ff', border: '#bae6fd', text: '#075985', accent: '#0ea5e9' },
  violet: { name: 'Violet', fill: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', accent: '#8b5cf6' },
};
export const ELEMENT_COLOR_KEYS = Object.keys(ELEMENT_COLORS);

// Minimum element size (%) so nothing collapses to nothing while resizing.
export const MIN_ELEMENT_SIZE = 5;

// ---- Print templates -------------------------------------------------------
// Which label design the Zebra print agent should use, and the variables each
// one expects. The agent maps `template` -> a .zpl file in print-agent/templates.
export const PRINT_TEMPLATES = {
  cart_label: {
    id: 'cart_label',
    label: 'Cart sticker',
    // Build the { data } payload + human title for a print job from a cart.
    build: (cart) => ({
      title: `Cart ${cart.cart_number}`,
      data: {
        cart_number: cart.cart_number,
        zone: ZONE_MAP[cart.zone]?.label || cart.zone,
        spot: cart.spot || '',
      },
    }),
  },
};

// ---- Formatting helpers ----------------------------------------------------
export const formatTimeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

// One-line description of an event for the activity feed.
export function describeEvent(ev) {
  const who = ev.moved_by || 'Someone';
  const cart = `Cart ${ev.cart_number}`;
  switch (ev.action) {
    case 'create':
      return `${who} added ${cart} to ${ZONE_MAP[ev.to_zone]?.label || ev.to_zone}`;
    case 'move': {
      const dest = ZONE_MAP[ev.to_zone]?.label || ev.to_zone;
      return `${who} moved ${cart} → ${dest}${ev.to_spot ? ` · ${ev.to_spot}` : ''}`;
    }
    case 'status':
      return `${who} updated ${cart} — ${ev.note || 'status'}`;
    case 'print':
      return `${who} printed a sticker for ${cart}`;
    case 'delete':
      return `${who} removed ${cart}`;
    default:
      return `${cart} updated`;
  }
}
