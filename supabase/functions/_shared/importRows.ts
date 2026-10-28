// Spreadsheet import rules: columns, bill types, units and row checks.
// Pure (no Deno, browser or network APIs), so the /import page and the
// import-records function apply exactly the same rules. Units, factors and
// classification come from emissionFactors.ts, the module the invoice reader
// uses; nothing is copied here. Missing values stay missing: nothing is filled
// in or read as zero.
import {
  FUEL_FACTORS,
  calculateEmissions,
  classifyByKeyword,
  normalizeUnit,
  type KeywordClass,
} from './emissionFactors.ts';
import { parseInvoiceDate } from './invoiceDate.ts';
import { gstinFault, normalizeGstinInput } from './gstin.ts';

export type ImportKind = 'activity' | 'suppliers';

export interface Column {
  key: string;
  label: string;
  required: boolean;
  /** Header spellings accepted on upload, compared after normalizeHeader. */
  aliases: string[];
  hint: string;
}

export type DocType = 'electricity' | 'diesel' | 'petrol' | 'lpg' | 'png' | 'cng' | 'coal' | 'freight';

export interface DocTypeRule {
  label: string;
  /** Canonical unit from normalizeUnit that a row of this type must convert to. */
  canonicalUnit: string;
  /** Units shown to people. Any spelling normalizeUnit maps to canonicalUnit is accepted. */
  unitsShown: string;
  /** The whole wrong-unit message, where a how-to helps; else "<Type> needs <units>." */
  unitHelp?: string;
  /**
   * Category, scope and fuel, from the invoice reader's own keyword
   * classification of the bill type's name (classifyByKeyword).
   */
  calc: KeywordClass;
}

const classify = (label: string): KeywordClass => {
  const c = classifyByKeyword(label);
  if (!c) throw new Error(`No classification for ${label}`);
  return c;
};

const fuel = (label: string, unitsShown: string, unitHelp?: string): DocTypeRule => {
  const calc = classify(label);
  return { label, unitHelp, canonicalUnit: normalizeUnit(FUEL_FACTORS[calc.fuelType!].unit)!.unit, unitsShown, calc };
};

export const DOC_TYPES: Record<DocType, DocTypeRule> = {
  electricity: { label: 'Electricity', canonicalUnit: 'kWh', unitsShown: 'kWh or MWh', unitHelp: 'Electricity is counted in kWh. Enter the units consumed on the bill, then set Unit to kWh (or MWh).', calc: classify('Electricity') },
  diesel: fuel('Diesel', 'litre or kl'),
  petrol: fuel('Petrol', 'litre or kl'),
  lpg: fuel('LPG', 'kg or tonne', 'LPG is counted in kg. Enter the total kg (cylinders times the kg printed on each), then set Unit to kg.'),
  png: fuel('PNG', 'scm', 'PNG is counted in scm. Enter the scm figure from the gas bill, then set Unit to scm.'),
  cng: fuel('CNG', 'kg or tonne'),
  coal: fuel('Coal', 'kg or tonne'),
  // Freight is Scope 3 and has no factor in emissionFactors.ts: Scope 3 lines
  // are calculated in the supplier evidence trail (scope3.ts), so an imported
  // freight row is kept as a record with no emission figure, as an uploaded
  // freight invoice is.
  freight: { label: 'Freight', canonicalUnit: 'ton-km', unitsShown: 'tonne-km', unitHelp: 'Freight is counted in tonne-km. Enter tonnes carried times km travelled, then set Unit to tonne-km.', calc: classify('Freight') },
};

export const DOC_TYPE_KEYS = Object.keys(DOC_TYPES) as DocType[];

/** "Electricity, Diesel, ... or Freight", from the list above. */
export const DOC_TYPE_LIST = (() => {
  const labels = DOC_TYPE_KEYS.map(k => DOC_TYPES[k].label);
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
})();

export const ACTIVITY_COLUMNS: Column[] = [
  { key: 'date', label: 'Date', required: true, aliases: ['invoicedate', 'billdate'], hint: 'DD/MM/YYYY or YYYY-MM-DD, for example 30/05/2026' },
  { key: 'type', label: 'Bill type', required: true, aliases: ['type', 'doctype', 'documenttype'], hint: DOC_TYPE_LIST },
  { key: 'quantity', label: 'Quantity', required: true, aliases: ['qty', 'units'], hint: 'More than 0, as printed on the bill' },
  { key: 'unit', label: 'Unit', required: true, aliases: ['uom'], hint: 'Must match the bill type. See the units list below.' },
  { key: 'supplier', label: 'Supplier name', required: true, aliases: ['supplier', 'vendor', 'vendorname'], hint: 'Who issued the bill' },
  { key: 'gstin', label: 'Supplier GSTIN', required: false, aliases: ['gstin', 'gst', 'gstno', 'suppliergst'], hint: '15 characters, if the bill shows one' },
  { key: 'invoice', label: 'Invoice number', required: false, aliases: ['invoice', 'invoiceno', 'billnumber', 'billno'], hint: 'As printed on the bill' },
  { key: 'amount', label: 'Amount (INR)', required: false, aliases: ['amount', 'amountinr', 'total', 'value'], hint: 'Bill total in rupees, more than 0' },
  { key: 'notes', label: 'Notes', required: false, aliases: ['note', 'remarks', 'comments'], hint: 'Anything you want kept with the row' },
];

export const SUPPLIER_COLUMNS: Column[] = [
  { key: 'name', label: 'Name', required: true, aliases: ['suppliername', 'supplier', 'vendor', 'vendorname'], hint: 'Registered business name' },
  { key: 'gstin', label: 'GSTIN', required: false, aliases: ['gst', 'gstno', 'suppliergstin'], hint: '15 characters' },
  { key: 'email', label: 'Contact email', required: false, aliases: ['email', 'emailid', 'contact'], hint: 'The person you deal with there' },
  { key: 'category', label: 'Category', required: false, aliases: ['whatyoubuy', 'buys'], hint: 'What you buy from them' },
  { key: 'spend', label: 'Annual spend (INR)', required: false, aliases: ['annualspend', 'spend', 'annualspendinr'], hint: 'Rupees a year, more than 0' },
];

export const COLUMNS: Record<ImportKind, Column[]> = { activity: ACTIVITY_COLUMNS, suppliers: SUPPLIER_COLUMNS };

/** Lowercase letters and digits only, so "Supplier GSTIN" and "supplier_gstin" match. */
export const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Read a document type cell ("Diesel", " lpg ") to its key, or null. */
export function parseDocType(raw: string): DocType | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  return DOC_TYPE_KEYS.find(k => k === v || DOC_TYPES[k].label.toLowerCase() === v) ?? null;
}

/** Why a unit does not fit a type, or null when it does. */
export function unitProblem(type: DocType, rawUnit: string): string | null {
  const rule = DOC_TYPES[type];
  const n = normalizeUnit(rawUnit);
  if (n && n.unit === rule.canonicalUnit) return null;
  if (type === 'electricity' && /^\s*kvah\s*$/i.test(rawUnit)) return 'kVAh is not kWh. Enter the kWh figure from the bill, then set Unit to kWh.';
  return rule.unitHelp ?? `${rule.label} needs ${rule.unitsShown}.`;
}

/**
 * A fix that changes a row's unit but keeps its number usually means the
 * number is still in the old unit (4 cylinders typed as 4 kg). Such a fix
 * needs the quantity confirmed or changed too. Returns the fixed values, or
 * a message when the quantity has not been confirmed. Pure, so it is tested.
 */
export function applyRowFix(
  before: Record<string, string>,
  draft: Record<string, string>,
  opts: { quantityConfirmed: boolean },
): { ok: true; values: Record<string, string> } | { ok: false; message: string } {
  const values = { ...before, ...draft };
  const unitChanged = (values.unit ?? '').trim().toLowerCase() !== (before.unit ?? '').trim().toLowerCase();
  const qtySame = (values.quantity ?? '').trim() === (before.quantity ?? '').trim();
  if (unitChanged && qtySame && (before.quantity ?? '').trim() && !opts.quantityConfirmed) {
    return { ok: false, message: `You changed the unit. Check that ${before.quantity.trim()} is in ${values.unit.trim() || 'the new unit'}, or change the quantity.` };
  }
  return { ok: true, values };
}

// ---------------------------------------------------------------------------
// Row checks
// ---------------------------------------------------------------------------
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 1000;
/** Rows the import-records function saves per call; the page sends batches. */
export const SAVE_BATCH_MAX = 100;

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
  if (!kind) return { ok: false, message: 'We could not find a Bill type column. Download the template above and paste your rows into it.' };
  const columnIndex = kind === 'activity' ? activity : suppliers;
  const missing = COLUMNS[kind].filter(c => c.required && !(c.key in columnIndex)).map(c => c.label);
  if (missing.length) {
    const names = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
    return { ok: false, message: `This file is missing the ${names} column${missing.length === 1 ? '' : 's'}. Add ${missing.length === 1 ? 'it' : 'them'}, or paste your rows into the template above.` };
  }
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

/** Why a date cell is not accepted, by cause, or null when it is. */
export function dateProblem(raw: string, now = new Date()): string | null {
  const v = raw.trim();
  if (parseImportDate(v, now)) return null;
  const dayFirst = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/.exec(v);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!dayFirst && !iso) return DATE_HELP;
  const [y, m, d] = dayFirst ? [+dayFirst[4], +dayFirst[3], +dayFirst[1]] : [+iso![1], +iso![2], +iso![3]];
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return `${v} is not a real date. Check the day and month.`;
  return 'Use a bill date from 2000 up to next month.';
}

/** A stored YYYY-MM-DD shown the Indian way, DD/MM/YYYY; anything else as typed. */
export function displayDate(raw: string): string {
  const iso = parseImportDate(raw);
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : raw;
}

/** Example shown when a number cell holds something else. */
const NUMBER_HELP: Record<string, string> = {
  quantity: 'like 850. Put the unit in the Unit column.',
  amount: 'like 76500.',
  spend: 'like 1200000.',
};

const normalizeId = normalizeGstinInput;

/** Plain GSTIN messages for import rows (format, state code, check character). */
export function gstinProblem(raw: string): string | null {
  const v = normalizeId(raw);
  if (!v) return null;
  const fault = gstinFault(v);
  if (fault === 'shape') return 'A GSTIN has 15 characters, like 27AAPFU0939F1ZV. Copy it from the bill.';
  if (fault === 'state') return 'The first two digits should be the state code, like 27 for Maharashtra.';
  if (fault === 'check') return 'This GSTIN has a typo. Copy it again from the bill.';
  return null;
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
  else {
    const problem = dateProblem(date, now);
    if (problem) issues.push({ field: 'date', message: problem });
  }

  const rawType = (values.type ?? '').trim();
  let type: DocType | null = null;
  if (!rawType) issues.push({ field: 'type', message: 'Bill type is missing.' });
  else if (!(type = parseDocType(rawType))) issues.push({ field: 'type', message: `"${rawType}" is not a bill type we accept. Use ${DOC_TYPE_LIST}.` });

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
    // Same call the invoice reader makes; India grid for electricity.
    const r = calculateEmissions(qty, unit, calc.scope, calc.productCategory, calc.fuelType, {
      activityDate: parseImportDate(date, now), activityDateFrom: 'invoice', description: DOC_TYPES[type].label,
    });
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

/** One row as named values, with its spreadsheet line number. */
export interface RowRecord { line: number; values: Record<string, string> }

/** Values for every column of a kind, trimmed; unknown keys are dropped and missing ones are empty. */
export function cleanValues(kind: ImportKind, raw: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const col of COLUMNS[kind]) {
    const v = raw?.[col.key];
    values[col.key] = typeof v === 'string' ? v.trim().slice(0, 500) : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
  }
  return values;
}

/** Check named rows. The page and the import-records function both call this. */
export function checkRecords(kind: ImportKind, records: RowRecord[], now = new Date()): CheckResult {
  const seen = new Map<string, number>();
  const rows: CheckedRow[] = [];
  for (const rec of records) {
    const values = cleanValues(kind, rec.values);
    const line = rec.line;
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
  }

  const counts = { ready: 0, fix: 0, duplicate: 0, total: rows.length };
  let sum = 0;
  let any = false;
  for (const r of rows) {
    counts[r.status]++;
    if (r.status === 'ready' && typeof r.estimateKg === 'number') { sum += r.estimateKg; any = true; }
  }
  return { kind, rows, counts, readyEstimateKg: any ? Math.round(sum * 100) / 100 : null };
}

/** Check every data row under the header. Blank rows are skipped but keep their line numbers. */
export function checkRows(kind: ImportKind, columnIndex: Record<string, number>, dataRows: string[][], now = new Date(), firstLine = 2): CheckResult {
  const records: RowRecord[] = [];
  dataRows.forEach((cells, i) => {
    if (isBlank(cells)) return;
    const values: Record<string, string> = {};
    for (const col of COLUMNS[kind]) {
      const idx = columnIndex[col.key];
      values[col.key] = idx === undefined ? '' : String(cells[idx] ?? '').trim();
    }
    records.push({ line: i + firstLine, values });
  });
  return checkRecords(kind, records, now);
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
  if (!filled) return { ok: false, message: 'The headings match, but there are no bills under them yet.' };
  if (filled > MAX_ROWS) return { ok: false, message: `This file has ${filled.toLocaleString('en-IN')} rows. Split it into files of ${MAX_ROWS.toLocaleString('en-IN')} rows or fewer.` };
  return { ok: true, result: checkRows(match.kind, match.columnIndex, data, now, headerAt + 2) };
}
