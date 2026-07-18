import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/claude-design — queue a Claude label-design request AND fire the Claude
// Code Routine immediately, so it runs now instead of waiting for its schedule.
//   POST { prompt, base:{width,height}, image?, by? } -> { id, fired }
//
// The routine is fired via the Claude Code Routines API using a token kept only
// on the server (never in the repo or browser):
//   CLAUDE_ROUTINE_TOKEN    the sk-ant-oat01-… token
//   CLAUDE_ROUTINE_FIRE_URL the full …/routines/<id>/fire URL   (or:)
//   CLAUDE_ROUTINE_ID       the trigger id (trig_…) to build the URL
// If those aren't set, the request is still queued and the scheduled run picks
// it up later.
// ============================================================================

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lovfbqnuxdihjidxacet.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';
  return createClient(url, key);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return res.status(405).json({ error: 'Method Not Allowed' }); }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const row = {
    prompt: body.prompt || 'Design a label from the attached reference image.',
    base: { width: body.base?.width || 609, height: body.base?.height || 406 },
    provider: 'claude',
    requested_by: (body.by || 'Label Studio').toString().slice(0, 80),
    status: 'pending',
  };
  if (body.image) row.image = body.image;

  const supabase = getClient();
  const { data, error } = await supabase.from('vista_label_ai_requests').insert([row]).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Fire the routine now (best-effort — a queued row still runs on schedule).
  let fired = false;
  let fireError = null;
  const token = process.env.CLAUDE_ROUTINE_TOKEN;
  const url = process.env.CLAUDE_ROUTINE_FIRE_URL || (process.env.CLAUDE_ROUTINE_ID ? `https://api.anthropic.com/v1/claude_code/routines/${process.env.CLAUDE_ROUTINE_ID}/fire` : null);
  if (token && url) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'experimental-cc-routine-2026-04-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: `Process pending Vista label design requests now (new request ${data.id}).` }),
      });
      fired = r.ok;
      if (!r.ok) fireError = `fire ${r.status}: ${(await r.text()).slice(0, 160)}`;
    } catch (e) {
      fireError = e.message;
    }
  }

  return res.status(201).json({ ...data, fired, fireError });
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
