// Pure helpers for reading an AI extraction safely and explaining, in plain
// words, what an invoice is missing. No I/O, so it is unit tested.

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
  return { ok: true };
}

/** What the user sees when every AI provider failed: our problem, not their image. */
export function providerFailure(status: number | undefined): { status: number; code: string; message: string } {
  if (status === 429) return { status: 429, code: 'ai_busy', message: 'Invoice reading is busy right now. Please wait a minute and try again; nothing was counted.' };
  if (status === 402) return { status: 503, code: 'ai_unavailable', message: 'Invoice reading is paused on our side right now. Please try again later; nothing was counted.' };
  if (status === 413) return { status: 413, code: 'file_too_large', message: 'This file is too large to read in one go. Take a photo of the page, or save the PDF at a lower quality.' };
  return { status: 503, code: 'ai_down', message: 'Invoice reading is temporarily unavailable on our side. Please try again in a few minutes; nothing was counted.' };
}

// ----------------------------------------------------------------------------
// Missing data: one plain next step per line, and one for the whole invoice.

export type LineStatus = 'counted' | 'avoided' | 'needs_data' | 'not_covered' | 'unclassified';

export interface LineGuidance { status: LineStatus; need: string | null; nextStep: string | null }

interface LineLike {
  description?: string; productCategory?: string; fuelType?: string; quantity?: number; unit?: string;
  co2Kg?: number; avoidedCo2Kg?: number; validationFlags?: string[];
}

const isFuel = (l: LineLike) => l.productCategory === 'FUEL';
const isPower = (l: LineLike) => ['ELECTRICITY', 'SOLAR_ENERGY', 'WIND_ENERGY'].includes(String(l.productCategory));

/**
 * Why a line was or was not counted, and the single simplest thing the user
 * can do about it. Only inputs printed on a document are ever used, so every
 * step points to a document, never to typing a number in.
 */
export function guideLine(l: LineLike): LineGuidance {
  if (typeof l.co2Kg === 'number' && l.co2Kg > 0) return { status: 'counted', need: null, nextStep: null };
  if (typeof l.avoidedCo2Kg === 'number' && l.avoidedCo2Kg > 0) return { status: 'avoided', need: null, nextStep: null };
  const flags = (l.validationFlags ?? []).join(' ').toLowerCase();
  if (!l.productCategory) {
    return { status: 'unclassified', need: 'What this item is', nextStep: 'Nothing needed if this is not fuel or electricity. Otherwise ask the supplier to print the HSN code on the invoice.' };
  }
  if (flags.includes('kvah')) {
    return { status: 'needs_data', need: 'Units in kWh', nextStep: 'This bill shows kVAh only. Upload a bill or meter statement that prints kWh.' };
  }
  if (flags.includes('import units')) {
    return { status: 'needs_data', need: 'Imported units', nextStep: 'Upload the bill page that shows import units (net units cannot be used).' };
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

const RANK: Record<LineStatus, number> = { needs_data: 0, unclassified: 1, not_covered: 2, avoided: 3, counted: 4 };

/** Counts and the one next step that unlocks the most, for the result screen. */
export function guideDocument(lines: LineLike[]): {
  counted: number; needsData: number; notCovered: number; unclassified: number; nextStep: string | null;
} {
  const g = lines.map(guideLine);
  const count = (s: LineStatus) => g.filter((x) => x.status === s).length;
  const first = [...g].sort((a, b) => RANK[a.status] - RANK[b.status])[0];
  const actionable = first && (first.status === 'needs_data' || (first.status === 'unclassified' && count('counted') === 0));
  return {
    counted: count('counted'), needsData: count('needs_data'), notCovered: count('not_covered'), unclassified: count('unclassified'),
    nextStep: actionable ? first.nextStep : null,
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
