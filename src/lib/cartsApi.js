import { supabase } from '../supabaseClient';
import { PRINT_TEMPLATES } from '../config/cartsConfig';

// ---- RPC helper ------------------------------------------------------------
// The cart RPCs return either a value or an { error } object (same convention
// as the Pickups RPCs). Throw on either so callers can try/catch uniformly.
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || 'Request failed');
  if (data && typeof data === 'object' && data.error) throw new Error(data.error);
  return data;
}

// ---- Carts -----------------------------------------------------------------
export async function listCarts() {
  const { data, error } = await supabase
    .from('vista_carts')
    .select('*')
    .order('cart_number', { ascending: true });
  if (error) throw new Error(error.message);
  // Natural sort so "2" comes before "10".
  return (data || []).sort((a, b) =>
    String(a.cart_number).localeCompare(String(b.cart_number), undefined, { numeric: true, sensitivity: 'base' }),
  );
}

export function addCart({ cartNumber, zone = 'inside', spot = null, by = null }) {
  return rpc('carts_add', { p_cart_number: cartNumber, p_zone: zone, p_spot: spot, p_by: by });
}

export function moveCart({ id, zone, spot = null, by = null }) {
  return rpc('carts_move', { p_id: id, p_zone: zone, p_spot: spot, p_by: by });
}

export function setCartStatus({ id, status, notes = null, by = null }) {
  return rpc('carts_set_status', { p_id: id, p_status: status, p_notes: notes, p_by: by });
}

export function removeCart({ id, by = null }) {
  return rpc('carts_remove', { p_id: id, p_by: by });
}

// ---- Activity feed ---------------------------------------------------------
export async function listEvents(limit = 30) {
  const { data, error } = await supabase
    .from('vista_cart_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

// ---- Roster (shared with the Pickups kiosk) --------------------------------
export async function fetchRoster() {
  try {
    const { data } = await supabase.rpc('pickups_roster');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ---- Print jobs ------------------------------------------------------------
// The browser queues jobs straight into Supabase (public RLS). The Windows
// print agent picks them up through /api/print. Siri queues via /api/print too.
export async function queuePrint({ template = 'cart_label', cart, quantity = 1, by = null, source = 'web' }) {
  const tpl = PRINT_TEMPLATES[template];
  const built = tpl && cart ? tpl.build(cart) : { title: template, data: {} };
  const { data, error } = await supabase
    .from('vista_print_jobs')
    .insert([
      {
        template,
        title: built.title,
        data: built.data,
        quantity: Math.max(1, Math.min(50, quantity | 0 || 1)),
        source,
        requested_by: by,
        status: 'queued',
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Best-effort: log the print against the cart's history too.
  if (cart?.id) {
    supabase
      .from('vista_cart_events')
      .insert([{ cart_id: cart.id, cart_number: cart.cart_number, action: 'print', moved_by: by, note: 'Sticker queued' }])
      .then(() => {})
      .catch(() => {});
  }
  return data;
}

export async function listPrintJobs(limit = 30) {
  const { data, error } = await supabase
    .from('vista_print_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function cancelPrintJob(id) {
  const { error } = await supabase
    .from('vista_print_jobs')
    .update({ status: 'canceled' })
    .eq('id', id)
    .eq('status', 'queued'); // only cancel jobs that haven't started printing
  if (error) throw new Error(error.message);
}

export async function reprintJob(job) {
  const { data, error } = await supabase
    .from('vista_print_jobs')
    .insert([
      {
        template: job.template,
        title: job.title,
        data: job.data,
        quantity: job.quantity || 1,
        source: job.source || 'web',
        requested_by: job.requested_by,
        status: 'queued',
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
