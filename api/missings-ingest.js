/* global process */
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/missings-ingest — the Google Sheet's way into floor.missings.
//
// The Apps Script keeps owning the spreadsheet; this is the one-way door that
// mirrors it into Supabase so the floor app has something to check scans
// against. Nothing here writes back to the Sheet.
//
//   POST { rows: [ {...}, ... ], sheetTab?: string, absent?: 'ignore'|'resolve' }
//   header: x-ingest-secret: <MISSINGS_INGEST_SECRET>
//
// Rows are accepted as whatever the sheet's header row calls things — the
// column mapping lives here rather than in the Apps Script, so adjusting it
// later is a deploy rather than an edit to a script bound to a live
// spreadsheet.
//
// Env:
//   MISSINGS_INGEST_SECRET      shared secret, also set in the Apps Script
//   SUPABASE_SERVICE_ROLE_KEY   required: RLS denies inserts to everyone else
// ============================================================================

export const config = { maxDuration: 60 };

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://lovfbqnuxdihjidxacet.supabase.co';

/* -------------------------------------------------------------------------- */
/* Column mapping                                                             */
/* -------------------------------------------------------------------------- */

// Header aliases, lowercased and stripped of non-alphanumerics before matching.
// Generous on purpose: a spreadsheet maintained by hand accumulates variants
// ("VALPN", "Valpn #", "valpn_number"), and a sync that silently drops rows
// because a header was renamed is worse than one that guesses well.
const FIELD_ALIASES = {
  valpn: ['valpn', 'valpnnumber', 'valpnno', 'item', 'itemnumber', 'sku'],
  location_last_seen: ['location', 'lastlocation', 'locationlastseen', 'lastseen', 'bin', 'aisle', 'spot'],
  marked_by: ['markedby', 'reportedby', 'flaggedby', 'addedby', 'by'],
  stacked_by: ['stackedby', 'stacker', 'stackedbyname', 'putawayby'],
  order_number: ['order', 'ordernumber', 'orderno', 'orderid', 'gaylordorder', 'gaylord'],
  order_kind: ['orderkind', 'kind', 'ordertype', 'type'],
  sold_price: ['price', 'soldprice', 'saleprice', 'value', 'amount'],
  ever_resold: ['everresold', 'resold', 'wasresold'],
  marked_at: ['markedat', 'date', 'datemissing', 'timestamp', 'reportedat', 'created'],
  sheet_row: ['row', 'sheetrow', 'rownumber'],
};

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Build header -> column map once per request, from the first row's keys. */
function buildMap(sampleKeys) {
  const map = {};
  for (const key of sampleKeys) {
    const n = norm(key);
    for (const [column, aliases] of Object.entries(FIELD_ALIASES)) {
      if (map[column]) continue;
      if (aliases.includes(n)) {
        map[column] = key;
        break;
      }
    }
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/* Value coercion                                                             */
/* -------------------------------------------------------------------------- */

/** Server-side twin of normalizeValpn(). Never trust the sheet's formatting. */
function normalizeValpn(raw) {
  if (raw === null || raw === undefined) return null;
  let token = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  token = token.replace(/^(?:VALPN)+/, '');
  return /^\d{5,}$/.test(token) ? `VALPN-${token}` : null;
}

/** Anchored to the end so any facility prefix is stripped. */
function normalizeLocation(raw) {
  if (!raw) return null;
  const compact = String(raw).toUpperCase().replace(/\s+/g, '');
  const m = /([A-Z]{1,3}\d{1,3}-\d{1,3})$/.exec(compact);
  return m ? m[1] : null;
}

function toPrice(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : null;
}

function toBool(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'boolean') return raw;
  return /^(y|yes|true|1|x)$/i.test(String(raw).trim());
}

function toTimestamp(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/** A gaylord order is a "prep"; everything else is a delivery. */
function toOrderKind(kindRaw, orderRaw) {
  const k = norm(kindRaw);
  if (k.includes('prep') || k.includes('gaylord')) return 'prep';
  if (k.includes('deliver')) return 'delivery';
  // Fall back to the order number's shape — gaylord orders are prefixed G-.
  if (/^g[-_]?\d/i.test(String(orderRaw ?? '').trim())) return 'prep';
  return orderRaw ? 'delivery' : null;
}

function toText(raw) {
  const s = String(raw ?? '').trim();
  return s === '' ? null : s;
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                    */
/* -------------------------------------------------------------------------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const secret = process.env.MISSINGS_INGEST_SECRET;
  if (!secret) return res.status(503).json({ ok: false, error: 'ingest_not_configured' });

  const provided = req.headers['x-ingest-secret'];
  if (!provided || String(provided) !== secret) {
    return res.status(401).json({ ok: false, error: 'bad_secret' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(503).json({ ok: false, error: 'service_role_missing' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const rows = Array.isArray(body.rows) ? body.rows : null;
    if (!rows) return res.status(400).json({ ok: false, error: 'rows_required' });

    const sheetTab = toText(body.sheetTab);
    const map = buildMap(rows.length ? Object.keys(rows[0]) : []);

    if (!map.valpn) {
      return res.status(400).json({
        ok: false,
        error: 'no_valpn_column',
        sawHeaders: rows.length ? Object.keys(rows[0]).slice(0, 30) : [],
      });
    }

    const seen = new Set();
    const records = [];
    let skipped = 0;

    rows.forEach((row, index) => {
      const valpn = normalizeValpn(row[map.valpn]);
      if (!valpn || seen.has(valpn)) {
        // Unreadable, blank, or a duplicate of an earlier row. The unique index
        // would reject the duplicate anyway; dropping it here keeps one bad row
        // from failing the whole batch.
        if (!valpn) skipped += 1;
        return;
      }
      seen.add(valpn);

      records.push({
        valpn,
        location_last_seen: map.location_last_seen ? normalizeLocation(row[map.location_last_seen]) : null,
        marked_by: map.marked_by ? toText(row[map.marked_by]) : null,
        stacked_by: map.stacked_by ? toText(row[map.stacked_by]) : null,
        order_number: map.order_number ? toText(row[map.order_number]) : null,
        order_kind: toOrderKind(map.order_kind ? row[map.order_kind] : null, map.order_number ? row[map.order_number] : null),
        sold_price: map.sold_price ? toPrice(row[map.sold_price]) : null,
        ever_resold: map.ever_resold ? toBool(row[map.ever_resold]) : null,
        marked_at: (map.marked_at ? toTimestamp(row[map.marked_at]) : null) || new Date().toISOString(),
        sheet_tab: sheetTab,
        sheet_row: map.sheet_row ? Number(row[map.sheet_row]) || index + 2 : index + 2,
      });
    });

    const supabase = createClient(SUPABASE_URL, serviceKey, {
      db: { schema: 'floor' },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Upsert on valpn. Note what is NOT in the payload: found, found_at,
    // found_by, found_note. PostgREST only updates the columns it is given, so
    // a resolution made on the floor survives every subsequent sheet sync —
    // the app's decision wins over a sheet that has not caught up yet.
    let upserted = 0;
    const CHUNK = 500;
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const { error } = await supabase.from('missings').upsert(chunk, { onConflict: 'valpn' });
      if (error) {
        console.error('[missings-ingest] upsert failed:', error.message);
        return res.status(502).json({ ok: false, error: 'upsert_failed', detail: error.message });
      }
      upserted += chunk.length;
    }

    // Optional reconciliation: close open rows this tab no longer lists.
    // Off by default and deliberately so — "gone from the sheet" is not the
    // same claim as "found", and guessing wrong quietly empties the floor's
    // work list.
    let closed = 0;
    if (body.absent === 'resolve' && sheetTab && seen.size) {
      const { data, error } = await supabase
        .from('missings')
        .update({
          found: true,
          found_at: new Date().toISOString(),
          found_note: 'Resolved outside the app (no longer on the sheet)',
        })
        .eq('sheet_tab', sheetTab)
        .is('found', null)
        .not('valpn', 'in', `(${[...seen].map((v) => `"${v}"`).join(',')})`)
        .select('valpn');

      if (error) console.error('[missings-ingest] reconcile failed:', error.message);
      else closed = data?.length ?? 0;
    }

    return res.status(200).json({
      ok: true,
      received: rows.length,
      upserted,
      skipped,
      closed,
      mappedColumns: map,
    });
  } catch (err) {
    console.error('[missings-ingest]', err?.message || 'unknown_error');
    return res.status(500).json({ ok: false, error: 'ingest_error' });
  }
}
