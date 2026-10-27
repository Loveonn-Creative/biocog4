// Routing for files picked in the upload boxes. A spreadsheet (CSV or Excel)
// is never sent to the invoice reader: it is handed to the /import row
// checker in this browser. PDFs and photos keep their usual path. Tiny and
// dependency-free, so the homepage bundle does not grow.

/** Extra entries for an upload box's accept attribute. */
export const SPREADSHEET_ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const SHEET_EXT = /\.(csv|xlsx)$/i;
const SHEET_TYPES = new Set(['text/csv', 'application/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

/** True for a CSV or .xlsx file, by name or type. PDFs and images are never spreadsheets. */
export function isSpreadsheetFile(file: { name?: string; type?: string }): boolean {
  const type = (file.type ?? '').toLowerCase();
  if (type.startsWith('image/') || type === 'application/pdf') return false;
  return SHEET_EXT.test(file.name ?? '') || SHEET_TYPES.has(type);
}

/** Bulk upload: spreadsheets go to the row checker, everything else to the reader as before. */
export function splitUploads<T extends { name?: string; type?: string }>(files: T[]): { reader: T[]; sheets: T[] } {
  const reader: T[] = [];
  const sheets: T[] = [];
  for (const f of files) (isSpreadsheetFile(f) ? sheets : reader).push(f);
  return { reader, sheets };
}

// The file waiting for /import, kept in memory only (never stored).
let pending: File | null = null;
export function handOffSpreadsheet(file: File): void { pending = file; }
export function takeHandedOffSpreadsheet(): File | null { const f = pending; pending = null; return f; }
