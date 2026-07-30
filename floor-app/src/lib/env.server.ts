// The whole point of this file. If a client component (directly or through any
// import chain) reaches for something in here, the build fails loudly instead of
// quietly inlining a credential into the browser bundle.
import 'server-only';

/**
 * Server-only environment: Vista credentials, the Supabase service_role key,
 * any Slack token.
 *
 * Read lazily through accessor functions rather than as module constants. A
 * missing VISTA_API_PASSWORD should fail when something tries to call Vista, not
 * break every render including the login page.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Names only. Never interpolate the value of a secret into an error, because
    // errors reach logs and sometimes responses.
    throw new Error(`Missing required server env var: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * Vista API credentials. Used only from route handlers and server actions that
 * proxy to Vista -- browsers cannot reach that host (CORS) and must not hold
 * these anyway.
 */
export function vistaEnv() {
  return {
    baseUrl: process.env.VISTA_API_BASE_URL ?? 'https://api.vistaapp.tech/api/v1',
    username: required('VISTA_API_USERNAME'),
    password: required('VISTA_API_PASSWORD'),
  } as const;
}

/**
 * service_role bypasses RLS completely. Only for the Apps Script ingest path and
 * the future on-prem media agent -- never for a request carrying a user session,
 * where the anon key plus RLS is the correct and safer tool.
 */
export function serviceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY');
}

export function slackToken(): string | undefined {
  return optional('SLACK_BOT_TOKEN');
}
