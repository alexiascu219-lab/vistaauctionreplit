import { generateText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';

// AI label design generation. Matches the app's existing browser-side Mistral
// setup (src/utils/aiService.js). The model returns a label design as JSON,
// which we then sanitise hard before letting it near the canvas.

const mistralModel = () => {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
  if (!apiKey) throw new Error('Add VITE_MISTRAL_API_KEY to use AI generation.');
  return createMistral({ apiKey })('mistral-large-latest');
};

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

export async function generateLabelDesign({ prompt, base, provider = 'mistral' }) {
  const W = base?.width || 609;
  const H = base?.height || 406;
  if (provider !== 'mistral') throw new Error('Only Mistral is wired up right now.');

  const { text } = await generateText({
    model: mistralModel(),
    system: systemPrompt(W, H),
    prompt: `Design a label: ${prompt}`,
    temperature: 0.5,
  });
  const template = sanitizeTemplate(extractJson(text), { width: W, height: H });
  if (!template.elements.length) throw new Error('The AI returned an empty label — try describing it differently.');
  return template;
}
