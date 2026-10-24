// Local-first storage so the suite works offline: one IndexedDB store, with
// localStorage as a fallback. Nothing leaves the device unless exported.
import { WORKBOOK_SCHEMA, type Workbook } from './types';

const DB = 'senseible-cbam-suite';
const STORE = 'workbooks';
const KEY = 'current';
const LS_KEY = 'senseible.cbam-suite.current';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function loadWorkbook(): Promise<Workbook | null> {
  const db = await openDb();
  if (db) {
    const got = await new Promise<unknown>((resolve) => {
      try {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
    if (isWorkbook(got)) return got;
  }
  try { const raw = localStorage.getItem(LS_KEY); const w = raw ? JSON.parse(raw) : null; return isWorkbook(w) ? w : null; } catch { return null; }
}

export async function saveWorkbook(w: Workbook): Promise<void> {
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(w, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch { resolve(); }
    });
    return;
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(w)); } catch { /* storage unavailable: state stays in memory */ }
}

export function isWorkbook(v: unknown): v is Workbook {
  const w = v as Workbook;
  return Boolean(w && typeof w === 'object' && w.schema === WORKBOOK_SCHEMA && w.installation && Array.isArray(w.processes) && Array.isArray(w.streams) && w.verification);
}

/** Parse an imported workbook file; throws a readable message when it is not one. */
export function parseWorkbookFile(text: string): Workbook {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not a CBAM workbook (not valid JSON).'); }
  const w = (data as { workbook?: unknown })?.workbook ?? data;
  if (!isWorkbook(w)) throw new Error('This file is not a Senseible CBAM workbook.');
  return w;
}
