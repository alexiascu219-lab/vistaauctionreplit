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
The current label is ${W} × ${H} dots. Use that size UNLESS the request implies a different shape — then choose an appropriate width/height and set them in the output.
Sizing (dots at 203 dpi): 1"=203, 2"=406, 3"=609, 4"=812, 6"=1218, 8"=1624. Keep width and height between 120 and 2400.
- "long" / "strip" / "shelf" → make it much longer on one axis (e.g. 812×203 for a 4×1 long label, or 1726×406 for a long 8.5×2 strip).
- "tall" → larger height; "wide" → larger width; "square" → equal width and height.
Whatever size you choose, keep every element fully inside those bounds.

Element types (each is an object in "elements"):
- text:    { "type":"text", "x":int, "y":int, "size":int, "value":string,
             "font"?:"0"|"archivo"|"fraunces",   // archivo = bold industrial display (great for big numbers), fraunces = serif, 0 = clean sans
             "align"?:"left"|"center"|"right", "w"?:int,   // for align to work, set "w" = the block width the text centers/right-aligns within
             "rotation"?:"N"|"R"|"I"|"B",         // N=0°, R=90°, I=180°, B=270°
             "inverse"?:bool }                    // white text on a solid black block (badges like SOLD)
- barcode: { "type":"barcode", "x":int, "y":int, "height":int, "module":int, "symbology":"code128"|"code39"|"qr", "showText":bool, "value":string }   // qr: module≈6-10 sets size; code128/39: height in dots
- box:     { "type":"box", "x":int, "y":int, "w":int, "h":int, "thickness":int, "rounding"?:int(0-8) }
- ellipse: { "type":"ellipse", "x":int, "y":int, "w":int, "h":int, "thickness":int }   // circle when w==h
- line:    { "type":"line", "x":int, "y":int, "w":int, "thickness":int, "orient":"h" }  (or "orient":"v" with "h":int)
- arrow:   { "type":"arrow", "x":int, "y":int, "w":int, "h":int, "thickness":int, "dir":"up"|"down"|"left"|"right" }

Design like a senior label designer — clean, scannable, professional:
- Put anything that changes per label as a \${key} placeholder inside a text/barcode "value" (e.g. "CART \${cart_number}"), and list every such key in "variables".
- Establish clear hierarchy: ONE dominant value (large, "font":"archivo"), supporting labels smaller (~24-34 dots).
- ALIGN things: share x/edges across related elements; center multi-field values by giving each a "w" and "align":"center". Group with a "box"; separate fields with vertical "line" dividers.
- For multi-field IDs (e.g. warehouse Area/Aisle/Rack/Level/Position), lay fields left→right with dividers and a small caption under each; add an "arrow" for directional cues.
- Add a "qr" (or code128) whenever there's a scannable ID; a QR can encode a composite like "\${area}-\${aisle}-\${rack}".
- Keep consistent margins (≥18 dots), don't overlap important elements, and respect the bounds.
- Brand text can be "VISTA AUCTION".

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
    // When editing, the caller passes the current design so the model refines it
    // instead of starting over.
    const current = body.current && Array.isArray(body.current.elements) ? body.current : null;
    const editNote = current
      ? `\n\nHere is the CURRENT design as JSON. MODIFY it to satisfy the request — keep what works, change only what's needed, and return the FULL updated design JSON:\n${JSON.stringify({ width: current.width || W, height: current.height || H, variables: current.variables || [], elements: current.elements })}`
      : '';
    const ask = `${current ? 'Edit this label' : 'Design a label'}: ${body.prompt || 'based on the attached reference image'}${editNote}`;
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
