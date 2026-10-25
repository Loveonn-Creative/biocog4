// Pure helpers for reading an AI extraction safely and explaining, in plain
// words, what an invoice is missing. No I/O, so it is unit tested.

import { KVAH_GUIDANCE, SINGLE_READING_GUIDANCE, type ElectricityBlocker } from './electricityBill.ts';
import { detectFileKind } from './fileSignature.ts';

/** "1,250.5", "₹ 12,345", "Rs. 900", 42 -> number; anything else -> null. Never guesses. */
export function parseAmount(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/₹|rs\.?|inr|\s/gi, '').replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** A positive quantity, or undefined. */
export function parseQuantity(v: unknown): number | undefined {
  const n = parseAmount(v);
  return n !== null && n > 0 ? n : undefined;
}

/**
 * The JSON object in an AI answer: plain JSON, fenced JSON, or JSON with a
 * sentence before or after it. Throws when there is no object.
 */
export function parseAiJson(content: string): any {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced ? fenced[1] : content).trim();
  try { return JSON.parse(text); } catch { /* try the outermost object */ }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No JSON object in AI answer');
  return JSON.parse(text.slice(start, end + 1));
}

/** "Tax Invoice" -> invoice, "Electricity Bill" -> bill, "Cash memo" -> receipt. */
export function normalizeDocumentType(t: unknown): string {
  const s = String(t ?? '').toLowerCase();
  if (!s) return 'unknown';
  if (/certificate|\brec\b|guarantee of origin/.test(s)) return 'certificate';
  // Credit notes and purchase orders are stored as evidence (see
  // documentKind.ts), so they are accepted rather than refused as unsupported.
  if (/credit\s*(note|memo)|purchase\s*order/.test(s)) return 'invoice';
  if (/consignment\s*note|\bbu?ilty\b|lorry/.test(s)) return 'receipt';
  if (/receipt|cash memo|slip/.test(s)) return 'receipt';
  if (/invoice|challan|e-?way/.test(s)) return 'invoice';
  if (/bill/.test(s)) return 'bill';
  if (s === 'unknown') return 'unknown';
  return s;
}

const GSTIN_RE = /^[0-9]{2}[A-Z0-9]{10}[0-9A-Z]Z[0-9A-Z]$/;
const norm = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Identity of an invoice independent of the file's bytes, so the same invoice
 * photographed twice, or sent once as PDF and once as a photo, is counted
 * once. Supplier GSTIN (or the supplier name when no GSTIN is printed),
 * invoice number and date for invoices; supplier, billing period and billed
 * units for electricity bills (consumer numbers are never read). Null when the
 * printed fields cannot identify the invoice: then only the file hash applies.
 */
export function invoiceIdentity(o: {
  supplierGstin?: unknown; vendor?: unknown; invoiceNumber?: unknown; date?: unknown;
  billingPeriodStart?: unknown; billingPeriodEnd?: unknown; unitsConsumedKwh?: unknown; amount?: unknown;
}): string | null {
  const gstin = norm(o.supplierGstin);
  const supplier = GSTIN_RE.test(gstin) ? `G:${gstin}` : norm(o.vendor).length >= 4 ? `V:${norm(o.vendor)}` : null;
  if (!supplier) return null;
  const date = typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
  const number = norm(o.invoiceNumber);
  if (number.length >= 2 && date) return `inv|${supplier}|${number}|${date}`;
  const start = typeof o.billingPeriodStart === 'string' ? o.billingPeriodStart : null;
  const end = typeof o.billingPeriodEnd === 'string' ? o.billingPeriodEnd : null;
  const units = parseAmount(o.unitsConsumedKwh);
  const amount = parseAmount(o.amount);
  if (start && end && units !== null && amount !== null) return `bill|${supplier}|${start}|${end}|${units}|${amount}`;
  return null;
}

/**
 * An electricity bill's identity from what does not change between photos
 * of it: supplier, billing period and billed units. The amount and bill
 * number are left out because a re-photographed bill is the likeliest to
 * have one of them misread. Null when any part is missing.
 */
export function electricityBillIdentity(o: {
  supplierGstin?: unknown; vendor?: unknown; billingPeriodStart?: unknown; billingPeriodEnd?: unknown; unitsConsumedKwh?: unknown;
}): string | null {
  const gstin = norm(o.supplierGstin);
  const supplier = GSTIN_RE.test(gstin) ? `G:${gstin}` : norm(o.vendor).length >= 4 ? `V:${norm(o.vendor)}` : null;
  const start = typeof o.billingPeriodStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.billingPeriodStart) ? o.billingPeriodStart : null;
  const end = typeof o.billingPeriodEnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.billingPeriodEnd) ? o.billingPeriodEnd : null;
  const units = parseAmount(o.unitsConsumedKwh);
  if (!supplier || !start || !end || units === null || units <= 0) return null;
  return `elec|${supplier}|${start}|${end}|${units}`;
}

/** Signed-in uploads: same types as guests, larger cap (inline AI requests top out near 20 MB). */
export const SIGNED_IN_MAX_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export function base64Size(b64: string): number {
  const clean = b64.replace(/\s+/g, '');
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - pad;
}

export function fileCheck(b64: string, mimeType: unknown, maxBytes = SIGNED_IN_MAX_BYTES):
  { ok: true } | { ok: false; status: number; code: string; message: string } {
  const type = typeof mimeType === 'string' && mimeType ? mimeType.toLowerCase() : 'image/jpeg';
  if (!ACCEPTED_TYPES.includes(type)) {
    return { ok: false, status: 415, code: 'unsupported_type', message: 'Upload a PDF or a photo (JPG, PNG, WEBP or HEIC) of the invoice or bill.' };
  }
  const bytes = base64Size(b64);
  if (bytes > maxBytes) {
    return { ok: false, status: 413, code: 'file_too_large', message: `This file is ${(bytes / 1048576).toFixed(1)} MB; the limit is ${Math.round(maxBytes / 1048576)} MB. Take a photo of the page, or save the PDF at a lower quality.` };
  }
  if (!detectFileKind(b64)) {
    return { ok: false, status: 415, code: 'unsupported_type', message: 'This file is not a PDF or a photo. Upload a PDF or a photo (JPG, PNG, WEBP or HEIC) of the invoice or bill.' };
  }
  return { ok: true };
}

/** What the user sees when every AI provider failed: our problem, not their image. */
export function providerFailure(status: number | undefined): { status: number; code: string; message: string } {
  if (status === 429) return { status: 429, code: 'ai_busy', message: "We're reading a high volume of bills right now. Nothing was counted. Try again in a minute." };
  if (status === 402) return { status: 503, code: 'ai_unavailable', message: 'Bill reading is catching up with demand. Nothing was counted and your account is fine. Try again in a few minutes.' };
  if (status === 413) return { status: 413, code: 'file_too_large', message: 'This file is too large to read in one go. Take a photo of the page, or save the PDF at a lower quality.' };
  return { status: 503, code: 'ai_down', message: 'Bill reading is catching up with demand. Nothing was counted and your account is fine. Try again in a few minutes.' };
}

// ----------------------------------------------------------------------------
// Missing data: one plain next step per line, and one for the whole invoice.

export type LineStatus = 'counted' | 'avoided' | 'needs_data' | 'not_covered' | 'unclassified' | 'bill_charge' | 'reference';

/**
 * `deterministic`: the blocker is printed on the document itself (kVAh with no
 * kWh or power factor, net units), so reading the same file again cannot help.
 */
export interface LineGuidance { status: LineStatus; need: string | null; nextStep: string | null; deterministic?: boolean }

interface LineLike {
  description?: string; productCategory?: string; fuelType?: string; quantity?: number; unit?: string;
  co2Kg?: number; avoidedCo2Kg?: number; validationFlags?: string[];
  /** Kept for its printed figure only; its consumption is counted on another line. */
  referenceNote?: string;
}

/** What the document is, as far as guidance needs to know. */
export interface GuideContext {
  /** A recognised electricity bill (or meter photo): charge lines are costs, not activities. */
  electricityBill?: boolean;
  /** A blocker found on the document as a whole (see electricityBill.ts). */
  blocker?: ElectricityBlocker | null;
}

export const BILL_CHARGE_GUIDANCE = 'Part of this electricity bill: a cost, not a separate activity.';
const POWER_OR_REACTIVE_UNIT = /^(kw|kva|kvar|kvarh|mw|mva|hp)$/i;
// Bill totals, balances and arrears restate charges already listed; the
// energy charge is the money for units counted from the units line. Neither
// is a separate bill charge, so the charge count does not depend on whether
// the AI printed the total or put the units on the energy charge line.
const BILL_TOTAL_LINE = /\b(total|net amount|amount payable|net payable|payable|bill amount|arrears?|previous (balance|dues?)|balance|outstanding|round(ing)?[ -]?off|amount due|due amount)\b/i;
const ENERGY_CHARGE_LINE = /\benergy charges?\b/i;
export const BILL_TOTAL_GUIDANCE = 'A bill total or balance, not a separate charge.';
export const ENERGY_CHARGE_GUIDANCE = 'The money for the units used; the units are counted from the units line.';

const isFuel = (l: LineLike) => l.productCategory === 'FUEL';
const isPower = (l: LineLike) => ['ELECTRICITY', 'SOLAR_ENERGY', 'WIND_ENERGY'].includes(String(l.productCategory));

/**
 * Why a line was or was not counted, and the single simplest thing the user
 * can do about it. Only inputs printed on a document are ever used, so every
 * step points to a document, never to typing a number in.
 */
export function guideLine(l: LineLike, ctx: GuideContext = {}): LineGuidance {
  if (typeof l.co2Kg === 'number' && l.co2Kg > 0) return { status: 'counted', need: null, nextStep: null };
  if (typeof l.avoidedCo2Kg === 'number' && l.avoidedCo2Kg > 0) return { status: 'avoided', need: null, nextStep: null };
  const allFlags = l.validationFlags ?? [];
  const flags = allFlags.join(' ').toLowerCase();
  if (l.referenceNote) return { status: 'reference', need: null, nextStep: l.referenceNote };
  const twice = allFlags.find((f) => /not counted twice/i.test(f));
  if (twice) return { status: 'reference', need: null, nextStep: twice };
  // On an electricity bill a line with no quantity (demand, wheeling, FAC,
  // duty, rebates) or a demand / reactive figure is money, not energy used.
  if (ctx.electricityBill && !l.quantity && BILL_TOTAL_LINE.test(String(l.description ?? ''))) {
    return { status: 'reference', need: null, nextStep: BILL_TOTAL_GUIDANCE };
  }
  if (ctx.electricityBill && !l.quantity && ENERGY_CHARGE_LINE.test(String(l.description ?? ''))) {
    return { status: 'reference', need: null, nextStep: ENERGY_CHARGE_GUIDANCE };
  }
  if (ctx.electricityBill && (!l.quantity || POWER_OR_REACTIVE_UNIT.test(String(l.unit ?? '').trim()))) {
    return { status: 'bill_charge', need: null, nextStep: BILL_CHARGE_GUIDANCE };
  }
  if (!l.productCategory) {
    if (ctx.electricityBill) return { status: 'unclassified', need: null, nextStep: 'Nothing needed: this is not electricity use.' };
    return { status: 'unclassified', need: 'What this item is', nextStep: 'Nothing needed if this is not fuel or electricity. Otherwise ask the supplier to print the HSN code on the invoice.' };
  }
  if (flags.includes('kvah')) {
    return { status: 'needs_data', need: 'kWh or power factor', nextStep: KVAH_GUIDANCE, deterministic: true };
  }
  if (flags.includes('import units')) {
    return { status: 'needs_data', need: 'Imported units', nextStep: 'Upload the bill page that shows import units (net units cannot be used).', deterministic: true };
  }
  if (flags.includes('no approved grid factor')) {
    return { status: 'not_covered', need: null, nextStep: 'Electricity outside India is not calculated yet. Your country is set in Settings.' };
  }
  if (!l.quantity) {
    if (isFuel(l)) return { status: 'needs_data', need: 'Litres or kg', nextStep: 'Upload the fuel slip or pump bill that prints litres (or kg for gas).' };
    if (isPower(l)) return { status: 'needs_data', need: 'Units (kWh)', nextStep: 'Upload the bill page that prints units consumed.' };
    return { status: 'needs_data', need: 'Quantity', nextStep: 'Ask the supplier for an invoice that prints the quantity.' };
  }
  if (!l.unit) {
    return { status: 'needs_data', need: 'Unit', nextStep: isFuel(l) ? 'Upload a bill that prints the unit (litres or kg).' : 'Ask the supplier for an invoice that prints the unit with the quantity.' };
  }
  if (isFuel(l) && !l.fuelType) {
    return { status: 'needs_data', need: 'Fuel type', nextStep: 'Upload a bill that names the fuel (diesel, petrol, LPG, CNG, coal).' };
  }
  if (isFuel(l) || isPower(l)) {
    return { status: 'needs_data', need: `A unit we can convert (${l.unit})`, nextStep: isFuel(l) ? 'Upload a bill that prints litres or kg for this fuel.' : 'Upload a bill that prints kWh.' };
  }
  return { status: 'not_covered', need: null, nextStep: 'Purchased goods and services are not converted to emissions yet; this line is kept as evidence for Scope 3.' };
}

const RANK: Record<LineStatus, number> = { needs_data: 0, unclassified: 1, not_covered: 2, bill_charge: 3, reference: 3, avoided: 4, counted: 5 };

/** The next step for a document-wide blocker, and whether reading the file again could change it. */
const BLOCKER_STEP: Record<ElectricityBlocker, { step: string; deterministic: boolean }> = {
  kvah_needs_kwh: { step: KVAH_GUIDANCE, deterministic: true },
  net_units: { step: 'Upload the bill page that shows import units (net units cannot be used).', deterministic: true },
  single_meter_reading: { step: SINGLE_READING_GUIDANCE, deterministic: true },
  kvah_mismatch: { step: 'The kWh printed looks larger than the kVAh. Check both figures on the bill, then upload a clearer copy.', deterministic: false },
  meter_readings_unusable: { step: 'Upload the bill for this period, or a photo that shows only this period\'s two meter readings.', deterministic: false },
};

/** Counts and the one next step that unlocks the most, for the result screen. */
export function guideDocument(lines: LineLike[], ctx: GuideContext = {}): {
  counted: number; needsData: number; notCovered: number; unclassified: number;
  /** Electricity bill charge lines (money, not energy); never part of "not recognised". */
  billCharges: number;
  nextStep: string | null;
  /** True when nothing is counted and the only blockers are printed on the document, so reading it again cannot help. */
  deterministicBlocker: boolean;
  /** Which electricity blocker applies (e.g. kvah_needs_kwh), so the screen can ask for the one missing figure. */
  blocker: string | null;
} {
  const g = lines.map((l) => guideLine(l, ctx));
  const count = (s: LineStatus) => g.filter((x) => x.status === s).length;
  const first = [...g].sort((a, b) => RANK[a.status] - RANK[b.status])[0];
  const counted = count('counted');
  const actionable = first && (first.status === 'needs_data' || (first.status === 'unclassified' && counted === 0 && !ctx.electricityBill));
  let nextStep = actionable ? first.nextStep : null;
  const blocker = ctx.blocker ? BLOCKER_STEP[ctx.blocker] : null;
  if (counted === 0 && blocker && !(first?.status === 'needs_data' && !first.deterministic)) nextStep = blocker.step;
  else if (!nextStep && ctx.electricityBill && counted === 0) nextStep = 'Upload the bill page that prints units consumed (kWh).';
  const needs = g.filter((x) => x.status === 'needs_data');
  const deterministicBlocker = counted === 0
    && ((blocker?.deterministic ?? false) || (!blocker && needs.length > 0))
    && needs.every((x) => x.deterministic === true);
  return {
    counted, needsData: needs.length, notCovered: count('not_covered'), unclassified: count('unclassified'),
    billCharges: count('bill_charge'), nextStep, deterministicBlocker,
    blocker: counted === 0 ? (ctx.blocker ?? null) : null,
  };
}

/**
 * LPG and gas sold in cylinders: "2 Nos" of "Commercial LPG cylinder 19 kg"
 * is 38 kg, because the cylinder size is printed on the line. Without a
 * printed size nothing is converted.
 */
export function cylinderToKg(l: { description?: string; quantity?: number; unit?: string }): { quantity: number; unit: 'kg' } | null {
  if (!l.quantity || !/^(nos?|no\.?|pcs?|cyl(inder)?s?|units?)$/i.test(String(l.unit ?? '').trim())) return null;
  const d = String(l.description ?? '');
  if (!/lpg|cylinder|propane|butane/i.test(d)) return null;
  const m = d.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?)\b/i);
  if (!m) return null;
  const size = Number(m[1]);
  if (!(size > 0 && size <= 500)) return null;
  return { quantity: Math.round(l.quantity * size * 1000) / 1000, unit: 'kg' };
}
