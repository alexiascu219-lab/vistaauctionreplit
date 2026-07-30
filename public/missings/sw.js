/*
 * Service worker for the missing-items floor app.
 *
 * SCOPE IS LOAD-BEARING. This file lives at /missings/sw.js, so its default
 * scope is /missings/ and it can only ever control pages under that path. The
 * careers site, the HR portal, the pickups and label tools are all outside it
 * and are never intercepted. Moving this file to the site root would silently
 * put every page on the domain behind this cache — don't.
 *
 * Once a /missings page IS controlled, every request that page makes passes
 * through here, including the root-level /assets/* bundles. That is what lets
 * the app boot with no network at all.
 *
 * Strategy, by request type:
 *   navigations     network-first, falling back to the cached shell. The floor
 *                   needs the latest build when it can get it, and something
 *                   rather than nothing when it can't.
 *   /assets/*       cache-first. Vite content-hashes these, so a given URL is
 *                   immutable and a stale hit is impossible.
 *   Supabase, /api  never cached. Item data and Vista lookups must not be
 *                   served stale from here — IndexedDB owns offline data, and
 *                   two competing caches would disagree.
 */

const VERSION = 'v1';
const SHELL_CACHE = `vista-missings-shell-${VERSION}`;
const ASSET_CACHE = `vista-missings-assets-${VERSION}`;
const SHELL_URL = '/missings';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort: a failed precache must not block activation, or a bad
      // network on first load would leave the app permanently uninstalled.
      await cache.add(new Request(SHELL_URL, { cache: 'reload' })).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('vista-missings-') && !n.endsWith(VERSION))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

function isAssetRequest(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/assets/');
}

function isNeverCached(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.supabase.in')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is cacheable. A POST to /api/vista or a Supabase RPC must always
  // hit the network, and replaying one from a cache would be actively wrong.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isNeverCached(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(SHELL_URL, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(SHELL_URL);
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
              '<body style="background:#0A0E14;color:#e2e8f0;font:16px system-ui;padding:2rem">' +
              '<h1>Offline</h1><p>Reconnect to load the app for the first time.</p></body>',
            { headers: { 'Content-Type': 'text/html' }, status: 503 },
          );
        }
      })(),
    );
    return;
  }

  if (isAssetRequest(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })(),
    );
  }
});

/** Lets the page trigger an immediate update instead of waiting for a reload. */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
