import type { EmissionFactor, Resolution, TraceEntry, WaterActivity } from './types.ts';
import { factorPerM3 } from './units.ts';

export interface ResolveContext {
  activity: WaterActivity;
  supplier_id: string | null;
  country_code: string | null;
  region_code?: string | null;
  period_start: string;     // allocated sub-period
  period_end: string;
  reporting_year: number;
  gwp_basis: string;        // entity's configured reporting basis
}

/**
 * Deterministic factor resolution with a full trace.
 * Eligibility: APPROVED, matching activity, valid over the whole sub-period,
 * convertible unit, same GWP basis. Tier A: supplier-specific, then the
 * national factor for the bill's country. Tier B: a record a human marked
 * approved for proxy use for this country (or for any country). No other
 * cross-geography fallback exists. Ties at a tier: the publication year
 * closest to (and preferably not after) the reporting year; still tied ->
 * AMBIGUOUS_FACTOR, never a random pick.
 */
export function resolveFactor(factors: EmissionFactor[], c: ResolveContext): Resolution {
  const trace: TraceEntry[] = [];
  const eligible: EmissionFactor[] = [];
  let gwpOnly = 0;

  for (const f of factors) {
    const why: string[] = [];
    if (f.status !== 'APPROVED') why.push(`status ${f.status}`);
    if (f.activity_type !== c.activity) why.push(`activity ${f.activity_type}`);
    if (f.valid_from > c.period_start) why.push(`valid from ${f.valid_from}`);
    if (f.valid_to !== null && f.valid_to < c.period_end) why.push(`valid to ${f.valid_to}`);
    if (factorPerM3(f.value, f.unit) === null) why.push(`unit ${f.unit} not convertible to m3`);
    const geoA = (f.geography_type === 'SUPPLIER' && !!c.supplier_id && f.geography === c.supplier_id)
      || (f.geography_type === 'COUNTRY' && !!c.country_code && f.geography === c.country_code);
    const proxyOk = f.approved_for_proxy && (!f.proxy_for_country || f.proxy_for_country === c.country_code);
    if (!geoA && !proxyOk) why.push(`geography ${f.geography_type}:${f.geography} not applicable`);
    if (why.length === 0 && f.gwp_basis !== c.gwp_basis) { why.push(`GWP basis ${f.gwp_basis} != ${c.gwp_basis}`); gwpOnly++; }
    trace.push({ factor_id: f.id, version: f.version, accepted: why.length === 0, reason: why.length ? why.join('; ') : 'eligible' });
    if (!why.length) eligible.push(f);
  }

  const supplier = eligible.filter(f => f.geography_type === 'SUPPLIER' && f.geography === c.supplier_id);
  const country = eligible.filter(f => f.geography_type === 'COUNTRY' && f.geography === c.country_code);
  const proxy = eligible.filter(f => !supplier.includes(f) && !country.includes(f));

  for (const [tier, set] of [['A', supplier], ['A', country], ['B', proxy]] as const) {
    if (!set.length) continue;
    const ranked = [...set].sort((a, b) => rankYear(a, c.reporting_year) - rankYear(b, c.reporting_year));
    if (ranked.length > 1 && rankYear(ranked[0], c.reporting_year) === rankYear(ranked[1], c.reporting_year)) {
      mark(trace, ranked, `tie at tier ${tier}: same publication-year distance`);
      return { status: 'UNAVAILABLE_FACTOR_PENDING', tier: 'none', factor: null, reasons: ['AMBIGUOUS_FACTOR'], trace };
    }
    const chosen = ranked[0];
    mark(trace, [chosen], `selected at tier ${tier}`);
    return tier === 'A'
      ? { status: 'CALCULATED', tier: 'A', factor: chosen, reasons: [], trace }
      : { status: 'ESTIMATED_PROXY', tier: 'B', factor: chosen, reasons: ['PROXY_FACTOR_USED'], trace };
  }
  return { status: 'UNAVAILABLE_FACTOR_PENDING', tier: 'none', factor: null, reasons: [gwpOnly > 0 ? 'GWP_BASIS_MISMATCH' : 'NO_FACTOR'], trace };
}

/** Same year = 0; earlier years count up; later years rank after every earlier one. */
function rankYear(f: EmissionFactor, year: number): number {
  const d = year - f.source_publication_year;
  return d >= 0 ? d : 1000 - d;
}

function mark(trace: TraceEntry[], fs: EmissionFactor[], note: string) {
  for (const f of fs) {
    const t = trace.find(x => x.factor_id === f.id && x.version === f.version);
    if (t) t.reason = `${t.reason}; ${note}`;
  }
}
