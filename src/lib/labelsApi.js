import { supabase } from '../supabaseClient';
import { templateToZpl, resolveDynamic, hasDynamicVars, resolveVars } from './zpl';
import { isRasterFont, fontCss, fontWeight } from '../config/labelsConfig';
import { rasterizeTextGF } from './raster';

// For pixel-exact custom fonts: replace each non-native text element with a
// bitmap (^GF) of its resolved text rendered in the real typeface. Runs in the
// browser (needs a canvas); a no-op when nothing uses a custom font. Falls back
// to the native text element if a glyph can't be rasterised, so printing never
// breaks. Returns a template clone safe to hand to templateToZpl.
async function rasterizeFonts(template, values) {
  const els = template.elements || [];
  if (!els.some((e) => e.type === 'text' && isRasterFont(e.font))) return template;
  if (typeof document === 'undefined') return template; // server path → native text
  try { if (document.fonts?.ready) await document.fonts.ready; } catch { /* ignore */ }
  const out = [];
  for (const el of els) {
    if (el.type === 'text' && isRasterFont(el.font)) {
      const text = resolveVars(el.value, values);
      if (!text) { out.push(el); continue; }
      try {
        const gf = rasterizeTextGF({
          text,
          fontCss: fontCss(el.font),
          size: el.size || 30,
          weight: fontWeight(el.font),
          align: el.align || 'left',
          boxW: el.w,
          inverse: !!el.inverse,
          elX: el.x || 0,
          elY: el.y || 0,
        });
        out.push({ id: el.id, type: 'image', x: gf.x, y: gf.y, w: gf.w, h: gf.h, gfHex: gf.gfHex, gfBpr: gf.gfBpr, gfRows: gf.gfRows });
      } catch {
        out.push(el); // fall back to native text
      }
    } else {
      out.push(el);
    }
  }
  return { ...template, elements: out };
}

// ---- Template CRUD ---------------------------------------------------------
export async function listTemplates() {
  const { data, error } = await supabase
    .from('vista_label_templates')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveTemplate(t, by = null) {
  const payload = {
    name: (t.name || 'Untitled').trim(),
    description: t.description || null,
    width: Math.round(t.width || 609),
    height: Math.round(t.height || 406),
    dpi: t.dpi || 203,
    variables: t.variables || [],
    elements: t.elements || [],
    updated_by: by,
    updated_at: new Date().toISOString(),
  };
  if (t.id) {
    const { data, error } = await supabase.from('vista_label_templates').update(payload).eq('id', t.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.from('vista_label_templates').insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveTemplate(id) {
  const { error } = await supabase.from('vista_label_templates').update({ archived: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Printing --------------------------------------------------------------
// jobs: [{ values, title }]. One print job per entry, each carrying finished
// ZPL so the agent prints it as-is.
//
// If the template serializes (has a counter/date variable), the run is expanded
// to ONE job per physical label so each gets the next counter value — otherwise
// identical copies are collapsed into a single job with a quantity.
const SERIAL_CAP = 2000;
export async function queueLabelPrints({ template, jobs, quantity = 1, by = null, source = 'web' }) {
  const q = Math.max(1, Math.min(50, quantity | 0 || 1));
  const vars = template.variables || [];
  const mk = (tpl, values, title, qty) => ({
    template: 'custom',
    title: title || template.name,
    data: { zpl: templateToZpl(tpl, values), values, template_id: template.id, template_name: template.name },
    quantity: qty,
    source,
    requested_by: by,
    status: 'queued',
  });

  // Per-value ZPL so custom fonts can be rasterised for the exact resolved text.
  const makeRow = async (values, title, qty) => mk(await rasterizeFonts(template, values), values, title, qty);

  let rows;
  if (hasDynamicVars(vars)) {
    const now = new Date();
    rows = [];
    let idx = 0;
    for (const { values, title } of jobs) {
      for (let c = 0; c < q && rows.length < SERIAL_CAP; c++) {
        rows.push(await makeRow(resolveDynamic(vars, values, idx, now), title, 1));
        idx += 1;
      }
    }
  } else {
    rows = [];
    for (const { values, title } of jobs) rows.push(await makeRow(values, title, q));
  }

  // Rasterised labels are large (~60 KB each), so insert in chunks to stay well
  // under request-size limits on big ranges.
  const CHUNK = 25;
  const inserted = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { data, error } = await supabase.from('vista_print_jobs').insert(rows.slice(i, i + CHUNK)).select();
    if (error) throw new Error(error.message);
    if (data) inserted.push(...data);
  }
  return inserted;
}

// ---- ZebraDesigner bridge --------------------------------------------------
// Queue ONE job that the desktop Print Station expands into a CSV (one row per
// value set) + trigger in the ZebraDesigner watched folder, so a whole range
// prints through ZebraDesigner (Automation or Professional) instead of our ZPL
// engine. `rows` is an array of values objects (e.g. one per number in a range).
export async function queueBridgePrints({ template, labelFile, rows, quantity = 1, by = null, source = 'web' }) {
  const q = Math.max(1, Math.min(50, quantity | 0 || 1));
  const bridgeRows = rows.map((values) => ({ ...values, quantity: q }));
  const job = {
    template: 'zebradesigner',
    title: `${template.name} · ${rows.length} label${rows.length === 1 ? '' : 's'} → ZebraDesigner`,
    data: {
      bridge: {
        label: (labelFile || template.name || '').trim(),
        columns: (template.variables || []).map((v) => v.key),
        rows: bridgeRows,
      },
      template_name: template.name,
    },
    quantity: 1, // per-row copies live in each row's "quantity" column
    source,
    requested_by: by,
    status: 'queued',
  };
  const { data, error } = await supabase.from('vista_print_jobs').insert([job]).select();
  if (error) throw new Error(error.message);
  return data;
}
