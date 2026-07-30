import { normalizeValpn } from './valpn';
import { fetchOpenMissings, logScan, markFound } from './missingsApi';
import * as db from './db';

/**
 * The offline brain: resolve scans locally, queue writes, reconcile later.
 *
 * The rule everything here serves: **a scan must return an answer with zero
 * network.** Warehouse Wi-Fi is unreliable, and a worker holding an item cannot
 * wait on a round trip that may never complete. So the open list is mirrored to
 * IndexedDB and every verdict comes from that mirror. The network is used to
 * refresh the mirror and to drain the write queue — never on the critical path
 * of answering "is this wanted?".
 */

/* -------------------------------------------------------------------------- */
/* Cache refresh                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Pull the open list and mirror it locally.
 *
 * Returns the items either way: if the network fails we fall back to whatever is
 * cached, because a slightly stale list is enormously more useful than none.
 */
export async function refreshOpenList() {
  try {
    const items = await fetchOpenMissings();
    await db.cacheOpenList(items).catch(() => {});
    return { items, stale: false, lastSync: Date.now() };
  } catch (err) {
    const cached = await db.readOpenList().catch(() => []);
    const lastSync = await db.getMeta('lastSync').catch(() => null);
    if (cached.length) return { items: cached, stale: true, lastSync, error: err };
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* Scan resolution                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The whole point of the app, in one function.
 *
 *   unreadable — could not be parsed as a VALPN
 *   clear      — parsed, not on the open list, move on
 *   wanted     — parsed and on the list; the item is returned with it
 *
 * Resolution is local and synchronous-feeling. The scan_events write is fired
 * afterwards and never awaited on the UI path — logging must not delay the
 * answer, and if it fails it goes in the queue.
 */
export async function resolveScan(rawInput, { source = 'camera' } = {}) {
  const valpn = normalizeValpn(rawInput);

  if (!valpn) {
    queueScanLog({ rawInput, source, resolvedOffline: true });
    return { kind: 'unreadable', raw: String(rawInput ?? '') };
  }

  let item = null;
  let resolvedOffline = true;

  try {
    item = await db.lookupCached(valpn);
  } catch {
    // No IndexedDB (private browsing, locked-down device). Fall back to the
    // network so the app still works, just without the offline guarantee.
    resolvedOffline = false;
    try {
      const items = await fetchOpenMissings();
      item = items.find((i) => i.valpn === valpn) ?? null;
    } catch {
      item = null;
    }
  }

  queueScanLog({ rawInput, source, resolvedOffline });

  return item ? { kind: 'wanted', valpn, item } : { kind: 'clear', valpn };
}

/**
 * Log a scan without ever blocking the caller.
 *
 * Tries the network first; on any failure the event lands in the durable queue.
 * Either way this returns immediately — the verdict is already on screen.
 */
function queueScanLog({ rawInput, source, resolvedOffline }) {
  const clientEventId = db.uuid();

  (async () => {
    const deviceLabel = await db.deviceLabel().catch(() => null);
    const payload = { rawInput, source, resolvedOffline, deviceLabel, clientEventId };

    if (!navigator.onLine) {
      await db.enqueue({ type: 'scan', ...payload }).catch(() => {});
      return;
    }

    try {
      await logScan(payload);
    } catch {
      await db.enqueue({ type: 'scan', ...payload }).catch(() => {});
    }
  })();
}

/* -------------------------------------------------------------------------- */
/* Found / not-found writeback                                                */
/* -------------------------------------------------------------------------- */

/**
 * Resolve an item, optimistically.
 *
 * The local mirror is updated FIRST so the UI and any subsequent scan agree
 * immediately — someone who marks an item found and re-scans it two seconds
 * later must not be told it is still wanted.
 *
 * Returns { queued } so the UI can say "saved" versus "will send when you're
 * back online" honestly, rather than claiming success it cannot verify.
 */
export async function resolveItem({ valpn, found, note = null }) {
  const clientEventId = db.uuid();

  await db.removeCached(valpn).catch(() => {});

  const payload = { valpn, found, note, clientEventId };

  if (!navigator.onLine) {
    await db.enqueue({ type: 'found', ...payload }).catch(() => {});
    return { queued: true };
  }

  try {
    await markFound(payload);
    return { queued: false };
  } catch (err) {
    // A genuine rejection (not on the list, not authorized) should not be
    // retried forever — only transport failures are worth queueing.
    if (isPermanentError(err)) throw err;
    await db.enqueue({ type: 'found', ...payload }).catch(() => {});
    return { queued: true };
  }
}

function isPermanentError(err) {
  const code = err?.code || '';
  // P0002 = not on the missing list, 42501 = not authorized, 22023 = bad input.
  return code === 'P0002' || code === '42501' || code === '22023';
}

/* -------------------------------------------------------------------------- */
/* Queue flush                                                                */
/* -------------------------------------------------------------------------- */

let flushing = false;

/**
 * Drain the write queue.
 *
 * Safe to call from anywhere and often — it self-serialises, and every entry
 * carries a clientEventId that mark_found and log_scan dedupe on server-side, so
 * a retry after a lost response is a no-op rather than a double-file.
 *
 * A permanently-rejected entry is dropped rather than retried forever; leaving
 * it in place would block everything behind it.
 */
export async function flushQueue() {
  if (flushing || !navigator.onLine) return { sent: 0, failed: 0 };
  flushing = true;

  let sent = 0;
  let failed = 0;

  try {
    const entries = await db.readQueue().catch(() => []);

    for (const entry of entries) {
      try {
        if (entry.type === 'found') {
          await markFound({
            valpn: entry.valpn,
            found: entry.found,
            note: entry.note,
            clientEventId: entry.clientEventId,
          });
        } else if (entry.type === 'scan') {
          await logScan({
            rawInput: entry.rawInput,
            source: entry.source,
            resolvedOffline: entry.resolvedOffline,
            deviceLabel: entry.deviceLabel,
            clientEventId: entry.clientEventId,
          });
        }
        await db.dequeue(entry.id);
        sent += 1;
      } catch (err) {
        if (isPermanentError(err)) {
          await db.dequeue(entry.id).catch(() => {});
        } else {
          await db.markAttempt(entry.id, err?.message || err).catch(() => {});
          failed += 1;
          // Stop on the first transport failure: the connection is evidently
          // still bad, and hammering it drains the battery for nothing.
          break;
        }
      }
    }
  } finally {
    flushing = false;
  }

  return { sent, failed };
}

export const pendingCount = db.queueSize;
export const clearLocal = db.clearAll;
