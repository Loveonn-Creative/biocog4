// A guest's invoice results, kept only in their own browser for 24 hours.
// The server keeps nothing for guests (extract-document), so this is where a
// guest's result, its records and the Verify preview come from. Expired
// entries are removed whenever the store is read. Cleared on sign-out, on
// "Not mine", and after the results are added to an account; kept across the
// guest-to-signed-in step so the person can be asked first (identity.ts).
// Every call fails soft: a blocked or private-mode browser just has no copy.

import { onIdentityReset } from '@/lib/identity';
import { buildEmissionRows, type EmissionInsertRow, type PersistableExtraction } from '@/lib/mrvPersistence';

const DB = 'senseible-guest-results';
const STORE = 'results';
export const GUEST_RESULT_TTL_MS = 24 * 60 * 60 * 1000;
export const GUEST_RESULT_MAX = 60;

export type GuestRow = EmissionInsertRow & { id: string };

export interface GuestResult<T extends PersistableExtraction = PersistableExtraction> {
  hash: string;
  fileName: string;
  savedAt: number;
  expiresAt: number;
  extracted: T;
  rows: GuestRow[];
}

/** Rows for one invoice, with stable local ids. Pure. */
export function guestRowsFor(extracted: PersistableExtraction, hash: string): GuestRow[] {
  const documentId = guestDocumentId(hash);
  return buildEmissionRows(extracted, { documentId, sessionId: null, userId: null })
    .map((r, i) => ({ ...r, id: `${documentId}-${i}` }));
}
export const guestDocumentId = (hash: string) => `guest-${hash.slice(0, 16)}`;

export const isExpired = (e: { expiresAt: number }, now = Date.now()) => e.expiresAt <= now;

/** Which entries to drop: expired ones, then the oldest beyond the cap. Pure. */
export function guestResultsToDrop(entries: Array<{ hash: string; savedAt: number; expiresAt: number }>, now = Date.now(), max = GUEST_RESULT_MAX): string[] {
  const live = entries.filter((e) => !isExpired(e, now)).sort((a, b) => b.savedAt - a.savedAt);
  const keep = new Set(live.slice(0, max).map((e) => e.hash));
  return entries.filter((e) => !keep.has(e.hash)).map((e) => e.hash);
}

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

/** Keep a result. Returns false when the browser could not store it (the result still shows, it just will not last). */
export async function putGuestResult(entry: Omit<GuestResult, 'savedAt' | 'expiresAt'>, now = Date.now()): Promise<boolean> {
  const ok = await run('readwrite', (s) => s.put({ ...entry, savedAt: now, expiresAt: now + GUEST_RESULT_TTL_MS }));
  await purgeGuestResults(now);
  return ok !== null;
}

/** All live results, newest first; expired ones are removed on the way. */
export async function listGuestResults(now = Date.now()): Promise<GuestResult[]> {
  await purgeGuestResults(now);
  const all = (await run<GuestResult[]>('readonly', (s) => s.getAll() as IDBRequest<GuestResult[]>)) ?? [];
  return all.filter((e) => !isExpired(e, now)).sort((a, b) => b.savedAt - a.savedAt);
}

export async function getGuestResult(hash: string, now = Date.now()): Promise<GuestResult | null> {
  const e = (await run<GuestResult | undefined>('readonly', (s) => s.get(hash) as IDBRequest<GuestResult | undefined>)) ?? null;
  if (!e) return null;
  if (isExpired(e, now)) { await run('readwrite', (s) => s.delete(hash)); return null; }
  return e;
}

export async function purgeGuestResults(now = Date.now()): Promise<void> {
  const all = (await run<GuestResult[]>('readonly', (s) => s.getAll() as IDBRequest<GuestResult[]>)) ?? [];
  const drop = guestResultsToDrop(all, now);
  if (drop.length) await run('readwrite', (s) => { drop.forEach((h) => s.delete(h)); });
}

export async function clearGuestResults(): Promise<void> {
  await run('readwrite', (s) => s.clear());
}

/** Records shaped like stored rows (with their invoice), for the Verify preview. */
export function rowsForPreview(results: GuestResult[]) {
  return results.flatMap((r) => r.rows.map((row) => ({
    id: row.id, document_id: row.document_id, category: row.category, scope: row.scope, co2_kg: row.co2_kg,
    activity_data: row.activity_data, activity_unit: row.activity_unit, emission_factor: row.emission_factor,
    data_quality: row.data_quality, verification_notes: row.verification_notes,
    documents: {
      vendor: r.extracted.vendor ?? null, invoice_number: r.extracted.invoiceNumber ?? null, amount: r.extracted.amount ?? null,
      confidence: r.extracted.confidence ?? null, document_hash: r.hash, invoice_date: r.extracted.date ?? null,
    },
  })));
}

// Sign-out or a different account: clear. Guest to signed-in: keep, so the
// import prompt can ask whether these are the new account's.
onIdentityReset((t) => { if (!(t && t.from === '' && t.to)) void clearGuestResults(); });
