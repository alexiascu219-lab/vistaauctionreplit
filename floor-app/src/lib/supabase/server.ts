import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { DB_SCHEMA, publicEnv } from '@/lib/env';

/**
 * Supabase client for server components, server actions and route handlers.
 *
 * Still the anon key: the request carries a user session and RLS is what we want
 * enforcing access. service_role is reserved for the ingest and media-agent paths
 * that have no user attached.
 *
 * Must be created per request -- cookies() is request-scoped, so a module-level
 * singleton would leak one user's session into another's request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    db: { schema: DB_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. That is expected and harmless
          // here: middleware refreshes the session on every request, so the
          // refreshed tokens are already being persisted there.
        }
      },
    },
  });
}
