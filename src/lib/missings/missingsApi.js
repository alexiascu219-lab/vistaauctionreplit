import { supabase } from '../../supabaseClient';

/**
 * Data access for the missing-items floor app.
 *
 * Everything here lives in the `floor` Postgres schema, not `public`, so it never
 * collides with the 28 vista_* / pickups_* tables. We reach it with
 * supabase.schema('floor') on the SHARED client rather than constructing a second
 * one — two Supabase clients in the same browser means two GoTrue instances
 * fighting over the same storage key, and the session here is deliberately the
 * same session the rest of the app uses.
 *
 * Requires `floor` to be listed under Settings -> API -> Exposed schemas in the
 * Supabase dashboard. Without that PostgREST returns a 404 for every call below.
 */
const floor = () => supabase.schema('floor');

/** Distinguishes "schema not exposed" from a genuine data error, for the UI. */
export function isSchemaMissingError(error) {
  if (!error) return false;
  const text = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return (
    text.includes('pgrst106') ||
    (text.includes('schema') && (text.includes('not') || text.includes('must be')))
  );
}

/**
 * The caller's own staff row, or null if they are not on the allowlist.
 *
 * A Supabase session is NOT authorization: Auth will create an account for any
 * email address on earth. Access to the floor app requires an active row here,
 * and RLS enforces the same rule on every table, so this lookup is a UI
 * convenience rather than the security boundary.
 */
export async function fetchStaffProfile(userId) {
  if (!userId) return { staff: null, error: null };

  const { data, error } = await floor()
    .from('staff')
    .select('id, display_name, role, active, facility')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { staff: null, error };
  if (!data || !data.active) return { staff: null, error: null };
  return { staff: data, error: null };
}

/**
 * Today's open list, joined to camera coverage.
 *
 * This is the payload that step 5 will cache locally so a scan resolves with no
 * network at all. For now it is a live read.
 */
export async function fetchOpenMissings() {
  const { data, error } = await floor()
    .from('open_missings')
    .select('*')
    .order('marked_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Resolve a missing item: found, or searched and not found.
 *
 * Goes through the mark_found RPC rather than an UPDATE because `authenticated`
 * has no UPDATE grant on floor.missings at all — Postgres RLS cannot restrict
 * WHICH columns an update touches, so the write path is a function instead. That
 * also means found_by is taken from the session, not from anything the client
 * sends, so nobody can attribute a find to someone else.
 *
 * clientEventId makes the call idempotent, which the step-5 offline queue needs:
 * a flush that succeeds server-side but loses the response must be safe to retry.
 */
export async function markFound({ valpn, found, note = null, clientEventId = null }) {
  const { data, error } = await floor().rpc('mark_found', {
    p_valpn: valpn,
    p_found: found,
    p_note: note,
    p_client_event_id: clientEventId,
  });

  if (error) throw error;
  return data;
}

/**
 * Log a scan — hit or miss, readable or not.
 *
 * Misses are the majority and are the point: they are what proves an item is
 * clear. The hit is resolved server-side so the log does not depend on the
 * client's cache being current.
 */
export async function logScan({
  rawInput,
  source = 'camera',
  resolvedOffline = false,
  deviceLabel = null,
  clientEventId = null,
}) {
  const { data, error } = await floor().rpc('log_scan', {
    p_raw_input: rawInput,
    p_source: source,
    p_resolved_offline: resolvedOffline,
    p_device_label: deviceLabel,
    p_client_event_id: clientEventId,
  });

  if (error) throw error;
  return data;
}

/**
 * Send a magic link. No password: warehouse staff should not be typing one in
 * gloves, and there is nothing to forget or share.
 *
 * The response is deliberately identical whether or not the address is on the
 * allowlist. Someone not on it gets a link, signs in, and lands on the
 * "not set up yet" screen — rather than this form telling anyone who asks which
 * addresses belong to staff.
 */
export async function sendMagicLink(email) {
  return supabase.auth.signInWithOtp({
    email: String(email || '').trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/missings` },
  });
}
