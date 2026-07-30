# Vista Floor — Missing Items

Mobile web app for the Sardis warehouse floor. Staff scan an item and immediately
learn whether it is wanted.

The workflow is inverted on purpose. Instead of dispatching someone to hunt one
item, **every scan of anything becomes a check against the missing list**. Two
outcomes:

- **clear** — not on the list, move on
- **wanted** — on the list; show where it was last seen, price, who stacked it,
  when it was marked, and any saved camera stills

## What this replaces, and what it does not

The Google Sheet and its ~4,200 lines of Apps Script keep running and keep
owning the spreadsheet. This app replaces only the floor-facing half.

Explicitly out of scope, and staying that way:

- **Writing to Google Sheets.** Apps Script owns it. `sheet_tab` / `sheet_row` on
  `floor.missings` are read-only provenance.
- **The Slack List sync.** Apps Script owns it.
- **The Django-admin HTML scraping** that derives the approver field. Fragile,
  stays in Apps Script.

## Status

| # | Step | State |
|---|------|-------|
| 1 | Supabase schema + migrations + RLS + seed | done, validated, **not yet applied** |
| 2 | Auth and app shell | done |
| 3 | Manual VALPN lookup end to end (proves the Vista proxy) | not started |
| 4 | Camera scanning | not started |
| 5 | Offline cache + write queue | not started |
| 6 | Found / not-found writeback | schema + RPC ready, no UI |

`/scan` and `/lookup` are honest placeholders. `/list` is real — it reads
`floor.open_missings` live, which makes it the end-to-end proof that the schema,
RLS, the exposed schema and the auth session all line up.

## Layout

```
floor-app/
├── supabase/
│   ├── migrations/          apply in filename order
│   └── seed.sql             NOT a migration — see below
├── middleware.ts            session refresh + unauthenticated redirect
└── src/
    ├── app/
    │   ├── (floor)/         authorized area: layout enforces the allowlist
    │   ├── auth/            magic-link callback, sign-out
    │   ├── login/
    │   └── no-access/       signed in, but not on the roster
    ├── components/
    └── lib/
        ├── env.ts           public env only — safe in the browser
        ├── env.server.ts    secrets, guarded by 'server-only'
        ├── valpn.ts         normalization (twin of the SQL function)
        ├── location.ts      normalization (twin of the SQL function)
        └── supabase/        browser / server / middleware clients
```

## Setup

### 1. Apply the migrations

Against project `lovfbqnuxdihjidxacet` (`vistastorage`), in filename order:

```
20260730000100_floor_schema_and_staff.sql
20260730000200_floor_core_tables.sql
20260730000300_floor_rls_policies.sql
```

### 2. Expose the `floor` schema — required

Supabase dashboard → **Settings → API → Exposed schemas** → add `floor`.

Everything for this app lives in `floor`, not `public`, so it never collides with
the 28 existing `vista_*` / `pickups_*` tables. Skip this step and PostgREST
returns 404 for every table here — that is the first thing to check if `/list`
shows a load error.

### 3. Seed

`supabase/seed.sql` is **deliberately not a migration**, because migrations run
against production and most of that file should not. Three sections, applied by
hand:

| Section | Contents | Safe for production? |
|---|---|---|
| 1 | Staff bootstrap | **Yes** — you need it to sign in |
| 2 | Aisle map + camera IDs | Placeholder. Replace with the real Sardis layout |
| 3 | Fake missing items | **No.** Dev only |

Every statement is idempotent.

### 4. Environment

```bash
cp .env.local.example .env.local   # then fill it in
npm install
npm run dev
```

### 5. Deploy

Vercel project with **Root Directory** set to `floor-app`. The repo root is a
separate Vite app with its own `vercel.json`; the two do not interact.

## Security model

Four rules, and the code is arranged so that breaking them is difficult rather
than merely discouraged.

**Secrets never reach the browser.** Vista credentials, any Slack token, and the
Supabase `service_role` key are read only through `src/lib/env.server.ts`, which
imports `server-only`. If a client component ever reaches for one of those —
directly or through any import chain — the build fails instead of quietly
inlining a credential. Verified against the emitted bundle: no server env names,
no Vista hostname.

**All Vista calls go through our own routes.** Browser-to-Vista would not work
anyway (CORS) and would expose the credentials. The access token is cached
server-side and refreshed rather than re-logging-in.

**The browser gets the anon key and nothing else.** Authorization is RLS.

**A session is not authorization.** Supabase Auth will create an account for any
email address on earth, so signing in is necessary but not sufficient: access
requires an active row in `floor.staff`. That check happens in two places — the
`(floor)` layout, and every RLS policy via `floor.is_staff()`.

Concretely, as verified against a real Postgres:

| Role | Reach |
|---|---|
| `anon` | Nothing. No schema usage, no grants, no policies |
| authenticated, not on the roster | Nothing. Zero rows from every table |
| active staff | Read `missings` / `locations` / `item_media`; append own `scan_events` |
| lead | Also reads everyone's `scan_events` |
| admin | Also manages `locations` and the roster |
| `service_role` | Bypasses RLS. Apps Script ingest and the future media agent only |

### Why `mark_found()` instead of an UPDATE policy

Postgres RLS cannot restrict *which columns* an `UPDATE` touches. Rather than
lean on a policy predicate to keep staff out of `sold_price` or `sheet_row`,
`authenticated` has **no UPDATE grant on `floor.missings` at all**. The
found/not-found writeback goes through `floor.mark_found()` and nothing else,
which also means `found_by` is taken from the session rather than the request
body — a staff member cannot attribute a find to someone else.

`floor.log_scan()` exists for the same reason: it resolves the hit server-side
instead of trusting the client's cache when writing the log.

Both take a `p_client_event_id` and are idempotent on it. That is what makes the
step-5 write queue safe: a flush that succeeds on the server but loses the
response can be retried without double-filing a scan or overwriting a newer
decision.

### One RLS behaviour worth knowing

RLS on `UPDATE` does not raise — it silently matches zero rows. A non-admin
editing `locations` gets no error and no effect. Any admin UI built later needs
to check the affected row count rather than assume success.

## Schema notes

**`missings.valpn` is UNIQUE, and that is load-bearing.** The old system filed
duplicates; this makes a second row for the same item impossible at the database
level rather than something application code has to remember to defend against.
Normalization runs in a trigger too, so `valpn- 10045821`, `10045821` and
`VALPN-10045821` all collide as they should.

**Normalization is deliberately duplicated** between SQL
(`floor.normalize_valpn`) and TypeScript (`src/lib/valpn.ts`). The client copy
exists because a scan must resolve against the IndexedDB cache with zero network;
the database copy exists so nothing malformed can be written by a caller that
skips the app. Change one, change both.

**`facts_at`** records when Vista was last queried, so an enrichment pass can skip
rows that are already fresh instead of re-hitting the API for the whole list.

**`item_media` is designed, not built.** The NVR is on the warehouse LAN and
unreachable from Vercel, so an on-prem agent will push stills and clips using
`service_role`. The table, the private `item-media` bucket and the read-side RLS
exist now; the agent does not. `item_media.valpn` is the FK target rather than
`id` because the agent will know the VALPN off the sheet — only possible because
`valpn` is unique.

**`locations.blind_spot`** encodes that some aisles have no camera coverage, and a
check constraint forbids pairing it with a camera ID. The scan screen should say
"no camera — blind spot" rather than implying stills exist.

**`scan_events` logs every scan including misses.** Misses are the majority and
are the point — they are what proves an item is clear. Append-only: no update or
delete policy for anyone.

## Design constraints

These come from the environment, not from taste:

- **Read at arm's length** — the scan verdict uses display-scale type
- **One-handed, in gloves** — nothing interactive is under 56px; bottom nav, not top
- **Bad overhead light** — dark surfaces with a saturated accent, AAA contrast
- **Not colour alone** — clear vs. wanted differ in text and shape too
- **Zoom is not locked** — someone will need to enlarge a note

## Known dependency advisories

`npm audit` reports 3 high-severity findings, all inside `next@16.2.12`'s own
pinned `postcss@8.4.31` and `sharp@0.34.5`. Our direct toolchain is already on
patched `postcss@8.5.25`. There is no upstream fix on the latest Next, and npm's
suggested remedy is downgrading to `next@9.3.3`, which is not one. Re-check when
Next ships a bump.
