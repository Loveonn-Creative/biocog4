// Totals that never look more certain than they are (I8): NULL emissions are
// excluded and counted, never summed as 0. Every total carries its coverage,
// proxy share, open gaps, uncertainty and verification status.
import type { EmissionResultDraft, ReasonCode, Severity } from './types.ts';
import type { GapFlag } from './flags.ts';

export type Bucket = string;   // "S1", "S2", "S3.C1", ... or "UNMAPPED"

export interface Total {
  period: string;
  bucket: Bucket;
  /** Sum of calculated rows, or null when no row in the bucket could be calculated. */
  total_kgco2e: number | null;
  tier_a_kgco2e: number | null;
  proxy_kgco2e: number | null;          // Tier B, shown separately
  included_count: number;
  excluded_count: number;
  excluded_volume_m3: number;           // known volumes of excluded rows
  excluded_volume_unknown_count: number;
  /** Included volume / all volume, by absolute m³. null when there is no volume at all. */
  coverage_pct: number | null;
  /** True when some excluded rows have no readable volume, so coverage is an upper bound. */
  coverage_is_upper_bound: boolean;
  /** Proxy kgCO2e / total kgCO2e, by absolute value. */
  estimation_share_pct: number | null;
  /** Combined ± kgCO2e (root-sum-square, factors assumed independent), or null when any row lacks one. */
  uncertainty_kgco2e: number | null;
  uncertainty_unquantified_count: number;
  open_gaps: number;
  verification_status: 'NOT_VERIFIED';
}

export const bucketOf = (r: Pick<EmissionResultDraft, 'mapping_status' | 'scope' | 'scope3_category'>): Bucket =>
  r.mapping_status !== 'MAPPED' || r.scope === null ? 'UNMAPPED' : r.scope === 3 ? `S3.C${r.scope3_category}` : `S${r.scope}`;

const pct = (n: number, d: number) => (d > 0 ? Math.round((1000 * n) / d) / 10 : null);

export function aggregate(results: EmissionResultDraft[], flags: GapFlag[] = []): Total[] {
  const groups = new Map<string, EmissionResultDraft[]>();
  for (const r of results) {
    const k = `${r.allocation_period}\u0000${bucketOf(r)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  const open = flags.filter(f => f.status === 'OPEN' || f.status === 'IN_PROGRESS');
  const out: Total[] = [];
  for (const [k, rows] of [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [period, bucket] = k.split('\u0000');
    const inc = rows.filter(r => r.emissions_kgco2e !== null);
    const exc = rows.filter(r => r.emissions_kgco2e === null);
    const sum = (xs: EmissionResultDraft[]) => (xs.length ? xs.reduce((s, r) => s + (r.emissions_kgco2e as number), 0) : null);
    const tierA = inc.filter(r => r.factor_tier === 'A'), tierB = inc.filter(r => r.factor_tier === 'B');
    const total = sum(inc), proxy = sum(tierB);
    const incVol = inc.reduce((s, r) => s + Math.abs(r.allocated_volume_m3 ?? 0), 0);
    const excKnown = exc.filter(r => r.allocated_volume_m3 !== null);
    const excVol = excKnown.reduce((s, r) => s + Math.abs(r.allocated_volume_m3 as number), 0);
    const absTotal = inc.reduce((s, r) => s + Math.abs(r.emissions_kgco2e as number), 0);
    const absProxy = tierB.reduce((s, r) => s + Math.abs(r.emissions_kgco2e as number), 0);
    const unq = inc.filter(r => r.factor_uncertainty === null || r.factor_uncertainty === undefined);
    const keys = new Set(rows.map(r => `${r.water_bill_key}|${r.allocation_period}`));
    out.push({
      period, bucket, total_kgco2e: total, tier_a_kgco2e: sum(tierA), proxy_kgco2e: proxy,
      included_count: inc.length, excluded_count: exc.length, excluded_volume_m3: excVol,
      excluded_volume_unknown_count: exc.length - excKnown.length,
      coverage_pct: pct(incVol, incVol + excVol), coverage_is_upper_bound: exc.length > excKnown.length,
      estimation_share_pct: inc.length ? pct(absProxy, absTotal) ?? 0 : null,
      uncertainty_kgco2e: inc.length && !unq.length
        ? Math.sqrt(inc.reduce((s, r) => s + (Math.abs(r.emissions_kgco2e as number) * (r.factor_uncertainty as number)) ** 2, 0)) : null,
      uncertainty_unquantified_count: unq.length,
      open_gaps: open.filter(f => keys.has(`${f.water_bill_key}|${f.allocation_period ?? 'UNALLOCATED'}`)).length,
      verification_status: 'NOT_VERIFIED',
    });
  }
  return out;
}

const fmt = (n: number, d = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const bucketName = (b: Bucket) => (b === 'UNMAPPED' ? 'Unmapped' : b.startsWith('S3.C') ? `Scope 3 Category ${b.slice(4)}` : `Scope ${b.slice(1)}`);

/** One line per total, e.g. "Scope 3 Category 1, 2026: 1,234.5 kgCO2e from 62% of volume, 4 open gaps, not verified." */
export function describeTotal(t: Total): string {
  const head = `${bucketName(t.bucket)}, ${t.period}: `;
  const amount = t.total_kgco2e === null ? 'not quantified' : `${fmt(t.total_kgco2e)} kgCO2e`;
  const cov = t.coverage_pct === null ? 'coverage unknown' : `${t.coverage_is_upper_bound ? 'at most ' : ''}${fmt(t.coverage_pct)}% of volume covered`;
  const parts = [amount, cov];
  if (t.estimation_share_pct) parts.push(`${fmt(t.estimation_share_pct)}% from proxy factors`);
  parts.push(t.uncertainty_kgco2e === null ? 'uncertainty not quantified' : `±${fmt(t.uncertainty_kgco2e)} kgCO2e (factor uncertainty only)`);
  parts.push(`${t.open_gaps} open gap${t.open_gaps === 1 ? '' : 's'}`, 'not verified');
  return head + parts.join(', ') + '.';
}

export interface VolumeRow { period: string; supply_m3: number; wastewater_m3: number; combined_unsplit_m3: number; unreadable_bills: number }

/** Water metrics in m³ (I5), supply and wastewater kept apart (I6), whether or not a factor exists. */
export function waterVolumes(results: EmissionResultDraft[], kindOf: (billKey: string) => 'SUPPLY' | 'WASTEWATER' | 'COMBINED_UNSPLIT'): VolumeRow[] {
  const m = new Map<string, VolumeRow>();
  for (const r of results) {
    const row = m.get(r.allocation_period) ?? { period: r.allocation_period, supply_m3: 0, wastewater_m3: 0, combined_unsplit_m3: 0, unreadable_bills: 0 };
    m.set(r.allocation_period, row);
    if (r.allocated_volume_m3 === null) { row.unreadable_bills++; continue; }
    const k = kindOf(r.water_bill_key);
    if (k === 'SUPPLY') row.supply_m3 += r.allocated_volume_m3;
    else if (k === 'WASTEWATER') row.wastewater_m3 += r.allocated_volume_m3;
    else row.combined_unsplit_m3 += r.allocated_volume_m3;
  }
  return [...m.values()].sort((a, b) => (a.period < b.period ? -1 : 1));
}

export interface GapLine { reason_code: ReasonCode; severity: Severity; open: number; overdue: number; owner_role: string }

/** Data-gap report: open flags by reason, most severe first. */
export function gapReport(flags: GapFlag[], today: string): GapLine[] {
  const rank: Record<Severity, number> = { High: 0, Medium: 1, Low: 2 };
  const m = new Map<ReasonCode, GapLine>();
  for (const f of flags) {
    if (f.status !== 'OPEN' && f.status !== 'IN_PROGRESS') continue;
    const l = m.get(f.reason_code) ?? { reason_code: f.reason_code, severity: f.severity, open: 0, overdue: 0, owner_role: f.owner_role };
    l.open++; if (f.due_date < today) l.overdue++;
    m.set(f.reason_code, l);
  }
  return [...m.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || (a.reason_code < b.reason_code ? -1 : 1));
}
