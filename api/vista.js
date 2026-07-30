/* global process, Buffer */
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/vista — server-side proxy to the Vista API.
//
// Two reasons this exists rather than the browser calling Vista directly:
//   1. Credentials. Vista auth material lives ONLY in this function's env. It
//      is never sent to the client, never logged, and never echoed in an error.
//   2. CORS. api.vistaapp.tech does not permit browser origins anyway.
//
// Every request is gated on the caller being an active member of floor.staff,
// so this is not an open relay to the Vista API for anyone who finds the URL.
//
//   POST { action: 'lookup', valpn, orderNumber?, orderKind? }
//        -> { ok, facts: {...} }
//
// Auth to Vista, in precedence order:
//   VISTA_SESSION_COOKIE      a session cookie string, used verbatim
//   VISTA_API_USERNAME/PASSWORD  JWT: POST /token/ then refresh, cached below
//
// Nothing here is verifiable from a dev sandbox — outbound access to Vista is
// not available there — so every response shape is treated as untrusted and
// read defensively.
// ============================================================================

export const config = { maxDuration: 30 };

const VISTA_BASE = (process.env.VISTA_API_BASE_URL || 'https://api.vistaapp.tech/api/v1').replace(/\/+$/, '');

/* -------------------------------------------------------------------------- */
/* Caller authorization                                                       */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lovfbqnuxdihjidxacet.supabase.co';
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';

/**
 * Resolve the caller to an active floor.staff row, or null.
 *
 * Deliberately uses the caller's OWN access token with the anon key rather than
 * service_role: the staff lookup then runs under RLS, so a forged or expired
 * token simply returns nothing. service_role here would bypass the very policy
 * that makes this safe.
 */
async function callerStaff(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const { data, error } = await supabase
    .schema('floor')
    .from('staff')
    .select('id, display_name, role, active')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error || !data || !data.active) return null;
  return data;
}

/* -------------------------------------------------------------------------- */
/* Vista authentication                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Token cache. Module scope survives across invocations on a warm lambda, which
 * is the whole point: re-logging-in on every lookup would be slow and would hammer
 * /token/. On a cold start this is empty and we log in once.
 */
let tokenCache = { access: null, refresh: null, expiresAt: 0 };

function cookieMode() {
  const cookie = process.env.VISTA_SESSION_COOKIE;
  return cookie ? cookie.trim() : null;
}

function credentials() {
  const username = process.env.VISTA_API_USERNAME;
  const password = process.env.VISTA_API_PASSWORD;
  return username && password ? { username, password } : null;
}

/** JWTs are opaque to us in principle, but reading exp lets us refresh early. */
function expiryFromJwt(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64').toString('utf8'));
    // Refresh 60s early so a request never races the expiry.
    return payload.exp ? payload.exp * 1000 - 60_000 : 0;
  } catch {
    return 0;
  }
}

async function login() {
  const creds = credentials();
  if (!creds) throw new HttpError(503, 'vista_not_configured');

  const res = await fetch(`${VISTA_BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });

  if (!res.ok) {
    // Status only. The body of a failed auth can contain the submitted
    // credentials, and this message reaches logs.
    throw new HttpError(502, `vista_login_failed_${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  const access = data.access || data.access_token || data.token;
  if (!access) throw new HttpError(502, 'vista_login_no_token');

  tokenCache = {
    access,
    refresh: data.refresh || data.refresh_token || null,
    expiresAt: expiryFromJwt(access) || Date.now() + 4 * 60_000,
  };
  return tokenCache.access;
}

/** Refresh rather than re-logging-in, per the integration brief. */
async function refresh() {
  if (!tokenCache.refresh) return login();

  const res = await fetch(`${VISTA_BASE}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokenCache.refresh }),
  });

  if (!res.ok) {
    // Refresh token expired or rejected — fall back to a full login.
    tokenCache = { access: null, refresh: null, expiresAt: 0 };
    return login();
  }

  const data = await res.json().catch(() => ({}));
  const access = data.access || data.access_token;
  if (!access) return login();

  tokenCache.access = access;
  tokenCache.expiresAt = expiryFromJwt(access) || Date.now() + 4 * 60_000;
  return access;
}

async function accessToken() {
  if (tokenCache.access && Date.now() < tokenCache.expiresAt) return tokenCache.access;
  if (tokenCache.refresh) return refresh();
  return login();
}

/** Auth headers for a Vista call. Cookie mode wins when configured. */
async function vistaAuthHeaders() {
  const cookie = cookieMode();
  if (cookie) return { Cookie: cookie };
  return { Authorization: `Bearer ${await accessToken()}` };
}

/**
 * GET from Vista with one automatic retry on 401.
 *
 * In JWT mode a 401 means the cached token died early; drop it and retry once.
 * In cookie mode a 401 means the cookie expired and only a human can fix it, so
 * it surfaces as a distinct error the UI can explain.
 */
async function vistaGet(path) {
  const url = path.startsWith('http') ? path : `${VISTA_BASE}${path}`;

  const attempt = async () => {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...(await vistaAuthHeaders()) },
    });
    return res;
  };

  let res = await attempt();

  if (res.status === 401 || res.status === 403) {
    if (cookieMode()) throw new HttpError(502, 'vista_cookie_expired');
    tokenCache = { access: null, refresh: tokenCache.refresh, expiresAt: 0 };
    res = await attempt();
  }

  if (res.status === 404) return null;
  if (!res.ok) throw new HttpError(502, `vista_http_${res.status}`);

  return res.json().catch(() => null);
}

/* -------------------------------------------------------------------------- */
/* Domain                                                                     */
/* -------------------------------------------------------------------------- */

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/** Server-side twin of normalizeValpn(). Never trust a client-normalized key. */
function normalizeValpn(raw) {
  if (!raw) return null;
  let token = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  token = token.replace(/^(?:VALPN)+/, '');
  return /^\d{5,}$/.test(token) ? `VALPN-${token}` : null;
}

/** Vista paginates some list endpoints and returns bare arrays on others. */
function firstResult(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] ?? null;
  if (Array.isArray(payload.results)) return payload.results[0] ?? null;
  if (payload.id) return payload;
  return null;
}

function asArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

/** Pull the first present key from a set of candidates. Vista field names vary. */
function pick(obj, ...keys) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Everything we want to know about one item, in one round trip for the client.
 *
 * Each stage degrades independently: a missing history or an unreachable order
 * still returns the product facts rather than failing the whole lookup. A
 * partial answer is genuinely useful on the floor; an error page is not.
 */
async function lookup({ valpn, orderNumber, orderKind }) {
  const product = firstResult(await vistaGet(`/products/?valpn=${encodeURIComponent(valpn)}`));

  if (!product) {
    return { valpn, found: false, product: null, history: [], order: null };
  }

  const productId = pick(product, 'id', 'pk', 'product_id');

  let history = [];
  if (productId) {
    try {
      history = asArray(await vistaGet(`/products/${encodeURIComponent(productId)}/history_detailed/`));
    } catch {
      history = [];
    }
  }

  // Different endpoint per order kind — a delivery order and a prep (gaylord)
  // order are separate resources in Vista.
  let order = null;
  const number = orderNumber || pick(product, 'order_number', 'order', 'order_id');
  const kind = orderKind || (pick(product, 'gaylord_order', 'gaylord_order_id') ? 'prep' : 'delivery');

  if (number) {
    const path = kind === 'prep'
      ? `/gaylord-orders/${encodeURIComponent(number)}/`
      : `/orders/${encodeURIComponent(number)}/`;
    try {
      order = await vistaGet(path);
    } catch {
      order = null;
    }
  }

  // Resold-before is a genuinely useful signal on the floor: an item that has
  // been through the building more than once tends to be misfiled again.
  const everResold =
    pick(product, 'ever_resold', 'is_resold', 'resold') ??
    (history.filter((h) => /resold|relist/i.test(String(pick(h, 'action', 'event', 'type') || ''))).length > 0);

  return {
    valpn,
    found: true,
    product: {
      id: productId,
      title: pick(product, 'title', 'name', 'description'),
      location: pick(product, 'location', 'bin_location', 'warehouse_location'),
      soldPrice: toNumber(pick(product, 'sold_price', 'price', 'final_price', 'sale_price')),
      condition: pick(product, 'condition', 'condition_name'),
      status: pick(product, 'status', 'state'),
      everResold: Boolean(everResold),
    },
    order: order
      ? {
          kind,
          number: pick(order, 'order_number', 'number', 'id') ?? number,
          customer: pick(order, 'customer_name', 'customer', 'buyer'),
          status: pick(order, 'status', 'state'),
          createdAt: pick(order, 'created_at', 'created', 'date'),
        }
      : null,
    history: history.slice(0, 25).map((h) => ({
      at: pick(h, 'timestamp', 'created_at', 'date', 'time'),
      action: pick(h, 'action', 'event', 'type', 'description'),
      by: pick(h, 'user', 'username', 'by', 'actor'),
      location: pick(h, 'location', 'to_location', 'bin_location'),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                    */
/* -------------------------------------------------------------------------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const staff = await callerStaff(req);
    if (!staff) return res.status(401).json({ ok: false, error: 'not_floor_staff' });

    if (!cookieMode() && !credentials()) {
      return res.status(503).json({ ok: false, error: 'vista_not_configured' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    if ((body.action || 'lookup') !== 'lookup') {
      return res.status(400).json({ ok: false, error: 'unknown_action' });
    }

    const valpn = normalizeValpn(body.valpn);
    if (!valpn) return res.status(400).json({ ok: false, error: 'unreadable_valpn' });

    const facts = await lookup({
      valpn,
      orderNumber: body.orderNumber ? String(body.orderNumber) : null,
      orderKind: body.orderKind === 'prep' ? 'prep' : body.orderKind === 'delivery' ? 'delivery' : null,
    });

    return res.status(200).json({ ok: true, facts, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const code = err instanceof HttpError ? err.code : 'vista_proxy_error';
    // Codes only. err.message from a fetch failure can contain the request URL,
    // and in cookie mode that is adjacent to credential material.
    console.error('[api/vista]', code);
    return res.status(status).json({ ok: false, error: code });
  }
}
