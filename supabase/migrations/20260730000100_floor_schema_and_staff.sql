-- Missing-items floor app: schema, staff allowlist, and shared helpers.
--
-- Everything for this app lives in the `floor` schema so it never collides with
-- the 28 existing vista_* / pickups_* tables in `public`.
--
-- MANUAL STEP after applying: add `floor` to Settings -> API -> Exposed schemas
-- in the Supabase dashboard, otherwise PostgREST returns 404 for every table here.

create schema if not exists floor;

-- The anon role gets nothing in this schema, ever. Not usage, not select.
-- Staff must be signed in AND on the allowlist to see anything.
revoke all on schema floor from anon;
grant usage on schema floor to authenticated, service_role;

-- Future tables created in this schema do not silently become readable.
alter default privileges in schema floor revoke all on tables from anon;
alter default privileges in schema floor revoke all on functions from anon;
alter default privileges in schema floor revoke all on sequences from anon;


-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------

create or replace function floor.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- staff: the access allowlist
-- ---------------------------------------------------------------------------
-- Signing in with a magic link is necessary but not sufficient. Supabase Auth
-- will happily create an account for any email address on earth; authorization
-- comes from a row here with active = true.
--
-- The allowlist is keyed on EMAIL, not user_id, so a person can be added before
-- they have ever logged in. user_id is linked automatically in both directions
-- by the triggers below, and once linked it is what RLS actually checks.

create table floor.staff (
  id            uuid primary key default gen_random_uuid(),

  email         text not null,
  user_id       uuid unique references auth.users (id) on delete set null,

  display_name  text not null,
  role          text not null default 'staff'
                  check (role in ('staff', 'lead', 'admin')),
  active        boolean not null default true,
  facility      text not null default 'sardis',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Email is the allowlist key; compare case-insensitively.
create unique index staff_email_lower_key on floor.staff (lower(email));

-- Hot path for every RLS check.
create index staff_user_id_active_idx on floor.staff (user_id) where active;

comment on table floor.staff is
  'Access allowlist for the missing-items floor app. A Supabase Auth account '
  'with no active row here can read nothing.';
comment on column floor.staff.email is
  'Allowlist key. Populate before the person first signs in; user_id links itself.';
comment on column floor.staff.user_id is
  'Linked to auth.users on first sign-in (or on insert here, whichever is later). '
  'This, not email, is what RLS policies check.';


-- Normalize email on the way in so the unique index and the link triggers agree.
create or replace function floor.staff_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

create trigger staff_normalize_before_write
  before insert or update on floor.staff
  for each row execute function floor.staff_normalize();

create trigger staff_touch_updated_at
  before update on floor.staff
  for each row execute function floor.touch_updated_at();


-- Link direction 1: allowlisted person signs in for the first time.
create or replace function floor.link_staff_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update floor.staff
     set user_id    = new.id,
         updated_at = now()
   where lower(email) = lower(new.email)
     and user_id is null;
  return new;
end;
$$;

create trigger link_floor_staff_on_signup
  after insert on auth.users
  for each row execute function floor.link_staff_on_signup();


-- Link direction 2: person is added to the allowlist after already having an account.
create or replace function floor.link_staff_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null then
    select u.id into new.user_id
      from auth.users u
     where lower(u.email) = lower(new.email)
     limit 1;
  end if;
  return new;
end;
$$;

create trigger link_floor_staff_on_insert
  before insert on floor.staff
  for each row execute function floor.link_staff_on_insert();


-- ---------------------------------------------------------------------------
-- Authorization helpers used by every policy in migration ...000300
-- ---------------------------------------------------------------------------
-- security definer so a caller who cannot read floor.staff can still be
-- checked against it. search_path is pinned empty per this project's
-- harden_function_search_path convention; everything is schema-qualified.
--
-- auth.uid() is wrapped in a scalar subquery so Postgres caches it as an
-- InitPlan once per statement instead of re-evaluating it per row.

create or replace function floor.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from floor.staff s
     where s.user_id = (select auth.uid())
       and s.active
  );
$$;

create or replace function floor.staff_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
    from floor.staff s
   where s.user_id = (select auth.uid())
     and s.active
   limit 1;
$$;

create or replace function floor.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.role
    from floor.staff s
   where s.user_id = (select auth.uid())
     and s.active
   limit 1;
$$;

create or replace function floor.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(floor.staff_role() = 'admin', false);
$$;

-- Leads and admins can see other people's scan history; plain staff cannot.
create or replace function floor.is_lead_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(floor.staff_role() in ('lead', 'admin'), false);
$$;


-- No security definer function is callable by anon or by the world.
revoke execute on function
  floor.is_staff(),
  floor.staff_id(),
  floor.staff_role(),
  floor.is_admin(),
  floor.is_lead_or_admin(),
  floor.link_staff_on_signup(),
  floor.link_staff_on_insert()
from public, anon;

grant execute on function
  floor.is_staff(),
  floor.staff_id(),
  floor.staff_role(),
  floor.is_admin(),
  floor.is_lead_or_admin()
to authenticated;


-- RLS on staff. Policies for the rest of the tables live in ...000300.
alter table floor.staff enable row level security;

-- A signed-in user may read their own row (the app needs display_name and role
-- to render the shell). Admins may read and manage the whole roster.
create policy staff_select_self on floor.staff
  for select to authenticated
  using (user_id = (select auth.uid()) or floor.is_admin());

create policy staff_admin_insert on floor.staff
  for insert to authenticated
  with check (floor.is_admin());

create policy staff_admin_update on floor.staff
  for update to authenticated
  using (floor.is_admin())
  with check (floor.is_admin());

-- Deliberately no delete policy: deactivate with active = false so the
-- found_by history on missings and scan_events stays attributable.

grant select on floor.staff to authenticated;
grant insert, update on floor.staff to authenticated;
