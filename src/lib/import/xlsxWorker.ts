// Reads an .xlsx file off the main thread. The xlsx 0.18.x parser has known
// prototype-pollution and slow-regex advisories, so it runs here: anything it
// pollutes stays inside this worker, only plain string rows cross back (the
// structured clone copies own values, never prototypes), and the page can stop
// the worker if a crafted file makes parsing hang.
import * as XLSX from 'xlsx';
import { readWorkbookRows } from './workbookRows';

type Ctx = { onmessage: ((e: MessageEvent<ArrayBuffer>) => void) | null; postMessage: (m: unknown) => void };
const ctx = self as unknown as Ctx;

ctx.onmessage = (e) => {
  try {
    ctx.postMessage({ ok: true, rows: readWorkbookRows(XLSX, new Uint8Array(e.data)) });
  } catch {
    ctx.postMessage({ ok: false });
  }
};
