// Bill authentication checks, kept as stored evidence only (cached_result.evidence).
// Nothing here changes the read, the classification, emission rows, kg figures,
// the document confidence, duplicate decisions or anything a user sees: the
// checks only record what the existing read already shows. Pure (no Deno or
// esm imports) so the edge function and the bun tests use the same code.
//
// Data protection: the evidence never holds names, addresses, phone numbers,
// consumer, account or meter numbers, the account's own GSTIN, or any figure
// from a financial document. GSTINs are checked, never copied into a detail.

import { gstinFault, normalizeGstinInput } from './gstin.ts';
import { isEvidenceOnlyKind } from './documentKind.ts';

// ============= DETERMINISTIC CONFIDENCE (moved from extract-document) =============
// Per BIOCOG MRV spec: base 100, fixed penalties, same input = same output.
// Returns the same score as before, plus the penalties behind it.
export const CONFIDENCE_PENALTIES = {
  MISSING_QUANTITY: 20,
  MISSING_UNIT: 15,
  MISSING_INVOICE_NUMBER: 10,
  MISSING_SUPPLIER_GSTIN: 10,
  MISSING_DATE: 5,
  MISSING_AMOUNT: 5,
  UNVERIFIABLE_ITEM: 15,
  MISSING_EMISSION_FACTOR: 10,
  NO_LINE_ITEMS: 30,
  LOW_EXTRACTION_RATE: 15,
  HSN_CLASSIFICATION_BONUS: 5,
} as const;

export interface ConfidenceParams {
  hasQuantity: boolean;
  hasUnit: boolean;
  hasInvoiceNumber: boolean;
  hasSupplierGstin: boolean;
  hasDate: boolean;
  hasAmount: boolean;
  lineItemCount: number;
  unverifiableCount: number;
  missingEmissionFactorCount: number;
  hsnClassifiedCount: number;
  extractedFieldRatio: number;
}

export interface ConfidenceReason { points: number; reason: string }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function deterministicConfidence(params: ConfidenceParams): { score: number; reasons: ConfidenceReason[] } {
  const P = CONFIDENCE_PENALTIES;
  const reasons: ConfidenceReason[] = [];
  let confidence = 100;
  const apply = (points: number, reason: string) => { if (points !== 0) { confidence += points; reasons.push({ points, reason }); } };

  if (!params.hasQuantity) apply(-P.MISSING_QUANTITY, 'No quantity read on any line');
  if (!params.hasUnit) apply(-P.MISSING_UNIT, 'No unit read on any line');
  if (!params.hasInvoiceNumber) apply(-P.MISSING_INVOICE_NUMBER, 'No invoice number');
  if (!params.hasSupplierGstin) apply(-P.MISSING_SUPPLIER_GSTIN, 'No supplier GSTIN');
  if (!params.hasDate) apply(-P.MISSING_DATE, 'No invoice date');
  if (!params.hasAmount) apply(-P.MISSING_AMOUNT, 'No total amount');

  apply(-params.unverifiableCount * P.UNVERIFIABLE_ITEM, `${plural(params.unverifiableCount, 'line')} could not be classified`);
  apply(-params.missingEmissionFactorCount * P.MISSING_EMISSION_FACTOR, `${plural(params.missingEmissionFactorCount, 'line')} without an emission factor, quantity or unit`);

  if (params.lineItemCount === 0) apply(-P.NO_LINE_ITEMS, 'No lines read');
  if (params.extractedFieldRatio < 0.5) apply(-P.LOW_EXTRACTION_RATE, 'Fewer than half the invoice details were read');

  const hsnBonus = Math.min(params.hsnClassifiedCount * P.HSN_CLASSIFICATION_BONUS, 10);
  apply(hsnBonus, `${plural(params.hsnClassifiedCount, 'line')} classified by HSN code`);

  const score = Math.max(0, Math.min(100, Math.round(confidence)));
  if (score !== confidence) reasons.push({ points: score - confidence, reason: 'Score kept between 0 and 100' });
  return { score, reasons };
}

// ============= EVIDENCE =============
export const EVIDENCE_VERSION = 1;
export type CheckResult = 'pass' | 'flag' | 'not_checked';
export interface BillCheck { id: string; label: string; result: CheckResult; detail: string }
export interface BillEvidence {
  version: 1;
  checks: BillCheck[];
  summary: { checksRun: number; passed: number; flagged: number; notChecked: number; duplicatesFound: number };
  confidenceReasons: ConfidenceReason[];
}

export interface CheckLine {
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  priceCheck?: unknown;
  sourcePage?: number;
  validationFlags?: string[];
  referenceNote?: string;
}

/** An earlier document of the same owner, as stored (id and cached_result only). */
export interface EarlierDocument { id: string; cached_result: unknown }

export interface BillCheckInput {
  supplierGstin?: unknown;
  buyerGstin?: unknown;
  vendor?: unknown;
  /**
   * The GSTIN on the account (profiles.gstin) for a personal workspace. null
   * when none is saved or the upload is to an organisation (organisations
   * have no GSTIN on file). Used for comparison only; never stored.
   */
  accountGstin: string | null;
  amount?: unknown;
  subtotal?: unknown;
  taxAmount?: unknown;
  lineItems: CheckLine[];
  /** Electricity bill (price checks do not run there: slab tariffs). */
  electricityBill: boolean;
  /** Invoice date as YYYY-MM-DD (parseInvoiceDate), or null. */
  invoiceDate: string | null;
  now: Date;
  /** Electricity bills: billing details only (never consumer identifiers). */
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  tariffCategory?: string | null;
  sanctionedLoadKw?: number | null;
  billKey?: string | null;
  invoiceKey?: string | null;
  /** Source file of a long PDF's part, so its sibling parts are not compared. */
  splitSourceHash?: string | null;
  /** Up to 24 earlier documents of the same owner and supplier; null when not looked up. */
  earlier: EarlierDocument[] | null;
  /** Duplicate outcome already decided by extract-document; copied, never changed. */
  duplicates: { repeatedLinesDropped: number; twinDocumentId: string | null };
  confidenceReasons: ConfidenceReason[];
}

export const TOTALS_TOLERANCE_INR = 1;
export const TOTALS_TOLERANCE_RATIO = 0.005;
export const OLD_BILL_MONTHS = 12;
export const SUPPLIER_JUMP_RATIO = 3;
export const SUPPLIER_JUMP_MIN_HISTORY = 3;
export const SUPPLIER_JUMP_HISTORY = 12;
export const OVERLAP_LOOKUP_LIMIT = 24;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const PAGE_OUT_OF_RANGE = /^Page reference .* is outside this document/;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isoDate = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Supplier identity: the GSTIN when it has a GSTIN's shape, else the vendor name normalised. */
export function supplierIdentity(o: { supplierGstin?: unknown; vendor?: unknown }): string | null {
  const g = typeof o.supplierGstin === 'string' ? normalizeGstinInput(o.supplierGstin) : '';
  if (g && gstinFault(g) !== 'shape') return `G:${g}`;
  const v = str(o.vendor).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return v.length >= 4 ? `V:${v}` : null;
}

function gstinCheck(id: string, label: string, who: 'supplier' | 'buyer', raw: unknown): BillCheck {
  if (typeof raw !== 'string' || !raw.trim()) return { id, label, result: 'not_checked', detail: `No ${who} GSTIN was read on this bill` };
  const fault = gstinFault(raw);
  if (!fault) return { id, label, result: 'pass', detail: 'Format, state code and check character are valid' };
  const detail = fault === 'shape' ? 'Does not have the 15-character GSTIN format'
    : fault === 'state' ? 'The first two digits are not a GST state code'
      : 'The check character does not match the rest of the GSTIN';
  return { id, label, result: 'flag', detail };
}

function billedToYou(buyer: unknown, account: string | null): BillCheck {
  const id = 'billed_to_you', label = 'Billed to your GSTIN';
  const b = typeof buyer === 'string' ? normalizeGstinInput(buyer) : '';
  const a = account ? normalizeGstinInput(account) : '';
  if (!b) return { id, label, result: 'not_checked', detail: 'No buyer GSTIN was read on this bill' };
  if (!a) return { id, label, result: 'not_checked', detail: 'No GSTIN is saved for this workspace' };
  return b === a
    ? { id, label, result: 'pass', detail: 'The buyer GSTIN matches the GSTIN saved for this workspace' }
    : { id, label, result: 'flag', detail: 'The buyer GSTIN differs from the GSTIN saved for this workspace' };
}

/** subtotal + tax against the total, within ₹1 or 0.5% of the total, whichever is larger. */
export function totalsCheck(subtotal: unknown, taxAmount: unknown, amount: unknown): BillCheck {
  const id = 'totals_add_up', label = 'Subtotal and tax add up to the total';
  const s = num(subtotal), t = num(taxAmount), a = num(amount);
  if (s === null || t === null || a === null || a <= 0) {
    return { id, label, result: 'not_checked', detail: 'The bill does not show all of subtotal, tax and total' };
  }
  const gap = Math.round(Math.abs(s + t - a) * 100) / 100;
  const allowed = Math.max(TOTALS_TOLERANCE_INR, Math.abs(a) * TOTALS_TOLERANCE_RATIO);
  return gap <= allowed
    ? { id, label, result: 'pass', detail: gap === 0 ? 'Subtotal plus tax equals the total' : `Subtotal plus tax is within ${inr(gap)} of the total` }
    : { id, label, result: 'flag', detail: `Subtotal plus tax differs from the total by ${inr(gap)}` };
}

function linePrices(lines: CheckLine[], electricity: boolean): BillCheck {
  const id = 'line_prices', label = 'Line prices match line totals';
  if (electricity) return { id, label, result: 'not_checked', detail: 'Not checked on electricity bills: slab tariffs price units at several rates' };
  const mismatched = lines.filter((l) => l.priceCheck).length;
  const checkable = lines.filter((l) => l.priceCheck || (pos(l.quantity) && pos(l.unitPrice) && pos(l.total))).length;
  if (checkable === 0) return { id, label, result: 'not_checked', detail: 'No line shows quantity, unit price and line total together' };
  return mismatched > 0
    ? { id, label, result: 'flag', detail: `${plural(mismatched, 'line')} of ${checkable}: quantity × price differs from the line total` }
    : { id, label, result: 'pass', detail: `${plural(checkable, 'line')} checked: quantity × price matches the line total` };
}

function pagesInRange(lines: CheckLine[]): BillCheck {
  const id = 'pages_in_range', label = 'Page references are inside the file';
  const outside = lines.filter((l) => (l.validationFlags ?? []).some((f) => PAGE_OUT_OF_RANGE.test(f))).length;
  const inside = lines.filter((l) => typeof l.sourcePage === 'number').length;
  if (outside + inside === 0) return { id, label, result: 'not_checked', detail: 'No page references were read' };
  return outside > 0
    ? { id, label, result: 'flag', detail: `${plural(outside, 'line')} gave a page number outside this file` }
    : { id, label, result: 'pass', detail: `${plural(inside, 'line')} point to pages inside this file` };
}

/** Today in India, as YYYY-MM-DD. */
export function todayIst(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole months from `date` to `today` (both YYYY-MM-DD); a partial month is not counted. */
export function monthsBetween(date: string, today: string): number {
  const [y1, m1, d1] = date.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return months;
}

/** Flags a bill dated more than 12 months before today (IST). Never rejects it. */
export function oldBillCheck(invoiceDate: string | null, now: Date): BillCheck {
  const id = 'old_bill', label = 'Bill is from the last 12 months';
  const d = isoDate(invoiceDate);
  if (!d) return { id, label, result: 'not_checked', detail: 'No invoice date was read' };
  const today = todayIst(now);
  if (d > today) return { id, label, result: 'pass', detail: 'Dated after today' };
  const months = monthsBetween(d, today);
  // More than 12 months: at least 12 whole months and past the same day of the month.
  const [y, m, day] = d.split('-').map(Number);
  const anniversary = new Date(Date.UTC(y, m - 1 + OLD_BILL_MONTHS, day)).toISOString().slice(0, 10);
  return today > anniversary
    ? { id, label, result: 'flag', detail: `Dated ${plural(Math.max(months, OLD_BILL_MONTHS), 'month')} ago; kept and counted as read` }
    : { id, label, result: 'pass', detail: months <= 0 ? 'Dated this month' : `Dated ${plural(months, 'month')} ago` };
}

interface StoredBill {
  id: string;
  supplier: string | null;
  billKey: string | null;
  invoiceKey: string | null;
  kind: unknown;
  splitSourceHash: string | null;
  start: string | null;
  end: string | null;
  tariffCategory: string | null;
  sanctionedLoadKw: number | null;
  lines: CheckLine[];
}

function readStored(d: EarlierDocument): StoredBill | null {
  const c = d?.cached_result;
  if (!d?.id || !c || typeof c !== 'object') return null;
  const r = c as Record<string, unknown>;
  const eb = r.electricityBill && typeof r.electricityBill === 'object' ? r.electricityBill as Record<string, unknown> : {};
  const split = r.split && typeof r.split === 'object' ? r.split as Record<string, unknown> : {};
  return {
    id: d.id,
    supplier: supplierIdentity({ supplierGstin: r.supplierGstin, vendor: r.vendor }),
    billKey: typeof r.billKey === 'string' ? r.billKey : null,
    invoiceKey: typeof r.invoiceKey === 'string' ? r.invoiceKey : null,
    kind: r.documentKind,
    splitSourceHash: typeof split.sourceHash === 'string' ? split.sourceHash : null,
    start: isoDate(eb.billingPeriodStart),
    end: isoDate(eb.billingPeriodEnd),
    tariffCategory: typeof eb.tariffCategory === 'string' ? eb.tariffCategory : null,
    sanctionedLoadKw: num(eb.sanctionedLoadKw),
    lines: Array.isArray(r.lineItems) ? r.lineItems as CheckLine[] : [],
  };
}

/** The supplier part of an electricity billKey ("elec|G:...|start|end|units" -> "G:..."). */
const billSupplier = (key: string | null | undefined) => (typeof key === 'string' && key.startsWith('elec|') ? key.split('|')[1] ?? null : null);
const norm = (s: string | null) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function periodOverlap(input: BillCheckInput, earlier: StoredBill[] | null): BillCheck {
  const id = 'electricity_period_overlap', label = 'Billing period does not overlap an earlier bill';
  if (!input.electricityBill) return { id, label, result: 'not_checked', detail: 'Only checked on electricity bills' };
  const start = isoDate(input.billingPeriodStart), end = isoDate(input.billingPeriodEnd);
  const supplier = billSupplier(input.billKey);
  if (!start || !end || !supplier) return { id, label, result: 'not_checked', detail: 'The bill does not show a billing period, supplier and billed units' };
  if (!earlier) return { id, label, result: 'not_checked', detail: 'Earlier bills could not be looked up' };
  const overlapping = earlier.filter((b) => {
    if (billSupplier(b.billKey) !== supplier || !b.start || !b.end) return false;
    // A different tariff category or sanctioned load is a different connection.
    if (input.tariffCategory && b.tariffCategory && norm(input.tariffCategory) !== norm(b.tariffCategory)) return false;
    if (pos(input.sanctionedLoadKw) && pos(b.sanctionedLoadKw) && input.sanctionedLoadKw !== b.sanctionedLoadKw) return false;
    return start <= b.end && b.start <= end;
  });
  if (overlapping.length === 0) {
    const compared = earlier.filter((b) => billSupplier(b.billKey) === supplier && b.start && b.end).length;
    return { id, label, result: 'pass', detail: compared ? `Compared with ${plural(compared, 'earlier bill')} from the same supplier` : 'No earlier bill from this supplier' };
  }
  const ids = overlapping.slice(0, 3).map((b) => b.id).join(', ');
  return { id, label, result: 'flag', detail: `Overlaps the billing period of ${plural(overlapping.length, 'earlier bill')} from the same supplier (document ${ids})` };
}

/** Total quantity per unit over a bill's lines (lines kept only for a printed figure are left out). */
export function quantityByUnit(lines: CheckLine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of lines) {
    if (!pos(l?.quantity) || typeof l.unit !== 'string' || !l.unit.trim() || l.referenceNote) continue;
    const u = l.unit.trim().toLowerCase();
    out.set(u, (out.get(u) ?? 0) + l.quantity);
  }
  return out;
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

function supplierJump(input: BillCheckInput, earlier: StoredBill[] | null): BillCheck {
  const id = 'supplier_jump', label = 'Quantity in line with earlier bills from this supplier';
  const supplier = supplierIdentity({ supplierGstin: input.supplierGstin, vendor: input.vendor });
  if (!supplier) return { id, label, result: 'not_checked', detail: 'No supplier GSTIN or name was read' };
  if (!earlier) return { id, label, result: 'not_checked', detail: 'Earlier bills could not be looked up' };
  const current = quantityByUnit(input.lineItems);
  if (current.size === 0) return { id, label, result: 'not_checked', detail: 'No quantity with a unit was read on this bill' };
  const history = earlier
    .filter((b) => b.supplier === supplier && !isEvidenceOnlyKind(b.kind) && !(input.invoiceKey && b.invoiceKey === input.invoiceKey))
    .slice(0, SUPPLIER_JUMP_HISTORY)
    .map((b) => quantityByUnit(b.lines));
  const jumps: string[] = [];
  let compared = 0;
  for (const [unit, qty] of current) {
    const past = history.map((h) => h.get(unit)).filter(pos);
    if (past.length < SUPPLIER_JUMP_MIN_HISTORY) continue;
    compared++;
    const m = median(past);
    const ratio = qty / m;
    if (ratio > SUPPLIER_JUMP_RATIO || ratio < 1 / SUPPLIER_JUMP_RATIO) jumps.push(`${round(qty)} ${unit} against a usual ${round(m)} ${unit} (${round(ratio, 1)}×, ${plural(past.length, 'earlier bill')})`);
  }
  if (compared === 0) return { id, label, result: 'not_checked', detail: `Fewer than ${SUPPLIER_JUMP_MIN_HISTORY} earlier bills from this supplier with the same unit` };
  return jumps.length
    ? { id, label, result: 'flag', detail: jumps.join('; ') }
    : { id, label, result: 'pass', detail: `Within a third to three times the usual quantity from this supplier` };
}

function duplicatesCheck(d: BillCheckInput['duplicates']): { check: BillCheck; found: number } {
  const id = 'duplicates', label = 'Not a repeat of something already read';
  const lines = Math.max(0, Math.floor(d.repeatedLinesDropped || 0));
  const found = lines + (d.twinDocumentId ? 1 : 0);
  if (found === 0) return { found, check: { id, label, result: 'pass', detail: 'No repeated lines or second copy found' } };
  const parts: string[] = [];
  if (lines) parts.push(`${plural(lines, 'repeated line')} from another part of the same PDF counted once`);
  if (d.twinDocumentId) parts.push(`another copy of this invoice, with nothing counted yet, is document ${d.twinDocumentId}`);
  return { found, check: { id, label, result: 'flag', detail: parts.join('; ') } };
}

/** Every check, each with a result, plus the summary. Pure. */
export function buildBillEvidence(input: BillCheckInput): BillEvidence {
  const earlier = input.earlier
    ? input.earlier.map(readStored).filter((b): b is StoredBill => !!b && !(input.splitSourceHash && b.splitSourceHash === input.splitSourceHash))
    : null;
  const dup = duplicatesCheck(input.duplicates);
  const checks: BillCheck[] = [
    gstinCheck('supplier_gstin_valid', 'Supplier GSTIN is valid', 'supplier', input.supplierGstin),
    gstinCheck('buyer_gstin_valid', 'Buyer GSTIN is valid', 'buyer', input.buyerGstin),
    billedToYou(input.buyerGstin, input.accountGstin),
    totalsCheck(input.subtotal, input.taxAmount, input.amount),
    linePrices(input.lineItems, input.electricityBill),
    pagesInRange(input.lineItems),
    oldBillCheck(input.invoiceDate, input.now),
    periodOverlap(input, earlier),
    supplierJump(input, earlier),
    dup.check,
  ];
  const passed = checks.filter((c) => c.result === 'pass').length;
  const flagged = checks.filter((c) => c.result === 'flag').length;
  return {
    version: EVIDENCE_VERSION,
    checks,
    summary: { checksRun: passed + flagged, passed, flagged, notChecked: checks.length - passed - flagged, duplicatesFound: dup.found },
    confidenceReasons: input.confidenceReasons.map((r) => ({ points: r.points, reason: r.reason })),
  };
}

/** The stored result without its evidence, so replies to the browser stay as they were. */
export function withoutEvidence<T>(cached: T): T {
  if (!cached || typeof cached !== 'object' || !('evidence' in (cached as object))) return cached;
  const { evidence: _evidence, ...rest } = cached as Record<string, unknown>;
  return rest as T;
}
