// Document kind: a fixed rules library that labels what a stored document is,
// from its printed heading and its billing signals. No AI decides the kind:
// the model only copies the heading as printed (documentTitle), and these
// rules read it. Pure, shared by extract-document and the website.
//
// Basis kept here, not shown to users:
// - Credit note: issued by a supplier to reduce the value or tax of an
//   earlier tax invoice (overbilling, goods returned, deficiency); CGST Act
//   2017 s.34. It records a correction, not a new purchase.
// - Purchase order: the buyer's intent to buy. GHG Protocol Scope 3 Standard
//   Category 1 counts goods "purchased or acquired ... in the reporting
//   year", so an order alone is not evidence that anything arrived.
// - E-way bill: required for movement of goods worth over ₹50,000 (CGST
//   Rules r.138); it carries the value of the invoice or challan it travels
//   with (GST Council flyer, ch. 18).
// - Lorry receipt / consignment note / bilty: issued by a goods transport
//   agency on receipt of goods; serially numbered, with consignor, consignee,
//   vehicle and route (GST Council GTA flyer, Sep 2017; CGST Rules r.54(3)).
// - Tax invoice: CGST Rules r.46; bill of supply r.49.
//
// Owner rule (October 2026): credit notes and purchase orders are kept as
// evidence and never counted as emissions.

export type DocumentKind =
  | 'electricity_bill' | 'fuel_slip' | 'lorry_receipt' | 'eway_bill'
  | 'tax_invoice' | 'credit_note' | 'purchase_order' | 'other';

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  electricity_bill: 'Electricity bill',
  fuel_slip: 'Fuel slip',
  lorry_receipt: 'Lorry receipt',
  eway_bill: 'E-way bill',
  tax_invoice: 'Tax invoice',
  credit_note: 'Credit note',
  purchase_order: 'Purchase order',
  other: 'Document',
};

/** Kinds kept as evidence only: no emission is ever counted from them. */
export const EVIDENCE_ONLY_KINDS: ReadonlySet<DocumentKind> = new Set(['credit_note', 'purchase_order']);
export const EVIDENCE_ONLY_NOTE = 'Evidence, not counted';

export const isEvidenceOnlyKind = (k: unknown): boolean =>
  typeof k === 'string' && EVIDENCE_ONLY_KINDS.has(k as DocumentKind);

const CREDIT_NOTE = /\bcredit\s*(note|memo)\b/;
const PURCHASE_ORDER = /\bpurchase\s*order\b/;
const EWAY = /\be[\s-]?way\s*bill\b|\bewb\b/;
const LORRY = /\blorry\s*receipt\b|\bconsignment\s*note\b|\bgoods\s*consignment\b|\bbu?ilty\b|\btransport\s*receipt\b|^\s*(l\.?\s?r\.?|g\.?\s?r\.?|gcn)\s*$/;
const FUEL_TITLE = /\bfuel\b|\bpetrol\b|\bdiesel\b|\bfilling\s*station\b|\bpetroleum\b|\bpump\b/;
const SLIP = /\breceipt\b|\bslip\b|\bcash\s*memo\b|\bbill\b/;
const TAX_INVOICE = /\binvoice\b|\bbill\s*of\s*supply\b/;

export interface KindInput {
  /** The heading as printed ("Tax Invoice", "Credit Note"), when read. */
  documentTitle?: unknown;
  /** The model's documentType before or after normalising. */
  documentType?: unknown;
  /** True for an electricity bill (units consumed, billing details or HSN 2716). */
  utilityBill?: boolean;
  /** Line categories after the deterministic classification, when known. */
  lineCategories?: Array<string | undefined | null>;
}

const text = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * The kind, from the first rule that matches. Corrections and orders come
 * first because their headings can also contain "invoice" ("credit note
 * against invoice 42"). Fuel slips need every classified line to be fuel and
 * a heading that is not a tax invoice; a pump's tax invoice stays a tax invoice.
 */
export function documentKind(input: KindInput): DocumentKind {
  const title = text(input.documentTitle);
  const type = text(input.documentType);
  const both = `${title} | ${type}`;
  if (CREDIT_NOTE.test(both)) return 'credit_note';
  if (PURCHASE_ORDER.test(both)) return 'purchase_order';
  if (EWAY.test(both)) return 'eway_bill';
  if (LORRY.test(title) || LORRY.test(type)) return 'lorry_receipt';
  if (input.utilityBill) return 'electricity_bill';
  const cats = (input.lineCategories ?? []).filter((c): c is string => !!c);
  const allFuel = cats.length > 0 && cats.every((c) => c === 'FUEL');
  if (allFuel && !/\btax\s*invoice\b/.test(title) && (FUEL_TITLE.test(title) || SLIP.test(both))) return 'fuel_slip';
  if (TAX_INVOICE.test(both) || type === 'invoice') return 'tax_invoice';
  return 'other';
}

/**
 * The kind for a stored read: the one saved with it, else the same rules run
 * on the fields older reads kept (type, billing details, line categories).
 */
export function storedDocumentKind(cached: unknown, documentType?: string | null): DocumentKind {
  const c = (cached && typeof cached === 'object' ? cached : {}) as Record<string, unknown>;
  if (typeof c.documentKind === 'string' && c.documentKind in DOCUMENT_KIND_LABEL) return c.documentKind as DocumentKind;
  const lines = Array.isArray(c.lineItems) ? c.lineItems as Array<Record<string, unknown>> : [];
  const utilityBill = !!c.electricityBill || lines.some((l) => String(l?.hsn_code ?? '').startsWith('2716'));
  return documentKind({
    documentTitle: c.documentTitle,
    documentType: c.documentType ?? documentType,
    utilityBill,
    lineCategories: lines.map((l) => (typeof l?.productCategory === 'string' ? l.productCategory : null)),
  });
}

/** Label for History: the kind's name; an unrecognised document keeps its stored type. */
export function documentKindLabel(cached: unknown, documentType?: string | null): string {
  const k = storedDocumentKind(cached, documentType);
  if (k !== 'other') return DOCUMENT_KIND_LABEL[k];
  const t = String(documentType ?? '').trim();
  return t && t !== 'unknown' ? t.charAt(0).toUpperCase() + t.slice(1) : DOCUMENT_KIND_LABEL.other;
}
