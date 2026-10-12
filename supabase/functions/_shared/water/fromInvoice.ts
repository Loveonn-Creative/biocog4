// Turns an extracted invoice into water-bill inputs for shadow mode. Pure.
// Reads only what the extraction already returns; it never asks the model for
// more and never fills a gap with an assumption (missing period, unknown unit
// and so on become flags downstream).
import type { VolumeKind, WaterBillInput } from './types.ts';

interface OcrLine { description?: string; hsn_code?: string; quantity?: number | string; unit?: string; sourceText?: string }
export interface OcrLike { vendor?: string; supplierGstin?: string; currency?: string; invoiceNumber?: string; lineItems?: OcrLine[] }

const UTILITY = /\b(water\s*(supply|charges?|bill|consumption|tax|works|board|authority)|jal\s*(board|nigam|sansthan)|sewer(age)?|sewage|waste\s*water|drainage\s*charges?|phed)\b/i;
const PACKAGED = /\b(bottled?|packaged|mineral|drinking\s*water\s*(jar|can)|bisleri|aquafina|kinley)\b/i;
const SEWER = /\b(sewer(age)?|sewage|waste\s*water|drainage)\b/i;
const SUPPLY = /\bwater\b/i;

/** A utility water or sewerage bill, not a purchase of packaged drinking water (HSN 2201). */
export function isWaterBill(o: OcrLike): boolean {
  const lines = o.lineItems ?? [];
  const text = [o.vendor ?? '', ...lines.map(l => `${l.description ?? ''} ${l.sourceText ?? ''}`)].join(' ');
  if (PACKAGED.test(text) || lines.some(l => String(l.hsn_code ?? '').startsWith('2201'))) return false;
  return UTILITY.test(text);
}

function kindOf(desc: string): VolumeKind | null {
  const s = SEWER.test(desc), w = SUPPLY.test(desc.replace(SEWER, ''));
  if (s && w) return 'COMBINED_UNSPLIT';
  if (s) return 'WASTEWATER';
  if (w) return 'SUPPLY';
  return null;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function isoDate(s: string): string | null {
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);           // DD/MM/YYYY (Indian bills)
  let y: number, mo: number, d: number;
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s-](\d{4})$/)) && MONTHS[m[2].toLowerCase()]) { d = +m[1]; mo = MONTHS[m[2].toLowerCase()]; y = +m[3]; }
  else return null;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null;
}

const DATE = String.raw`(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\s-][A-Za-z]{3,9}[\s-]\d{4})`;
const RANGE = new RegExp(`${DATE}\\s*(?:to|till|until|-|–)\\s*${DATE}`, 'i');

/** A printed billing period "A to B"; null unless both dates are valid, ordered and at most 400 days apart. */
export function billingPeriod(texts: string[]): { start: string; end: string } | null {
  for (const t of texts) {
    const m = t.match(RANGE);
    if (!m) continue;
    const a = isoDate(m[1].trim()), b = isoDate(m[2].trim());
    if (a && b && a <= b && (Date.parse(b) - Date.parse(a)) / 86_400_000 <= 400) return { start: a, end: b };
  }
  return null;
}

/**
 * One input per water/sewerage line that carries a quantity. Country is IN only
 * when the bill carries an Indian GSTIN; otherwise it is left unknown. Bills do
 * not name a site, so every bill goes to the entity's "unassigned" site until
 * sites are configured (identity only; it affects no number).
 */
export function waterBillsFromInvoice(o: OcrLike, entity_id: string, document_ref: string): WaterBillInput[] {
  if (!isWaterBill(o)) return [];
  const lines = o.lineItems ?? [];
  const period = billingPeriod(lines.map(l => `${l.sourceText ?? ''} ${l.description ?? ''}`));
  const gstin = (o.supplierGstin ?? '').trim().toUpperCase();
  const country = /^\d{2}[A-Z0-9]{13}$/.test(gstin) ? 'IN' : null;
  const supplier = (o.vendor ?? '').trim().toLowerCase().replace(/\s+/g, ' ') || null;
  const out: WaterBillInput[] = [];
  lines.forEach((l, i) => {
    const desc = `${l.description ?? ''}`;
    const kind = kindOf(desc);
    const q = Number(l.quantity);
    if (!kind || l.quantity === undefined || l.quantity === null || l.quantity === '' || !Number.isFinite(q)) return;
    out.push({
      entity_id, site_id: 'unassigned', supplier_id: supplier, country_code: country,
      billing_period_start: period?.start ?? null, billing_period_end: period?.end ?? null,
      volume_raw: q, unit_raw: l.unit ?? null, volume_kind: kind,
      reading_type: /\b(estimated|average|avg\.?)\s*(reading|billing|consumption)?\b/i.test(`${desc} ${l.sourceText ?? ''}`) ? 'ESTIMATED_BY_UTILITY' : 'ACTUAL',
      source_document_ref: `${document_ref}#${i}`,
    });
  });
  return out;
}
