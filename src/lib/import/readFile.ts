// Turn an uploaded CSV or Excel file into rows of text cells, in the browser.
// Nothing is uploaded. The xlsx library loads only when a file is read.
import type * as XLSXNS from 'xlsx';
import { parseCsv } from './csv';
import { MAX_FILE_BYTES } from './validate';

type XLSXModule = typeof XLSXNS;

export type ReadResult = { ok: true; rows: string[][] } | { ok: false; message: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** First sheet as text cells. Real date cells become YYYY-MM-DD so no day or month is guessed. */
export function workbookToRows(XLSX: XLSXModule, wb: XLSXNS.WorkBook): string[][] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws['!ref']) return [];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as XLSXNS.CellObject | undefined;
      if (!cell || cell.v === undefined || cell.v === null) { row.push(''); continue; }
      if (cell.t === 'd' && cell.v instanceof Date) {
        const d = cell.v;
        row.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      } else if (cell.t === 'n' && cell.z && XLSX.SSF.is_date(cell.z)) {
        const p = XLSX.SSF.parse_date_code(cell.v as number);
        row.push(p ? `${p.y}-${pad(p.m)}-${pad(p.d)}` : String(cell.v));
      } else row.push(String(cell.v));
    }
    rows.push(row);
  }
  return rows;
}

/** Read workbook bytes, keeping number formats so date cells can be told apart from numbers. */
export function readWorkbookRows(XLSX: XLSXModule, data: Uint8Array): string[][] {
  return workbookToRows(XLSX, XLSX.read(data, { type: 'array', cellNF: true }));
}

export function fileKind(name: string): 'csv' | 'xlsx' | null {
  const n = name.toLowerCase();
  if (n.endsWith('.csv')) return 'csv';
  // The old binary .xls format is not accepted: only .xlsx.
  if (n.endsWith('.xlsx')) return 'xlsx';
  return null;
}

export async function readSpreadsheet(file: File): Promise<ReadResult> {
  const kind = fileKind(file.name);
  if (!kind) return { ok: false, message: 'Use a .csv or .xlsx file.' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, message: 'This file is over 2 MB. Split it into smaller files.' };
  try {
    if (kind === 'csv') return { ok: true, rows: parseCsv(await file.text()) };
    const XLSX = await import('xlsx');
    return { ok: true, rows: readWorkbookRows(XLSX, new Uint8Array(await file.arrayBuffer())) };
  } catch {
    return { ok: false, message: 'We could not open this file. Save it again as .xlsx or .csv and retry.' };
  }
}
