-- Seed data for the missing-items floor app.
--
-- Deliberately NOT a migration. Migrations run against production; most of what
-- follows is placeholder data that should not. Apply the sections you want by
-- hand, or run the whole file against a branch/local database.
--
-- Every statement is idempotent, so re-running is safe.
--
--   Section 1  staff bootstrap ...... SAFE FOR PRODUCTION. You need this to log in.
--   Section 2  locations ............ PLACEHOLDER LAYOUT. Replace with the real
--                                     Sardis aisle map and camera IDs before prod.
--   Section 3  missings ............. DEV ONLY. Fake items. Never apply to prod.


-- ---------------------------------------------------------------------------
-- 1. Staff bootstrap  (safe for production)
-- ---------------------------------------------------------------------------
-- Allowlist yourself as admin before first sign-in. user_id links itself when
-- you request your first magic link -- the trigger in ...000100 handles both
-- orderings, so it does not matter whether this runs before or after.
--
-- Add the rest of the crew the same way, or from the admin UI once one exists.

insert into floor.staff (email, display_name, role, facility)
values ('alexiascu219@gmail.com', 'Alexia', 'admin', 'sardis')
on conflict (lower(email)) do update
  set role = excluded.role,
      active = true;


-- ---------------------------------------------------------------------------
-- 2. Locations  (placeholder aisle map -- replace before production)
-- ---------------------------------------------------------------------------
-- prefix is the aisle portion of a location: the A12 of A12-4.
-- blind_spot = true means no camera covers the aisle and none is expected; the
-- check constraint forbids pairing it with a unifi_camera_id.
--
-- The UniFi IDs below are structurally plausible placeholders, not real device
-- IDs. Pull the real ones from UniFi Protect (Settings -> Devices) before the
-- media agent goes in, otherwise every still will land under the wrong aisle.

insert into floor.locations (prefix, label, unifi_camera_id, blind_spot, notes) values
  ('A1',  'Aisle A1 - electronics intake',  '6640a1c2e4b0f10123000101', false, null),
  ('A2',  'Aisle A2 - electronics',         '6640a1c2e4b0f10123000101', false, 'Shares the A1 camera; far bays are soft.'),
  ('A10', 'Aisle A10 - small appliance',    '6640a1c2e4b0f10123000102', false, null),
  ('A11', 'Aisle A11 - small appliance',    '6640a1c2e4b0f10123000102', false, null),
  ('A12', 'Aisle A12 - tools',              '6640a1c2e4b0f10123000103', false, null),
  ('B1',  'Aisle B1 - furniture',           '6640a1c2e4b0f10123000104', false, null),
  ('B2',  'Aisle B2 - furniture',           '6640a1c2e4b0f10123000104', false, null),
  ('B7',  'Aisle B7 - oversize',            null,                       true,  'No coverage. Roof truss blocks any mount point.'),
  ('C1',  'Aisle C1 - prep / gaylord',      '6640a1c2e4b0f10123000105', false, null),
  ('C2',  'Aisle C2 - prep / gaylord',      '6640a1c2e4b0f10123000105', false, null),
  ('D1',  'Dock D1 - outbound staging',     '6640a1c2e4b0f10123000106', false, null),
  ('D4',  'Dock D4 - returns',              null,                       true,  'Blind spot. Items marked here rarely have stills.')
on conflict (prefix) do update
  set label           = excluded.label,
      unifi_camera_id = excluded.unifi_camera_id,
      blind_spot      = excluded.blind_spot,
      notes           = excluded.notes;


-- ---------------------------------------------------------------------------
-- 3. Missings  (DEV ONLY -- fake items, do not apply to production)
-- ---------------------------------------------------------------------------
-- Enough shape to exercise the real cases:
--   - open rows in covered aisles and in blind spots
--   - both order kinds (delivery and prep/gaylord)
--   - a stale row (facts_at null) and fresh rows, to test the enrichment skip
--   - resolved rows (found true and false) so the open-list filter is provable
--   - a row with no location at all
--
-- found_by is left null: these are seeded, not found by a real person, and the
-- FK would need a staff row that may not exist yet in a fresh database.

insert into floor.missings (
  valpn, location_last_seen, marked_at, marked_by, stacked_by,
  order_number, order_kind, sold_price, ever_resold,
  found, found_at, sheet_tab, sheet_row, facts_at
) values
  -- Open, covered aisle, enriched recently.
  ('VALPN-10045821', 'A12-4',  now() - interval '3 hours',  'alexia',  'marcus',
   '884120', 'delivery', 128.00, false, null, null, '2026-07-30', 12, now() - interval '2 hours'),

  -- Open, covered aisle, never enriched -- the enrichment sweep should pick this first.
  ('VALPN-10045822', 'A10-2',  now() - interval '5 hours',  'alexia',  'dana',
   '884120', 'delivery', 74.50,  false, null, null, '2026-07-30', 13, null),

  -- Open, blind spot. Scan result must say so instead of implying stills exist.
  ('VALPN-10046190', 'B7-1',   now() - interval '1 day',    'jordan',  'marcus',
   '884205', 'delivery', 340.00, true,  null, null, '2026-07-29', 4,  now() - interval '20 hours'),

  -- Open, prep/gaylord order -- different Vista endpoint than a delivery.
  ('VALPN-10046204', 'C2-3',   now() - interval '2 days',   'jordan',  'priya',
   'G-9912', 'prep',     19.99,  false, null, null, '2026-07-28', 21, now() - interval '2 days'),

  -- Open, high value, prep order, stale facts.
  ('VALPN-10046311', 'C1-1',   now() - interval '6 hours',  'alexia',  'priya',
   'G-9930', 'prep',     1249.00, false, null, null, '2026-07-30', 7, null),

  -- Open, no location recorded at all. UI must not crash on a null aisle.
  ('VALPN-10046415', null,     now() - interval '4 hours',  'dana',    null,
   '884301', 'delivery', 55.00,  false, null, null, '2026-07-30', 18, null),

  -- Open, facility prefix on the location -- the normalizer should strip it.
  ('VALPN-10046502', 'SARDIS-B2-6', now() - interval '90 minutes', 'marcus', 'dana',
   '884310', 'delivery', 210.00, false, null, null, '2026-07-30', 22, null),

  -- Resolved: found. Must NOT appear in floor.open_missings.
  ('VALPN-10044100', 'A1-3',   now() - interval '3 days',   'alexia',  'marcus',
   '883980', 'delivery', 89.00,  false, true,  now() - interval '2 days', '2026-07-27', 3, now() - interval '3 days'),

  -- Resolved: searched and not found. Also excluded from the open list.
  ('VALPN-10044101', 'D4-2',   now() - interval '4 days',   'jordan',  null,
   '883975', 'delivery', 42.00,  true,  false, now() - interval '3 days', '2026-07-26', 9, now() - interval '4 days')
on conflict (valpn) do nothing;


-- Media rows for one open item, standing in for what the on-prem agent will
-- push. The storage objects themselves do not exist, so signed URLs for these
-- paths will 404 -- that is expected until the agent is built.
insert into floor.item_media (valpn, storage_path, kind, camera_id, captured_at, duration_seconds, uploaded_by_agent)
values
  ('VALPN-10045821', 'VALPN-10045821/2026-07-30T14-02-11Z-still.jpg', 'still',
   '6640a1c2e4b0f10123000103', now() - interval '3 hours', null, 'seed'),
  ('VALPN-10045821', 'VALPN-10045821/2026-07-30T14-02-11Z-clip.mp4',  'clip',
   '6640a1c2e4b0f10123000103', now() - interval '3 hours', 12.5, 'seed')
on conflict (storage_path) do nothing;
