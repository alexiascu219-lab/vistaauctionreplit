-- Missing-items floor app: domain normalizers and the four core tables.
--
-- RLS is enabled on every table here but NO policies are created in this file.
-- RLS with zero policies denies everything, so there is no window where a table
-- exists and is readable. Policies land in ...000300.


-- ---------------------------------------------------------------------------
-- VALPN normalization
-- ---------------------------------------------------------------------------
-- Canonical form is VALPN-<5 or more digits>. Real input is messy: bare digits
-- off a keyboard, lowercase, stray whitespace inside the token ("VALPN- 1234567"),
-- and occasionally a doubled prefix. This mirrors normalizeValpn() in
-- src/lib/valpn.ts -- the TypeScript copy exists so an offline scan can resolve
-- with zero network. Change one, change both.
--
-- Returns null for anything that cannot be read as a VALPN. Callers decide
-- whether that is a validation error or an unparseable scan worth logging.

create or replace function floor.normalize_valpn(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  token text;
begin
  if raw is null then
    return null;
  end if;

  -- Uppercase and drop everything that is not a letter or digit. This absorbs
  -- whitespace, the hyphen, and any punctuation a damaged barcode read adds.
  token := regexp_replace(upper(raw), '[^A-Z0-9]', '', 'g');

  -- Shed a leading VALPN prefix, however many times it got stuck on.
  token := regexp_replace(token, '^(VALPN)+', '');

  if token ~ '^[0-9]{5,}$' then
    return 'VALPN-' || token;
  end if;

  return null;
end;
$$;

comment on function floor.normalize_valpn(text) is
  'Messy scanner/keyboard input -> canonical VALPN-<digits>, or null if unreadable. '
  'Kept in sync with normalizeValpn() in floor-app/src/lib/valpn.ts.';


-- ---------------------------------------------------------------------------
-- Location normalization
-- ---------------------------------------------------------------------------
-- Locations are aisle-bay: A12-4. Vista sometimes prefixes the facility
-- ("SARDIS-A12-4", "SRD_A12-4"). Anchoring the match to the end of the string
-- strips any prefix without needing to know the facility token.

create or replace function floor.normalize_location(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  compact text;
begin
  if raw is null then
    return null;
  end if;

  compact := regexp_replace(upper(raw), '\s+', '', 'g');

  return (regexp_match(compact, '([A-Z]{1,3}[0-9]{1,3}-[0-9]{1,3})$'))[1];
end;
$$;

comment on function floor.normalize_location(text) is
  'Strips any facility prefix and returns the canonical A12-4 aisle-bay form, '
  'or null if the input does not end in one.';


-- ---------------------------------------------------------------------------
-- locations: aisle prefix -> camera coverage
-- ---------------------------------------------------------------------------

create table floor.locations (
  prefix          text primary key
                    check (prefix ~ '^[A-Z]{1,3}[0-9]{1,3}$'),
  label           text,
  unifi_camera_id text,
  blind_spot      boolean not null default false,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- "Some aisles have no coverage" -- encode it rather than trusting convention.
  constraint locations_blind_spot_has_no_camera
    check (not blind_spot or unifi_camera_id is null)
);

comment on table floor.locations is
  'Maps an aisle prefix (the A12 of A12-4) to the UniFi camera that covers it. '
  'blind_spot = true means there is no camera and none is expected.';

create trigger locations_touch_updated_at
  before update on floor.locations
  for each row execute function floor.touch_updated_at();

alter table floor.locations enable row level security;


-- ---------------------------------------------------------------------------
-- missings: the list a scan is checked against
-- ---------------------------------------------------------------------------

create table floor.missings (
  id                     uuid primary key default gen_random_uuid(),

  valpn                  text not null,

  location_last_seen     text,

  marked_at              timestamptz not null default now(),
  marked_by              text,
  stacked_by             text,

  order_number           text,
  order_kind             text check (order_kind in ('delivery', 'prep')),

  sold_price             numeric(12, 2) check (sold_price is null or sold_price >= 0),
  ever_resold            boolean,

  -- null = still open, true = found, false = searched and not found.
  found                  boolean,
  found_note             text,
  found_by               uuid references floor.staff (id) on delete set null,
  found_at               timestamptz,
  -- Dedupes a queued offline write that gets flushed more than once.
  found_client_event_id  uuid,

  sheet_tab              text,
  sheet_row              integer check (sheet_row is null or sheet_row > 0),

  -- When Vista was last queried for this row. Lets an enrichment pass skip
  -- anything already fresh instead of re-hitting the API for the whole list.
  facts_at               timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Load-bearing. The old Apps Script filed duplicates; this makes a second row
  -- for the same item impossible at the database level rather than something
  -- application code has to remember to defend against.
  constraint missings_valpn_key unique (valpn),

  constraint missings_valpn_format check (valpn ~ '^VALPN-[0-9]{5,}$'),

  constraint missings_location_format
    check (location_last_seen is null
           or location_last_seen ~ '^[A-Z]{1,3}[0-9]{1,3}-[0-9]{1,3}$'),

  -- found_at is set exactly when found is resolved, by the same write.
  constraint missings_found_at_matches_found
    check ((found is null) = (found_at is null))
);

comment on table floor.missings is
  'One row per missing item, keyed by VALPN. found is null while open, '
  'true when recovered, false when searched and not found.';
comment on constraint missings_valpn_key on floor.missings is
  'Intentional and load-bearing: duplicate filings must be impossible in the DB, '
  'not merely avoided by application code.';
comment on column floor.missings.facts_at is
  'Last successful enrichment from the Vista API. Null = never enriched.';
comment on column floor.missings.sheet_row is
  'Provenance back to the Apps Script day-tab. Read-only here; this app never '
  'writes to the Sheet.';

-- Derived aisle prefix, so a scan result can join straight to camera coverage
-- without string work at query time. Immutable expression, hence stored.
alter table floor.missings
  add column location_prefix text
  generated always as (split_part(location_last_seen, '-', 1)) stored;

comment on column floor.missings.location_prefix is
  'Derived aisle (A12 from A12-4). Join key to floor.locations.prefix.';


-- Normalize on write so malformed values cannot reach the table even if a
-- caller forgets. Unparseable input is passed through untouched so the check
-- constraint rejects it with a named error instead of silently storing null.
create or replace function floor.missings_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.valpn := coalesce(floor.normalize_valpn(new.valpn), new.valpn);

  if new.location_last_seen is not null then
    new.location_last_seen := coalesce(
      floor.normalize_location(new.location_last_seen),
      new.location_last_seen
    );
  end if;

  return new;
end;
$$;

create trigger missings_normalize_before_write
  before insert or update on floor.missings
  for each row execute function floor.missings_normalize();

create trigger missings_touch_updated_at
  before update on floor.missings
  for each row execute function floor.touch_updated_at();

-- Today's open list: the query the app runs on every load to fill IndexedDB.
create index missings_open_idx on floor.missings (marked_at desc) where found is null;

-- Enrichment sweep: oldest facts first, open rows only.
create index missings_stale_facts_idx on floor.missings (facts_at nulls first)
  where found is null;

create index missings_location_prefix_idx on floor.missings (location_prefix)
  where location_prefix is not null;

create index missings_order_idx on floor.missings (order_kind, order_number);

alter table floor.missings enable row level security;


-- ---------------------------------------------------------------------------
-- item_media: camera stills and clips
-- ---------------------------------------------------------------------------
-- Populated later by an on-prem agent. The NVR sits on the warehouse LAN and is
-- unreachable from Vercel, so nothing in this app writes here -- the agent will
-- push with the service_role key. This table and the storage bucket exist now so
-- the read path and the RLS story are settled; the agent is not built.
--
-- valpn is the FK target rather than id because the agent will know the VALPN
-- off the sheet, not our surrogate key. Only possible because valpn is unique.

create table floor.item_media (
  id                uuid primary key default gen_random_uuid(),

  valpn             text not null
                      references floor.missings (valpn)
                      on update cascade on delete cascade,

  storage_path      text not null unique,
  kind              text not null check (kind in ('still', 'clip')),

  camera_id         text,
  captured_at       timestamptz,
  duration_seconds  numeric(8, 2) check (duration_seconds is null or duration_seconds > 0),
  bytes             bigint check (bytes is null or bytes >= 0),

  -- Which on-prem agent uploaded this, for debugging a silent agent.
  uploaded_by_agent text,
  created_at        timestamptz not null default now(),

  constraint item_media_clip_has_duration
    check (kind <> 'clip' or duration_seconds is not null)
);

comment on table floor.item_media is
  'Camera stills/clips for a missing item. Written by an on-prem agent via '
  'service_role; the web app only ever reads.';

create index item_media_valpn_idx on floor.item_media (valpn, captured_at desc);

alter table floor.item_media enable row level security;


-- Private bucket the storage_path values point into. Public = false, so reads
-- go through signed URLs minted server-side.
insert into storage.buckets (id, name, public)
values ('item-media', 'item-media', false)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- scan_events: every scan, hit or miss
-- ---------------------------------------------------------------------------
-- The inverted workflow means most scans are misses, so this grows fast --
-- identity bigint rather than uuid, and no updated_at. Append-only.

create table floor.scan_events (
  id               bigint generated always as identity primary key,

  scanned_at       timestamptz not null default now(),
  staff_id         uuid references floor.staff (id) on delete set null,

  -- Exactly what the scanner or keyboard produced, before normalization. Kept
  -- so a run of unparseable reads can be traced to a damaged label or a bad lens.
  raw_input        text,
  valpn            text,
  hit              boolean not null,
  missing_id       uuid references floor.missings (id) on delete set null,

  source           text not null default 'camera'
                     check (source in ('camera', 'barcode_detector', 'manual')),

  -- True when the answer came from the IndexedDB cache with no network.
  resolved_offline boolean not null default false,
  device_label     text,

  -- Idempotency key for the offline write queue: a flush that partially
  -- succeeded and retries must not double-file its scans.
  client_event_id  uuid unique,

  constraint scan_events_hit_has_missing check (not hit or missing_id is not null)
);

comment on table floor.scan_events is
  'Append-only log of every scan including misses. Misses are the majority and '
  'are the point -- they are what proves an item is clear.';

create index scan_events_staff_recent_idx on floor.scan_events (staff_id, scanned_at desc);
create index scan_events_valpn_idx on floor.scan_events (valpn) where valpn is not null;
create index scan_events_hits_idx on floor.scan_events (scanned_at desc) where hit;

alter table floor.scan_events enable row level security;
