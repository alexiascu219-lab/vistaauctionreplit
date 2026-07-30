'use client';

import { createBrowserClient } from '@supabase/ssr';

import { DB_SCHEMA, publicEnv } from '@/lib/env';

/**
 * Browser Supabase client. Anon key only -- authorization is RLS plus an active
 * row in floor.staff. There is no code path where the browser holds
 * service_role, and adding one would defeat the entire access model.
 *
 * createBrowserClient memoizes internally, so calling this per component is fine.
 */
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    db: { schema: DB_SCHEMA },
  });
}
