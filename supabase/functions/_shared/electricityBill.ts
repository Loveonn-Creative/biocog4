// Electricity bills, read the way Indian discoms print them. Pure; shared by
// extract-document (Deno) and the tests (bun).
//
// What goes wrong without this:
//  - Consumption is printed as "Units consumed: 342" in a meter box, not as a
//    charge line, so the model returns "Energy charges ₹2,500" with no
//    quantity and nothing can be calculated.
//  - "Unit" is the billing term for kWh (1 unit = 1 kWh on Indian electricity
//    bills), but a bare "units" is not a safe unit anywhere else.
// Nothing is invented: a quantity is a value printed (or visible) on the bill,
// or a fixed calculation from printed values, and every counted line says
// which (its `basis`):
//  - read_from_bill: kWh printed on the bill. On a kVAh-billed tariff the
//    printed kWh (usually in the meter-reading table) is preferred.
//  - estimated_kvah_pf: no kWh printed; kWh = kVAh x the power factor printed
//    on the same bill. Labelled as an estimate, lower data quality.
//  - handwritten: read from a handwritten bill. Labelled, lower data quality.
//  - meter_readings: a meter photo showing two cumulative readings; kWh is the
//    later minus the earlier, worked out here. Labelled, lower data quality.
//  - entered_by_you: reserved for a figure the user types in (not used here).

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
  /** kWh (active energy) printed on the bill, e.g. in the meter-reading table, even when billing is in kVAh. */
  activeEnergyKwh?: number | string | null;
  activeEnergyText?: string | null;
  /** Average or billed power factor as printed (0 < PF <= 1). Never computed by the model. */
  powerFactor?: number | string | null;
  powerFactorText?: string | null;
  /** How the document was captured: a printed bill, a handwritten bill, or a photo of the meter. */
  documentCapture?: string | null;
  /** Meter photos only: cumulative register values visible in the photo (never the meter number). */
  meterReadings?: Array<{ readingKwh?: number | string | null; readingDate?: string | null; sourceText?: string | null }> | null;
  /** kWh the owner typed for a kVAh bill that prints neither kWh nor a power factor (set by the server from the request, never by the model). */
  enteredKwh?: number | null;
  [k: string]: unknown;
}

/** How a counted quantity was obtained. */
export type Basis = 'read_from_bill' | 'estimated_kvah_pf' | 'handwritten' | 'meter_readings' | 'entered_by_you';

/** Plain label shown next to a counted line ("How this was calculated") and stored with the record. */
export const BASIS_LABEL: Record<Basis, string> = {
  read_from_bill: 'Read from the bill',
  estimated_kvah_pf: 'Estimated: kWh worked out from kVAh x the power factor printed on the bill (kVAh × PF)',
  handwritten: 'Read from a handwritten bill',
  meter_readings: 'Calculated from two meter readings in the photo',
  entered_by_you: 'Entered by you',
};

/** Bases that are labelled and carry lower data quality than a printed reading. */
export const LOWER_QUALITY_BASES: ReadonlySet<string> = new Set<Basis>(['estimated_kvah_pf', 'handwritten', 'meter_readings', 'entered_by_you']);

/** Friendly next steps for blockers that reading the same file again cannot fix. */
export const KVAH_GUIDANCE = 'Your bill is in kVAh. We need the kWh or power factor printed on it — usually near the meter readings.';
export const SINGLE_READING_GUIDANCE = 'Add your previous meter reading or the bill for this period.';

/** "printed" | "handwritten" | "meter_photo", from the model's documentCapture (or the older legibility field). */
export function documentCaptureOf(ocr: Pick<RawOcr, 'documentCapture'> & { legibility?: unknown }): 'printed' | 'handwritten' | 'meter_photo' {
  const c = String(ocr.documentCapture ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  if (c === 'meter_photo' || c === 'meter') return 'meter_photo';
  if (c === 'handwritten') return 'handwritten';
  if (!c && String(ocr.legibility ?? '').toLowerCase() === 'handwritten') return 'handwritten';
  return 'printed';
}

const ELECTRICITY_TEXT = /\b(electricity|electric|discom|power\s*(distribution|supply)|energy\s*charges?|units?\s*(consumed|billed)|billed\s*units|kwh|tariff|sanctioned\s*load|meter\s*reading|bescom|msedcl|mahadiscom|tata\s*power|adani\s*electricity|bses|tpddl|tangedco|tneb|uppcl|pspcl|dhbvn|uhbvn|jvvnl|avvnl|jdvvnl|cesc|wbsedcl|apspdcl|apepdcl|tsspdcl|tsnpdcl|kseb|torrent\s*power|mpez|mppkvvcl|cspdcl|tpcodl|nbpdcl|sbpdcl)\b/i;

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = 86_400_000;
const validDate = (v: unknown): string | null => {
  if (typeof v !== 'string' || !ISO_DATE.test(v.trim())) return null;
  const t = Date.parse(`${v.trim()}T00:00:00Z`);
  return Number.isFinite(t) && t >= Date.UTC(2000, 0, 1) && t <= Date.now() + 31 * dayMs ? v.trim() : null;
};

/** True when the document reads as an electricity bill (or is a photo of an electricity meter). */
export function isElectricityBill(ocr: RawOcr): boolean {
  if (documentCaptureOf(ocr) === 'meter_photo' && Array.isArray(ocr.meterReadings) && ocr.meterReadings.length > 0) return true;
  const text = [ocr.documentType, ocr.vendor, ...(ocr.lineItems ?? []).map(l => `${l.description ?? ''} ${l.hsn_code ?? ''}`)].join(' ');
  return ELECTRICITY_TEXT.test(text) || (ocr.lineItems ?? []).some(l => String(l.hsn_code ?? '').startsWith('2716'));
}

const isElectricityLine = (l: RawLine) =>
  String(l.hsn_code ?? '').startsWith('2716') || ELECTRICITY_TEXT.test(`${l.description ?? ''} ${l.sourceText ?? ''}`);

const UNIT_WORD = /^(units?|unit\s*consumed|units\s*consumed|billed\s*units?)$/i;
// kVAh (apparent energy) and kvarh (reactive energy) are billed on some HT and
// LT tariffs. Neither is kWh, so a kVAh or kvarh line is never read as kWh.
// kVAh becomes kWh only from the bill's own printed figures: its printed kWh
// reading, or kVAh x its printed power factor (a labelled estimate). kvarh is
// never converted.
const APPARENT = /\bkv\s*a\s*r?\s*h\b|\bkvarh\b/i;
const REACTIVE = /\bkv\s*a\s*r\s*h\b|\bkvarh\b/i;
// Net units (import minus solar export) are not grid consumption.
const NET = /\b(net\s*(units|consumption|import)|export(ed)?\s*(units|energy|kwh)?)\b/i;
// The consumption line extract-document asks the model for, or a printed total.
const TOTAL = /\b(total|billed)\b|^\s*electricity\s+consumed\b/i;

const round2 = (n: number) => Math.round(n * 100) / 100;
const text240 = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 240) : null);

/** Printed figures kept on the counted line as evidence for how its kWh was obtained. */
export interface EnergyEvidence {
  kvah?: number;
  kvahText?: string | null;
  powerFactor?: number;
  powerFactorText?: string | null;
  activeEnergyText?: string | null;
  meterReadings?: MeterReading[];
  /** kWh typed by the owner (basis entered_by_you). */
  enteredKwh?: number;
}

/** Lowest power factor accepted for an estimate. Below this a misread is more
 *  likely than a real reading, and kVAh x PF would understate emissions, so the
 *  bill asks for its kWh instead. */
export const MIN_POWER_FACTOR = 0.5;

/** Power factor exactly as printed, when it is a usable one (0.5 <= PF <= 1); otherwise null. */
export function printedPowerFactor(v: unknown): number | null {
  const n = num(v);
  return n !== null && n >= MIN_POWER_FACTOR && n <= 1 ? n : null;
}

export type KvahResolution =
  | { kwh: number; basis: 'read_from_bill' | 'estimated_kvah_pf' | 'entered_by_you'; sourceText: string; note: string; evidence: EnergyEvidence }
  | { kwh: null; reason: 'kvah_needs_kwh' | 'active_exceeds_apparent'; note: string; evidence: EnergyEvidence };

/**
 * kWh for a bill billed in kVAh, from that bill's own printed figures only:
 *  1. the kWh it prints (meter-reading table), basis read_from_bill;
 *  2. otherwise kVAh x the power factor it prints, basis estimated_kvah_pf
 *     (deterministic, rounded to 0.01 kWh, labelled as an estimate);
 *  3. otherwise the kWh the owner typed for this bill, basis entered_by_you,
 *     only when it fits the printed kVAh (kVAh x 0.5 <= kWh <= kVAh);
 *  4. otherwise nothing.
 * A printed kWh larger than the printed kVAh cannot be right (PF <= 1), so
 * neither is used.
 */
export function kwhForKvahBill(o: {
  kvah: number | null; kvahText?: string | null;
  activeEnergyKwh?: unknown; activeEnergyText?: unknown; powerFactor?: unknown; powerFactorText?: unknown;
  enteredKwh?: unknown;
}): KvahResolution {
  const evidence: EnergyEvidence = {};
  if (o.kvah !== null) { evidence.kvah = o.kvah; evidence.kvahText = text240(o.kvahText); }
  const activeText = text240(o.activeEnergyText);
  let active = num(o.activeEnergyKwh);
  // A figure labelled only kVAh, or a net figure, is not printed kWh.
  if (active !== null && activeText && ((APPARENT.test(activeText) && !/\bkwh\b/i.test(activeText)) || NET.test(activeText))) active = null;
  if (active !== null) {
    evidence.activeEnergyText = activeText;
    if (o.kvah !== null && active > o.kvah * 1.02) {
      return { kwh: null, reason: 'active_exceeds_apparent', evidence, note: `Electricity bill: the printed kWh (${active}) is larger than the printed kVAh (${o.kvah}), which cannot be right; neither is used until checked` };
    }
    return {
      kwh: active, basis: 'read_from_bill', evidence,
      sourceText: activeText ?? `kWh: ${active}`,
      note: `Billed in kVAh; the kWh printed on the bill (${active} kWh) is used`,
    };
  }
  const pf = printedPowerFactor(o.powerFactor);
  if (pf !== null && o.kvah !== null) {
    const kwh = round2(o.kvah * pf);
    evidence.powerFactor = pf;
    evidence.powerFactorText = text240(o.powerFactorText);
    return {
      kwh, basis: 'estimated_kvah_pf', evidence,
      sourceText: `${o.kvah} kVAh × PF ${pf} = ${kwh} kWh`.slice(0, 240),
      note: `Estimated: kWh worked out from kVAh x the power factor printed on the bill (kVAh × PF): ${o.kvah} kVAh × ${pf} = ${kwh} kWh`,
    };
  }
  const entered = num(o.enteredKwh);
  if (entered !== null && o.kvah !== null && entered >= o.kvah * MIN_POWER_FACTOR && entered <= o.kvah * 1.02) {
    const kwh = round2(entered);
    evidence.enteredKwh = kwh;
    return {
      kwh, basis: 'entered_by_you', evidence,
      sourceText: `Entered by you: ${kwh} kWh (bill: ${o.kvah} kVAh)`.slice(0, 240),
      note: `Entered by you: ${kwh} kWh for a bill printed in kVAh (${o.kvah} kVAh); check it against the bill before relying on it`,
    };
  }
  return { kwh: null, reason: 'kvah_needs_kwh', evidence, note: 'Electricity bill: billed consumption is printed in kVAh (apparent energy), not kWh, and no kWh or power factor is printed, so emissions cannot be calculated' };
}

export interface MeterReading { readingKwh: number; readingDate: string | null; sourceText: string | null }

export type MeterResolution =
  | { kwh: number; earlier: MeterReading; later: MeterReading; periodStart: string | null; periodEnd: string | null; sourceText: string; note: string }
  | { kwh: null; reason: 'no_readings' | 'single_reading' | 'too_many_readings' | 'not_increasing' | 'implausible'; note: string };

// Text that may carry a meter, consumer or account number is not kept.
const PERSONAL_TEXT = /\b(meter\s*(no|number|sr|serial|id)|serial|sr\.?\s*no|consumer|account|a\/c|ca\s*no|k\s*no|service\s*no)\b/i;
const MAX_READING_KWH = 1_000_000;
const MAX_KWH_PER_DAY = 100_000;

/** Meter-register values visible in a photo, validated (no meter number is ever kept). */
export function meterReadingsOf(raw: RawOcr['meterReadings']): MeterReading[] {
  const out: MeterReading[] = [];
  for (const r of Array.isArray(raw) ? raw : []) {
    const value = num(r?.readingKwh);
    if (value === null || value > 1e9) continue;
    const src = text240(r?.sourceText);
    const reading: MeterReading = { readingKwh: value, readingDate: validDate(r?.readingDate), sourceText: src && !PERSONAL_TEXT.test(src) ? src.slice(0, 80) : null };
    // The same reading seen twice is one reading.
    if (!out.some((o) => o.readingKwh === reading.readingKwh && o.readingDate === reading.readingDate)) out.push(reading);
  }
  return out;
}

/**
 * Consumption from a meter photo: two cumulative register readings, later
 * minus earlier, worked out here (never by the model). With both dates the
 * later date is the later reading; without them the higher value is (a
 * register only counts up). The difference must be positive and plausible.
 */
export function consumptionFromMeterReadings(raw: RawOcr['meterReadings']): MeterResolution {
  const rs = meterReadingsOf(raw);
  if (rs.length === 0) return { kwh: null, reason: 'no_readings', note: 'Meter photo: no meter reading could be read' };
  if (rs.length === 1) return { kwh: null, reason: 'single_reading', note: 'Meter photo: one reading is visible; consumption needs the previous reading too' };
  if (rs.length > 2) return { kwh: null, reason: 'too_many_readings', note: 'Meter photo: more than two readings are visible, so which two belong to this period is not clear' };
  const [a, b] = rs;
  let earlier: MeterReading, later: MeterReading;
  const dated = !!(a.readingDate && b.readingDate);
  if (dated) {
    if (a.readingDate === b.readingDate) return { kwh: null, reason: 'implausible', note: 'Meter photo: both readings carry the same date' };
    [earlier, later] = (a.readingDate as string) < (b.readingDate as string) ? [a, b] : [b, a];
  } else {
    [earlier, later] = a.readingKwh < b.readingKwh ? [a, b] : [b, a];
  }
  const kwh = round2(later.readingKwh - earlier.readingKwh);
  if (!(kwh > 0)) return { kwh: null, reason: 'not_increasing', note: `Meter photo: the later reading (${later.readingKwh}) is not higher than the earlier one (${earlier.readingKwh}); a meter change or misread is possible, so nothing is counted` };
  if (kwh > MAX_READING_KWH) return { kwh: null, reason: 'implausible', note: `Meter photo: the difference between the readings (${kwh} kWh) is too large to be one period's consumption` };
  if (dated) {
    const days = Math.round((Date.parse(`${later.readingDate}T00:00:00Z`) - Date.parse(`${earlier.readingDate}T00:00:00Z`)) / dayMs);
    if (days > 400 || kwh / days > MAX_KWH_PER_DAY) return { kwh: null, reason: 'implausible', note: `Meter photo: ${kwh} kWh over ${days} days is not a plausible reading period` };
  }
  const label = (r: MeterReading) => r.sourceText ?? `${r.readingKwh}${r.readingDate ? ` (${r.readingDate})` : ''}`;
  return {
    kwh, earlier, later, periodStart: dated ? earlier.readingDate : null, periodEnd: dated ? later.readingDate : null,
    sourceText: `${label(later)} − ${label(earlier)} = ${kwh} kWh`.slice(0, 240),
    note: `Calculated from two meter readings in the photo: ${later.readingKwh} − ${earlier.readingKwh} = ${kwh} kWh${dated ? '' : ' (the higher reading taken as the later one; a meter register only counts up)'}`,
  };
}

/** Printed billed consumption on the bill, read only when it is plainly kWh of grid import. */
export function printedBilledKwh(ocr: RawOcr): { kwh: number | null; reason: 'apparent_energy' | 'net_units' | null } {
  const printed = num(ocr.unitsConsumedKwh);
  if (printed === null) return { kwh: null, reason: null };
  const text = `${ocr.unitsConsumedUnit ?? ''} ${ocr.unitsConsumedText ?? ''}`;
  if (APPARENT.test(text)) return { kwh: null, reason: 'apparent_energy' };
  if (NET.test(text)) return { kwh: null, reason: 'net_units' };
  return { kwh: printed, reason: null };
}

/** Blockers on the document itself: reading the same file again gives the same result. */
export type ElectricityBlocker = 'kvah_needs_kwh' | 'kvah_mismatch' | 'net_units' | 'single_meter_reading' | 'meter_readings_unusable';

export interface PreparedElectricity {
  lines: RawLine[];
  notes: string[];
  /** The kWh the bill's consumption resolved to (printed, estimated or from readings), for consolidation. */
  billedKwh: number | null;
  /** How that kWh was obtained, when it was not simply printed as billed kWh. */
  basis: Basis | null;
  blocker: ElectricityBlocker | null;
  /** Dated meter readings: the period they span, for the billing period when none is printed. */
  readingPeriod: { start: string; end: string } | null;
}

/** A line kept for its printed figure only; its consumption is counted on another line. */
const REFERENCE_KVAH = 'kVAh reading kept as evidence; the consumption is counted once, in kWh';

/**
 * Prepares an electricity bill's lines before deterministic classification:
 *  1. On electricity lines, the unit "unit(s)" becomes "kWh", unless the line
 *     says kVAh or kvarh (then the unit stays kVAh / kvarh and no factor applies).
 *  2. Net-unit lines lose their quantity: net is not grid consumption.
 *  3. Billed in kVAh: the printed kWh, else kVAh x the printed power factor
 *     (labelled estimate), becomes the consumption line; the kVAh lines stay
 *     as evidence and are not counted.
 *  4. A meter photo: two readings give the consumption (later minus earlier).
 *  5. The printed billed consumption wins: if no line carries it, one line is
 *     added from the printed value (consolidateElectricity then counts only it).
 * Returns the (possibly) updated lines and notes for the audit trail.
 */
export function prepareElectricityLines(ocr: RawOcr): PreparedElectricity {
  let lines = [...(ocr.lineItems ?? [])].map(l => ({ ...l }));
  const notes: string[] = [];
  const done = (extra: Partial<PreparedElectricity> = {}): PreparedElectricity => ({ lines, notes, billedKwh: null, basis: null, blocker: null, readingPeriod: null, ...extra });
  if (!isElectricityBill(ocr)) return done();

  // A meter photo has no charge lines; any number the model put on a line is
  // a cumulative register value, never consumption.
  if (documentCaptureOf(ocr) === 'meter_photo') {
    lines = [];
    const m = consumptionFromMeterReadings(ocr.meterReadings);
    notes.push(m.note);
    if ('reason' in m) return done({ blocker: m.reason === 'single_reading' || m.reason === 'no_readings' ? 'single_meter_reading' : 'meter_readings_unusable' });
    lines.push({
      description: 'Electricity consumed (meter readings)', hsn_code: '2716', quantity: m.kwh, unit: 'kWh', sourcePage: 1, sourceText: m.sourceText,
      basis: 'meter_readings', basisLabel: BASIS_LABEL.meter_readings, evidence: { meterReadings: [m.earlier, m.later] } satisfies EnergyEvidence,
    });
    return done({ billedKwh: m.kwh, basis: 'meter_readings', readingPeriod: m.periodStart && m.periodEnd ? { start: m.periodStart, end: m.periodEnd } : null });
  }

  const apparentNotes: string[] = [];
  let netCleared = false;
  for (const l of lines) {
    if (!isElectricityLine(l)) continue;
    const text = `${l.description ?? ''} ${l.sourceText ?? ''} ${l.unit ?? ''}`;
    if (num(l.quantity) !== null && APPARENT.test(text)) {
      const reactive = REACTIVE.test(text);
      l.unit = reactive ? 'kvarh' : 'kVAh';
      apparentNotes.push(`"${l.description ?? 'line'}": billed in ${l.unit} (${reactive ? 'reactive' : 'apparent'} energy), not kWh, so no grid factor applies`);
      continue;
    }
    if (num(l.quantity) !== null && NET.test(text)) {
      l.quantity = null;
      netCleared = true;
      l.referenceNote = 'Net units (import minus export) are not grid consumption; the import units are needed';
      notes.push(`"${l.description ?? 'line'}": net units (import minus export) are not grid consumption; import units are needed`);
      continue;
    }
    if (typeof l.unit === 'string' && UNIT_WORD.test(l.unit.trim())) {
      l.unit = 'kWh';
      notes.push(`"${l.description ?? 'line'}": unit "units" read as kWh (electricity billing unit)`);
    }
    // A printed kWh quantity on an electricity line of a discom bill (e.g.
    // "Energy Charges 18303 kWh") is grid electricity even without an HSN.
    if (num(l.quantity) !== null && /^kwh$/i.test(String(l.unit ?? '').trim()) && !String(l.hsn_code ?? '').startsWith('2716')) {
      l.hsn_code = '2716';
      notes.push(`"${l.description ?? 'line'}": printed kWh read as grid electricity`);
    }
  }

  const billed = printedBilledKwh(ocr);
  const isKwhLine = (l: RawLine) => isElectricityLine(l) && num(l.quantity) !== null && /^kwh$/i.test(String(l.unit ?? '').trim());
  const kvahLines = lines.filter(l => isElectricityLine(l) && num(l.quantity) !== null && l.unit === 'kVAh');
  const hasConsumptionLine = lines.some(isKwhLine);
  const unitsText = `${ocr.unitsConsumedUnit ?? ''} ${ocr.unitsConsumedText ?? ''}`;

  // ---- Billed in kVAh ----
  const billedInKvah = billed.reason === 'apparent_energy' && !REACTIVE.test(unitsText);
  const kvahOnLines = billed.kwh === null && billed.reason === null && !hasConsumptionLine && kvahLines.length > 0;
  if (billedInKvah || kvahOnLines) {
    let kvah: number | null = null;
    let kvahText: string | null = null;
    if (billedInKvah) {
      kvah = num(ocr.unitsConsumedKwh);
      kvahText = text240(ocr.unitsConsumedText);
    } else {
      const distinct = [...new Set(kvahLines.map(l => num(l.quantity)))];
      const total = kvahLines.find(l => TOTAL.test(String(l.description ?? ''))) ?? (distinct.length === 1 ? kvahLines[0] : undefined);
      if (total) { kvah = num(total.quantity); kvahText = text240(total.sourceText) ?? `${total.description ?? 'Consumption'}: ${kvah} kVAh`; }
    }
    const r = kwhForKvahBill({ kvah, kvahText, activeEnergyKwh: ocr.activeEnergyKwh, activeEnergyText: ocr.activeEnergyText, powerFactor: ocr.powerFactor, powerFactorText: ocr.powerFactorText, enteredKwh: ocr.enteredKwh });
    if (!('reason' in r)) {
      for (const l of kvahLines) {
        l.printedQuantity = num(l.quantity);
        l.printedUnit = 'kVAh';
        l.quantity = null;
        l.referenceNote = REFERENCE_KVAH;
      }
      const carrier = lines.find(l => isKwhLine(l) && Math.abs((num(l.quantity) as number) - r.kwh) <= 1e-6);
      if (carrier) {
        Object.assign(carrier, { basis: r.basis, basisLabel: BASIS_LABEL[r.basis], evidence: r.evidence });
      } else {
        lines.push({
          description: 'Electricity consumed (kWh)', hsn_code: '2716', quantity: r.kwh, unit: 'kWh', sourcePage: 1, sourceText: r.sourceText,
          basis: r.basis, basisLabel: BASIS_LABEL[r.basis], evidence: r.evidence,
        });
      }
      notes.push(r.note);
      return done({ billedKwh: r.kwh, basis: r.basis });
    }
    notes.push(...apparentNotes, r.note);
    return done({ blocker: r.reason === 'active_exceeds_apparent' ? 'kvah_mismatch' : 'kvah_needs_kwh' });
  }

  notes.push(...apparentNotes);
  if (billed.reason === 'apparent_energy') notes.push('Electricity bill: billed consumption is printed in kvarh (reactive energy), not kWh, so emissions cannot be calculated');
  if (billed.reason === 'net_units') notes.push('Electricity bill: the printed consumption is net of exported units; grid import units are needed');
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
  if (!hasConsumptionLine && billed.kwh === null && billed.reason === null && !netCleared) {
    notes.push('Electricity bill: billed units (kWh) not found on the bill, so emissions cannot be calculated');
  }
  const blocker: ElectricityBlocker | null = (billed.reason === 'net_units' || netCleared) && billed.kwh === null && !hasConsumptionLine ? 'net_units' : null;
  return done({ billedKwh: billed.kwh, blocker });
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
