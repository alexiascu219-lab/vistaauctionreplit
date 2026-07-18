# Cart Location Tracking + Siri Sticker Printing

Two connected systems for the warehouse floor:

1. **Cart Yard** (`/carts`) — a live board that tracks every cart between the
   **Inside area** and the **Outside carts area**.
2. **Siri → Zebra printing** — queue a cart sticker by voice (or one tap on the
   board) and a Zebra printer prints it.

---

## Cart Yard — `/carts`

A shared, kiosk-style board in the same "Atelier Light" style as the Pickups
portal. Open `/carts` on any tablet or phone on the floor.

- **Two areas, at a glance.** Inside (warm) and Outside (cool) sit side by side,
  each with a live cart count and its own atmosphere so you instantly know where
  a cart is.
- **One-tap moves.** Every cart tile has a **⇄** button that flips it to the
  other area instantly, with a 5-second **Undo**. Tap the tile itself for the
  full sheet: exact spot, condition (Ready / Needs attention / Out of service),
  print, or remove.
- **Who moved it.** Optionally set "On carts: *name*" (pulled from the same
  employee roster as Pickups) so every move is logged to a name.
- **Live activity feed** of recent moves, and **live sync** across every station
  via Supabase Realtime.
- **Search** by cart number or spot.

### First-time setup

1. Run **`cart_tracking_schema.sql`** in the Supabase SQL editor. It creates the
   tables, the move/add RPCs, and seeds carts 1–10 so the board isn't empty.
2. Open **`/carts`**. That's it.

Data model (see the SQL for details):

- `vista_carts` — one row per cart holding its current `zone` + `spot` + `status`.
- `vista_cart_events` — append-only log of every move/add/status/print.
- Writes go through `carts_add`, `carts_move`, `carts_set_status`, `carts_remove`
  RPCs so the board and history never drift apart.

---

## Siri → Zebra sticker printing

Say **"Hey Siri, print cart sticker,"** give a number, and the Zebra by your
desk prints it. Or tap **Print sticker** on any cart, or **Print again** in the
Print Queue panel.

How it flows:

```
Siri / Cart board  ─►  print queue (Supabase)  ─►  print agent on the Zebra PC  ─►  🖨️
```

- **`api/print.js`** — `POST` queues a job (Siri), `GET` lets the agent claim jobs.
- **`api/print-complete.js`** — the agent reports each job printed / failed.
- **`print-agent/`** — a tiny zero-dependency Node app that runs on the Windows
  PC next to the printer. Supports three modes: send ZPL to the printer's IP
  (recommended), print through the installed Windows driver, or hand off to
  **ZebraDesigner Automation** so it prints *your* designed label.
- **Print Queue panel** on `/carts` shows every job: queued → printing → printed,
  with re-print and cancel.

### Full setup

Everything — server secrets, installing the agent, keeping it running, using
your ZebraDesigner Professional label, and building the **Siri Shortcut** — is
in **[`print-agent/README.md`](print-agent/README.md)**.

Quick version:

1. Run **`print_jobs_schema.sql`** in Supabase.
2. Set `PRINT_API_KEY` and `PRINT_AGENT_KEY` on your host (Vercel) and redeploy.
3. On the Zebra PC: install Node, copy `print-agent/`, fill in `config.json`,
   run `node agent.mjs`.
4. Build the Siri Shortcut (README §4) pointing at `https://YOUR-SITE/api/print`.

---

## Files added

| Area | Files |
| --- | --- |
| Database | `cart_tracking_schema.sql`, `print_jobs_schema.sql` |
| Config / API | `src/config/cartsConfig.js`, `src/lib/cartsApi.js` |
| Board UI | `src/pages/Carts.jsx`, `src/components/carts/*` |
| Print API | `api/print.js`, `api/print-complete.js` |
| Print agent | `print-agent/` (agent, ZPL template, PowerShell helper, README) |
| Route | `/carts` wired in `src/App.jsx` |
