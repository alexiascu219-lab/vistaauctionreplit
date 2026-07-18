import { supabase } from '../supabaseClient';

// AI label design generation. Calls our own /api/ai serverless endpoint, which
// talks to Mistral server-side — the API key never reaches the browser. The
// model returns a label design as JSON, which we sanitise hard before letting
// it near the canvas.

// POST to the server-side Mistral proxy and return the raw model text.
async function callAi(payload) {
  const r = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `AI request failed (${r.status})`);
  return data.text || '';
}

function extractJson(text) {
  let s = String(text || '').trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('The AI did not return a label.');
  return JSON.parse(s.slice(a, b + 1));
}

const clamp = (v, lo, hi, dflt) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(n)));
};
const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'value';
const str = (s, cap = 120) => String(s == null ? '' : s).slice(0, cap);

// Never trust raw model output — coerce everything into the safe label model.
export function sanitizeTemplate(raw, { width, height }) {
  const W = clamp(raw?.width, 120, 2400, width);
  const H = clamp(raw?.height, 120, 2400, height);
  const SYMB = new Set(['code128', 'code39', 'qr']);

  const elements = (Array.isArray(raw?.elements) ? raw.elements : [])
    .slice(0, 40)
    .map((el, i) => {
      const base = { id: `a${i}${Math.random().toString(36).slice(2, 5)}`, x: clamp(el?.x, 0, W, 0), y: clamp(el?.y, 0, H, 0) };
      switch (el?.type) {
        case 'text':
          return { ...base, type: 'text', size: clamp(el.size, 8, H, 40), value: str(el.value) || 'Text' };
        case 'barcode':
          return {
            ...base,
            type: 'barcode',
            height: clamp(el.height, 20, H, 100),
            module: clamp(el.module, 1, 12, 3),
            symbology: SYMB.has(el.symbology) ? el.symbology : 'code128',
            showText: !!el.showText,
            value: str(el.value) || '${number}',
          };
        case 'box':
          return { ...base, type: 'box', w: clamp(el.w, 4, W, 100), h: clamp(el.h, 4, H, 60), thickness: clamp(el.thickness, 1, 20, 3) };
        case 'line':
          return el.orient === 'v'
            ? { ...base, type: 'line', orient: 'v', h: clamp(el.h ?? el.w, 4, H, 100), thickness: clamp(el.thickness, 1, 20, 3) }
            : { ...base, type: 'line', orient: 'h', w: clamp(el.w, 4, W, 200), thickness: clamp(el.thickness, 1, 20, 3) };
        default:
          return null;
      }
    })
    .filter(Boolean);

  const variables = (Array.isArray(raw?.variables) ? raw.variables : [])
    .slice(0, 12)
    .map((v) => ({ key: slug(v?.key), label: str(v?.label, 40) || slug(v?.key), default: str(v?.default, 40) }))
    .filter((v) => v.key);

  return {
    name: str(raw?.name, 60) || 'AI label',
    description: 'Generated with AI',
    width: W,
    height: H,
    dpi: 203,
    variables,
    elements,
  };
}

// ---- AI data mapping (Mistral) --------------------------------------------
// "Tell the AI to do it": given the data columns + the label's variables + a
// plain-English instruction, return a column→variable mapping, optional row
// filter, and copies.
export async function mapDataWithAI({ instruction, columns, variables }) {
  const text = await callAi({
    task: 'map',
    instruction,
    columns,
    variables: variables.map((v) => ({ key: v.key, label: v.label })),
  });
  const raw = extractJson(text);

  const mapping = {};
  if (raw.mapping && typeof raw.mapping === 'object') {
    for (const v of variables) if (columns.includes(raw.mapping[v.key])) mapping[v.key] = raw.mapping[v.key];
  }
  let filter = null;
  const OPS = ['equals', 'not_equals', 'contains', 'not_empty', 'gt', 'lt'];
  if (raw.filter && columns.includes(raw.filter.column)) {
    filter = { column: raw.filter.column, op: OPS.includes(raw.filter.op) ? raw.filter.op : 'not_empty', value: String(raw.filter.value ?? '') };
  }
  const quantity = Math.max(1, Math.min(50, parseInt(raw.quantity, 10) || 1));
  return { mapping, filter, quantity };
}

// ---- Claude via the Routine queue -----------------------------------------
// Drop a request; a Claude Code Routine fulfils it and writes back the design.
export async function enqueueClaudeDesign({ prompt, base, by = null, image = null }) {
  const row = {
    prompt: prompt || 'Design a label from the attached reference image.',
    base: { width: base?.width || 609, height: base?.height || 406 },
    provider: 'claude',
    requested_by: by,
    status: 'pending',
  };
  if (image) row.image = image; // base64 JPEG data URL — the Routine reads it as a file
  const { data, error } = await supabase.from('vista_label_ai_requests').insert([row]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchAiRequest(id) {
  const { data, error } = await supabase.from('vista_label_ai_requests').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

// Turn a completed request's raw result into a safe template.
export function templateFromRequest(req) {
  return sanitizeTemplate(req.result || {}, { width: req.base?.width || 609, height: req.base?.height || 406 });
}

// `image` (optional) is a data URL (e.g. "data:image/png;base64,...") the model
// uses as a visual reference. The /api/ai proxy picks a vision model when an
// image is present and a text model otherwise, trying all Mistral models.
export async function generateLabelDesign({ prompt, base, provider = 'mistral', image = null }) {
  const W = base?.width || 609;
  const H = base?.height || 406;

  const text = await callAi({ task: 'design', provider, prompt, base: { width: W, height: H }, image });
  const template = sanitizeTemplate(extractJson(text), { width: W, height: H });
  if (!template.elements.length) throw new Error('The AI returned an empty label — try describing it differently.');
  return template;
}
