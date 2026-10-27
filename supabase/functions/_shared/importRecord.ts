// A checked spreadsheet bill row as a stored record, in the same shape an
// uploaded bill is stored in (documents row + cached_result with one line
// item), so History, Verify, Reports and the Dashboard read it the same way
// and the shared emission writer (uploadRecords.ts) creates its emission row.
// Pure: the import-records function and the tests use it.
import { calculateEmissions } from './emissionFactors.ts';
import { invoiceIdentity } from './extractionRead.ts';
import { BASIS_LABEL } from './electricityBill.ts';
import { METHODOLOGY_VERSION } from './uploadRecords.ts';
import { DOC_TYPES, parseAmount, parseDocType, parseImportDate, type DocType } from './importRows.ts';
import { normalizeGstinInput } from './gstin.ts';

/** cached_result.source for every imported record. */
export const IMPORT_SOURCE = 'import';

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ');

/**
 * The fields that make a row the same bill, as canonical JSON (fixed key
 * order, normalised text, parsed numbers), so the same row imported twice
 * hashes to the same document_hash.
 */
export function importIdentityJson(values: Record<string, string>): string {
  const type = parseDocType(values.type ?? '');
  return JSON.stringify({
    source: IMPORT_SOURCE,
    type,
    date: parseImportDate(values.date ?? '') ?? norm(values.date ?? ''),
    quantity: parseAmount(values.quantity ?? ''),
    unit: (values.unit ?? '').trim().toLowerCase(),
    supplier: norm(values.supplier ?? ''),
    gstin: normalizeGstinInput(values.gstin ?? ''),
    invoice: norm(values.invoice ?? '').replace(/\s+/g, ''),
    amount: values.amount?.trim() ? parseAmount(values.amount) : null,
  });
}

/** SHA-256 hex of the row identity. Web Crypto, available in Deno, Bun and browsers. */
export async function importDocumentHash(values: Record<string, string>): Promise<string> {
  const bytes = new TextEncoder().encode(importIdentityJson(values));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ImportedRecord {
  /** Columns for the documents insert, apart from ownership and the hash. */
  document: {
    document_type: string;
    vendor: string;
    invoice_number: string | null;
    invoice_date: string;
    amount: number | null;
    /** No reader was involved, so there is no read confidence. */
    confidence: null;
  };
  cachedResult: Record<string, unknown> & { invoiceKey?: string; lineItems: Array<Record<string, unknown>> };
  /** kgCO2e on the line, or null when no factor applies (freight). */
  co2Kg: number | null;
}

/**
 * Build the stored record for a row that checkRecords marked ready.
 * gridCountry follows extract-document: the country in Settings, else India
 * for a bill in rupees. Returns null for a row that is not a bill type.
 */
export function buildImportedRecord(
  values: Record<string, string>,
  ctx: { gridCountry: string; gridSource: 'profile' | 'bill' | 'unknown'; line: number },
): ImportedRecord | null {
  const type = parseDocType(values.type ?? '') as DocType | null;
  const date = parseImportDate(values.date ?? '');
  const qty = parseAmount(values.quantity ?? '');
  if (!type || !date || qty === null || qty <= 0) return null;
  const rule = DOC_TYPES[type];
  const unit = values.unit.trim();
  const vendor = values.supplier.trim();
  const gstin = values.gstin?.trim() ? normalizeGstinInput(values.gstin) : undefined;
  const invoiceNumber = values.invoice?.trim() || undefined;
  const amount = values.amount?.trim() ? parseAmount(values.amount) : null;
  const { calc } = rule;

  const description = `${rule.label}, ${values.quantity.trim()} ${unit} (spreadsheet row ${ctx.line})`;
  const item: Record<string, unknown> = {
    description,
    quantity: qty,
    unit,
    productCategory: calc.productCategory,
    industryCode: calc.industryCode,
    scope: calc.scope,
    ...(calc.fuelType ? { fuelType: calc.fuelType } : {}),
    // Classified from the bill type the row names, with the reader's keyword map.
    classificationMethod: 'KEYWORD',
    sourceText: description,
    validationFlags: [] as string[],
  };
  const flags: string[] = [];
  const result = calculateEmissions(qty, unit, calc.scope, calc.productCategory, calc.fuelType, { gridCountry: ctx.gridCountry });
  let co2Kg: number | null = null;
  if (result && result.kind === 'emission') {
    if (result.quantity !== qty || result.unit !== unit) {
      item.originalQuantity = qty;
      item.originalUnit = unit;
      item.quantity = result.quantity;
      item.unit = result.unit;
    }
    item.factorSource = result.factorSource;
    item.co2Kg = result.co2Kg;
    item.emissionFactor = result.emissionFactor;
    item.basis = 'entered_by_you';
    item.basisLabel = BASIS_LABEL.entered_by_you;
    (item.validationFlags as string[]).push(BASIS_LABEL.entered_by_you);
    const a: string[] = [];
    if (item.originalQuantity !== undefined) a.push(`Converted ${item.originalQuantity} ${item.originalUnit} to ${item.quantity} ${item.unit}`);
    if (calc.productCategory === 'ELECTRICITY') a.push(ctx.gridSource === 'unknown' ? 'India grid factor: no country set in Settings' : `Grid factor for ${ctx.gridCountry}`);
    a.push(BASIS_LABEL.entered_by_you);
    a.push(`Imported from spreadsheet row ${ctx.line}`);
    item.assumptions = a;
    co2Kg = result.co2Kg;
  } else {
    const reason = calc.productCategory === 'ELECTRICITY' && ctx.gridCountry !== 'IN'
      ? `No approved grid factor for ${ctx.gridCountry} yet; this electricity is not calculated`
      : 'No carbon factor for this bill type and unit yet.';
    (item.validationFlags as string[]).push(reason);
    flags.push(`${reason}: ${description.substring(0, 40)}`);
  }

  const invoiceKey = invoiceIdentity({ supplierGstin: gstin, vendor, invoiceNumber, date }) ?? undefined;
  const documentType = `${rule.label} bill`;
  const cachedResult = {
    source: IMPORT_SOURCE,
    importLine: ctx.line,
    documentType,
    documentKind: 'other',
    vendor,
    date,
    invoiceNumber,
    supplierGstin: gstin,
    amount: amount ?? undefined,
    currency: 'INR',
    lineItems: [item],
    primaryScope: calc.scope,
    primaryCategory: calc.productCategory,
    totalCO2Kg: co2Kg !== null && co2Kg > 0 ? co2Kg : undefined,
    // Typed values have no read uncertainty; the lower data quality of a
    // typed figure is carried by its basis (entered_by_you).
    confidence: 100,
    validationFlags: flags,
    classificationStatus: co2Kg !== null ? 'VERIFIED' : 'UNVERIFIABLE',
    methodology: METHODOLOGY_VERSION,
    ...(invoiceKey ? { invoiceKey } : {}),
  };
  return {
    document: { document_type: documentType, vendor, invoice_number: invoiceNumber ?? null, invoice_date: date, amount, confidence: null },
    cachedResult,
    co2Kg,
  };
}
