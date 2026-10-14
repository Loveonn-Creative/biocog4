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
  /** Unit printed next to the billed consumption: kWh, or kVAh on apparent-energy tariffs. */
  unitsConsumedUnit?: string | null;
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
// kVAh (apparent energy) and kvarh (reactive energy) are billed on some HT and
// LT tariffs. Neither is kWh, and converting needs the power factor for the
// period, which is not reliably printed; such a line is never read as kWh.
const APPARENT = /\bkv\s*a\s*r?\s*h\b|\bkvarh\b/i;
// Net units (import minus solar export) are not grid consumption.
const NET = /\b(net\s*(units|consumption|import)|export(ed)?\s*(units|energy|kwh)?)\b/i;
// The consumption line extract-document asks the model for, or a printed total.
const TOTAL = /\b(total|billed)\b|^\s*electricity\s+consumed\b/i;

/** Billed consumption printed on the bill, read only when it is plainly kWh of grid import. */
export function printedBilledKwh(ocr: RawOcr): { kwh: number | null; reason: 'apparent_energy' | 'net_units' | null } {
  const printed = num(ocr.unitsConsumedKwh);
  if (printed === null) return { kwh: null, reason: null };
  const text = `${ocr.unitsConsumedUnit ?? ''} ${ocr.unitsConsumedText ?? ''}`;
  if (APPARENT.test(text)) return { kwh: null, reason: 'apparent_energy' };
  if (NET.test(text)) return { kwh: null, reason: 'net_units' };
  return { kwh: printed, reason: null };
}

/**
 * Prepares an electricity bill's lines before deterministic classification:
 *  1. On electricity lines, the unit "unit(s)" becomes "kWh", unless the line
 *     says kVAh or kvarh (then the unit stays kVAh and no factor applies).
 *  2. Net-unit lines lose their quantity: net is not grid consumption.
 *  3. The printed billed consumption wins: if no line carries it, one line is
 *     added from the printed value (consolidateElectricity then counts only it).
 * Returns the (possibly) updated lines and notes for the audit trail.
 */
export function prepareElectricityLines(ocr: RawOcr): { lines: RawLine[]; notes: string[] } {
  const lines = [...(ocr.lineItems ?? [])].map(l => ({ ...l }));
  const notes: string[] = [];
  if (!isElectricityBill(ocr)) return { lines, notes };

  for (const l of lines) {
    if (!isElectricityLine(l)) continue;
    const text = `${l.description ?? ''} ${l.sourceText ?? ''} ${l.unit ?? ''}`;
    if (num(l.quantity) !== null && APPARENT.test(text)) {
      l.unit = 'kVAh';
      notes.push(`"${l.description ?? 'line'}": billed in kVAh (apparent energy), not kWh, so no grid factor applies`);
      continue;
    }
    if (num(l.quantity) !== null && NET.test(text)) {
      l.quantity = null;
      notes.push(`"${l.description ?? 'line'}": net units (import minus export) are not grid consumption; import units are needed`);
      continue;
    }
    if (typeof l.unit === 'string' && UNIT_WORD.test(l.unit.trim())) {
      l.unit = 'kWh';
      notes.push(`"${l.description ?? 'line'}": unit "units" read as kWh (electricity billing unit)`);
    }
  }

  const billed = printedBilledKwh(ocr);
  if (billed.reason === 'apparent_energy') notes.push('Electricity bill: billed consumption is printed in kVAh (apparent energy), not kWh, so emissions cannot be calculated');
  if (billed.reason === 'net_units') notes.push('Electricity bill: the printed consumption is net of exported units; grid import units are needed');
  const isKwhLine = (l: RawLine) => isElectricityLine(l) && num(l.quantity) !== null && /^kwh$/i.test(String(l.unit ?? '').trim());
  const hasConsumptionLine = lines.some(isKwhLine);
  const carriesBilled = billed.kwh !== null && lines.some(l => isKwhLine(l) && Math.abs((num(l.quantity) as number) - (billed.kwh as number)) <= 1e-6);
  if (billed.kwh !== null && !carriesBilled) {
    lines.push({
      description: 'Electricity consumed (billed units)',
      hsn_code: '2716',
      quantity: billed.kwh,
      unit: 'kWh',
      sourcePage: 1,
      sourceText: (ocr.unitsConsumedText ?? `Units consumed: ${billed.kwh}`).toString().slice(0, 240),
    });
    notes.push(`Billed consumption ${billed.kwh} kWh taken from the printed units on the bill`);
  }
  if (!hasConsumptionLine && billed.kwh === null && billed.reason === null) {
    notes.push('Electricity bill: billed units (kWh) not found on the bill, so emissions cannot be calculated');
  }
  return { lines, notes };
}

/**
 * Solar or wind energy printed in kWh on an electricity bill is electricity
 * delivered through the grid: it is Scope 2 consumption (location-based at
 * the grid average), not an avoided emission. A lower market-based figure
 * needs certificate evidence (see ./electricity.ts).
 */
export function isGridRenewableLine(isUtilityBill: boolean, productCategory: string | undefined, unit: string | undefined): boolean {
  return isUtilityBill && (productCategory === 'SOLAR_ENERGY' || productCategory === 'WIND_ENERGY')
    && /^(kwh|mwh|units?)$/i.test(String(unit ?? '').trim());
}

export interface CalculatedLine { description?: string; productCategory?: string; quantity?: number; co2Kg?: number; validationFlags?: string[] }

/**
 * Counts each kWh once.
 *  - When the bill prints its billed consumption, the line carrying it is the
 *    consumption and every other electricity line is a component of it.
 *  - Otherwise a line labelled as the total (or the "Electricity consumed"
 *    line) that equals the sum of the others replaces them. An unlabelled line
 *    equal to the sum of the others could be a total or a third meter, so
 *    nothing is guessed and none of them is counted.
 *  - Lines with exactly the same quantity are one reading printed twice.
 *    Different readings (two meters, 1,000 and 1,004 kWh) each count.
 */
export function consolidateElectricity<T extends CalculatedLine>(items: T[], opts: { billedKwh?: number | null } = {}): T[] {
  const elec = items.filter(i => i.productCategory === 'ELECTRICITY' && typeof i.co2Kg === 'number' && typeof i.quantity === 'number');
  if (elec.length < 2) return items;
  const drop = new Map<T, string>();
  const same = (a: number, b: number) => Math.abs(a - b) <= 1e-6;
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.5, b * 0.005);
  const qty = (e: T) => e.quantity as number;

  const billed = num(opts.billedKwh);
  const carrier = billed === null ? undefined : elec.find(e => same(qty(e), billed));
  if (carrier) {
    for (const e of elec) if (e !== carrier) drop.set(e, 'Part of the billed consumption already counted; not counted twice');
  } else if (elec.length >= 3) {
    const sumOthers = (t: T) => elec.reduce((s, e) => s + (e === t ? 0 : qty(e)), 0);
    const totals = elec.filter(t => close(qty(t), sumOthers(t)));
    if (totals.length === 1 && TOTAL.test(totals[0].description ?? '')) {
      for (const e of elec) if (e !== totals[0]) drop.set(e, 'Part of the total already counted; not counted twice');
    } else if (totals.length >= 1) {
      for (const e of elec) drop.set(e, 'One line equals the sum of the others, so it may be a total or another meter; not counted until confirmed');
    }
  }
  const seen: number[] = [];
  for (const e of elec) {
    if (drop.has(e)) continue;
    if (seen.some(q => same(q, qty(e)))) drop.set(e, 'Same consumption already counted on another line; not counted twice');
    else seen.push(qty(e));
  }
  for (const [d, why] of drop) {
    d.co2Kg = undefined;
    (d.validationFlags ??= []).push(why);
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
