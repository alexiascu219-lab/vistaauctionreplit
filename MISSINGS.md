# Missing Items — warehouse floor app

Lives at **`/missings`** on the Vista site. Staff open it on a phone, scan an
item, and immediately learn whether it's wanted.

The workflow is inverted on purpose. Instead of dispatching someone to hunt one
item, **every scan of anything becomes a check against the missing list**. Two
outcomes:

- **clear** — not on the list, move on
- **wanted** — on the list; show where it was last seen, price, who stacked it,
  when it was marked, and any saved camera stills

## What this replaces, and what it doesn't

The Google Sheet and its ~4,200 lines of Apps Script keep running and keep owning
the spreadsheet. This replaces only the floor-facing half. Out of scope, and
staying that way:

- **Writing to Google Sheets.** Apps Script owns it. `sheet_tab` / `sheet_row` on
  `floor.missings` are read-only provenance.
- **The Slack List sync.** Apps Script owns it.
- **The Django-admin HTML scraping** that derives the approver field.

## Status

| # | Step | State |
|---|------|-------|
| 1 | Supabase schema + migrations + RLS + seed | **applied to `vistastorage`** |
| 2 | Auth and app shell | done |
| 3 | Manual VALPN lookup (proves the Vista proxy) | not started |
| 4 | Camera scanning | not started |
| 5 | Offline cache + write queue | not started |
| 6 | Found / not-found writeback | schema + RPC ready, no UI |

`/missings` (scan) and `/missings/lookup` are honest placeholders — a scanner that
half works is worse than one visibly absent, because someone will trust it.
**`/missings/list` is real**: it reads `floor.open_missings` live, which makes it
the end-to-end proof that schema, RLS, the exposed schema and the session all line
up.

## Why it's part of the Vite app rather than a separate Next.js project

It was originally built as a standalone Next.js App Router app proxied in at
`/missings`. That needed a second Vercel project, because **one Vercel project
builds exactly one framework** and this one is Vite. Creating that project was
blocked (`403 — You don't have permission to create a project`), and deploying
Next into *this* project would have replaced the careers site and deleted the 8
`api/` serverless functions the Print Station and Siri shortcut depend on.

So it's React Router routes in the existing SPA instead. The security properties
that mattered all survive:

- Vista credentials still never reach the browser — step 3 puts them in an
  `api/vista-*.js` serverless function, exactly the pattern the 8 existing
  functions already use.
- The browser still only holds the Supabase anon key.
- Authorization is still RLS plus the `floor.staff` allowlist.

What was given up: server components, and middleware-based session refresh. Auth
is client-side via the existing `AuthContext`, which is how the rest of this app
already works.

## Layout

```
src/pages/Missings.jsx           shell, auth gate, open list, placeholders
src/lib/missings/missingsApi.js  floor-schema queries and RPCs
src/lib/missings/valpn.js        VALPN normalization (twin of the SQL function)
src/lib/missings/location.js     location normalization (twin of the SQL function)
supabase/migrations/             apply in filename order
supabase/seed.sql                NOT a migration — see below
```

Routes are registered in `src/App.jsx`, which also suppresses the global navbar
and AI assistant on `/missings`, the same way it does for pickups / carts /
labels / station. Tailwind tokens are namespaced under `floor.*` and CSS
component classes under `.fl-*`, so nothing can collide with the careers palette.

No `vercel.json` change was needed — the existing SPA catch-all already serves
`/missings/*`.

## Database

Already applied to project `lovfbqnuxdihjidxacet` (`vistastorage`): all three
migrations (5 tables, 1 view, 11 policies, 14 functions, RLS on everything), plus
`seed.sql` sections 1 and 2. Section 3 (fake items) was deliberately **not**
applied, so `floor.missings` is empty — real rows come from the Apps Script.

`supabase/seed.sql` is deliberately not a migration, because migrations run
against production and section 3 should never. Every statement is idempotent.

| Section | Contents | Prod-safe? | Applied? |
|---|---|---|---|
| 1 | Staff bootstrap | Yes | yes |
| 2 | Aisle map + camera IDs | Placeholder — replace with the real Sardis layout | yes |
| 3 | Fake missing items | **No.** Dev only | no |

## Two manual dashboard steps

Neither can be done through an API.

**1. Expose the `floor` schema — required, nothing works without it.**
Supabase → Settings → API → Exposed schemas → add `floor`.

Everything lives in `floor` rather than `public` so it never collides with the 28
existing `vista_*` / `pickups_*` tables. PostgREST only serves schemas on that
list. The app detects this specific failure and shows a "Not configured yet"
screen naming the fix.

**2. Allow the sign-in redirect.**
Supabase → Authentication → URL Configuration → Redirect URLs:

```
https://vistaauction.vercel.app/missings
http://localhost:5173/missings
```

Supabase silently ignores an `emailRedirectTo` that isn't listed and falls back to
the Site URL, so a magic link would sign you in and dump you on the careers
homepage.

## Security model

**A session is not authorization.** Supabase Auth will create an account for any
email address on earth, so signing in is necessary but not sufficient: access
requires an active row in `floor.staff`. That's checked in the page for UX and by
every RLS policy for real.

Note this shares one Supabase identity with the HR portal — same project, same
browser session. That's deliberate: one person, one login. *Authorization* stays
separate, because HR access needs a `vista_employees` row and floor access needs a
`floor.staff` row, and neither implies the other. Signing out of one signs out of
both.

Verified against a real Postgres:

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
which also means `found_by` comes from the session rather than the request body —
a staff member cannot attribute a find to someone else. `floor.log_scan()` exists
for the same reason: it resolves the hit server-side instead of trusting the
client's cache.

Both take a `p_client_event_id` and are idempotent on it. That's what will make
the step-5 write queue safe: a flush that succeeds server-side but loses the
response can retry without double-filing or overwriting a newer decision.

### One RLS behaviour worth knowing

RLS on `UPDATE` does not raise — it silently matches zero rows. A non-admin
editing `locations` gets no error and no effect. Any admin UI built later must
check the affected row count rather than assume success.

## Schema notes

**`missings.valpn` is UNIQUE, and that's load-bearing.** The old system filed
duplicates; this makes a second row for the same item impossible at the database
level rather than something application code has to remember to defend against.
Normalization runs in a trigger too, so `valpn- 10045821`, `10045821` and
`VALPN-10045821` all collide as they should.

**Normalization is deliberately duplicated** between SQL and JS. The client copy
exists because a scan must resolve against the local cache with zero network; the
database copy exists so nothing malformed can be written by a caller that skips
the app. Change one, change both.

**`facts_at`** records when Vista was last queried, so an enrichment pass can skip
rows that are already fresh instead of re-hitting the API for the whole list.

**`item_media` is designed, not built.** The NVR is on the warehouse LAN and
unreachable from Vercel, so an on-prem agent will push stills and clips using
`service_role`. The table, the private `item-media` bucket and the read-side RLS
exist now; the agent does not. `item_media.valpn` is the FK target rather than
`id` because the agent will know the VALPN off the sheet — only possible because
`valpn` is unique.

**`locations.blind_spot`** encodes that some aisles have no camera coverage, and a
check constraint forbids pairing it with a camera ID. The list says "no camera —
blind spot" rather than implying stills exist.

**`scan_events` logs every scan including misses.** Misses are the majority and
are the point — they're what proves an item is clear. Append-only: no update or
delete policy for anyone.

## Design constraints

From the environment, not from taste:

- **Read at arm's length** — the verdict and VALPN use display-scale type
- **One-handed, in gloves** — nothing interactive under 56px; bottom nav, not top
- **Bad overhead light** — dark surfaces, one saturated accent, AAA contrast
- **Not colour alone** — active state is colour *plus* a bar; tags carry text
- **Zoom is not locked** — someone will need to enlarge a note

## Open question

How `floor.missings` gets populated. The `sheet_tab` / `sheet_row` columns imply
rows originate from the Apps Script day-tabs, so this is designed for the Apps
Script pushing to Supabase with `service_role` (which bypasses RLS — no policy
needed). That direction has not been confirmed, and it shapes step 3.
