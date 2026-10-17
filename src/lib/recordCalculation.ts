// The calculation behind one stored emission record, for History and Verify:
// quantity × factor = kg, the factor source, the page it came from, the
// factor set version and the assumptions. Reads the stored row only; records
// written before the version and assumptions were kept say "not recorded".

export const NOT_RECORDED = 'not recorded';

export interface CalculationRow {
  activity_data: number | null;
  activity_unit: string | null;
  emission_factor: number | null;
  co2_kg: number;
  verification_notes: string | null;
}

export interface RecordCalculation {
  /** "1,200 kWh × 0.727 kg/kWh = 872.4 kg CO2e", or null when a figure is missing. */
  line: string | null;
  factorSource: string;
  page: string;
  factorSetVersion: string;
  assumptions: string[] | null;
}

const fmt = (n: number, dp: number) => n.toLocaleString('en-IN', { maximumFractionDigits: dp });

export function recordCalculation(row: CalculationRow, cachedResult?: unknown): RecordCalculation {
  let p: Record<string, unknown> = {};
  try { const v = JSON.parse(row.verification_notes || 'null'); if (v && typeof v === 'object') p = v; } catch { /* legacy notes */ }
  const q = row.activity_data, f = row.emission_factor, unit = (row.activity_unit || '').trim();
  const line = typeof q === 'number' && typeof f === 'number' && unit
    ? `${fmt(q, 3)} ${unit} × ${fmt(f, 6)} kg/${unit} = ${fmt(row.co2_kg, 2)} kg CO₂e`
    : null;
  let page: number | null = typeof p.sourcePage === 'number' ? p.sourcePage : null;
  if (page === null && typeof p.sourceDescription === 'string' && cachedResult && typeof cachedResult === 'object') {
    const items = (cachedResult as { lineItems?: unknown }).lineItems;
    const match = Array.isArray(items) ? (items as Array<Record<string, unknown>>).find((i) => i?.description === p.sourceDescription && typeof i?.sourcePage === 'number') : undefined;
    if (match) page = match.sourcePage as number;
  }
  return {
    line,
    factorSource: typeof p.factorSource === 'string' && p.factorSource ? p.factorSource : NOT_RECORDED,
    page: page !== null ? `page ${page}` : NOT_RECORDED,
    factorSetVersion: typeof p.factorSetVersion === 'string' && p.factorSetVersion ? p.factorSetVersion : NOT_RECORDED,
    assumptions: Array.isArray(p.assumptions) ? (p.assumptions as unknown[]).map(String) : null,
  };
}
