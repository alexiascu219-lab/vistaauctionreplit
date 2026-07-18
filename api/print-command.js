import { createClient } from '@supabase/supabase-js';
import { templateToZpl } from '../src/lib/zpl.js';

// ============================================================================
// /api/print-command — one spoken line → many labels.
//   POST { text: "Print warehouse labels for Aisle 12 Rack 3 for all levels
//                 and positions from the google sheet", sheet?: <url> }
// Parses the request, and if it references a spreadsheet, pulls the matching
// rows from a Google Sheet, renders each label's ZPL, and queues them.
// ============================================================================

export const config = { maxDuration: 60 };

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lovfbqnuxdihjidxacet.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';
  return createClient(url, key);
}
function authorized(req) {
  const configured = [process.env.PRINT_API_KEY, process.env.PRINT_AGENT_KEY].filter(Boolean);
  if (!configured.length) return true;
  const provided = req.headers['x-api-key'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() || (req.query && req.query.key) || '';
  return !!provided && configured.includes(provided);
}

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Known location fields we can parse out of a spoken phrase.
const FIELDS = ['area', 'aisle', 'rack', 'level', 'position', 'cart', 'bay', 'shelf', 'zone', 'slot', 'lot', 'bin'];

function parseCommand(text) {
  const t = String(text || '');
  const filters = {};
  const NOISE = /^(for|all|and|the|from|of|every|each|any|labels?|stickers?|tags?|copies|copy|prints?|warehouse|location|from)$/i;
  for (const f of FIELDS) {
    if (new RegExp(`\\b(all|every|each|any)\\s+${f}`, 'i').test(t)) continue; // "all levels" → no filter
    const m = t.match(new RegExp(`\\b${f}s?\\s*(?:#|number|no\\.?|:)?\\s*([A-Za-z0-9-]+)`, 'i'));
    if (m && !NOISE.test(m[1])) filters[f] = m[1];
  }
  const qm = t.match(/\b(\d+)\s+(?:[a-z]+\s+){0,3}?(?:labels?|copies|copy|stickers?|tags?|prints?)\b/i) || t.match(/\bx\s*(\d+)\b/i);
  const quantity = qm ? Math.max(1, Math.min(50, parseInt(qm[1], 10))) : 1;
  const useSheet = /\b(sheet|spreadsheet|google|xlsx|excel|csv|database)\b/i.test(t);
  return { filters, quantity, useSheet, text: t };
}

// Turn any Google Sheets URL into a CSV export URL.
function sheetCsvUrl(url) {
  const id = (url.match(/\/d\/([a-zA-Z0-9-_]+)/) || [])[1];
  if (!id) return url; // maybe already a CSV link
  const gid = (url.match(/[#&?]gid=([0-9]+)/) || [])[1] || '0';
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  const headers = (rows.shift() || []).map((h) => h.trim());
  return headers.length ? rows.filter((r) => r.some((c) => c.trim() !== '')).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()]))) : [];
}

// Find the column in a row that matches a variable/filter key by name.
function colFor(rowKeys, key) {
  const nk = norm(key);
  return rowKeys.find((h) => norm(h) === nk) || rowKeys.find((h) => norm(h).includes(nk) || nk.includes(norm(h)));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return res.status(405).json({ error: 'Method Not Allowed' }); }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const parsed = parseCommand(body.text);
  const supabase = getClient();

  const { data: tpls } = await supabase.from('vista_label_templates').select('id, name, width, height, variables, elements').eq('archived', false);
  if (!tpls || !tpls.length) return res.status(404).json({ error: 'No label templates exist yet.' });

  // Pick the template: explicit body.template, else the one whose variables best
  // cover the fields we parsed, else a keyword match against the request text.
  const filterKeys = Object.keys(parsed.filters);
  let tpl = body.template && tpls.find((t) => t.id === body.template || norm(t.name) === norm(body.template));
  if (!tpl) {
    const scored = tpls.map((t) => {
      const vars = (t.variables || []).map((v) => norm(v.key));
      const cover = filterKeys.filter((k) => vars.includes(norm(k))).length;
      const kw = norm(body.text).includes(norm(t.name)) ? 2 : 0;
      return { t, score: cover * 3 + kw };
    }).sort((a, b) => b.score - a.score);
    tpl = (scored[0] && scored[0].score > 0 ? scored[0].t : scored[0]?.t) || tpls[0];
  }

  const tvars = tpl.variables || [];
  const defaults = {};
  for (const v of tvars) defaults[v.key] = v.default ?? '';

  const jobs = [];
  let spoken;

  if (parsed.useSheet) {
    const sheetUrl = body.sheet || process.env.LOCATIONS_SHEET_URL;
    if (!sheetUrl) return res.status(400).json({ error: 'No spreadsheet configured. Pass "sheet" or set LOCATIONS_SHEET_URL.' });
    let rows;
    try {
      const r = await fetch(sheetCsvUrl(sheetUrl));
      if (!r.ok) throw new Error(`sheet ${r.status}`);
      rows = parseCSV(await r.text());
    } catch (e) {
      return res.status(502).json({ error: `Could not read the sheet: ${e.message}` });
    }
    if (!rows.length) return res.status(400).json({ error: 'The spreadsheet has no rows.' });
    const headers = Object.keys(rows[0]);

    // Keep rows matching every parsed filter (e.g. aisle=12, rack=3).
    const matched = rows.filter((row) => filterKeys.every((k) => {
      const col = colFor(headers, k);
      return col && norm(row[col]) === norm(parsed.filters[k]);
    }));
    if (!matched.length) return res.status(200).json({ ok: true, count: 0, spoken: `No rows matched ${filterKeys.map((k) => `${k} ${parsed.filters[k]}`).join(', ') || 'that'}.` });

    for (const row of matched.slice(0, 500)) {
      const values = { ...defaults };
      for (const v of tvars) { const col = colFor(headers, v.key); if (col && row[col] !== '') values[v.key] = row[col]; }
      Object.assign(values, parsed.filters); // the spoken constants win
      jobs.push({ template: tpl.name, title: `${tpl.name} ${Object.values(parsed.filters).join(' ')}`.trim(), data: { ...values, zpl: templateToZpl(tpl, values) }, quantity: parsed.quantity, source: 'siri', requested_by: 'Siri (command)', status: 'queued' });
    }
    spoken = `Okay — queued ${jobs.length} ${tpl.name} label${jobs.length === 1 ? '' : 's'}${filterKeys.length ? ` for ${filterKeys.map((k) => `${k} ${parsed.filters[k]}`).join(', ')}` : ''}.`;
  } else {
    // No sheet — one label from the spoken values.
    const values = { ...defaults, ...parsed.filters };
    jobs.push({ template: tpl.name, title: `${tpl.name} ${Object.values(parsed.filters).join(' ')}`.trim(), data: { ...values, zpl: templateToZpl(tpl, values) }, quantity: parsed.quantity, source: 'siri', requested_by: 'Siri (command)', status: 'queued' });
    spoken = `Okay — queued ${parsed.quantity > 1 ? parsed.quantity + ' ' : ''}${tpl.name} label${parsed.quantity > 1 ? 's' : ''}.`;
  }

  const { error } = await supabase.from('vista_print_jobs').insert(jobs);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(201).json({ ok: true, count: jobs.length, template: tpl.name, filters: parsed.filters, spoken });
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
