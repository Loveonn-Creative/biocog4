// Row checks for the spreadsheet importer. Pure, so the same rules can run on
// the server when saving is added. Missing values stay missing: nothing is
// filled in or read as zero.
import { calculateEmissions } from '../../../supabase/functions/_shared/emissionFactors';
import { parseInvoiceDate } from '../../../supabase/functions/_shared/invoiceDate';
import { checkGstin, gstinCheckChar, normalizeId } from '../indiaBusinessIds';
import { COLUMNS, DOC_TYPE_LIST, DOC_TYPES, normalizeHeader, parseDocType, unitProblem, type DocType, type ImportKind } from './schema';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 1000;

export type RowStatus = 'ready' | 'fix' | 'duplicate';

export interface Issue { field: string; message: string }

export interface CheckedRow {
  /** Row number as the spreadsheet shows it (the header is row 1). */
  line: number;
  values: Record<string, string>;
  issues: Issue[];
  status: RowStatus;
  /** Line of the first row this one repeats. */
  duplicateOf?: number;
  /** Activity rows only. Preview estimate in kgCO2e from the shared factors; null when none applies. */
  estimateKg?: number | null;
}

export interface CheckResult {
  kind: ImportKind;
  rows: CheckedRow[];
  counts: { ready: number; fix: number; duplicate: number; total: number };
  /** Sum of estimates on ready rows, or null when no ready row has one. */
  readyEstimateKg: number | null;
}

export type HeaderMatch =
  | { ok: true; kind: ImportKind; columnIndex: Record<string, number> }
  | { ok: false; message: string };

/** Work out which template a header row belongs to and where each column is. */
export function matchHeaders(header: string[]): HeaderMatch {
  const norm = header.map(h => normalizeHeader(String(h ?? '')));
  const locate = (kind: ImportKind) => {
    const idx: Record<string, number> = {};
    for (const col of COLUMNS[kind]) {
      const names = [normalizeHeader(col.label), ...col.aliases];
      const i = norm.findIndex(h => h && names.includes(h));
      if (i >= 0) idx[col.key] = i;
    }
    return idx;
  };
  const activity = locate('activity');
  const suppliers = locate('suppliers');
  const kind: ImportKind | null = 'type' in activity ? 'activity' : ('name' in suppliers || 'email' in suppliers || 'spend' in suppliers) ? 'suppliers' : null;
  if (!kind) return { ok: false, message: 'We could not match the columns. Start from one of the templates above.' };
  const columnIndex = kind === 'activity' ? activity : suppliers;
  const missing = COLUMNS[kind].filter(c => c.required && !(c.key in columnIndex)).map(c => c.label);
  if (missing.length) return { ok: false, message: `This file has no ${missing.join(', ')} column. Add it, or paste your rows into the template above.` };
  return { ok: true, kind, columnIndex };
}

/** A positive number from a cell, allowing commas and a rupee sign. null when it is not one. */
export function parseAmount(raw: string): number | null {
  const v = raw.trim().replace(/^(₹|rs\.?|inr)\s*/i, '').replace(/[,\s]/g, '');
  if (!/^\d*\.?\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * A bill date as YYYY-MM-DD, or null. Accepts YYYY-MM-DD and, following the
 * Indian convention, day-first DD/MM/YYYY or DD-MM-YYYY. The range rule
 * (2000 to a month ahead, real calendar dates) is the server's parseInvoiceDate.
 */
export function parseImportDate(raw: string, now = new Date()): string | null {
  const v = raw.trim();
  const dayFirst = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/.exec(v);
  const iso = dayFirst ? `${dayFirst[4]}-${dayFirst[3].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}` : v;
  return parseInvoiceDate(iso, now);
}

const DATE_HELP = 'Write the date as DD/MM/YYYY or YYYY-MM-DD, for example 30/05/2026.';

/** Example shown when a number cell holds something else. */
const NUMBER_HELP: Record<string, string> = {
  quantity: 'like 850. Put the unit in the Unit column.',
  amount: 'like 76500.',
  spend: 'like 1200000.',
};

const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Plain GSTIN messages for this page. The checks themselves are checkGstin's. */
export function gstinProblem(raw: string): string | null {
  const v = normalizeId(raw);
  if (!v) return null;
  if (checkGstin(v).status === 'format_ok') return null;
  if (!GSTIN_SHAPE.test(v)) return 'A GSTIN has 15 characters, like 27AAPFU0939F1ZV. Copy it from the bill.';
  if (gstinCheckChar(v.slice(0, 14)) === v[14]) return 'The first two digits should be the state code, like 27 for Maharashtra.';
  return 'This GSTIN has a typo. Copy it again from the bill.';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function positive(values: Record<string, string>, key: string, label: string, required: boolean, issues: Issue[]): number | null {
  const raw = values[key] ?? '';
  if (!raw.trim()) {
    if (required) issues.push({ field: key, message: `${label} is missing.` });
    return null;
  }
  const n = parseAmount(raw);
  if (n === null) { issues.push({ field: key, message: `${label} should be a number only, ${NUMBER_HELP[key] ?? 'like 100.'}` }); return null; }
  if (n <= 0) { issues.push({ field: key, message: required ? `${label} must be more than 0.` : `${label} must be more than 0, or leave it empty.` }); return null; }
  return n;
}

function checkGstinCell(values: Record<string, string>, issues: Issue[]) {
  const problem = gstinProblem(values.gstin ?? '');
  if (problem) issues.push({ field: 'gstin', message: problem });
}

function checkActivity(values: Record<string, string>, now: Date): { issues: Issue[]; estimateKg: number | null } {
  const issues: Issue[] = [];
  const date = (values.date ?? '').trim();
  if (!date) issues.push({ field: 'date', message: 'Date is missing.' });
  else if (!parseImportDate(date, now)) issues.push({ field: 'date', message: DATE_HELP });

  const rawType = (values.type ?? '').trim();
  let type: DocType | null = null;
  if (!rawType) issues.push({ field: 'type', message: 'Document type is missing.' });
  else if (!(type = parseDocType(rawType))) issues.push({ field: 'type', message: `"${rawType}" is not on the list. Use ${DOC_TYPE_LIST}.` });

  const qty = positive(values, 'quantity', 'Quantity', true, issues);

  const unit = (values.unit ?? '').trim();
  if (!unit) issues.push({ field: 'unit', message: 'Unit is missing.' });
  else if (type) {
    const p = unitProblem(type, unit);
    if (p) issues.push({ field: 'unit', message: p });
  }

  if (!(values.supplier ?? '').trim()) issues.push({ field: 'supplier', message: 'Supplier name is missing.' });
  checkGstinCell(values, issues);
  positive(values, 'amount', 'Amount', false, issues);

  let estimateKg: number | null = null;
  if (!issues.length && type && qty !== null) {
    const calc = DOC_TYPES[type].calc;
    // Same call the extraction pipeline makes; India grid for electricity.
    const r = calc ? calculateEmissions(qty, unit, calc.scope, calc.productCategory, calc.fuelType) : null;
    estimateKg = r && r.kind === 'emission' ? r.co2Kg : null;
  }
  return { issues, estimateKg };
}

function checkSupplier(values: Record<string, string>): Issue[] {
  const issues: Issue[] = [];
  if (!(values.name ?? '').trim()) issues.push({ field: 'name', message: 'Name is missing.' });
  checkGstinCell(values, issues);
  const email = (values.email ?? '').trim();
  if (email && !EMAIL.test(email)) issues.push({ field: 'email', message: 'This email does not look right.' });
  if (!email && !(values.gstin ?? '').trim()) issues.push({ field: 'email', message: 'Add their email or GSTIN.' });
  positive(values, 'spend', 'Annual spend', false, issues);
  return issues;
}

/**
 * Key that marks two rows as the same bill or supplier, or null when a part is missing.
 * Suppliers match on GSTIN plus name, since two units can share one GSTIN in a state.
 */
export function duplicateKey(kind: ImportKind, values: Record<string, string>): string | null {
  const gstin = normalizeId(values.gstin ?? '');
  if (kind === 'suppliers') {
    const name = (values.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return gstin && name ? `${gstin}|${name}` : null;
  }
  const invoice = (values.invoice ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const rawDate = (values.date ?? '').trim();
  const date = parseImportDate(rawDate) ?? rawDate;
  if (!gstin || !invoice || !date) return null;
  return `${gstin}|${invoice}|${date}`;
}

const isBlank = (row: string[]) => row.every(c => !String(c ?? '').trim());

/** Check every data row under the header. Blank rows are skipped but keep their line numbers. */
export function checkRows(kind: ImportKind, columnIndex: Record<string, number>, dataRows: string[][], now = new Date(), firstLine = 2): CheckResult {
  const seen = new Map<string, number>();
  const rows: CheckedRow[] = [];
  dataRows.forEach((cells, i) => {
    if (isBlank(cells)) return;
    const values: Record<string, string> = {};
    for (const col of COLUMNS[kind]) {
      const idx = columnIndex[col.key];
      values[col.key] = idx === undefined ? '' : String(cells[idx] ?? '').trim();
    }
    const line = i + firstLine;
    let issues: Issue[];
    let estimateKg: number | null | undefined;
    if (kind === 'activity') ({ issues, estimateKg } = checkActivity(values, now));
    else issues = checkSupplier(values);

    const key = duplicateKey(kind, values);
    const duplicateOf = key ? seen.get(key) : undefined;
    if (key && duplicateOf === undefined) seen.set(key, line);
    const status: RowStatus = issues.length ? 'fix' : duplicateOf !== undefined ? 'duplicate' : 'ready';
    const row: CheckedRow = { line, values, issues, status };
    if (duplicateOf !== undefined) row.duplicateOf = duplicateOf;
    if (kind === 'activity') row.estimateKg = status === 'ready' ? estimateKg ?? null : null;
    rows.push(row);
  });

  const counts = { ready: 0, fix: 0, duplicate: 0, total: rows.length };
  let sum = 0;
  let any = false;
  for (const r of rows) {
    counts[r.status]++;
    if (r.status === 'ready' && typeof r.estimateKg === 'number') { sum += r.estimateKg; any = true; }
  }
  return { kind, rows, counts, readyEstimateKg: any ? Math.round(sum * 100) / 100 : null };
}

export type SheetCheck = { ok: true; result: CheckResult } | { ok: false; message: string };

/** Header match, row limit and row checks for a parsed sheet. */
export function checkSheet(sheet: string[][], now = new Date()): SheetCheck {
  const headerAt = sheet.findIndex(r => !isBlank(r));
  if (headerAt < 0) return { ok: false, message: 'This file is empty.' };
  const match = matchHeaders(sheet[headerAt]);
  if (match.ok === false) return { ok: false, message: match.message };
  const data = sheet.slice(headerAt + 1);
  const filled = data.filter(r => !isBlank(r)).length;
  if (!filled) return { ok: false, message: 'The columns are right but there are no rows yet.' };
  if (filled > MAX_ROWS) return { ok: false, message: `This file has ${filled.toLocaleString('en-IN')} rows. Split it into files of ${MAX_ROWS.toLocaleString('en-IN')} rows or fewer.` };
  return { ok: true, result: checkRows(match.kind, match.columnIndex, data, now, headerAt + 2) };
}
