/**
 * Local store for the floor app: the open-list cache and the outbound write queue.
 *
 * Warehouse Wi-Fi drops constantly, and the core promise of this app is that a
 * scan returns an answer with ZERO network. So the open list is mirrored into
 * IndexedDB on load and every scan resolves against that mirror first. Writes go
 * into a durable queue and flush when the connection comes back.
 *
 * Hand-rolled rather than pulling in `idb`: this needs three object stores and
 * about six operations, and a dependency that ships to every visitor of the
 * careers site should earn its place.
 */

const DB_NAME = 'vista-missings';
const DB_VERSION = 1;

const STORE_OPEN = 'open';   // keyPath valpn — the cached open list
const STORE_META = 'meta';   // key/value — last sync time, device label
const STORE_QUEUE = 'queue'; // autoIncrement — pending writes

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_OPEN)) {
        db.createObjectStore(STORE_OPEN, { keyPath: 'valpn' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    // Private browsing and some locked-down devices refuse IndexedDB. Reset so a
    // later attempt can retry, and let callers degrade to online-only.
    dbPromise = null;
    throw err;
  });

  return dbPromise;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    try {
      result = fn(s);
    } catch (err) {
      reject(err);
      return;
    }
    t.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const wrap = (req) => ({ __req: req });

/* -------------------------------------------------------------------------- */
/* Open-list cache                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Replace the cached open list wholesale.
 *
 * A full replace rather than a merge, because an item leaving the open list
 * (someone else found it) is exactly as important as one joining it — a merge
 * would leave resolved items on the floor's screens forever.
 */
export async function cacheOpenList(items) {
  const db = await openDb();
  await tx(db, STORE_OPEN, 'readwrite', (store) => {
    store.clear();
    for (const item of items) if (item?.valpn) store.put(item);
  });
  await setMeta('lastSync', Date.now());
}

export async function readOpenList() {
  const db = await openDb();
  return tx(db, STORE_OPEN, 'readonly', (store) => wrap(store.getAll()));
}

/**
 * The core offline question: is this VALPN wanted?
 *
 * A direct keyed get, so it stays O(1) and instant even with a few thousand
 * cached rows — this runs on every scan, and a scan must feel immediate.
 */
export async function lookupCached(valpn) {
  if (!valpn) return null;
  const db = await openDb();
  const row = await tx(db, STORE_OPEN, 'readonly', (store) => wrap(store.get(valpn)));
  return row ?? null;
}

/**
 * Apply a resolution to the local mirror immediately, so the UI and any
 * subsequent scan agree before the server has heard about it.
 */
export async function removeCached(valpn) {
  const db = await openDb();
  await tx(db, STORE_OPEN, 'readwrite', (store) => store.delete(valpn));
}

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

export async function setMeta(key, value) {
  const db = await openDb();
  await tx(db, STORE_META, 'readwrite', (store) => store.put(value, key));
}

export async function getMeta(key) {
  const db = await openDb();
  const value = await tx(db, STORE_META, 'readonly', (store) => wrap(store.get(key)));
  return value ?? null;
}

/**
 * A stable per-device label, so scan_events can be traced to a specific phone
 * when one develops a bad lens or a cracked screen.
 */
export async function deviceLabel() {
  let label = await getMeta('deviceLabel').catch(() => null);
  if (!label) {
    label = `dev-${Math.random().toString(36).slice(2, 8)}`;
    await setMeta('deviceLabel', label).catch(() => {});
  }
  return label;
}

/* -------------------------------------------------------------------------- */
/* Write queue                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Queue an outbound write.
 *
 * Every entry carries a clientEventId generated HERE, at the moment of the
 * action. That is what makes the flush idempotent server-side: mark_found and
 * log_scan both dedupe on it, so a flush that succeeds but loses its response
 * can retry without double-filing or overwriting a newer decision.
 */
export async function enqueue(entry) {
  const db = await openDb();
  const record = {
    ...entry,
    clientEventId: entry.clientEventId || uuid(),
    queuedAt: Date.now(),
    attempts: 0,
  };
  await tx(db, STORE_QUEUE, 'readwrite', (store) => store.add(record));
  return record;
}

export async function readQueue() {
  const db = await openDb();
  return tx(db, STORE_QUEUE, 'readonly', (store) => wrap(store.getAll()));
}

export async function queueSize() {
  try {
    const db = await openDb();
    return await tx(db, STORE_QUEUE, 'readonly', (store) => wrap(store.count()));
  } catch {
    return 0;
  }
}

export async function dequeue(id) {
  const db = await openDb();
  await tx(db, STORE_QUEUE, 'readwrite', (store) => store.delete(id));
}

/** Record a failed attempt so the UI can show something is genuinely stuck. */
export async function markAttempt(id, error) {
  const db = await openDb();
  const db2 = db;
  const existing = await tx(db2, STORE_QUEUE, 'readonly', (store) => wrap(store.get(id)));
  if (!existing) return;
  await tx(db2, STORE_QUEUE, 'readwrite', (store) =>
    store.put({ ...existing, attempts: (existing.attempts || 0) + 1, lastError: String(error).slice(0, 200) }),
  );
}

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older WebViews, which some warehouse handhelds still ship.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Wipe everything. Used on sign-out so one person's list is not left on a shared phone. */
export async function clearAll() {
  try {
    const db = await openDb();
    await tx(db, STORE_OPEN, 'readwrite', (s) => s.clear());
    await tx(db, STORE_QUEUE, 'readwrite', (s) => s.clear());
    await tx(db, STORE_META, 'readwrite', (s) => s.clear());
  } catch {
    // Nothing to clear if IndexedDB was never available.
  }
}
