import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/print-complete — the print agent reports the result of a job.
//   POST { id, status: 'printed' | 'error', error?, agent? }
// Requires PRINT_AGENT_KEY (if configured).
// ============================================================================

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lovfbqnuxdihjidxacet.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';
  return createClient(url, key);
}

function authorized(req) {
  const expected = process.env.PRINT_AGENT_KEY;
  if (!expected) return true; // unguarded until a key is configured
  const provided =
    req.headers['x-api-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() ||
    (req.query && req.query.key) ||
    '';
  return provided === expected;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const { id } = body;
  const status = body.status === 'error' ? 'error' : 'printed';
  if (!id) return res.status(400).json({ error: 'Missing job id' });

  const patch = {
    status,
    error: status === 'error' ? String(body.error || 'Print failed').slice(0, 500) : null,
    printed_at: status === 'printed' ? new Date().toISOString() : null,
  };
  if (body.agent) patch.agent = String(body.agent).slice(0, 80);

  const supabase = getClient();
  const { error } = await supabase.from('vista_print_jobs').update(patch).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
