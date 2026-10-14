// Guest uploads are never stored on the server. So a guest can still open the
// file behind a result ("View source" in History), the original stays in this
// browser only, keyed by its document fingerprint. Cleared when the identity on
// the device changes (see identity.ts). Every call fails soft: a blocked or
// private-mode browser simply has no copy.

import { onIdentityReset } from '@/lib/identity';

const DB = 'senseible-guest-sources';
const STORE = 'files';
export const GUEST_CACHE_LIMITS = { maxFiles: 30, maxBytes: 60 * 1024 * 1024 } as const;

interface Entry { hash: string; blob: Blob; name: string; type: string; savedAt: number }

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'hash' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  return open().then((db) => new Promise((resolve) => {
    if (!db) return resolve(null);
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => { resolve(req ? (req.result as T) : null); db.close(); };
      tx.onerror = tx.onabort = () => { resolve(null); db.close(); };
    } catch { resolve(null); db.close(); }
  }));
}

/** Which entries to drop so the newest fit the limits. Pure, for tests. */
export function entriesToPrune(entries: Array<{ hash: string; size: number; savedAt: number }>, limits = GUEST_CACHE_LIMITS): string[] {
  const newestFirst = [...entries].sort((a, b) => b.savedAt - a.savedAt);
  const keep: string[] = [];
  let bytes = 0;
  for (const e of newestFirst) {
    if (keep.length < limits.maxFiles && bytes + e.size <= limits.maxBytes) { keep.push(e.hash); bytes += e.size; }
  }
  return newestFirst.filter((e) => !keep.includes(e.hash)).map((e) => e.hash);
}

/** Keep a guest's uploaded file in this browser. */
export async function cacheGuestSource(hash: string | null | undefined, file: Blob, name: string): Promise<void> {
  if (!hash || file.size > GUEST_CACHE_LIMITS.maxBytes) return;
  await run('readwrite', (s) => s.put({ hash, blob: file, name, type: file.type || 'application/octet-stream', savedAt: Date.now() } satisfies Entry));
  const all = (await run<Entry[]>('readonly', (s) => s.getAll() as IDBRequest<Entry[]>)) ?? [];
  const drop = entriesToPrune(all.map((e) => ({ hash: e.hash, size: e.blob.size, savedAt: e.savedAt })));
  if (drop.length) await run('readwrite', (s) => { drop.forEach((h) => s.delete(h)); });
}

export async function getGuestSource(hash: string): Promise<Entry | null> {
  await purgeExpiredGuestSources();
  return (await run<Entry | undefined>('readonly', (s) => s.get(hash) as IDBRequest<Entry | undefined>)) ?? null;
}

export async function cachedGuestHashes(): Promise<Set<string>> {
  const keys = (await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())) ?? [];
  return new Set(keys.map(String));
}

export async function clearGuestSources(): Promise<void> {
  await run('readwrite', (s) => s.clear());
}

/** Guest files are kept as long as their results: 24 hours. */
export const GUEST_SOURCE_TTL_MS = 24 * 60 * 60 * 1000;
export async function purgeExpiredGuestSources(now = Date.now()): Promise<void> {
  const all = (await run<Entry[]>('readonly', (s) => s.getAll() as IDBRequest<Entry[]>)) ?? [];
  const old = all.filter((e) => now - e.savedAt >= GUEST_SOURCE_TTL_MS).map((e) => e.hash);
  if (old.length) await run('readwrite', (s) => { old.forEach((h) => s.delete(h)); });
}

// A different person on this device never sees the previous guest's files.
// Guest to signed-in keeps them until the import prompt is answered (the
// files are re-read under the new account if the person says they are theirs).
onIdentityReset((t) => { if (!(t && t.from === '' && t.to)) void clearGuestSources(); });
