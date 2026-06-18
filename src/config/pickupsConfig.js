// Shared configuration for the Pickups Department request system.
// Each request type defines its accent colors, icon name (lucide), and the
// fields rendered in its form. Both the staff portal (Pickups.jsx) and the
// manager dashboard (PickupsManager.jsx) read from this single source of truth.

// LocalStorage key for the signed-in Pickups manager session. Real per-manager
// accounts (email + password) are verified server-side via Supabase RPCs; this
// just remembers who is signed in on the device.
export const MANAGER_SESSION_KEY = 'pickups_manager_session';

export const REQUEST_TYPES = [
  {
    id: 'lunch',
    title: 'Lunch Reservation',
    short: 'Lunch',
    icon: 'UtensilsCrossed',
    blurb: 'Reserve your lunch slot so the floor stays covered.',
    // Tailwind class fragments (kept as full strings so they survive purging)
    accent: 'orange',
    gradient: 'from-orange-500 to-amber-500',
    soft: 'bg-orange-50 text-orange-600',
    ring: 'focus:ring-orange-500/40 focus:border-orange-400',
    fields: [
      { name: 'date', label: 'Date', type: 'date', required: true },
      {
        name: 'slot',
        label: 'Lunch Slot',
        type: 'select',
        required: true,
        options: ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM'],
      },
      { name: 'duration', label: 'Duration', type: 'select', options: ['30 min', '45 min', '1 hour'], required: true },
      { name: 'party_size', label: 'People in Party', type: 'number', placeholder: '1', min: 1 },
      { name: 'notes', label: 'Notes for Manager', type: 'textarea', placeholder: 'Anything we should know?', full: true },
    ],
  },
  {
    id: 'floor_wave',
    title: 'Floor Time & Wave Picking',
    short: 'Floor / Wave',
    icon: 'ClipboardList',
    blurb: 'Log your floor time and wave picking activity.',
    accent: 'indigo',
    gradient: 'from-indigo-500 to-blue-500',
    soft: 'bg-indigo-50 text-indigo-600',
    ring: 'focus:ring-indigo-500/40 focus:border-indigo-400',
    fields: [
      {
        name: 'log_type',
        label: 'Log Type',
        type: 'select',
        required: true,
        options: ['Floor Time', 'Wave Picking'],
      },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'start_time', label: 'Start Time', type: 'time', required: true },
      { name: 'end_time', label: 'End Time', type: 'time' },
      { name: 'wave_number', label: 'Wave # (if picking)', type: 'text', placeholder: 'e.g. Wave 4' },
      { name: 'area', label: 'Area / Zone', type: 'text', placeholder: 'e.g. Aisle 12, Dock B' },
      { name: 'units', label: 'Units Picked', type: 'number', placeholder: '0', min: 0 },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Issues, jams, short picks…', full: true },
    ],
  },
  {
    id: 'zebra',
    title: 'Zebra Tracking',
    short: 'Zebra',
    icon: 'ScanLine',
    blurb: 'Check scanners in and out and flag any issues.',
    accent: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    soft: 'bg-emerald-50 text-emerald-600',
    ring: 'focus:ring-emerald-500/40 focus:border-emerald-400',
    fields: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: ['Check Out', 'Check In', 'Report Issue'],
      },
      { name: 'device_id', label: 'Zebra ID', type: 'text', required: true, placeholder: 'e.g. Zebra #12' },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        options: ['Good', 'Low Battery', 'Not Charging', 'Cracked Screen', 'Damaged', 'Lost'],
      },
      { name: 'expected_return', label: 'Expected Return', type: 'time' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Describe the issue or hand-off…', full: true },
    ],
  },
];

export const TYPE_MAP = REQUEST_TYPES.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {});

export const STATUS_STYLES = {
  Pending: { label: 'Pending', soft: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500' },
  Approved: { label: 'Approved', soft: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
  Denied: { label: 'Denied', soft: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
  Responded: { label: 'Responded', soft: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' },
};

// Human-readable one-line summary of a request's details, used in lists/cards.
export function summarizeRequest(req) {
  const d = req.details || {};
  switch (req.type) {
    case 'lunch':
      return [d.date, d.slot, d.duration && `(${d.duration})`].filter(Boolean).join(' · ');
    case 'floor_wave':
      return [d.log_type, d.date, d.start_time && `${d.start_time}${d.end_time ? '–' + d.end_time : ''}`, d.wave_number]
        .filter(Boolean)
        .join(' · ');
    case 'zebra':
      return [d.action, d.device_id, d.condition].filter(Boolean).join(' · ');
    default:
      return '';
  }
}
