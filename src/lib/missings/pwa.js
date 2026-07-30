/**
 * PWA registration for the floor app.
 *
 * Called only from the /missings page, never at app boot. Two reasons that
 * matters: a visitor to the careers site should not be silently registering a
 * service worker they will never benefit from, and the SW's scope (/missings/)
 * makes it useless to them anyway.
 *
 * The manifest link is injected here for the same reason — the site's index.html
 * is shared with the careers app, and a global manifest would offer to install
 * "Vista Missing Items" to someone reading a job posting.
 */

let registered = false;

export function registerFloorPwa() {
  if (registered || typeof window === 'undefined') return;
  registered = true;

  injectManifestLink();
  injectThemeColor();

  if (!('serviceWorker' in navigator)) return;

  // Registration is not urgent and competes with the camera and the first list
  // fetch for bandwidth on a slow connection, so it waits for load.
  const register = () => {
    navigator.serviceWorker
      // Explicit scope, matching the script's location. Belt and braces: the
      // default would already be /missings/, but stating it means a future move
      // of this file fails loudly rather than widening the scope by accident.
      .register('/missings/sw.js', { scope: '/missings/' })
      .catch((err) => {
        // An unavailable service worker costs offline support, not function.
        console.warn('[missings] service worker registration failed:', err?.message);
      });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

function injectManifestLink() {
  if (document.querySelector('link[rel="manifest"][data-floor]')) return;
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/missings/manifest.webmanifest';
  link.dataset.floor = 'true';
  document.head.appendChild(link);
}

/**
 * Darkens the browser chrome to match the app. Removed on unmount so the
 * careers site does not inherit a near-black status bar.
 */
function injectThemeColor() {
  let meta = document.querySelector('meta[name="theme-color"][data-floor]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.dataset.floor = 'true';
    document.head.appendChild(meta);
  }
  meta.content = '#0A0E14';
}

/** Undo the document-level changes when leaving the floor app. */
export function unregisterFloorChrome() {
  document.querySelector('link[rel="manifest"][data-floor]')?.remove();
  document.querySelector('meta[name="theme-color"][data-floor]')?.remove();
  registered = false;
}
