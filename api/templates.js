import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/templates — lists the label designs a Siri Shortcut (or anything) can
// print, each with the fields it needs. The Shortcut calls this to ask
// "which label?", then prompts for that label's variables, then POSTs /api/print.
//   GET /api/templates -> { templates: [{ id, name, width, height,
//                                         variables: [{ key, label, default }] }] }
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
  const configured = [process.env.PRINT_API_KEY, process.env.PRINT_AGENT_KEY].filter(Boolean);
  if (configured.length === 0) return true; // unguarded until a key is set
  const provided =
    req.headers['x-api-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() ||
    (req.query && req.query.key) ||
    '';
  return !!provided && configured.includes(provided);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getClient();
  const { data, error } = await supabase
    .from('vista_label_templates')
    .select('id, name, width, height, variables')
    .eq('archived', false)
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const templates = (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    width: t.width,
    height: t.height,
    variables: Array.isArray(t.variables) ? t.variables.map((v) => ({ key: v.key, label: v.label || v.key, default: v.default ?? '' })) : [],
  }));

  // `names` is a convenience for a Shortcut "Choose from List" step.
  return res.status(200).json({ templates, names: templates.map((t) => t.name) });
}
