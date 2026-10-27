// Columns, document types and unit rules for the spreadsheet importer.
// Units and factors come from the same shared module the extraction pipeline
// uses (supabase/functions/_shared/emissionFactors.ts); nothing is copied here.
import {
  FUEL_FACTORS,
  normalizeUnit,
  type FuelType,
} from '../../../supabase/functions/_shared/emissionFactors';

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
  /** Extra how-to added to the wrong-unit message, where one helps. */
  unitTip?: string;
  /** How the server calculates it, or null when it has no factor in the shared file. */
  calc: { scope: number; productCategory: string; fuelType?: FuelType } | null;
}

const fuel = (label: string, fuelType: FuelType, unitsShown: string, unitTip?: string): DocTypeRule => ({
  label,
  unitTip,
  canonicalUnit: normalizeUnit(FUEL_FACTORS[fuelType].unit)!.unit,
  unitsShown,
  calc: { scope: 1, productCategory: 'FUEL', fuelType },
});

export const DOC_TYPES: Record<DocType, DocTypeRule> = {
  electricity: { label: 'Electricity', canonicalUnit: 'kWh', unitsShown: 'kWh or MWh', unitTip: 'Use the units consumed on the bill.', calc: { scope: 2, productCategory: 'ELECTRICITY' } },
  diesel: fuel('Diesel', 'DIESEL', 'litre or kl'),
  petrol: fuel('Petrol', 'PETROL', 'litre or kl'),
  lpg: fuel('LPG', 'LPG', 'kg or tonne', 'Multiply cylinders by the kg printed on each one.'),
  png: fuel('PNG', 'PNG', 'scm', 'Use the scm figure on the gas bill.'),
  cng: fuel('CNG', 'CNG', 'kg or tonne'),
  coal: fuel('Coal', 'COAL', 'kg or tonne'),
  // Freight has no factor in the shared file: Scope 3 lines are calculated in
  // the supplier evidence trail (scope3.ts), so the preview shows no estimate.
  freight: { label: 'Freight', canonicalUnit: 'ton-km', unitsShown: 'tonne-km', unitTip: 'Multiply tonnes carried by km travelled.', calc: null },
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
  { key: 'unit', label: 'Unit', required: true, aliases: ['uom'], hint: 'Must match the bill type. See the How to fill sheet.' },
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
  if (type === 'electricity' && /^\s*kvah\s*$/i.test(rawUnit)) return 'kVAh is not kWh. Use the kWh figure on the bill.';
  return `${rule.label} needs ${rule.unitsShown}.${rule.unitTip ? ` ${rule.unitTip}` : ''}`;
}
