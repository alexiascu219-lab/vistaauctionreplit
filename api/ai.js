import { generateText } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { createAnthropic } from '@ai-sdk/anthropic';

// ============================================================================
// /api/ai — server-side AI proxy for Label Studio (Mistral + Claude).
//   POST { task:'design', provider?, prompt, base:{width,height}, image? } -> { text }
//   POST { task:'map', instruction, columns, variables }                   -> { text }
//
// provider: 'mistral' (default) or 'claude'. Keys live ONLY here, read from
// server env vars, so they never ship to the browser or the repo:
//   MISTRAL_API_KEY   for Mistral / Pixtral
//   ANTHROPIC_API_KEY for Claude
// ============================================================================

export const config = { maxDuration: 60 };

// Ordered fallback chains — every model we'll try, best first.
const VISION_MODELS = ['pixtral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'pixtral-12b-2409'];
const TEXT_MODELS = ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-nemo', 'open-mixtral-8x22b'];
const CLAUDE_MODELS = ['claude-sonnet-5', 'claude-haiku-4-5-20251001', 'claude-3-5-sonnet-latest'];

const designSystem = (W, H) => `You design thermal labels for a Zebra printer and output ONLY JSON.

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

const mapSystem = `You configure a label mail-merge. Given spreadsheet COLUMNS and the label's VARIABLES, map each variable to the best-matching column, optionally set a row filter, and set copies per row.
Return ONLY JSON, no prose:
{"mapping":{"<variableKey>":"<columnName>"},"filter":{"column":"<columnName>","op":"equals|not_equals|contains|not_empty|gt|lt","value":"<value>"}|null,"quantity":int}
Use only column names from COLUMNS and variable keys from VARIABLES. Use null for filter when none is needed.`;

async function runModels(mistral, ids, opts) {
  let lastErr = null;
  for (const id of ids) {
    try {
      const { text } = await generateText({ model: mistral(id), ...opts });
      return text;
    } catch (e) {
      lastErr = e;
    }
  }
  const detail = lastErr?.data?.error?.message || lastErr?.responseBody || lastErr?.message || String(lastErr);
  throw new Error(String(detail).slice(0, 300));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const task = body.task || 'design';
  const provider = body.provider === 'claude' ? 'claude' : 'mistral';

  // Pick the provider + credentials for this request.
  const mistralKey = process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    if (task === 'map') {
      if (!mistralKey) return res.status(500).json({ error: 'MISTRAL_API_KEY is not set on the server.' });
      const mistral = createMistral({ apiKey: mistralKey });
      const columns = Array.isArray(body.columns) ? body.columns : [];
      const variables = Array.isArray(body.variables) ? body.variables : [];
      const prompt = `COLUMNS: ${JSON.stringify(columns)}\nVARIABLES: ${JSON.stringify(variables)}\nINSTRUCTION: ${body.instruction || ''}`;
      const text = await runModels(mistral, TEXT_MODELS, { system: mapSystem, prompt, temperature: 0.2 });
      return res.status(200).json({ text });
    }

    // task === 'design'
    const W = body.base?.width || 609;
    const H = body.base?.height || 406;
    const image = body.image || null;
    const ask = `Design a label: ${body.prompt || 'based on the attached reference image'}`;
    const messages = image
      ? [{ role: 'user', content: [
          { type: 'text', text: `${ask}\n\nUse the attached image as a visual reference for the layout, style, and wording. Recreate it as a printable Zebra label — do not copy it pixel-for-pixel.` },
          { type: 'image', image },
        ] }]
      : [{ role: 'user', content: ask }];

    if (provider === 'claude') {
      if (!anthropicKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server.' });
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      const text = await runModels(anthropic, CLAUDE_MODELS, { system: designSystem(W, H), messages, temperature: image ? 0.4 : 0.5 });
      return res.status(200).json({ text });
    }

    if (!mistralKey) return res.status(500).json({ error: 'MISTRAL_API_KEY is not set on the server.' });
    const mistral = createMistral({ apiKey: mistralKey });
    const text = await runModels(mistral, image ? VISION_MODELS : TEXT_MODELS, {
      system: designSystem(W, H),
      messages,
      temperature: image ? 0.4 : 0.5,
    });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: `${provider === 'claude' ? 'Claude' : 'Mistral'} error: ${e.message}` });
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
