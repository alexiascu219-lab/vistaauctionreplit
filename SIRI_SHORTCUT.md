# Siri → Vista Print Station

Two ways to print by voice. Build either (or both) in the iOS **Shortcuts** app.

Base URL: `https://vistaauction.vercel.app`
If you set `PRINT_API_KEY` in Vercel, add header `x-api-key: <key>` to every request. If it's unset, the endpoints are open (fine for first-run).

---

## A) Guided shortcut — "Print a label"
Asks, in order: **which label → how many → each field the label needs**, then prints.
The fields change automatically per label (a cart tag asks for the cart; a warehouse tag asks Area/Aisle/Rack/Level/Position).

**APIs**
- `GET /api/templates` → `{ names:[…], templates:[{ name, variables:[{key,label,default}] }] }`
- `POST /api/print` → `{ template, quantity, data:{ <key>:<value>… } }` → renders that label's ZPL server-side and queues it. Returns `{ spoken }` for Siri to read back.

**Build it**
1. **Get Contents of** `…/api/templates` (GET).
2. **Get Dictionary Value** `names` → **Choose from List** ("Which label?") → save as **Label**.
3. **Ask for Input** — "How many?" (Number, default 1) → save as **Qty**.
4. **Get Dictionary Value** `templates` → **Find** where `name` is **Label** → **Get Dictionary Value** `variables` → **Repeat with Each**:
   - **Ask for Input** — prompt = current item's `label`, default = current item's `default`.
   - **Set Dictionary Value** on a dictionary **Data**: key = current item's `key`, value = the answer.
5. **Get Contents of** `…/api/print` — POST, JSON body: `template` = **Label**, `quantity` = **Qty**, `data` = **Data**.
6. **Get Dictionary Value** `spoken` → **Speak**.

Trigger: *"Hey Siri, print a label."*

---

## B) Natural-language command — "Print labels" (the powerful one)
Say one sentence and it figures out the label, the filters, how many, and whether to pull from your spreadsheet. Examples that work:

- *"Print cart labels for **Aisle 12 Rack 3** for **all levels and positions** **from the google sheet**."*
  → pulls every row in the sheet where Aisle = 12 and Rack = 3 (every level/position) and prints each.
- *"Print **3** warehouse labels for **Area CLT1 Aisle 8 Rack 13 Level 1 Position C**."*
  → one specific label, 3 copies (no sheet needed).
- *"Print **cart 302**."*

**API**
- `POST /api/print-command` → `{ text: "<the spoken sentence>", sheet?: "<google sheet url>" }`
  → `{ ok, count, template, filters, spoken }`

It parses the sentence for the label type, field filters (Area/Aisle/Rack/Level/Position/Cart…), quantity, and whether a sheet is referenced. "all/every <field>" means *don't* filter that field. It auto-picks the template whose fields best match, renders each matching row's ZPL, and queues them.

**Build it**
1. **Dictate Text** (or **Ask for Input** as Text) → save as **Command**.
2. **Get Contents of** `…/api/print-command` — POST, JSON body: `text` = **Command** (and `sheet` = your Google Sheet URL, unless you set it once in Vercel — see below).
3. **Get Dictionary Value** `spoken` → **Speak**.

Trigger: *"Hey Siri, print labels."* → then say the full command.

**Spreadsheet setup (once):** share your Google Sheet as **"anyone with the link – Viewer,"** then either
- set `LOCATIONS_SHEET_URL` in Vercel to the sheet URL (then the shortcut only sends `text`), or
- pass the URL as `sheet` in the shortcut body.

The sheet's header row should have columns named like the label's fields (Area, Aisle, Rack, Level, Position). Matching is by name and case-insensitive.

---

## Notes
- Both endpoints render the label's ZPL on the server, so the Print Station prints any design verbatim.
- Errors come back as JSON `{ error }` (e.g. missing a required field, or no rows matched) — you can **Speak** `error` too.
- Row cap per command: 500.
