-- Missing-items floor app: RLS policies, grants, and the one sanctioned write path.
--
-- Shape of the model:
--   anon              -> nothing, anywhere. No schema usage, no grants, no policies.
--   authenticated     -> nothing unless floor.is_staff() (active allowlist row).
--   active staff      -> read missings / locations / item_media; append scan_events.
--   admin             -> additionally manage locations and the staff roster.
--   service_role      -> bypasses RLS. Used by the Apps Script ingest and by the
--                        future on-prem media agent. Never reaches the browser.
--
-- Note there is no direct UPDATE grant on floor.missings for authenticated.
-- Postgres RLS cannot restrict *which columns* an UPDATE touches, so rather than
-- rely on a policy predicate to keep staff out of sold_price or sheet_row, the
-- found/not-found writeback goes through floor.mark_found() and nothing else.


-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------

create policy locations_select_staff on floor.locations
  for select to authenticated
  using (floor.is_staff());

create policy locations_admin_insert on floor.locations
  for insert to authenticated
  with check (floor.is_admin());

create policy locations_admin_update on floor.locations
  for update to authenticated
  using (floor.is_admin())
  with check (floor.is_admin());

create policy locations_admin_delete on floor.locations
  for delete to authenticated
  using (floor.is_admin());

grant select on floor.locations to authenticated;
grant insert, update, delete on floor.locations to authenticated;


-- ---------------------------------------------------------------------------
-- missings
-- ---------------------------------------------------------------------------
-- Read-only for staff. Rows arrive from the Apps Script (service_role, which
-- bypasses RLS); resolution happens via floor.mark_found() below.

create policy missings_select_staff on floor.missings
  for select to authenticated
  using (floor.is_staff());

grant select on floor.missings to authenticated;


-- ---------------------------------------------------------------------------
-- item_media
-- ---------------------------------------------------------------------------
-- Read-only for staff. The on-prem agent writes with service_role.

create policy item_media_select_staff on floor.item_media
  for select to authenticated
  using (floor.is_staff());

grant select on floor.item_media to authenticated;


-- Objects in the private item-media bucket follow the same rule. Reads in the
-- app go through signed URLs minted server-side; this policy is what makes
-- those legal for staff and illegal for everyone else.
create policy item_media_objects_select_staff on storage.objects
  for select to authenticated
  using (bucket_id = 'item-media' and floor.is_staff());

-- Deliberately no insert/update/delete policy on the bucket: uploads are
-- service_role only, which is how the on-prem agent will authenticate.


-- ---------------------------------------------------------------------------
-- scan_events
-- ---------------------------------------------------------------------------
-- Append-only. A staff member may file scans as themselves and read their own
-- history; leads and admins can read everyone's.

create policy scan_events_insert_self on floor.scan_events
  for insert to authenticated
  with check (floor.is_staff() and staff_id = floor.staff_id());

create policy scan_events_select_own on floor.scan_events
  for select to authenticated
  using (floor.is_lead_or_admin() or staff_id = floor.staff_id());

-- No update or delete policy, for anyone. The log is evidence.

grant select, insert on floor.scan_events to authenticated;


-- ---------------------------------------------------------------------------
-- open_missings: the payload the app caches to IndexedDB on load
-- ---------------------------------------------------------------------------
-- security_invoker means the view runs with the caller's privileges, so the
-- missings_select_staff policy above still applies. Without it a view owned by
-- postgres would quietly bypass RLS.

create view floor.open_missings
with (security_invoker = true) as
select
  m.id,
  m.valpn,
  m.location_last_seen,
  m.location_prefix,
  m.marked_at,
  m.marked_by,
  m.stacked_by,
  m.order_number,
  m.order_kind,
  m.sold_price,
  m.ever_resold,
  m.facts_at,
  m.sheet_tab,
  m.sheet_row,
  l.unifi_camera_id,
  l.blind_spot,
  l.label as location_label,
  -- Lets the scan screen say "3 stills" without a second round trip.
  (select count(*) from floor.item_media im where im.valpn = m.valpn) as media_count
from floor.missings m
left join floor.locations l on l.prefix = m.location_prefix
where m.found is null;

comment on view floor.open_missings is
  'Today''s open list, joined to camera coverage. Cached to IndexedDB on load so '
  'a scan resolves with zero network.';

grant select on floor.open_missings to authenticated;


-- ---------------------------------------------------------------------------
-- mark_found: the only write path into floor.missings for staff
-- ---------------------------------------------------------------------------
-- security definer because authenticated has no UPDATE grant on the table. The
-- allowlist check is therefore done here, explicitly, first.
--
-- p_client_event_id makes the call idempotent, which the offline write queue
-- needs: a flush that succeeds on the server but loses the response must be
-- safe to retry without overwriting a newer decision or re-attributing a find.

create or replace function floor.mark_found(
  p_valpn           text,
  p_found           boolean,
  p_note            text default null,
  p_client_event_id uuid default null
)
returns floor.missings
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_staff uuid;
  v_valpn text;
  v_row   floor.missings;
begin
  v_staff := floor.staff_id();
  if v_staff is null then
    -- insufficient_privilege
    raise exception 'not authorized for the floor app' using errcode = '42501';
  end if;

  if p_found is null then
    raise exception 'found must be true or false, not null' using errcode = '22023';
  end if;

  v_valpn := floor.normalize_valpn(p_valpn);
  if v_valpn is null then
    raise exception 'unreadable valpn' using errcode = '22023';
  end if;

  -- Replay of an already-applied queued write: return the stored row untouched.
  if p_client_event_id is not null then
    select m.* into v_row
      from floor.missings m
     where m.valpn = v_valpn
       and m.found_client_event_id = p_client_event_id;

    if v_row.id is not null then
      return v_row;
    end if;
  end if;

  update floor.missings m
     set found                 = p_found,
         found_note            = nullif(btrim(coalesce(p_note, '')), ''),
         found_by              = v_staff,
         found_at              = now(),
         found_client_event_id = p_client_event_id
   where m.valpn = v_valpn
  returning m.* into v_row;

  if v_row.id is null then
    -- no_data_found: scanned something that is not on the list
    raise exception 'valpn is not on the missing list' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

comment on function floor.mark_found(text, boolean, text, uuid) is
  'Resolve a missing item. The only sanctioned staff write into floor.missings; '
  'authenticated has no UPDATE grant on the table. Idempotent per p_client_event_id.';

revoke execute on function floor.mark_found(text, boolean, text, uuid) from public, anon;
grant execute on function floor.mark_found(text, boolean, text, uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- log_scan: append a scan event, attributed to the caller
-- ---------------------------------------------------------------------------
-- Staff could insert directly under scan_events_insert_self, but they would have
-- to know their own staff_id and resolve the hit themselves. This does both and
-- keeps the client from having to trust its own cache when writing the log.

create or replace function floor.log_scan(
  p_raw_input        text,
  p_source           text default 'camera',
  p_resolved_offline boolean default false,
  p_device_label     text default null,
  p_client_event_id  uuid default null
)
returns floor.scan_events
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_staff   uuid;
  v_valpn   text;
  v_missing uuid;
  v_row     floor.scan_events;
begin
  v_staff := floor.staff_id();
  if v_staff is null then
    raise exception 'not authorized for the floor app' using errcode = '42501';
  end if;

  if p_client_event_id is not null then
    select s.* into v_row
      from floor.scan_events s
     where s.client_event_id = p_client_event_id;

    if v_row.id is not null then
      return v_row;
    end if;
  end if;

  v_valpn := floor.normalize_valpn(p_raw_input);

  if v_valpn is not null then
    select m.id into v_missing
      from floor.missings m
     where m.valpn = v_valpn
       and m.found is null;
  end if;

  insert into floor.scan_events (
    staff_id, raw_input, valpn, hit, missing_id,
    source, resolved_offline, device_label, client_event_id
  )
  values (
    v_staff, p_raw_input, v_valpn, v_missing is not null, v_missing,
    coalesce(p_source, 'camera'), coalesce(p_resolved_offline, false),
    p_device_label, p_client_event_id
  )
  returning * into v_row;

  return v_row;
end;
$$;

comment on function floor.log_scan(text, text, boolean, text, uuid) is
  'Append a scan event and resolve the hit server-side. Idempotent per '
  'p_client_event_id so an offline queue flush can safely retry.';

revoke execute on function floor.log_scan(text, text, boolean, text, uuid) from public, anon;
grant execute on function floor.log_scan(text, text, boolean, text, uuid) to authenticated;
