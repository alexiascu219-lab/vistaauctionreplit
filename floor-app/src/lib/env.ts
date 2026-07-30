/**
 * Public environment. Safe to import from anywhere, including client components.
 *
 * Anything secret belongs in env.server.ts, which is guarded by 'server-only'.
 * Do not add a non-NEXT_PUBLIC_ variable to this file.
 */

function requiredPublic(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.local.example to .env.local and fill it in, ` +
        `or set it in the Vercel project settings.`,
    );
  }
  return value;
}

// Read off process.env by literal key so Next's build-time inlining can see them.
export const publicEnv = {
  supabaseUrl: requiredPublic(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: requiredPublic(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;

/**
 * All app tables live in the `floor` schema, not `public`. Both the browser and
 * server Supabase clients must be configured with it, and it has to be listed
 * under Settings -> API -> Exposed schemas in the Supabase dashboard.
 */
export const DB_SCHEMA = 'floor' as const;
