/**
 * Base path handling.
 *
 * This app is served at /missings on vistaauction.vercel.app, which is a Vite SPA
 * on a different Vercel project. One Vercel project builds one framework, so the
 * two cannot share a project — instead this is a multi-zone setup: floor-app is
 * its own project with basePath '/missings', and the careers project rewrites
 * /missings/* through to it.
 *
 * Next applies basePath automatically to <Link href>, router navigations and
 * next.config redirects. It does NOT apply it to:
 *   - raw URLs built with `new URL(path, origin)`
 *   - HTML form `action` attributes
 *   - anything handed to an external service, e.g. Supabase's emailRedirectTo
 *
 * Those are exactly the places auth lives, so they go through withBasePath().
 */
export const BASE_PATH = '/missings';

/** Prefix an app-absolute path ('/login') with the base path ('/missings/login'). */
export function withBasePath(path: string): string {
  if (!path.startsWith('/')) throw new Error(`withBasePath expects a rooted path, got: ${path}`);
  return path === '/' ? BASE_PATH : `${BASE_PATH}${path}`;
}

/**
 * Absolute public URL for a path, e.g. for Supabase's emailRedirectTo.
 *
 * Prefers NEXT_PUBLIC_SITE_URL because this app runs behind a rewrite from
 * another Vercel project: the browser only ever sees vistaauction.vercel.app,
 * but the upstream request arrives with this project's own host. Deriving the
 * origin from request headers would therefore mint magic links pointing at the
 * wrong hostname. Set NEXT_PUBLIC_SITE_URL and there is nothing to guess.
 *
 * Falls back to the caller-supplied origin, which is correct for local dev and
 * for hitting this project's own Vercel URL directly.
 */
export function siteUrl(path: string, fallbackOrigin: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || fallbackOrigin;
  return new URL(withBasePath(path), base).toString();
}
