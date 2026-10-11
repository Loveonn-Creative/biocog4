// Safety rates for BRSR Principle 3.
//   LTIFR = lost time injuries x 1,000,000 / hours worked  (BRSR: per million person-hours)
//   TRIR  = total recordable injuries x 200,000 / hours worked
// No benchmarks: we have no sourced industry figures to compare against.

export type Num = number | "";

export interface HoursInput {
  mode: "total" | "headcount";
  total: Num;
  headcount: Num;
  hoursPerDay: Num;
  days: Num;
}

const n = (v: Num) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** Hours worked: as given, or headcount x hours per day x working days. */
export function hoursWorked(i: HoursInput): number {
  return i.mode === "total" ? n(i.total) : n(i.headcount) * n(i.hoursPerDay) * n(i.days);
}

export const ltifr = (ltis: number, hours: number) => (hours > 0 ? (ltis * 1_000_000) / hours : 0);
export const trir = (recordables: number, hours: number) => (hours > 0 ? (recordables * 200_000) / hours : 0);

export interface InjuryInput { ltis: Num; recordables: Num; fatalities: Num }

export interface GroupRates { hours: number; ltis: number; recordables: number; fatalities: number; ltifr: number; trir: number }

export function rates(hours: number, inj: InjuryInput): GroupRates {
  const ltis = n(inj.ltis), recordables = n(inj.recordables), fatalities = n(inj.fatalities);
  return { hours, ltis, recordables, fatalities, ltifr: ltifr(ltis, hours), trir: trir(recordables, hours) };
}

/** Recordables include lost time injuries, so they cannot be fewer. */
export const recordablesValid = (inj: InjuryInput) => n(inj.recordables) >= n(inj.ltis);

export const fmtRate = (v: number, dp: number) => v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const fmtHours = (v: number) => Math.round(v).toLocaleString("en-IN");

export function safetyHeadline(r: GroupRates): string {
  return `LTIFR ${fmtRate(r.ltifr, 2)} per million hours. TRIR ${fmtRate(r.trir, 1)}.`;
}

export function safetySummary(total: GroupRates, groups?: { employees: GroupRates; workers: GroupRates }): string {
  const base = `Hours worked: ${fmtHours(total.hours)}. Lost time injuries: ${total.ltis}. Recordable injuries: ${total.recordables}. Fatalities: ${total.fatalities}. LTIFR ${fmtRate(total.ltifr, 2)} per million person-hours. TRIR ${fmtRate(total.trir, 1)} per 200,000 hours.`;
  if (!groups) return base;
  const g = (name: string, r: GroupRates) => `${name}: LTIFR ${fmtRate(r.ltifr, 2)}, TRIR ${fmtRate(r.trir, 1)} over ${fmtHours(r.hours)} hours.`;
  return `${base} ${g("Employees", groups.employees)} ${g("Workers", groups.workers)}`;
}

// ---- Hours lattice -----------------------------------------------------------

/**
 * Block size for the lattice: the smallest 1-2-5 step that keeps the grid at
 * or under 600 cells, so most inputs land between about 20x12 and 40x24.
 */
export function blockSize(hours: number, maxCells = 600): number {
  if (hours <= maxCells) return 1;
  const raw = hours / maxCells;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

/** Cells and a 5:3 grid that holds them. */
export function lattice(hours: number) {
  const block = blockSize(hours);
  const cells = Math.max(0, Math.ceil(hours / block));
  const cols = Math.max(1, Math.ceil(Math.sqrt((cells * 5) / 3)));
  const rows = Math.max(1, Math.ceil(cells / cols));
  return { block, cells, cols, rows };
}

/** Deterministic PRNG (mulberry32) so the same inputs always place injuries in the same cells. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distinct cell indices for each injury (first `ltis` are lost time). */
export function injuryCells(cells: number, count: number, seed: number): number[] {
  const k = Math.min(count, cells);
  const rnd = seeded(seed);
  const taken = new Set<number>();
  const out: number[] = [];
  while (out.length < k) {
    const c = Math.floor(rnd() * cells);
    if (!taken.has(c)) { taken.add(c); out.push(c); }
  }
  return out;
}
