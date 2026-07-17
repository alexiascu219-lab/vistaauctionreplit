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
