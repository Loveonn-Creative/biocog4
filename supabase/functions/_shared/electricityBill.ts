// Electricity bills, read the way Indian discoms print them. Pure; shared by
// extract-document (Deno) and the tests (bun).
//
// What goes wrong without this:
//  - Consumption is printed as "Units consumed: 342" in a meter box, not as a
//    charge line, so the model returns "Energy charges ₹2,500" with no
//    quantity and nothing can be calculated.
//  - "Unit" is the billing term for kWh (1 unit = 1 kWh on Indian electricity
//    bills), but a bare "units" is not a safe unit anywhere else.
// Nothing is estimated: quantities come only from values printed on the bill.

export interface RawLine {
  description?: string | null;
  hsn_code?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  total?: number | null;
  sourcePage?: number | null;
  sourceText?: string | null;
  [k: string]: unknown;
}

export interface RawOcr {
  documentType?: string | null;
  vendor?: string | null;
  lineItems?: RawLine[] | null;
  /** Billed consumption exactly as printed (units / kWh), if the bill shows it. */
  unitsConsumedKwh?: number | string | null;
  unitsConsumedText?: string | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  tariffCategory?: string | null;
  sanctionedLoadKw?: number | string | null;
  [k: string]: unknown;
}

const ELECTRICITY_TEXT = /\b(electricity|electric|discom|power\s*(distribution|supply)|energy\s*charges?|units?\s*(consumed|billed)|billed\s*units|kwh|tariff|sanctioned\s*load|meter\s*reading|bescom|msedcl|mahadiscom|tata\s*power|adani\s*electricity|bses|tpddl|tangedco|tneb|uppcl|pspcl|dhbvn|uhbvn|jvvnl|avvnl|jdvvnl|cesc|wbsedcl|apspdcl|apepdcl|tsspdcl|tsnpdcl|kseb|torrent\s*power|mpez|mppkvvcl|cspdcl|tpcodl|nbpdcl|sbpdcl)\b/i;

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** True when the document reads as an electricity bill. */
export function isElectricityBill(ocr: RawOcr): boolean {
  const text = [ocr.documentType, ocr.vendor, ...(ocr.lineItems ?? []).map(l => `${l.description ?? ''} ${l.hsn_code ?? ''}`)].join(' ');
  return ELECTRICITY_TEXT.test(text) || (ocr.lineItems ?? []).some(l => String(l.hsn_code ?? '').startsWith('2716'));
}

const isElectricityLine = (l: RawLine) =>
  String(l.hsn_code ?? '').startsWith('2716') || ELECTRICITY_TEXT.test(`${l.description ?? ''} ${l.sourceText ?? ''}`);

const UNIT_WORD = /^(units?|unit\s*consumed|units\s*consumed|billed\s*units?)$/i;

/**
 * Prepares an electricity bill's lines before deterministic classification:
 *  1. On electricity lines, the unit "unit(s)" becomes "kWh".
 *  2. If no electricity line carries a quantity but the bill prints its billed
 *     consumption, one line is added from that printed value.
 * Returns the (possibly) updated lines and notes for the audit trail.
 */
export function prepareElectricityLines(ocr: RawOcr): { lines: RawLine[]; notes: string[] } {
  const lines = [...(ocr.lineItems ?? [])].map(l => ({ ...l }));
  const notes: string[] = [];
  if (!isElectricityBill(ocr)) return { lines, notes };

  for (const l of lines) {
    if (isElectricityLine(l) && typeof l.unit === 'string' && UNIT_WORD.test(l.unit.trim())) {
      l.unit = 'kWh';
      notes.push(`"${l.description ?? 'line'}": unit "units" read as kWh (electricity billing unit)`);
    }
  }

  const hasConsumptionLine = lines.some(l => isElectricityLine(l) && num(l.quantity) !== null && /kwh/i.test(String(l.unit ?? '')));
  const printed = num(ocr.unitsConsumedKwh);
  if (!hasConsumptionLine && printed !== null) {
    lines.push({
      description: 'Electricity consumed (billed units)',
      hsn_code: '2716',
      quantity: printed,
      unit: 'kWh',
      sourcePage: 1,
      sourceText: (ocr.unitsConsumedText ?? `Units consumed: ${printed}`).toString().slice(0, 240),
    });
    notes.push(`Billed consumption ${printed} kWh taken from the printed units on the bill`);
  }
  if (!hasConsumptionLine && printed === null) {
    notes.push('Electricity bill: billed units (kWh) not found on the bill, so emissions cannot be calculated');
  }
  return { lines, notes };
}

export interface CalculatedLine { productCategory?: string; quantity?: number; co2Kg?: number; validationFlags?: string[] }

/**
 * Prevents counting the same consumption twice: if one electricity line equals
 * the sum of the others (a total plus its time-of-day slabs), only the total
 * counts; identical quantities on several lines count once.
 */
export function consolidateElectricity<T extends CalculatedLine>(items: T[]): T[] {
  const elec = items.filter(i => i.productCategory === 'ELECTRICITY' && typeof i.co2Kg === 'number' && typeof i.quantity === 'number');
  if (elec.length < 2) return items;
  const drop = new Set<T>();
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.5, b * 0.005);
  for (const total of elec) {
    const others = elec.filter(e => e !== total);
    const sum = others.reduce((s, e) => s + (e.quantity as number), 0);
    if (close(total.quantity as number, sum)) { others.forEach(o => drop.add(o)); break; }
  }
  const seen: number[] = [];
  for (const e of elec) {
    if (drop.has(e)) continue;
    if (seen.some(q => close(q, e.quantity as number))) drop.add(e);
    else seen.push(e.quantity as number);
  }
  for (const d of drop) {
    d.co2Kg = undefined;
    (d.validationFlags ??= []).push('Same consumption already counted on another line; not counted twice');
  }
  return items;
}

export interface ElectricityBillMeta {
  /** Billing period as printed (YYYY-MM-DD), both ends included. */
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  /** Tariff category exactly as printed, e.g. "LT-II Commercial". */
  tariffCategory: string | null;
  sanctionedLoadKw: number | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = 86_400_000;
const validDate = (v: unknown): string | null => {
  if (typeof v !== 'string' || !ISO_DATE.test(v.trim())) return null;
  const t = Date.parse(`${v.trim()}T00:00:00Z`);
  return Number.isFinite(t) && t >= Date.UTC(2000, 0, 1) && t <= Date.now() + 31 * dayMs ? v.trim() : null;
};

/**
 * Billing details printed on an electricity bill, validated. A field that is
 * missing or fails a check is null; nothing is inferred. Personal details
 * (consumer name, address, account, consumer or meter numbers) are never
 * read: the tariff text is dropped if it carries a long digit run.
 */
export function electricityBillMeta(ocr: RawOcr): ElectricityBillMeta | null {
  if (!isElectricityBill(ocr)) return null;
  let start = validDate(ocr.billingPeriodStart);
  let end = validDate(ocr.billingPeriodEnd);
  if (start && end) {
    const span = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / dayMs + 1;
    if (span < 1 || span > 400) { start = null; end = null; }
  } else { start = null; end = null; }

  const tariffRaw = typeof ocr.tariffCategory === 'string' ? ocr.tariffCategory.replace(/\s+/g, ' ').trim() : '';
  const tariffCategory = tariffRaw && tariffRaw.length <= 60 && !/\d{6,}/.test(tariffRaw) ? tariffRaw : null;

  const load = num(ocr.sanctionedLoadKw);
  const sanctionedLoadKw = load !== null && load < 100_000 ? load : null;

  if (!start && !tariffCategory && sanctionedLoadKw === null) return null;
  return { billingPeriodStart: start, billingPeriodEnd: end, tariffCategory, sanctionedLoadKw };
}
