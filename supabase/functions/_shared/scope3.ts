// Scope 3 supplier emissions, line by line. Pure: no Deno imports, so the
// website tests run the same code the edge functions run.
//
// Contract (GHG Protocol Corporate Value Chain (Scope 3) Standard and its
// Technical Guidance for Calculating Scope 3 Emissions):
// - Every invoice line is kept with its source evidence, whatever happens.
// - A line gets kgCO2e only from printed activity data (quantity and unit, or
//   for freight the printed weight and distance) times an APPROVED factor
//   that matches its Scope 3 category, its material (HSN heading or freight
//   mode) and its geography (the supplier, or the supplier's country).
// - Nothing is inferred: no unit read from the description, no quantity from
//   the amount, no generic or spend-based factor, no fallback above the HSN
//   heading (4 digits) or to another country. A missing input makes the line Needs
//   Data; a failed reconciliation makes it Needs Review. Neither counts.
// - "verified" here means: calculated as above, with every reconciliation
//   check passing, on an invoice counted once. Only those lines are totalled.

import { checkedSourcePage } from './extractionChecks.ts';
import { normalizeUnit } from './emissionFactors.ts';

export const SCOPE3_METHOD = { id: 'SENSEIBLE-SCOPE3-LINES', version: '1.0' } as const;
export const SCOPE3_METHOD_VERSION = `${SCOPE3_METHOD.id}_v${SCOPE3_METHOD.version}`;

/** GHG Protocol Scope 3 categories. */
export const SCOPE3_CATEGORIES: Record<number, string> = {
  1: 'Purchased goods and services', 2: 'Capital goods', 3: 'Fuel- and energy-related activities',
  4: 'Upstream transportation and distribution', 5: 'Waste generated in operations', 6: 'Business travel',
  7: 'Employee commuting', 8: 'Upstream leased assets', 9: 'Downstream transportation and distribution',
  10: 'Processing of sold products', 11: 'Use of sold products', 12: 'End-of-life treatment of sold products',
  13: 'Downstream leased assets', 14: 'Franchises', 15: 'Investments',
};

export type DataClass = 'primary_supplier' | 'supplier_specific_factor' | 'secondary_factor' | 'spend_based' | 'unverified';
export type LineStatus = 'verified' | 'needs_data' | 'needs_review' | 'duplicate' | 'not_scope3';
export type Check = 'pass' | 'fail' | 'n/a';

// ---------------------------------------------------------------------------
// Sealed extraction: the OCR fields exactly as read, before any classification
// ---------------------------------------------------------------------------
export interface Logistics { mode: string | null; distanceKm: number | null; weightKg: number | null; origin: string | null; destination: string | null }
export interface SealedLine {
  index: number;
  description: string;
  hsn: string | null;
  quantity: number | null;
  /** The unit printed with the quantity. Never read from the description. */
  unit: string | null;
  unitPrice: number | null;
  total: number | null;
  sourcePage: number | null;
  sourceText: string | null;
  logistics: Logistics | null;
}
export interface SealedDocument {
  documentType: string;
  vendor: string | null;
  invoiceNumber: string | null;
  date: string | null;
  supplierGstin: string | null;
  buyerGstin: string | null;
  amount: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  currency: string;
  lines: SealedLine[];
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/,/g, '')) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const pos = (v: unknown) => { const n = num(v); return n !== null && n > 0 ? n : null; };
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

function sealLogistics(raw: unknown): Logistics | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const l: Logistics = {
    mode: text(r.mode, 40), distanceKm: pos(r.distanceKm), weightKg: pos(r.weightKg),
    origin: text(r.origin, 60), destination: text(r.destination, 60),
  };
  return Object.values(l).some((v) => v !== null) ? l : null;
}

/** The extraction as read by OCR, cleaned of non-values only. */
export function sealExtraction(ocr: Record<string, unknown>, pageCount: number | null): SealedDocument {
  const lines = Array.isArray(ocr.lineItems) ? ocr.lineItems as Record<string, unknown>[] : [];
  return {
    documentType: text(ocr.documentType, 20) ?? 'unknown',
    vendor: text(ocr.vendor, 160),
    invoiceNumber: text(ocr.invoiceNumber, 60),
    date: isDate(ocr.date) ? ocr.date : null,
    supplierGstin: text(ocr.supplierGstin, 20)?.replace(/\s+/g, '').toUpperCase() ?? null,
    buyerGstin: text(ocr.buyerGstin, 20)?.replace(/\s+/g, '').toUpperCase() ?? null,
    amount: num(ocr.amount), subtotal: num(ocr.subtotal), taxAmount: num(ocr.taxAmount),
    currency: text(ocr.currency, 3)?.toUpperCase() ?? 'INR',
    lines: lines.map((l, index) => ({
      index,
      description: text(l.description, 240) ?? '',
      hsn: typeof l.hsn_code === 'string' || typeof l.hsn_code === 'number' ? String(l.hsn_code).replace(/\D/g, '').slice(0, 8) || null : null,
      quantity: pos(l.quantity),
      unit: text(l.unit, 20),
      unitPrice: num(l.unitPrice),
      total: num(l.total),
      sourcePage: checkedSourcePage(l.sourcePage, pageCount),
      sourceText: text(l.sourceText, 240),
      logistics: sealLogistics(l.logistics),
    })),
  };
}

/** Key-sorted JSON, so the same extraction always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object).sort().filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

// ---------------------------------------------------------------------------
// Supplier identity
// ---------------------------------------------------------------------------
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Indian GSTIN: format and the published mod-36 check character. */
export function isValidGstin(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  const g = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = GSTIN_CHARS.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36] === g[14];
}

/** The string an invoice is deduplicated on: supplier, invoice number, date. Null when any is missing. */
export function invoiceKeyMaterial(doc: SealedDocument): string | null {
  if (!isValidGstin(doc.supplierGstin) || !doc.invoiceNumber || !doc.date) return null;
  const no = doc.invoiceNumber.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^0+(?=\d)/, '');
  return no ? `${doc.supplierGstin}|${no}|${doc.date}` : null;
}

// ---------------------------------------------------------------------------
// Classification into a Scope 3 category (rules, versioned with the method)
// ---------------------------------------------------------------------------
export interface Classification {
  scope: 1 | 2 | 3 | null;
  category: number | null;
  method: 'HSN' | 'SAC' | 'KEYWORD' | 'NONE';
  basis: string;
  /** Material keys to look up, most specific first (HSN 6-digit then 4-digit, or freight mode). */
  materialKeys: string[];
  /** Freight or travel mode, when the line is transport. */
  mode: string | null;
  /** Where the activity comes from: the printed quantity, or weight x distance (freight), or passengers x distance (travel). */
  activity: 'printed' | 'freight' | 'travel';
  review: string[];
  missing: string[];
}

const MODES: Array<[RegExp, string]> = [
  [/\b(air|airway|air ?cargo|air ?freight|flight)\b/i, 'air'],
  [/\b(sea|ocean|vessel|ship|container ship)\b/i, 'sea'],
  [/\b(rail|railway|train|wagon|rake)\b/i, 'rail'],
  [/\b(road|truck|lorry|trailer|tempo|ftl|ptl)\b/i, 'road'],
];
function freightMode(line: SealedLine): { mode: string | null; basis: string } {
  const printed = line.logistics?.mode;
  if (printed) for (const [re, m] of MODES) if (re.test(printed)) return { mode: m, basis: `mode printed as "${printed}"` };
  for (const [re, m] of MODES) if (re.test(line.description)) return { mode: m, basis: `mode named in the description` };
  return { mode: null, basis: 'mode not printed' };
}

const FREIGHT_KW = /\b(freight|transport(ation)?|logistics|courier|shipping|cartage|haulage|truck hire|lorry hire|carriage)\b/i;
const TRAVEL_KW = /\b(air ?fare|air ticket|flight ticket|train ticket|rail ticket|bus ticket|taxi|cab hire)\b/i;
const HOTEL_KW = /\b(hotel|lodging|room (charges|rent|tariff))\b/i;
const WASTE_KW = /\b(waste (disposal|collection|management|handling)|scrap disposal|garbage collection)\b/i;
const WASTE_ROUTES: Array<[RegExp, string]> = [
  [/\blandfill/i, 'landfill'], [/\brecycl/i, 'recycling'], [/\bincinerat/i, 'incineration'],
  [/\bcompost/i, 'composting'], [/\bco-?process/i, 'co_processing'],
];

function freight(line: SealedLine, method: Classification['method'], basis: string): Classification {
  const fm = freightMode(line);
  return {
    scope: 3, category: 4, method, basis: `${basis}; ${fm.basis}`, mode: fm.mode, activity: 'freight',
    materialKeys: fm.mode ? [`freight:${fm.mode}`] : [], review: [], missing: fm.mode ? [] : ['missing_mode'],
  };
}
function travel(line: SealedLine, method: Classification['method'], basis: string): Classification {
  const fm = freightMode(line);
  const mode = fm.mode === 'sea' ? null : fm.mode;
  return {
    scope: 3, category: 6, method, basis: `${basis}; ${fm.basis}`, mode, activity: 'travel',
    materialKeys: mode ? [`travel:${mode}`] : [], review: [], missing: mode ? [] : ['missing_mode'],
  };
}
function waste(line: SealedLine, method: Classification['method'], basis: string): Classification {
  const route = WASTE_ROUTES.find(([re]) => re.test(line.description))?.[1] ?? null;
  return {
    scope: 3, category: 5, method, basis: route ? `${basis}; treatment "${route}" printed` : basis, mode: null, activity: 'printed',
    materialKeys: route ? [`waste:${route}`] : [], review: [], missing: route ? [] : ['waste_route'],
  };
}

export function classifyLine(line: SealedLine): Classification {
  const hsn = line.hsn;
  const base = { mode: null, activity: 'printed' as const, review: [] as string[], missing: [] as string[] };
  if (hsn && hsn.length >= 4) {
    const ch = hsn.slice(0, 2), h4 = hsn.slice(0, 4);
    if (ch === '99') {
      // SAC (services accounting code).
      if (['9965', '9967', '9968'].includes(h4)) return freight(line, 'SAC', `SAC ${h4}: goods transport, cargo handling or courier services`);
      if (h4 === '9964') return travel(line, 'SAC', 'SAC 9964: passenger transport');
      if (h4 === '9963' && HOTEL_KW.test(line.description)) return { ...base, scope: 3, category: 6, method: 'SAC', basis: 'SAC 9963 with a room stay named', materialKeys: ['stay:hotel'] };
      if (h4 === '9994') return waste(line, 'SAC', 'SAC 9994: sewage and waste services');
      return { ...base, scope: 3, category: 1, method: 'SAC', basis: `SAC ${h4}: purchased service`, materialKeys: [hsn.length >= 6 ? `sac:${hsn.slice(0, 6)}` : '', `sac:${h4}`].filter(Boolean) };
    }
    if (h4 === '2716') return { ...base, scope: 2, category: null, method: 'HSN', basis: 'HSN 2716: electricity (Scope 2)', materialKeys: [] };
    if (ch === '27') return { ...base, scope: 1, category: null, method: 'HSN', basis: `HSN chapter 27: fuel burned on site (Scope 1)`, materialKeys: [] };
    const keys = [hsn.length >= 6 ? `hsn:${hsn.slice(0, 6)}` : '', `hsn:${h4}`].filter(Boolean);
    if (['84', '85', '86', '87', '88', '89', '90'].includes(ch)) {
      return { ...base, scope: 3, category: 2, method: 'HSN', basis: `HSN chapter ${ch}: machinery, equipment or vehicles`, materialKeys: keys, review: ['capitalisation_unconfirmed'] };
    }
    return { ...base, scope: 3, category: 1, method: 'HSN', basis: `HSN ${h4}: purchased goods`, materialKeys: keys };
  }
  if (FREIGHT_KW.test(line.description)) return freight(line, 'KEYWORD', 'transport service named in the description');
  if (TRAVEL_KW.test(line.description)) return travel(line, 'KEYWORD', 'travel ticket named in the description');
  if (HOTEL_KW.test(line.description)) return { ...base, scope: 3, category: 6, method: 'KEYWORD', basis: 'hotel stay named in the description', materialKeys: ['stay:hotel'] };
  if (WASTE_KW.test(line.description)) return waste(line, 'KEYWORD', 'waste service named in the description');
  return { ...base, scope: null, category: null, method: 'NONE', basis: 'no HSN or SAC code and no rule matches', materialKeys: [], missing: ['unclassified'] };
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------
const EXTRA_UNITS: Record<string, { unit: string; multiplier: number }> = {
  nos: { unit: 'nos', multiplier: 1 }, no: { unit: 'nos', multiplier: 1 }, 'no.': { unit: 'nos', multiplier: 1 },
  pcs: { unit: 'nos', multiplier: 1 }, pc: { unit: 'nos', multiplier: 1 }, piece: { unit: 'nos', multiplier: 1 }, pieces: { unit: 'nos', multiplier: 1 },
  km: { unit: 'km', multiplier: 1 }, kms: { unit: 'km', multiplier: 1 },
  pkm: { unit: 'pkm', multiplier: 1 }, 'passenger-km': { unit: 'pkm', multiplier: 1 },
  night: { unit: 'night', multiplier: 1 }, nights: { unit: 'night', multiplier: 1 },
};
/** Canonical unit and multiplier (kg, litre, kWh, scm, ton-km, nos, km, pkm, night). */
export function scope3Unit(raw: string | null | undefined): { unit: string; multiplier: number } | null {
  if (typeof raw !== 'string') return null;
  const n = normalizeUnit(raw);
  if (n) return n;
  return EXTRA_UNITS[raw.trim().toLowerCase().replace(/\s+/g, ' ')] ?? null;
}

// ---------------------------------------------------------------------------
// Factors
// ---------------------------------------------------------------------------
export interface Scope3Factor {
  id: string;
  factorKey: string;
  version: string;
  scope3Category: number;
  materialKey: string;
  /** 'IN' style country code, or 'SUPPLIER:<GSTIN>' for a supplier's own figure. */
  geography: string;
  unit: string;
  kgPerUnit: number;
  dataClass: 'primary_supplier' | 'supplier_specific_factor' | 'secondary_factor';
  sourceName: string;
  sourceRef: string;
  publicationYear: number;
  validFrom: string;
  validTo: string | null;
}

type Resolution = { factor: Scope3Factor; tier: 'supplier' | 'country' } | { factor: null; reason: 'no_factor' | 'factor_ambiguous' | 'supplier_identity' };

/** The supplier's own factor first, then the supplier's country; same material, category and date only. */
export function resolveFactor(c: Classification, doc: SealedDocument, factors: Scope3Factor[]): Resolution {
  if (!isValidGstin(doc.supplierGstin)) return { factor: null, reason: 'supplier_identity' };
  const date = doc.date;
  const valid = (f: Scope3Factor) => !date || (f.validFrom <= date && (!f.validTo || date <= f.validTo));
  for (const key of c.materialKeys) {
    for (const [tier, geo] of [['supplier', `SUPPLIER:${doc.supplierGstin}`], ['country', 'IN']] as const) {
      const hits = factors.filter((f) => f.scope3Category === c.category && f.materialKey === key && f.geography === geo && valid(f));
      if (!hits.length) continue;
      const keys = new Set(hits.map((f) => f.factorKey));
      if (keys.size > 1) return { factor: null, reason: 'factor_ambiguous' };
      const latest = hits.sort((a, b) => (a.validFrom < b.validFrom ? 1 : a.validFrom > b.validFrom ? -1 : 0))[0];
      return { factor: latest, tier };
    }
  }
  return { factor: null, reason: 'no_factor' };
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------
export interface DocumentChecks { invoice_identity: Check; invoice_totals: Check; reasons: string[]; detail: string }

const close = (a: number, b: number, rel: number) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * rel);

/** Invoice-level checks that every line of the invoice inherits. */
export function documentChecks(doc: SealedDocument): DocumentChecks {
  const reasons: string[] = [];
  const identity = !!invoiceKeyMaterial(doc);
  if (!identity) reasons.push(isValidGstin(doc.supplierGstin) ? 'invoice_identity' : 'supplier_identity');
  let totals: Check = 'fail', detail = '';
  const lineTotals = doc.lines.map((l) => l.total);
  if (!doc.lines.length || lineTotals.some((t) => t === null)) { reasons.push('line_totals_missing'); detail = 'Not every line prints its total'; }
  else {
    const sum = Math.round(lineTotals.reduce((a, t) => a + (t as number), 0) * 100) / 100;
    const target = doc.subtotal ?? (doc.amount !== null && doc.taxAmount !== null ? doc.amount - doc.taxAmount : doc.amount);
    const label = doc.subtotal !== null ? 'subtotal' : doc.taxAmount !== null ? 'amount less tax' : 'amount';
    if (target === null) { reasons.push('invoice_totals'); detail = 'No subtotal or total is printed'; }
    else if (close(sum, target, 0.005)) { totals = 'pass'; detail = `Lines sum to ${sum}, ${label} ${target}`; }
    else { reasons.push('invoice_totals'); detail = `Lines sum to ${sum}, but the ${label} is ${target}`; }
  }
  return { invoice_identity: identity ? 'pass' : 'fail', invoice_totals: totals, reasons, detail };
}

// ---------------------------------------------------------------------------
// One line, end to end
// ---------------------------------------------------------------------------
export interface LineResult {
  lineIndex: number;
  scope: 1 | 2 | 3 | null;
  scope3Category: number | null;
  classificationMethod: Classification['method'];
  classificationBasis: string;
  materialKey: string | null;
  factor: Scope3Factor | null;
  dataClass: DataClass;
  activityQty: number | null;
  activityUnit: string | null;
  formula: string | null;
  kgCo2e: number | null;
  status: LineStatus;
  reasons: string[];
  nextAction: string | null;
  checks: Record<string, Check>;
  confidence: 'high' | 'medium' | 'low' | null;
}

/** Reasons that mean an input is missing (Needs Data); every other reason means Needs Review. */
export const NEEDS_DATA = new Set(['unclassified', 'missing_quantity', 'missing_unit', 'missing_weight', 'missing_distance', 'missing_mode', 'waste_route', 'supplier_identity', 'no_factor']);

/** Plain-language reason and the next step, for the trail. */
export const REASONS: Record<string, { label: string; next: string }> = {
  unclassified: { label: 'No HSN or SAC code, and no rule fits the description', next: 'Ask the supplier to print the HSN or SAC code on the invoice' },
  capitalisation_unconfirmed: { label: 'Machinery or equipment: capital good (Category 2) or consumable (Category 1) is not confirmed', next: 'Confirm with your accounts team whether this purchase is capitalised' },
  missing_quantity: { label: 'No quantity is printed for this line', next: 'Ask the supplier for an invoice that prints the quantity' },
  missing_unit: { label: 'No unit is printed with the quantity', next: 'Ask the supplier for an invoice that prints the unit' },
  unit_mismatch: { label: 'The printed unit cannot be converted to the factor\'s unit', next: 'Check the unit on the invoice, or add a factor in this unit' },
  missing_weight: { label: 'Freight weight is not printed', next: 'Upload the lorry receipt or bill of lading that shows the weight' },
  missing_distance: { label: 'Distance is not printed', next: 'Upload the transport document that shows the route or distance' },
  missing_mode: { label: 'Transport mode (road, rail, air, sea) is not printed', next: 'Upload the transport document that names the mode' },
  waste_route: { label: 'Waste treatment route is not printed', next: 'Ask the waste handler for a certificate naming the treatment route' },
  supplier_identity: { label: 'No valid supplier GSTIN, so the supplier, its country and duplicates cannot be established', next: 'Check the GSTIN on the invoice' },
  no_factor: { label: 'No approved factor for this material and geography', next: 'Ask the supplier for its product carbon footprint, or add a sourced factor for review' },
  factor_ambiguous: { label: 'More than one approved factor fits this line', next: 'Retire the factor that does not apply' },
  invoice_identity: { label: 'Invoice number or date is missing, so duplicates cannot be ruled out', next: 'Check the invoice number and date' },
  invoice_totals: { label: 'Line totals do not reconcile with the invoice total', next: 'Check that every line was read, or upload a clearer copy' },
  line_totals_missing: { label: 'Not every line prints its total, so the invoice cannot be reconciled', next: 'Upload a copy where every line total is legible' },
  line_math: { label: 'Quantity times rate does not equal the line total', next: 'Check the quantity and rate on the invoice' },
  duplicate_line: { label: 'The same line appears twice on this invoice', next: 'Confirm both lines are separate supplies' },
  duplicate_invoice: { label: 'This invoice is already counted from another upload', next: 'Nothing to do: it is counted once' },
};

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const fmt = (n: number) => String(r6(n));

export function evaluateLine(line: SealedLine, doc: SealedDocument, docChecks: DocumentChecks, factors: Scope3Factor[]): LineResult {
  const c = classifyLine(line);
  const base = {
    lineIndex: line.index, scope: c.scope, scope3Category: c.category, classificationMethod: c.method,
    classificationBasis: c.basis,
  };
  if (c.scope === 1 || c.scope === 2) {
    return { ...base, materialKey: null, factor: null, dataClass: 'unverified', activityQty: null, activityUnit: null, formula: null, kgCo2e: null,
      status: 'not_scope3', reasons: [], nextAction: null, checks: {}, confidence: null };
  }
  const reasons = new Set<string>([...c.missing, ...c.review, ...docChecks.reasons]);
  const checks: Record<string, Check> = {
    invoice_identity: docChecks.invoice_identity, invoice_totals: docChecks.invoice_totals,
    category: c.category && !c.review.length && !c.missing.includes('unclassified') ? 'pass' : 'fail',
  };

  // Same line printed twice on this invoice.
  const twin = doc.lines.some((o) => o.index !== line.index && o.description === line.description && o.quantity === line.quantity && o.total === line.total);
  checks.duplicate_line = twin ? 'fail' : 'pass';
  if (twin) reasons.add('duplicate_line');

  // Quantity x rate = line total, when all three are printed.
  if (line.quantity !== null && line.unitPrice !== null && line.total !== null) {
    const ok = close(line.quantity * line.unitPrice, line.total, 0.01);
    checks.line_math = ok ? 'pass' : 'fail';
    if (!ok) reasons.add('line_math');
  } else checks.line_math = 'n/a';

  // Factor.
  const res = c.category ? resolveFactor(c, doc, factors) : { factor: null, reason: 'no_factor' as const };
  const factor = res.factor;
  if (!factor) reasons.add((res as { reason: string }).reason);
  checks.factor = factor ? 'pass' : 'fail';

  // Activity data, from printed values only.
  let activityQty: number | null = null, activityUnit: string | null = null, formula: string | null = null;
  const printed = scope3Unit(line.unit);
  if (c.activity === 'travel' && !(printed?.unit === 'pkm' && line.quantity)) {
    // Passenger-km: passengers (printed as a count) x printed distance.
    const d = line.logistics?.distanceKm ?? null;
    const pax = line.quantity && printed?.unit === 'nos' ? line.quantity : null;
    if (!d) reasons.add('missing_distance');
    if (!pax) reasons.add(line.quantity ? 'missing_unit' : 'missing_quantity');
    checks.quantity = d && pax ? 'pass' : 'fail';
    checks.unit = pax ? 'pass' : 'n/a';
    if (d && pax) { activityQty = r6(pax * d); activityUnit = 'pkm'; formula = `${fmt(pax)} passengers x ${fmt(d)} km = ${fmt(activityQty)} pkm`; }
  } else if (c.activity === 'freight' && !(printed?.unit === 'ton-km' && line.quantity)) {
    const w = line.logistics?.weightKg ?? null, d = line.logistics?.distanceKm ?? null;
    if (!w) reasons.add('missing_weight');
    if (!d) reasons.add('missing_distance');
    checks.quantity = w && d ? 'pass' : 'fail';
    if (w && d) {
      activityQty = r6((w / 1000) * d); activityUnit = 'ton-km';
      checks.unit = 'pass';
      formula = `${fmt(w)} kg / 1000 x ${fmt(d)} km = ${fmt(activityQty)} t-km`;
    } else checks.unit = 'n/a';
  } else {
    if (!line.quantity) reasons.add('missing_quantity');
    if (!line.unit) reasons.add('missing_unit');
    checks.quantity = line.quantity ? 'pass' : 'fail';
    checks.unit = line.unit && printed ? 'pass' : 'fail';
    if (line.unit && !printed) reasons.add('unit_mismatch');
    if (line.quantity && printed) {
      activityQty = r6(line.quantity * printed.multiplier); activityUnit = printed.unit;
      formula = printed.multiplier === 1 ? `${fmt(line.quantity)} ${line.unit}` : `${fmt(line.quantity)} ${line.unit} = ${fmt(activityQty)} ${printed.unit}`;
    }
  }

  // Calculation: activity in the factor's unit x factor.
  let kgCo2e: number | null = null;
  if (factor && activityQty !== null && activityUnit) {
    const fu = scope3Unit(factor.unit);
    if (!fu || fu.unit !== activityUnit) { reasons.add('unit_mismatch'); checks.unit = 'fail'; }
    else {
      const qtyInFactorUnit = r6(activityQty / fu.multiplier);
      kgCo2e = r6(qtyInFactorUnit * factor.kgPerUnit);
      activityQty = qtyInFactorUnit; activityUnit = factor.unit;
      formula = `${formula}${fu.multiplier === 1 ? '' : ` = ${fmt(qtyInFactorUnit)} ${factor.unit}`} x ${fmt(factor.kgPerUnit)} kgCO2e/${factor.unit} (${factor.factorKey} v${factor.version}) = ${fmt(kgCo2e)} kgCO2e`;
    }
  }
  checks.co2e = kgCo2e !== null ? 'pass' : 'fail';
  if (kgCo2e === null) formula = null;

  const all = [...reasons];
  const status: LineStatus = all.some((r) => NEEDS_DATA.has(r)) ? 'needs_data' : all.length ? 'needs_review' : 'verified';
  const first = all.find((r) => NEEDS_DATA.has(r)) ?? all[0];
  const dataClass: DataClass = factor ? factor.dataClass : 'unverified';
  // High: the supplier's own figure. Medium: a secondary factor at the most specific material key
  // (6-digit HSN/SAC, or a named mode or route). Low: a 4-digit heading or a keyword classification.
  const confidence = kgCo2e === null ? null
    : factor!.dataClass !== 'secondary_factor' ? 'high'
    : c.method !== 'KEYWORD' && (!/^(hsn|sac):/.test(factor!.materialKey) || factor!.materialKey.length === 10) ? 'medium' : 'low';
  return {
    ...base, materialKey: factor?.materialKey ?? c.materialKeys[0] ?? null, factor, dataClass, activityQty, activityUnit,
    formula, kgCo2e, status, reasons: all.sort(), nextAction: first ? REASONS[first]?.next ?? null : null, checks, confidence,
  };
}

/** Every line of one sealed invoice. */
export function evaluateDocument(doc: SealedDocument, factors: Scope3Factor[]): { checks: DocumentChecks; lines: LineResult[] } {
  const checks = documentChecks(doc);
  return { checks, lines: doc.lines.map((l) => evaluateLine(l, doc, checks, factors)) };
}

// ---------------------------------------------------------------------------
// Aggregation (the same rule the database views apply)
// ---------------------------------------------------------------------------
export interface StoredLine { status: LineStatus; scope3Category: number | null; supplierGstin: string | null; supplierName: string | null; kgCo2e: number | null; lineTotal: number | null; dataClass: DataClass }

/** Verified kgCO2e by category and by supplier GSTIN, with coverage. Only verified lines count. */
export function aggregate(lines: StoredLine[]) {
  const scope3 = lines.filter((l) => l.status !== 'not_scope3' && l.status !== 'duplicate');
  const verified = scope3.filter((l) => l.status === 'verified' && typeof l.kgCo2e === 'number');
  const byCategory = new Map<number, number>(), bySupplier = new Map<string, { name: string | null; kg: number; verifiedLines: number; lines: number }>();
  for (const l of verified) byCategory.set(l.scope3Category!, r6((byCategory.get(l.scope3Category!) ?? 0) + l.kgCo2e!));
  for (const l of scope3) {
    const key = l.supplierGstin ?? 'unidentified';
    const s = bySupplier.get(key) ?? { name: l.supplierName, kg: 0, verifiedLines: 0, lines: 0 };
    s.lines++;
    if (l.status === 'verified' && typeof l.kgCo2e === 'number') { s.kg = r6(s.kg + l.kgCo2e); s.verifiedLines++; }
    bySupplier.set(key, s);
  }
  return {
    totalKg: r6(verified.reduce((a, l) => a + l.kgCo2e!, 0)),
    byCategory, bySupplier,
    lines: scope3.length, verifiedLines: verified.length,
    needsData: scope3.filter((l) => l.status === 'needs_data').length,
    needsReview: scope3.filter((l) => l.status === 'needs_review').length,
  };
}
