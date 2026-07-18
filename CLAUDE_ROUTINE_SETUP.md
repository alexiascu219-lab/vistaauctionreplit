# Claude label design — Routine setup

> The **Claude** button in Label Studio runs through this Routine — it designs
> using your **claude.ai subscription** (no API key, no per-call billing), and it
> can see a reference image. **Mistral** is the instant, in-browser alternative
> (server-side `/api/ai`). An optional direct-Anthropic-API path also exists in
> `/api/ai` (`ANTHROPIC_API_KEY`) if you ever want instant Claude via a paid key,
> but it's off unless that key is set and the UI is pointed at it.

---


Label Studio's **Claude** option doesn't call an Anthropic API. Instead it drops
a design request into a Supabase table (`vista_label_ai_requests`), and a
**Claude Code Routine** — running as *you* — picks it up, designs the label, and
writes it back. The Studio then loads the finished design into the canvas.

Everything on the app side is built. You just create the Routine once.

## Why it must be created from the claude.ai Routines UI

The Routine needs to read/write the Supabase table. In the Claude Code runtime,
direct network calls to `supabase.co` are blocked by the environment's network
policy — so the Routine must use the **Supabase connector** (MCP), which goes
through Anthropic's control plane instead of the blocked network. Connectors can
only be attached to a Routine from the **claude.ai → Routines** UI, so that's
where this one gets created.

## Create it (once)

1. Go to **claude.ai → Routines → New Routine**.
2. **Connectors:** enable **Supabase**.
3. **Schedule:** pick the **most frequent** option the UI offers (e.g. every 15
   min) so requests are picked up quickly — or fire it on demand (see below).
4. **Prompt:** paste this exactly:

```
You are the Vista Auction Label Studio AI worker. Be fast and decisive; never
ask questions. Use the Supabase tools (project lovfbqnuxdihjidxacet).

1. Claim pending work in one query:
   execute_sql:
     UPDATE vista_label_ai_requests SET status='processing', updated_at=now()
     WHERE id IN (SELECT id FROM vista_label_ai_requests WHERE status='pending'
                  ORDER BY created_at ASC LIMIT 5)
     RETURNING id, prompt, base, image;
   If it returns no rows, stop immediately.

2. For EACH returned row, design a Zebra thermal label as a JSON object.
   - If "image" is set, it is a base64 JPEG data URL. LOOK AT IT: strip the
     "data:...;base64," prefix, run in Bash
       echo '<BASE64>' | base64 -d > /tmp/ref.jpg
     then use the Read tool on /tmp/ref.jpg and recreate that reference as a
     printable label (layout, wording, barcodes) — do not copy pixel-for-pixel.
   - Coordinates are DOTS at 203 dpi; origin top-left; x right, y down.
     Label size is base.width x base.height dots (default 609 x 406); keep every
     element inside those bounds.
   Element types (objects in "elements"):
   - {"type":"text","x":int,"y":int,"size":int,"value":str}  (size = char height in dots)
   - {"type":"barcode","x":int,"y":int,"height":int,"module":int,"symbology":"code128"|"code39"|"qr","showText":bool,"value":str}
   - {"type":"box","x":int,"y":int,"w":int,"h":int,"thickness":int}
   - {"type":"line","x":int,"y":int,"w":int,"thickness":int,"orient":"h"}  (or "orient":"v" with "h":int)
   Put per-label values as ${key} placeholders in text/barcode "value" and list
   each key in "variables". Brand text may be "VISTA AUCTION". Favor one dominant
   large number/text, a title, and a barcode when an ID is involved.
   The design object must be exactly:
   {"name":str,"width":int,"height":int,"variables":[{"key":str,"label":str,"default":str}],"elements":[...]}

3. Write it back (execute_sql), embedding the compact JSON as a jsonb literal:
   UPDATE vista_label_ai_requests
   SET status='done', result='<DESIGN_JSON>'::jsonb, updated_at=now()
   WHERE id='<ID>';
   If you cannot design one:
   UPDATE vista_label_ai_requests SET status='error', error='<short reason>', updated_at=now() WHERE id='<ID>';

Process every claimed row, then stop.
```

> The claim-in-one-query step (`pending` → `processing`) means overlapping runs
> won't fight over the same rows, so you can schedule it aggressively.

## Using it

- In **Label Studio → Design**, pick **Claude**, type your prompt (and/or
  **Add reference image** — Claude will see it), hit **Send to Claude**. The
  request is queued and the panel shows "Claude is drafting via your Routine…".
  When the Routine runs and fills it in, the design loads into the canvas
  automatically (while the page is open; the Studio now polls every ~2s).
- **Speed:** the floor is how often the Routine runs. Set the schedule to the
  most frequent option, or — for an immediate result — open the Routine in
  claude.ai and **Run now** right after sending; it processes the queue in well
  under a minute. The app itself picks the result up within a couple seconds.
- **Mistral** (the other option) is a direct browser call and is always instant,
  and also accepts a reference image (via Pixtral) — use it when you want a draft
  right away.

## Table reference

`vista_label_ai_requests` — `label_ai_requests_schema.sql` (already applied):
`prompt`, `base {width,height}`, `image` (optional base64 JPEG data URL),
`status` (pending → processing → done/error), `result` (the design),
`requested_by`.
