// Billing period -> reporting period allocation, pro-rata by days (inclusive).

export interface ReportingPeriod { label: string; start: string; end: string; year: number }
export interface Allocation { period: ReportingPeriod; start: string; end: string; days: number; volume_m3: number; method: 'WHOLE_PERIOD' | 'PRO_RATA_DAYS' }

const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;
const iso = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10);

/** Calendar years or India financial years (1 April to 31 March) covering a date range. */
export function reportingPeriods(start: string, end: string, basis: 'CALENDAR' | 'INDIA_FY'): ReportingPeriod[] {
  const out: ReportingPeriod[] = [];
  const sy = +start.slice(0, 4), ey = +end.slice(0, 4);
  for (let y = sy - 1; y <= ey; y++) {
    const p = basis === 'CALENDAR'
      ? { label: String(y), start: `${y}-01-01`, end: `${y}-12-31`, year: y }
      : { label: `FY${y}-${String((y + 1) % 100).padStart(2, '0')}`, start: `${y}-04-01`, end: `${y + 1}-03-31`, year: y + 1 };
    if (p.end >= start && p.start <= end) out.push(p);
  }
  return out;
}

/** Splits a volume across reporting periods by days; parts sum exactly to the total. */
export function allocate(start: string, end: string, volume_m3: number, periods: ReportingPeriod[]): Allocation[] {
  const s = day(start), e = day(end);
  const total = e - s + 1;
  const parts = periods
    .map(p => ({ p, a: Math.max(s, day(p.start)), b: Math.min(e, day(p.end)) }))
    .filter(x => x.b >= x.a)
    .map(x => ({ period: x.p, start: iso(x.a), end: iso(x.b), days: x.b - x.a + 1 }));
  const method = parts.length > 1 ? 'PRO_RATA_DAYS' as const : 'WHOLE_PERIOD' as const;
  let assigned = 0;
  return parts.map((x, i) => {
    const v = i === parts.length - 1 ? volume_m3 - assigned : (volume_m3 * x.days) / total;
    assigned += v;
    return { ...x, volume_m3: v, method };
  });
}
