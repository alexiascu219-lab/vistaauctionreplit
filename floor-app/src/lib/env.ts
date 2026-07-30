/**
 * Public environment. Safe to import from anywhere, including client components.
 *
 * Anything secret belongs in env.server.ts, which is guarded by 'server-only'.
 * Do not add a non-NEXT_PUBLIC_ variable to this file.
 */

/*
 * Fallbacks for the public Supabase values, matching the convention already
 * established in the root app's src/supabaseClient.js.
 *
 * These are safe to ship. The anon key is designed to be public — it is inlined
 * into the browser bundle either way, and it grants nothing on its own: the
 * `floor` schema denies anon entirely, and every authenticated read additionally
 * requires an active row in floor.staff.
 *
 * They exist as fallbacks so a deploy cannot fail (or worse, half-succeed) purely
 * because a NEXT_PUBLIC_ var was not set on the host. A real env var always wins.
 */
const SUPABASE_URL_FALLBACK = 'https://lovfbqnuxdihjidxacet.supabase.co';
const SUPABASE_ANON_FALLBACK = 'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_FALLBACK,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK,
} as const;

/**
 * All app tables live in the `floor` schema, not `public`. Both the browser and
 * server Supabase clients must be configured with it, and it has to be listed
 * under Settings -> API -> Exposed schemas in the Supabase dashboard.
 */
export const DB_SCHEMA = 'floor' as const;
