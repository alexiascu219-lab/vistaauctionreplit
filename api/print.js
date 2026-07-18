import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/print — the bridge between "ask for a sticker" and "a Zebra prints it".
//
//   POST  /api/print          Queue a print job.  Used by the Siri Shortcut
//                             (and anything else that can send an HTTP POST).
//   GET   /api/print          The print agent on the Zebra PC polls this to
//                             claim queued jobs (marks them 'printing').
//
// Auth is via a shared secret so a random visitor can't trigger prints:
//   - POST accepts PRINT_API_KEY or PRINT_AGENT_KEY
//   - GET  requires PRINT_AGENT_KEY
// If neither env var is set the endpoint runs UNGUARDED (handy for first-run
// testing) — set the keys in your Vercel project before going live.
// ============================================================================

function getClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return createClient(url, key);
}

// Pull the presented secret from a header or query string.
function presentedKey(req) {
  return (
    req.headers['x-api-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() ||
    (req.query && req.query.key) ||
    ''
  );
}

// Returns { ok, unguarded } — `unguarded` means no secret is configured.
function authorize(req, envNames) {
  const configured = envNames.map((n) => process.env[n]).filter(Boolean);
  if (configured.length === 0) return { ok: true, unguarded: true };
  const provided = presentedKey(req);
  return { ok: !!provided && configured.includes(provided) };
}

// Best-effort: dig a cart number out of a spoken phrase like "cart twelve" /
// "print cart 12". Digits win; otherwise map common number words.
const NUMBER_WORDS = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
  nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
};
function parseCartNumber(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  // Already a compact cart id ("12", "A3", "Blue-4")? Respect it verbatim,
  // but still map a lone spoken number-word ("twelve").
  if (!/\s/.test(s) && s.length <= 12) return NUMBER_WORDS[s.toLowerCase()] || s;
  // A spoken phrase ("print cart twelve") — pull out a cart-number-ish token.
  const token = s.match(/[A-Za-z]?\d+[A-Za-z]?/); // "12", "3b", "a3"
  if (token) return token[0].toUpperCase();
  const word = s.toLowerCase().match(/\b([a-z]+)\b/g)?.find((w) => NUMBER_WORDS[w]);
  if (word) return NUMBER_WORDS[word];
  return s;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getClient();

  // ---- Agent poll: claim queued jobs --------------------------------------
  if (req.method === 'GET') {
    const auth = authorize(req, ['PRINT_AGENT_KEY']);
    if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

    const agentName = (req.query && (req.query.agent || req.query.name)) || 'zebra-agent';
    const limit = Math.min(20, parseInt((req.query && req.query.limit) || '10', 10) || 10);

    const { data: queued, error } = await supabase
      .from('vista_print_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    if (!queued || queued.length === 0) return res.status(200).json({ jobs: [] });

    const ids = queued.map((j) => j.id);
    const { data: claimed, error: claimErr } = await supabase
      .from('vista_print_jobs')
      .update({ status: 'printing', claimed_at: new Date().toISOString(), agent: agentName })
      .in('id', ids)
      .eq('status', 'queued') // don't steal a job another poll already grabbed
      .select();
    if (claimErr) return res.status(500).json({ error: claimErr.message });

    return res.status(200).json({ jobs: claimed || [] });
  }

  // ---- Create a job (Siri / API) ------------------------------------------
  if (req.method === 'POST') {
    const auth = authorize(req, ['PRINT_API_KEY', 'PRINT_AGENT_KEY']);
    if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
    const template = (body.template || 'cart_label').toString();
    const quantity = Math.max(1, Math.min(50, parseInt(body.quantity, 10) || 1));
    const source = ['web', 'cart', 'siri', 'api'].includes(body.source) ? body.source : 'siri';
    const requestedBy = (body.requested_by || body.by || 'Siri').toString().slice(0, 80);

    const cartNumber = parseCartNumber(body.cart_number ?? body.cart ?? body.number ?? body.text);
    const data = { ...(body.data || {}) };
    let title = body.title;

    if (template === 'cart_label') {
      if (!cartNumber) {
        return res.status(400).json({ error: 'Which cart? Provide cart_number (e.g. "12").' });
      }
      data.cart_number = cartNumber;
      if (body.zone && !data.zone) data.zone = String(body.zone);
      if (body.spot && !data.spot) data.spot = String(body.spot);
      title = title || `Cart ${cartNumber}`;
    }

    const { data: job, error } = await supabase
      .from('vista_print_jobs')
      .insert([{ template, title: title || template, data, quantity, source, requested_by: requestedBy, status: 'queued' }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      ok: true,
      job,
      // A short line Siri can read back out loud.
      spoken: `Okay — queued ${quantity > 1 ? quantity + ' stickers' : 'a sticker'} for cart ${cartNumber || title}.`,
    });
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Method Not Allowed' });
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
