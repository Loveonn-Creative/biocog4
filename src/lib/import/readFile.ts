// Turn an uploaded CSV or Excel file into rows of text cells, in the browser.
// Nothing is uploaded. Excel files are parsed in a Web Worker with a hard time
// limit (see xlsxWorker.ts); the xlsx library loads only when a file is read.
import { parseCsv } from './csv';
import { MAX_FILE_BYTES } from './validate';
import { isRows, looksLikeXlsx, readWorkbookRows } from './workbookRows';

export { workbookToRows, readWorkbookRows, looksLikeXlsx } from './workbookRows';

export type ReadResult = { ok: true; rows: string[][] } | { ok: false; message: string };

/** A crafted workbook can make the parser spin; the worker is stopped after this. */
export const XLSX_PARSE_TIMEOUT_MS = 10_000;

const COULD_NOT_OPEN = 'We could not open this file. Save it again as .xlsx or .csv and retry.';

export function fileKind(name: string): 'csv' | 'xlsx' | null {
  const n = name.toLowerCase();
  if (n.endsWith('.csv')) return 'csv';
  // The old binary .xls format is not accepted: only .xlsx.
  if (n.endsWith('.xlsx')) return 'xlsx';
  return null;
}

/** Parse in a worker; resolves null if the worker fails, times out or returns anything but string rows. */
function parseInWorker(data: ArrayBuffer, timeoutMs: number): Promise<string[][] | null> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./xlsxWorker.ts', import.meta.url), { type: 'module' });
    let settled = false;
    const done = (rows: string[][] | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(rows);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    worker.onmessage = (e: MessageEvent<{ ok?: unknown; rows?: unknown }>) => {
      const m = e.data;
      done(m && m.ok === true && isRows(m.rows) ? m.rows : null);
    };
    worker.onerror = () => done(null);
    worker.onmessageerror = () => done(null);
    // Transfer the bytes: the page keeps no copy of the file once it is handed over.
    worker.postMessage(data, [data]);
  });
}

export async function readSpreadsheet(file: File): Promise<ReadResult> {
  const kind = fileKind(file.name);
  if (!kind) return { ok: false, message: 'Use a .csv or .xlsx file.' };
  // Size is checked before any byte is read or parsed.
  if (file.size > MAX_FILE_BYTES) return { ok: false, message: 'This file is over 2 MB. Split it into smaller files.' };
  try {
    if (kind === 'csv') return { ok: true, rows: parseCsv(await file.text()) };
    const data = await file.arrayBuffer();
    if (data.byteLength > MAX_FILE_BYTES || !looksLikeXlsx(new Uint8Array(data, 0, Math.min(4, data.byteLength)))) {
      return { ok: false, message: COULD_NOT_OPEN };
    }
    if (typeof Worker === 'undefined') {
      // No worker support (tests, very old browsers): parse in place with the same options.
      const XLSX = await import('xlsx');
      return { ok: true, rows: readWorkbookRows(XLSX, new Uint8Array(data)) };
    }
    const rows = await parseInWorker(data, XLSX_PARSE_TIMEOUT_MS);
    return rows ? { ok: true, rows } : { ok: false, message: COULD_NOT_OPEN };
  } catch {
    return { ok: false, message: COULD_NOT_OPEN };
  }
}
