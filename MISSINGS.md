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
| 3 | Manual VALPN lookup + Vista proxy | **working** — cookie authenticating in production |
| 4 | Camera scanning | done |
| 5 | Offline cache + write queue + PWA | done |
| 6 | Found / not-found writeback | done |

## Vista credentials

`/api/vista` is live and authenticating: a production lookup returned 200 with
Vista JSON, confirmed in the runtime logs. Configure via the env vars below.

Set these in **Vercel → the `vistaauctioncareers` project → Settings →
Environment Variables**. They are read only inside the serverless function and
never reach the browser.

Two auth modes, cookie takes precedence:

```
# Cookie mode — accepts EITHER form:
#   sessionid=.eJx...   a full Cookie header, used verbatim
#   .eJx...             a bare Django session value, wrapped for you
VISTA_SESSION_COOKIE=
VISTA_SESSION_COOKIE_NAME=   # optional, defaults to "sessionid"

# or JWT mode — logs in once, then refreshes rather than re-logging-in
VISTA_API_USERNAME=<username>
VISTA_API_PASSWORD=<password>

# optional, defaults to https://api.vistaapp.tech/api/v1
VISTA_API_BASE_URL=
```

**Cookie mode is a bridge, not a solution.** A Django session cookie expires on
Django's `SESSION_COOKIE_AGE` — two weeks by default, counted from when it was
issued, not from when you paste it. When it dies the proxy returns
`vista_cookie_expired` and the UI says the saved session needs refreshing rather
than showing a generic failure, but somebody has to go and refresh it by hand.
JWT mode is self-healing. Prefer it.

Two failure modes specific to session auth are handled explicitly, because both
would otherwise produce a **silent wrong answer** rather than an error:

- Django answers an unauthenticated request with a **302 to the login page**. The
  proxy uses `redirect: 'manual'` and treats any 3xx as an auth failure, instead
  of following it and parsing the login HTML as "no such product".
- A **200 that isn't JSON** is almost always that same login page rendered in
  place of the resource, so a non-JSON content-type is treated as an auth
  failure too.

If the cookie was issued by `app.vistaapp.tech` rather than `api.vistaapp.tech`,
it will only authenticate against `api.` if the cookie's domain covers both. If
lookups come back as `vista_cookie_expired` with a cookie you know is fresh,
point `VISTA_API_BASE_URL` at the host that actually issued it.

Authentication is confirmed working. The **field mapping is not** — it has only
ever seen a "no such product" response, never a populated one. The proxy reads
every response defensively (multiple candidate field names, tolerant of missing
history or orders) and degrades to partial data rather than failing, but expect
to adjust `lookup()` once a real product comes back.

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

The register is **an auction house's operations tool**. Vista sells at auction,
so the reference is a saleroom catalogue — restraint, deep neutrals, an editorial
serif, precious-metal accents — not a hazard placard.

An earlier pass got this wrong: fluorescent safety colours flooded edge to edge,
condensed all-caps everywhere, 3px offset shadows on every button. It read cheap.
What changed:

- **Colour arrives as type on a dark ground**, not as saturated fills. The
  verdict fields are deep (forest, bronze) with luminous type on them, rather
  than fluorescent walls with dark text.
- **Type**: Fraunces — a high-contrast editorial serif — reserved strictly for
  display moments (the verdict word, screen titles). Archivo carries everything
  functional. Roboto Mono with tabular figures for every VALPN, location and
  price. All three are **already loaded** by `index.css` for the label studio, so
  the floor app costs zero extra font network — which matters when the premise is
  bad Wi-Fi. Fallbacks are specified and hold up.
- **1px hairlines, never heavier.** Depth comes from layered surfaces, not
  borders or drop shadows. The diagonal hatch texture is gone; on a phone it read
  as noise.
- **Buttons dim rather than jump.** The offset-shadow press read as a toy; a
  surface that lights under the thumb is just as perceptible through a glove.

What did not change, because the operating constraints still win any tie:

- **The verdict is the product**, so it takes the whole screen. Clear
  auto-dismisses after 1.8s with a countdown — it's the ~95% case and must cost
  nothing. Wanted persists and requires a decision.
- **Haptics** carry the verdict before the eyes do: one short buzz for clear, an
  urgent triple for wanted.
- **Never colour alone** — the two outcomes differ in word, icon, and duration.
- **56px minimum** on everything interactive; the keypad is 68px.
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

## Getting the live list in — `/api/missings-ingest`

The Apps Script keeps owning the spreadsheet. This is the one-way door that
mirrors it into `floor.missings` so the floor app has something to check scans
against. Nothing writes back to the Sheet.

**Vercel env vars** (project → Settings → Environment Variables):

```
MISSINGS_INGEST_SECRET      a long random string, shared with the Apps Script
SUPABASE_SERVICE_ROLE_KEY   required — RLS denies inserts to everyone else
```

**Apps Script**: paste `missings_sheet_sync.gs` into the project bound to the
**missing-items** sheet (not the careers one — that's a different workbook), set
Script Property `INGEST_SECRET` to the same string, run `syncMissingsToApp` once
to authorise, then add a 5-minute time-driven trigger.

Column mapping lives in the endpoint, not the script, so the header row can say
"VALPN" or "Valpn #" or "item number" and still land. The response echoes
`mappedColumns` — run the sync once and read the log to confirm what matched
rather than assuming.

Two deliberate choices:

- **Resolutions are never clobbered.** The upsert omits `found`, `found_at`,
  `found_by` and `found_note`, and PostgREST only updates the columns it is
  given — so a decision made on the floor survives every later sheet sync. The
  app's answer beats a sheet that hasn't caught up.
- **Removal from the sheet does not close an item** unless you opt in by setting
  `CLOSE_ITEMS_MISSING_FROM_SHEET = true`. "Gone from the sheet" is not the same
  claim as "found", and guessing wrong quietly empties the floor's work list.

## Open question

Whether the 5-minute push above is the right cadence, and whether the day-tab
naming in `TAB_NAME()` matches your sheet. Both are one-line changes in the
Apps Script.
