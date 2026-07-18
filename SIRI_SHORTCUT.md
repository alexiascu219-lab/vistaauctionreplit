# Siri → Vista Print Station

Two ways to print by voice. Build either (or both) in the iOS **Shortcuts** app.

Base URL: `https://vistaauction.vercel.app`
If you set `PRINT_API_KEY` in Vercel, add header `x-api-key: <key>` to every
request (Get Contents of URL → Show More → Headers). If it's unset, the
endpoints are open (fine for first-run).

> **You must build these by hand in the Shortcuts app.** Apple no longer lets you
> import an unsigned `.shortcut` file, so a downloadable file won't open — the
> steps below are the way in.

---

## A) Guided shortcut — "Print a label" (menu-driven, asks each thing)
Uses **Choose from Menu** to pick the label, then asks each field, how many
copies, and — for warehouse labels — lets you say **all** for level/position to
print every one from the spreadsheet.

**API used:** `POST /api/print-command` accepts a *structured* body:
`{ template, quantity, data:{ <field>:<value>… }, useSheet }`. Any field left
blank or set to **all** / **every** / **any** / **\*** is not filtered — with
`useSheet:true` it expands to every matching row in your sheet. Returns
`{ ok, count, spoken }` for Siri to read back.

**Build it**
1. Add **Choose from Menu** — prompt "What are you printing?" with items:
   **Cart tag**, **Warehouse location**.
2. **Under "Cart tag":**
   - **Ask for Input** (Text) — "Cart number?" 
   - **Ask for Input** (Number, default 1) — "How many copies?"
   - **Get Contents of** `…/api/print-command` — POST, header `x-api-key`, JSON body:
     `template` = `Vista cart sticker`, `quantity` = the copies answer,
     `data` = a Dictionary with `cart_number` = the cart-number answer.
   - **Get Dictionary Value** `spoken` → **Speak**.
3. **Under "Warehouse location":**
   - **Ask** (Text) "Area?" · "Aisle?" · "Rack?" · "Level? (say ALL for every level)" · "Position? (say ALL for every position)"
   - **Ask** (Number, default 1) "How many copies of each?"
   - **Get Contents of** `…/api/print-command` — POST, header `x-api-key`, JSON body:
     `template` = `Warehouse location`, `quantity` = copies, `useSheet` = `true` (Boolean),
     `data` = a Dictionary with `area`,`aisle`,`rack`,`level`,`position` = each answer.
   - **Get Dictionary Value** `spoken` → **Speak**.

Say **all** for level and position (with a couple of fixed fields like aisle/rack)
and it prints every matching spot from the sheet. Give every field a real value
and it prints that one label (× copies).

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
