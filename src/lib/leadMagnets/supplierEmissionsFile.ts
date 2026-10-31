// The supplier emissions file from /scope-3-supplier-evidence: one page an
// MSME supplier sends when a buyer asks for its emissions. Scope 1 (fuel) and
// Scope 2 (grid electricity, location-based) for one period, worked out from
// numbers the supplier types off its own bills. Every factor and its source
// comes from supabase/functions/_shared/emissionFactors.ts (grid by the
// financial year, fuels from FUEL_FACTORS through quickCarbon), so the file
// and an uploaded bill never disagree. Built in the browser; nothing is sent.
import { FUEL_FACTORS, gridFactorFor } from '../../../supabase/functions/_shared/emissionFactors';
import { FUELS, fuelLine, type QuickFuel } from '@/lib/calculators/quickCarbon';
import { cleanName, fileDate, toCsv, type SendableFile } from './sendableFile';

/** Financial years offered, by start year. FY 2026-27 is the year in progress. */
export const FILE_YEARS = [2026, 2025, 2024] as const;
export type FileYear = (typeof FILE_YEARS)[number];
/** Months of an Indian financial year, April first. */
export const FY_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'] as const;
/** Fuels for the "other fuel" line: everything the calculators offer except diesel, which has its own line. */
export const OTHER_FUELS = FUELS.filter((f) => f.id !== 'DIESEL');

export type Basis = 'total' | 'month';

export interface SupplierFileInput {
  /** Start year of the financial year, e.g. 2025 for FY 2025-26. */
  fy: number;
  /** Month indexes within the financial year, 0 = April. */
  from: number;
  to: number;
  /** Whether the quantities are totals for the period or one typical month. */
  basis: Basis;
  /** Grid electricity in kWh; null when not given. */
  kwh: number | null;
  /** Diesel in litres; null when not given, 0 when none was used. */
  diesel: number | null;
  other?: { fuel: QuickFuel; unit: string; qty: number | null } | null;
  /** Lines the supplier holds a bill for, for every month of the period. */
  billsHeld: { electricity: boolean; diesel: boolean; other: boolean };
  company?: string;
  buyer?: string;
  date?: Date;
}

export interface FileRow {
  key: 'electricity' | 'diesel' | 'other';
  source: string;
  scope: 1 | 2;
  /** Quantity for the whole period, in the factor's unit. */
  qty: number;
  unit: string;
  factor: number;
  factorUnit: string;
  factorSource: string;
  kg: number;
  billsHeld: boolean;
}

export interface FileResult {
  months: number;
  period: string;
  rows: FileRow[];
  scope1Kg: number | null;
  scope2Kg: number | null;
  totalKg: number;
  grid: ReturnType<typeof gridFactorFor>;
}

const valid = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const fyLabel = (y: number) => `FY ${y}-${String(y + 1).slice(-2)}`;
const calYear = (fy: number, i: number) => (i >= 9 ? fy + 1 : fy);
const UNIT_WORD: Record<string, string> = { litre: 'litres', kg: 'kg', scm: 'scm' };

/** "April 2025 to March 2026 (FY 2025-26)", or the months and their count for part of a year. */
export function periodLabel(fy: number, from: number, to: number): string {
  const a = Math.min(from, to), b = Math.max(from, to);
  const span = `${FY_MONTHS[a]} ${calYear(fy, a)} to ${FY_MONTHS[b]} ${calYear(fy, b)}`;
  const n = b - a + 1;
  return n === 12 ? `${span} (${fyLabel(fy)})` : `${span} (${n} ${n === 1 ? 'month' : 'months'} of ${fyLabel(fy)})`;
}

export function supplierEmissions(input: SupplierFileInput): FileResult {
  const a = Math.min(input.from, input.to), b = Math.max(input.from, input.to);
  const months = b - a + 1;
  const times = input.basis === 'month' ? months : 1;
  const grid = gridFactorFor(`${input.fy}-04-01`);
  const rows: FileRow[] = [];

  if (valid(input.kwh)) {
    const qty = input.kwh * times;
    rows.push({
      key: 'electricity', source: 'Grid electricity', scope: 2, qty, unit: 'kWh',
      factor: grid.value, factorUnit: 'kWh',
      factorSource: grid.source,
      kg: qty * grid.value, billsHeld: input.billsHeld.electricity,
    });
  }
  if (valid(input.diesel)) {
    const qty = input.diesel * times;
    const f = FUEL_FACTORS.DIESEL;
    rows.push({ key: 'diesel', source: 'Diesel', scope: 1, qty, unit: 'litres', factor: f.value, factorUnit: 'litre', factorSource: f.source, kg: qty * f.value, billsHeld: input.billsHeld.diesel });
  }
  const o = input.other;
  if (o && valid(o.qty)) {
    const r = fuelLine({ fuel: o.fuel, unit: o.unit, qty: o.qty * times });
    rows.push({
      key: 'other', source: r.fuel.name, scope: 1, qty: r.base, unit: UNIT_WORD[r.fuel.unit] ?? r.fuel.unit,
      factor: r.fuel.factor, factorUnit: r.fuel.unit, factorSource: FUEL_FACTORS[r.fuel.id].source, kg: r.kg, billsHeld: input.billsHeld.other,
    });
  }

  const sum = (scope: 1 | 2) => { const s = rows.filter((r) => r.scope === scope); return s.length ? s.reduce((t, r) => t + r.kg, 0) : null; };
  const scope1Kg = sum(1), scope2Kg = sum(2);
  return { months, period: periodLabel(input.fy, a, b), rows, scope1Kg, scope2Kg, totalKg: (scope1Kg ?? 0) + (scope2Kg ?? 0), grid };
}

export const hasFigures = (r: FileResult) => r.rows.length > 0;

const n0 = (n: number) => Math.round(n).toLocaleString('en-IN');
/** Tonnes for the page and the file: two decimals under 10 t, one above. */
export const tonnes = (kg: number) => (kg / 1000).toLocaleString('en-IN', { minimumFractionDigits: kg < 10_000 ? 2 : 1, maximumFractionDigits: kg < 10_000 ? 2 : 1 });
const qtyText = (r: FileRow) => `${r.qty.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${r.unit}`;
const factorText = (r: FileRow) => `${r.factor} kg CO2 per ${r.factorUnit}`;
const scopeText = (r: FileRow) => (r.scope === 2 ? 'Scope 2, location-based' : 'Scope 1');
const EVIDENCED = 'Bills held for every month';
const DECLARED = 'Self-declared';
const evidence = (r: FileRow) => (r.billsHeld ? EVIDENCED : DECLARED);
const to = (buyer?: string) => ['The sustainability and procurement team', cleanName(buyer)].filter(Boolean).join(', ');
const total = (kg: number | null, none: string) => (kg === null ? none : `${tonnes(kg)} tCO2e (${n0(kg)} kg)`);

function methodLines(r: FileResult, basis: Basis): string[] {
  const fuels = r.rows.filter((x) => x.scope === 1);
  return [
    ...(fuels.length ? ['Scope 1: fuel burned on our site or in our own vehicles, multiplied by the factor for that fuel.'] : []),
    ...(r.scope2Kg !== null ? [`Scope 2, location-based: grid units multiplied by the CEA India grid average for ${r.grid.factorYear}${r.grid.billYear === r.grid.factorYear ? '' : `, the latest year published, applied to ${r.grid.billYear}`}. No market-based figure is given.`] : []),
    ...(basis === 'month' ? [`Quantities are one typical month's bill multiplied by ${r.months}, not the sum of each month's bill.`] : ['Quantities are totals for the period.']),
    'Factors cover CO2 only, so CO2e here is CO2. Methane and nitrous oxide from fuel would add under 1%.',
    'Only the sources in the table are included. Refrigerant leaks and process emissions, if any, are not.',
  ];
}

export function supplierEmissionsFile(input: SupplierFileInput): SendableFile {
  const r = supplierEmissions(input);
  return {
    title: 'Scope 1 and 2 emissions',
    to: to(input.buyer),
    from: cleanName(input.company),
    date: fileDate(input.date),
    subject: `Our Scope 1 and Scope 2 emissions for ${r.period}.`,
    blocks: [
      {
        heading: 'Totals',
        lines: [
          { text: `Scope 1: ${total(r.scope1Kg, 'no fuel figures given')}`, bold: true },
          { text: `Scope 2, location-based: ${total(r.scope2Kg, 'no electricity figure given')}`, bold: true },
          { text: `Scope 1 and 2: ${total(r.totalKg, '')}`, bold: true },
        ],
      },
      {
        heading: 'By source',
        table: {
          head: ['Source', 'Scope', 'Quantity', 'Factor', 'kg CO2e', 'Evidence'],
          widths: [17, 19, 17, 18, 12, 17],
          rows: r.rows.map((x) => [x.source, scopeText(x), qtyText(x), factorText(x), n0(x.kg), evidence(x)]),
        },
      },
      { heading: 'Factor sources', lines: r.rows.map((x) => `${x.source}: ${x.factorSource}`) },
      { heading: 'Method', lines: methodLines(r, input.basis) },
      {
        heading: 'Evidence',
        lines: [
          ...r.rows.map((x) => (x.billsHeld
            ? `${x.source}: we hold the bill for every month of the period. Copies on request.`
            : `${x.source}: self-declared. We do not hold a bill for every month.`)),
          'These figures come from our own bills and records. They have not been checked by a third party.',
        ],
      },
    ],
    footer: [
      'Made with the free supplier file at senseible.earth/scope-3-supplier-evidence',
    ],
  };
}

/** The same rows as CSV, for a buyer who collects supplier figures in a spreadsheet. Plain numbers, formula-safe cells. */
export function supplierEmissionsCsv(input: SupplierFileInput): string {
  const r = supplierEmissions(input);
  const kg = (n: number | null) => (n === null ? '' : String(Math.round(n)));
  return toCsv([
    ['To', to(input.buyer)],
    ['From', cleanName(input.company) ?? ''],
    ['Date', fileDate(input.date)],
    ['Period', r.period],
    [],
    ['Source', 'Scope', 'Quantity', 'Unit', 'Factor (kg CO2 per unit)', 'Factor source', 'Emissions (kg CO2e)', 'Evidence'],
    ...r.rows.map((x) => [x.source, scopeText(x), String(Math.round(x.qty * 100) / 100), x.unit, String(x.factor), x.factorSource, kg(x.kg), evidence(x)]),
    [],
    ['Scope 1 (kg CO2e)', kg(r.scope1Kg)],
    ['Scope 2, location-based (kg CO2e)', kg(r.scope2Kg)],
    ['Scope 1 and 2 (kg CO2e)', kg(r.totalKg)],
    [],
    ...methodLines(r, input.basis).map((l) => ['Method', l]),
    ['Verification', 'These figures come from our own bills and records. They have not been checked by a third party.'],
  ]);
}

export const supplierFileName = (ext: 'pdf' | 'csv', d: Date = new Date()) => `scope-1-2-emissions-${d.toISOString().slice(0, 10)}.${ext}`;
