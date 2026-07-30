import { supabase } from '../../supabaseClient';

/**
 * Client wrapper for /api/vista.
 *
 * The browser never talks to api.vistaapp.tech directly — CORS forbids it, and
 * more importantly the Vista credentials live only in the serverless function's
 * environment. This sends the caller's Supabase access token so the proxy can
 * confirm they are active floor staff before it spends a Vista call on them.
 */
export async function lookupVista({ valpn, orderNumber = null, orderKind = null, signal } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new VistaError('not_signed_in');

  const res = await fetch('/api/vista', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'lookup', valpn, orderNumber, orderKind }),
    signal,
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || !payload.ok) {
    throw new VistaError(payload.error || `http_${res.status}`);
  }

  return payload.facts;
}

export class VistaError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/**
 * Turn a proxy error code into something actionable on the floor.
 *
 * Configuration problems are called out specifically rather than lumped into a
 * generic failure, because the fix is completely different: "not configured"
 * needs an admin in the Vercel dashboard, an expired cookie needs a human to
 * refresh it, and a network error just needs another try.
 */
export function vistaErrorMessage(code) {
  switch (code) {
    case 'vista_not_configured':
      return 'Vista lookup is not set up yet — the API credentials have not been added on the server.';
    case 'vista_cookie_expired':
      return 'The saved Vista session has expired. It needs to be refreshed on the server.';
    case 'not_floor_staff':
    case 'not_signed_in':
      return 'Your session expired. Sign in again.';
    case 'unreadable_valpn':
      return 'That does not look like a VALPN.';
    default:
      if (String(code).startsWith('vista_http_') || String(code).startsWith('vista_login_failed_')) {
        return 'Vista did not respond as expected. The item details may be incomplete.';
      }
      return 'Could not reach Vista. Showing what we have saved.';
  }
}
