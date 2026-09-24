/**
 * Browser-side cache for TIPS data (IndexedDB). Screens paint from here instantly on a cold
 * start; useTips then revalidates against the bridge. Only the parsed JSON the screens show
 * is stored (the bridge already drops sensitive profile fields). Cleared on sign-out.
 */
const DB = 'tokaihub';
const STORE = 'tips';

let dbPromise: Promise<IDBDatabase | null> | null = null;
function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null); // private mode etc.: run without a local cache
    } catch { resolve(null); }
  });
  return dbPromise;
}

export interface CachedEntry { data: unknown; cachedAt: number }

export async function readLocal(key: string): Promise<CachedEntry | null> {
  const db = await open();
  if (!db) return null;
  return new Promise(resolve => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as CachedEntry) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function writeLocal(key: string, entry: CachedEntry) {
  const db = await open();
  if (!db) return;
  try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(entry, key); } catch { /* quota: skip */ }
}

export async function clearLocal() {
  const db = await open();
  if (!db) return;
  try { db.transaction(STORE, 'readwrite').objectStore(STORE).clear(); } catch { /* ignore */ }
}
