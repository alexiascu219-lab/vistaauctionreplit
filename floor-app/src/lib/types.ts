/**
 * Hand-written row types for the `floor` schema.
 *
 * These mirror supabase/migrations/*.sql. Once the schema is applied you can
 * replace this file with generated types:
 *
 *   supabase gen types typescript --project-id lovfbqnuxdihjidxacet \
 *     --schema floor > src/lib/database.types.ts
 *
 * Until then, hand-written types keep the app honest without a generation step
 * that would fail against a database the migrations have not reached yet.
 */

export type StaffRole = 'staff' | 'lead' | 'admin';
export type OrderKind = 'delivery' | 'prep';
export type MediaKind = 'still' | 'clip';
export type ScanSource = 'camera' | 'barcode_detector' | 'manual';

export interface Staff {
  id: string;
  email: string;
  user_id: string | null;
  display_name: string;
  role: StaffRole;
  active: boolean;
  facility: string;
  created_at: string;
  updated_at: string;
}

export interface LocationRow {
  prefix: string;
  label: string | null;
  unifi_camera_id: string | null;
  blind_spot: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Missing {
  id: string;
  valpn: string;
  location_last_seen: string | null;
  location_prefix: string | null;
  marked_at: string;
  marked_by: string | null;
  stacked_by: string | null;
  order_number: string | null;
  order_kind: OrderKind | null;
  /** numeric(12,2) arrives from PostgREST as a string; parse at the edge. */
  sold_price: string | null;
  ever_resold: boolean | null;
  /** null = still open, true = found, false = searched and not found. */
  found: boolean | null;
  found_note: string | null;
  found_by: string | null;
  found_at: string | null;
  found_client_event_id: string | null;
  sheet_tab: string | null;
  sheet_row: number | null;
  /** When Vista was last queried for this row. Null = never enriched. */
  facts_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A row of floor.open_missings -- the view cached to IndexedDB on load and
 * resolved against locally. Camera coverage is denormalized in so a scan result
 * can be rendered without a second query.
 */
export interface OpenMissing {
  id: string;
  valpn: string;
  location_last_seen: string | null;
  location_prefix: string | null;
  marked_at: string;
  marked_by: string | null;
  stacked_by: string | null;
  order_number: string | null;
  order_kind: OrderKind | null;
  sold_price: string | null;
  ever_resold: boolean | null;
  facts_at: string | null;
  sheet_tab: string | null;
  sheet_row: number | null;
  unifi_camera_id: string | null;
  blind_spot: boolean | null;
  location_label: string | null;
  media_count: number;
}

export interface ItemMedia {
  id: string;
  valpn: string;
  storage_path: string;
  kind: MediaKind;
  camera_id: string | null;
  captured_at: string | null;
  duration_seconds: string | null;
  bytes: number | null;
  uploaded_by_agent: string | null;
  created_at: string;
}

export interface ScanEvent {
  id: number;
  scanned_at: string;
  staff_id: string | null;
  raw_input: string | null;
  valpn: string | null;
  hit: boolean;
  missing_id: string | null;
  source: ScanSource;
  resolved_offline: boolean;
  device_label: string | null;
  client_event_id: string | null;
}

/** The two outcomes of a scan. Everything on the floor reduces to this. */
export type ScanVerdict =
  | { kind: 'clear'; valpn: string }
  | { kind: 'wanted'; valpn: string; item: OpenMissing }
  | { kind: 'unreadable'; raw: string };
