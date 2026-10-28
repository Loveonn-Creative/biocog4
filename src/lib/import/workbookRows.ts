// Pure workbook-to-rows helpers, shared by the page and the parsing worker.
import type * as XLSXNS from 'xlsx';

type XLSXModule = typeof XLSXNS;

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

/** An .xlsx file is a zip archive. Anything else (HTML, XML, SYLK, old .xls) is
 *  refused before the parser sees it, so its other format readers never run. */
export function looksLikeXlsx(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04;
}

/** Read workbook bytes, keeping number formats so date cells can be told apart
 *  from numbers. Only the first sheet is parsed, and formulas, rich text/HTML,
 *  styles and macros are skipped: the import uses cell values only. */
export function readWorkbookRows(XLSX: XLSXModule, data: Uint8Array): string[][] {
  if (!looksLikeXlsx(data)) throw new Error('not an xlsx file');
  return workbookToRows(XLSX, XLSX.read(data, {
    type: 'array',
    cellNF: true,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    bookVBA: false,
    bookDeps: false,
    bookFiles: false,
    sheets: 0,
  }));
}

/** Rows that came back from the worker are only accepted as arrays of strings. */
export function isRows(x: unknown): x is string[][] {
  return Array.isArray(x) && x.every((r) => Array.isArray(r) && r.every((c) => typeof c === 'string'));
}
