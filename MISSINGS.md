# Missing Items — warehouse floor app

Lives at **`/missings`** on the Vista site. Staff open it on a phone, scan an
item, and immediately learn whether it's wanted.

The workflow is inverted on purpose. Instead of dispatching someone to hunt one
item, **every scan of anything becomes a check against the missing list**. Two
outcomes:

- **clear** — not on the list, move on
- **wanted** — on the list; show where it was last seen, price, who stacked it,
  when it was marked, plus live Vista detail

## What this replaces, and what it doesn't

The Google Sheet and its ~4,200 lines of Apps Script keep running and keep owning
the spreadsheet. This replaces only the floor-facing half. Out of scope:

- **Writing to Google Sheets.** Apps Script owns it. `sheet_tab` / `sheet_row` are
  read-only provenance.
- **The Slack List sync.** Apps Script owns it.
- **The Django-admin HTML scraping** that derives the approver field.

## Status

| # | Step | State |
|---|------|-------|
| 1 | Supabase schema + migrations + RLS + seed | applied to `vistastorage` |
| 2 | Auth and app shell | done |
| 3 | Manual VALPN lookup + Vista proxy | built — **needs credentials, see below** |
| 4 | Camera scanning | done |
| 5 | Offline cache + write queue + PWA | done |
| 6 | Found / not-found writeback | done |

## Vista credentials — the one thing that isn't wired

`/api/vista` is written and deployed, but it has no credentials, so lookups
return `vista_not_configured` and the verdict screen says so plainly. Everything
else works without it.

Set these in **Vercel → the `vistaauctioncareers` project → Settings →
Environment Variables**. They are read only inside the serverless function and
never reach the browser.

Two auth modes, cookie takes precedence:

```
# Cookie mode
VISTA_SESSION_COOKIE=<the full Cookie header value>

# or JWT mode — logs in once, then refreshes rather than re-logging-in
VISTA_API_USERNAME=<username>
VISTA_API_PASSWORD=<password>

# optional, defaults to https://api.vistaapp.tech/api/v1
VISTA_API_BASE_URL=
```

A cookie will eventually expire; when it does the proxy returns
`vista_cookie_expired` and the UI says the saved session needs refreshing rather
than showing a generic failure. JWT mode is self-healing and is the better
long-term choice.

**None of this has been exercised against the real Vista API** — no credentials
were ever available in the environment where it was written, and outbound access
to `api.vistaapp.tech` was blocked there. The proxy therefore reads every
response defensively (multiple candidate field names, tolerant of missing
history or orders) and degrades to partial data rather than failing. Expect to
adjust the field mapping in `lookup()` once you see real payloads.

## Layout

```
api/vista.js                        Vista proxy: staff-gated, cookie or JWT
src/pages/Missings.jsx              shell, auth gate, sync orchestration
src/components/missings/
  Verdict.jsx                       the verdict screen + resolve sheet
  ScanView.jsx                      live camera
  LookupView.jsx                    glove-sized keypad
  ListView.jsx                      open list
  StatusStrip.jsx                   connection / queue state
src/lib/missings/
  sync.js                           resolve scans, queue writes, flush
  db.js                             IndexedDB cache + write queue
  scanner.js                        BarcodeDetector + lazy ZXing
  vistaApi.js                       client for /api/vista
  missingsApi.js                    floor-schema queries
  valpn.js / location.js            normalizers (twins of the SQL functions)
  pwa.js                            manifest + service worker registration
public/missings/sw.js               service worker — SCOPED to /missings/
public/missings/manifest.webmanifest
supabase/migrations/                apply in filename order
supabase/seed.sql                   NOT a migration
```

## How offline works

The promise is that **a scan returns an answer with zero network**. Warehouse
Wi-Fi drops, and a worker holding an item cannot wait on a round trip that may
never complete.

- On load, the open list is mirrored into IndexedDB.
- Every scan resolves against that mirror — a keyed `get`, O(1), instant.
- Writes (found / not-found, and scan logs) go into a durable queue and flush on
  reconnect, triggered by the `online` event.
- Every queued write carries a `clientEventId` generated at the moment of the
  action. `mark_found` and `log_scan` both dedupe on it server-side, so a flush
  that succeeds but loses its response retries harmlessly.
- Resolving an item updates the local mirror **first**, so re-scanning it two
  seconds later doesn't claim it's still wanted.
- The status strip always states connection, staleness and queue depth. Hiding
  that would be the worst possible design here: someone marks ten items found,
  walks away, and never learns the writes didn't land.

The service worker caches the app shell and the hashed `/assets/*` bundles. It
**never** caches Supabase or `/api` responses — IndexedDB owns offline data, and
two competing caches would disagree.

### Service worker scope is load-bearing

`sw.js` lives at `/missings/sw.js`, so its scope is `/missings/`. The careers
site, HR portal, pickups and label tools are outside it and are never
intercepted. **Moving that file to the site root would silently put the entire
domain behind this cache.** The manifest and `theme-color` are likewise injected
only when the floor app mounts, so a careers visitor is never offered "Vista
Missing Items" as an install.

## Scanning

`BarcodeDetector` where available — native, hardware-accelerated. ZXing as the
fallback, loaded by dynamic import so it is a separate 454KB chunk: a careers
visitor never downloads a barcode decoder, and even here it only loads if the
native detector is missing. The whole floor app is `React.lazy`'d for the same
reason.

Same-code repeats within 2.5s are ignored while a *different* code passes
through instantly, so scanning two items back to back stays fast. The camera is
released whenever a verdict is showing — a device has to last a whole shift.

Torch is exposed where the hardware supports it. An aisle at 6am needs it.

## Design

The brief is an **industrial instrument panel**, not a website: one gloved hand,
bad overhead light, read at arm's length, unreliable Wi-Fi. Every rule follows
from that.

- **Type**: Oswald (condensed signage gothic — what racking labels and safety
  signs are actually set in), Roboto Mono with tabular figures for every VALPN
  and location, Roboto Condensed for UI. All three are **already loaded** by
  `index.css` for the label studio, so the floor app costs zero extra font
  network — which matters when the premise is bad Wi-Fi. Fallbacks are specified
  and hold up.
- **Colour**: near-black instrument housing, hairline rules, and three saturated
  signal colours from warehouse safety signage. Verdict colours clear 7:1.
- **The verdict is the product**, so it takes the whole screen. Clear
  auto-dismisses after 1.8s with a countdown bar — it's the ~95% case and must
  cost nothing. Wanted persists and requires a decision.
- **Haptics** carry the verdict before the eyes do: one short buzz for clear, an
  urgent triple for wanted.
- **Never colour alone** — the two outcomes differ in word, icon, and how long
  they persist. Nav active state is a bar plus colour.
- **56px minimum** on everything interactive; the keypad is 68px. Buttons press
  down mechanically with a collapsing shadow, so feedback survives a glove.
- `prefers-reduced-motion` is respected.

Tokens are namespaced `floor.*` and CSS classes `.fl-*`, scoped under
`.fl-scope`, so nothing can leak into the careers palette.

> **`tailwind.config.js` had `fontFamily`, `animation` and `keyframes` declared
> twice.** In a JS object literal the later key silently wins, so one set was
> being dropped. They are now merged into single blocks — don't re-add a second
> declaration.

## Database

Applied to `lovfbqnuxdihjidxacet`: all three migrations (5 tables, 1 view, 11
policies, 14 functions, RLS on everything), plus `seed.sql` sections 1 and 2.
Section 3 (fake items) was deliberately not applied.

| Section | Contents | Prod-safe? | Applied? |
|---|---|---|---|
| 1 | Staff bootstrap | Yes | yes |
| 2 | Aisle map + camera IDs | Placeholder — replace with the real Sardis layout | yes |
| 3 | Fake missing items | **No.** Dev only | no |

## Security model

**A session is not authorization.** Supabase Auth will create an account for any
email address, so access requires an active row in `floor.staff` — checked in the
page for UX, by every RLS policy for real, and again inside `/api/vista` before
it will spend a Vista call on you.

`/api/vista` verifies the caller with their **own** access token under RLS rather
than `service_role`, so a forged or expired token simply returns nothing.
Using `service_role` there would bypass the policy that makes it safe.

This shares one Supabase identity with the HR portal — same project, same browser
session. Deliberate: one person, one login. Authorization stays separate, because
HR needs a `vista_employees` row and floor needs `floor.staff`, and neither
implies the other. Signing out of one signs out of both, and signing out clears
the local mirror so one person's list doesn't survive onto the next shift's phone.

| Role | Reach |
|---|---|
| `anon` | Nothing. No schema usage, no grants, no policies |
| authenticated, not on the roster | Nothing. Zero rows from every table |
| active staff | Read `missings` / `locations` / `item_media`; append own `scan_events` |
| lead | Also reads everyone's `scan_events` |
| admin | Also manages `locations` and the roster |
| `service_role` | Bypasses RLS. Apps Script ingest and the future media agent only |

### Why `mark_found()` instead of an UPDATE policy

Postgres RLS cannot restrict *which columns* an `UPDATE` touches, so rather than
lean on a predicate to keep staff out of `sold_price` or `sheet_row`,
`authenticated` has **no UPDATE grant on `floor.missings` at all**. Writeback
goes through `floor.mark_found()` and nothing else, which also means `found_by`
comes from the session rather than the request body.

RLS on `UPDATE` does not raise — it silently matches zero rows. Any admin UI
built later must check the affected row count rather than assume success.

## Schema notes

**`missings.valpn` is UNIQUE, and that's load-bearing.** The old system filed
duplicates; this makes a second row for the same item impossible at the database
level. Normalization runs in a trigger too, so `valpn- 10045821`, `10045821` and
`VALPN-10045821` all collide as they should.

**Normalization is deliberately duplicated** between SQL and JS — the client copy
because a scan must resolve with zero network, the database copy so nothing
malformed can be written by a caller that skips the app. Change one, change both.

**`facts_at`** records when Vista was last queried, so an enrichment pass can skip
rows that are already fresh.

**`item_media` is designed, not built.** The NVR is LAN-only, so an on-prem agent
will push using `service_role`. The table, the private bucket and the read-side
RLS exist; the agent does not.

**`scan_events` logs every scan including misses.** Misses are the majority and
are the point. Append-only.

## Manual dashboard steps

1. Supabase → Settings → API → **Exposed schemas** → add `floor`. Nothing works
   without it; the app detects this specific failure and names the fix.
2. Supabase → Authentication → **Redirect URLs** → `https://vistaauction.vercel.app/missings`

## Open question

How `floor.missings` gets populated. `sheet_tab` / `sheet_row` imply rows
originate from the Apps Script day-tabs, so this is designed for the Apps Script
pushing to Supabase with `service_role` (bypasses RLS, no policy needed). That
direction is still unconfirmed.
