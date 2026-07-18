import { generateText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { supabase } from '../supabaseClient';

// AI label design generation. Matches the app's existing browser-side Mistral
// setup (src/utils/aiService.js). The model returns a label design as JSON,
// which we then sanitise hard before letting it near the canvas.

// Mistral Large for text prompts; Pixtral (vision) when a reference image is
// attached, so the model can actually look at the picture.
const mistralModel = (model = 'mistral-large-latest') => {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
  if (!apiKey) throw new Error('Add VITE_MISTRAL_API_KEY to use AI generation.');
  return createMistral({ apiKey })(model);
};

// Ordered fallback chains — every Mistral model we'll try, best first.
// Vision-capable models handle a reference image; the rest are text-only.
const VISION_MODELS = ['pixtral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'pixtral-12b-2409'];
const TEXT_MODELS = ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-nemo', 'open-mixtral-8x22b'];

const systemPrompt = (W, H) => `You design thermal labels for a Zebra printer and output ONLY JSON.

Coordinates are in DOTS at 203 dpi. Origin is the top-left; x increases to the right, y increases downward.
The label is ${W} dots wide and ${H} dots tall. Keep every element fully inside those bounds.

Element types (each is an object in "elements"):
- text:    { "type":"text", "x":int, "y":int, "size":int, "value":string }   (size = character height in dots, ~24 small, ~160 huge)
- barcode: { "type":"barcode", "x":int, "y":int, "height":int, "module":int, "symbology":"code128"|"code39"|"qr", "showText":bool, "value":string }
- box:     { "type":"box", "x":int, "y":int, "w":int, "h":int, "thickness":int }
- line:    { "type":"line", "x":int, "y":int, "w":int, "thickness":int, "orient":"h" }  (or "orient":"v" with "h":int for a vertical line)

Rules:
- Put anything that changes per label as a \${key} placeholder inside a text/barcode "value" (e.g. "CART \${cart_number}"), and list every such key in "variables".
- Prefer one dominant large number/text, a title, and a barcode when an ID is involved.
- Brand text can be "VISTA AUCTION".
- Do not overlap important elements; leave small margins.

Return ONLY this JSON object, no prose, no code fences:
{ "name": string, "width": ${W}, "height": ${H}, "variables": [{ "key":string, "label":string, "default":string }], "elements": [ ... ] }`;

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
  const sys = `You configure a label mail-merge. Given spreadsheet COLUMNS and the label's VARIABLES, map each variable to the best-matching column, optionally set a row filter, and set copies per row.
Return ONLY JSON, no prose:
{"mapping":{"<variableKey>":"<columnName>"},"filter":{"column":"<columnName>","op":"equals|not_equals|contains|not_empty|gt|lt","value":"<value>"}|null,"quantity":int}
Use only column names from COLUMNS and variable keys from VARIABLES. Use null for filter when none is needed.`;
  const prompt = `COLUMNS: ${JSON.stringify(columns)}\nVARIABLES: ${JSON.stringify(variables.map((v) => ({ key: v.key, label: v.label })))}\nINSTRUCTION: ${instruction}`;
  const { text } = await generateText({ model: mistralModel(), system: sys, prompt, temperature: 0.2 });
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
// uses as a visual reference. With an image we call Pixtral (vision); without
// one, Mistral Large.
export async function generateLabelDesign({ prompt, base, provider = 'mistral', image = null }) {
  const W = base?.width || 609;
  const H = base?.height || 406;
  if (provider !== 'mistral') throw new Error('Only Mistral is wired up right now.');

  const ask = `Design a label: ${prompt || 'based on the attached reference image'}`;
  const messages = image
    ? [{ role: 'user', content: [
        { type: 'text', text: `${ask}\n\nUse the attached image as a visual reference for the layout, style, and wording. Recreate it as a printable Zebra label — do not copy it pixel-for-pixel.` },
        { type: 'image', image },
      ] }]
    : [{ role: 'user', content: ask }];

  // Try Mistral models in order until one succeeds — vision-capable models for
  // an image, the strongest text models otherwise. Whatever the account can
  // reach wins; the rest are graceful fallbacks.
  const candidates = image ? VISION_MODELS : TEXT_MODELS;
  let text;
  let lastErr = null;
  for (const id of candidates) {
    try {
      ({ text } = await generateText({
        model: mistralModel(id),
        system: systemPrompt(W, H),
        messages,
        temperature: image ? 0.4 : 0.5,
      }));
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) {
    const detail = lastErr?.data?.error?.message || lastErr?.responseBody || lastErr?.message || String(lastErr);
    throw new Error(`${image ? 'Pixtral (image)' : 'Mistral'} error: ${String(detail).slice(0, 300)}`);
  }
  const template = sanitizeTemplate(extractJson(text), { width: W, height: H });
  if (!template.elements.length) throw new Error('The AI returned an empty label — try describing it differently.');
  return template;
}
