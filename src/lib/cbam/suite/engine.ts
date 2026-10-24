// CBAM calculation engine for one installation. Pure functions, no I/O.
//
// Rules implemented (Commission guidance, definitive period):
// - Source stream emissions (Guidance No. 3, section 4.2; template B_EmInst):
//     combustion    AD x NCV x EF x OxF x (1 - BioC) / 1000   (NCV GJ/unit, EF t CO2/TJ)
//     process       AD x EF x ConvF x (1 - BioC)               (EF t CO2/unit)
//     mass balance  AD x C x 44/12 x (1 - BioC)                (C t C/unit, AD negative for outputs)
//     measured      the reported total
//     factor        AD x the platform's factor for that fuel (kg CO2 per unit) / 1000,
//                   from supabase/functions/_shared/emissionFactors.ts, applied by default
//                   and replaced by plant-measured NCV and EF when the plant has them
// - Directly attributable emissions of a production process = its shares of the
//   source streams, or a total entered for the process (template D_Processes (g)).
// - Indirect attributed emissions = electricity consumed (MWh) x EF (t CO2/MWh)
//   (Guidance No. 3, equations 56 and 35).
// - Embedded emissions = attributed emissions + sum(precursor tonnes x precursor SEE);
//   SEE = embedded emissions / activity level (total production of the process).
// - Indirect emissions count towards the CBAM obligation only for INDIRECT_COUNTED
//   sectors (Guidance No. 3, section 4.1.3); SEE (indirect) is still reported.
// - Purchased precursors without supplier data use the default value for the
//   country of production (Annex I) or, if not India, Annex IV, increased by the
//   mark-up for the precursor's year (Guidance No. 3, section 4.10).
// - Specific embedded free allocation (Guidance No. 4, equations 2 and 4):
//     SFAProc = CBAM factor x CSCF x BM (Column A, actual data)
//     SEFA    = SFAProc + sum(m_i x SEFA_i)
//   Purchased precursors on default values use Column B.
// The certificate figures are an estimate for the importer's planning; the
// declaration itself is the authorised declarant's.

import {
  CBAM_FACTOR, CERTIFICATE_PRICES, CSCF_PRELIMINARY, INDIRECT_COUNTED, ROUTE_CODES,
  BENCHMARKS, annexIVFor, benchmarkFor, defaultFor, markupFor, type Benchmark, type BenchmarkEntry, type CbamSector,
} from '../official';
import { CN_CATEGORIES, GOODS_CATEGORIES } from './templateGoods';
import { FUEL_FACTORS } from '../../../../supabase/functions/_shared/emissionFactors';
import type { Process, PrecursorUse, SourceStream, Workbook } from './types';

export type Level = 'error' | 'warning' | 'note';
export interface Issue { level: Level; code: string; message: string; ref: string }

export interface StreamResult { id: string; name: string; tco2e: number; energyTJ: number; biogenicTco2e: number; formula: string }

export interface PrecursorResult {
  id: string; label: string; quantity: number; seeDirect: number; seeIndirect: number;
  embeddedDirect: number; embeddedIndirect: number; sefa: number | null; basis: 'own' | 'supplier' | 'default';
  defaultShare: number; formula: string;
}

export interface ProcessResult {
  id: string; name: string; sector: CbamSector; category: string;
  activity: number; consumedInternally: number; forMarket: number;
  dirEm: number; indirEm: number; electricityMwh: number;
  precursors: PrecursorResult[];
  embeddedDirect: number; embeddedIndirect: number;
  seeDirect: number; seeIndirect: number; indirectCounted: boolean; seeCounted: number;
  embeddedElectricityPerT: number; defaultShare: number;
  sfaProc: number | null; sefa: number | null;
  trail: string[];
}

export interface GoodResult {
  processId: string; goodId: string; cn: string; name: string; category: string; tonnes: number;
  seeDirect: number; seeIndirect: number; seeTotal: number; seeCounted: number; indirectCounted: boolean;
  defaultSee: number | null; defaultSource: string | null; markup: number;
  sefa: number | null; certificates: number | null; certificatesAtDefault: number | null;
  priceEur: number; pricePeriod: string; costEur: number | null; costAtDefaultEur: number | null;
}

export interface Result {
  year: number;
  streams: StreamResult[];
  processes: ProcessResult[];
  goods: GoodResult[];
  totals: { direct: number; indirect: number; total: number; biogenic: number; energyTJ: number; unallocated: number };
  issues: Issue[];
}

const EPS = 1e-9;
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
const r = (v: number, d = 3) => (Number.isFinite(v) ? Number(v.toFixed(d)) : v);
const fmt = (v: number, d = 3) => (Number.isFinite(v) ? r(v, d).toLocaleString('en-US', { maximumFractionDigits: d }) : 'n/a');

export function reportingYear(w: Workbook): number {
  const y = Number(String(w.installation.periodEnd || '').slice(0, 4));
  return Number.isFinite(y) && y >= 2026 ? y : 2026;
}

const frac = (v: number | undefined, dflt: number) => (v === undefined || v === null || Number.isNaN(v) ? dflt : v);

export function streamEmissions(s: SourceStream): { tco2e: number; energyTJ: number; biogenic: number; formula: string; problem?: string } {
  const ox = frac(s.oxidation, 1), conv = frac(s.conversion, 1), bio = frac(s.biomass, 0);
  const ad = num(s.ad);
  if (!Number.isFinite(ad)) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'Activity data missing' };
  if (bio < 0 || bio > 1 || ox < 0 || ox > 1 || conv < 0 || conv > 1) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'Fractions must be between 0 and 100%' };
  if (s.method === 'factor') {
    const f = s.fuel ? (FUEL_FACTORS as Record<string, { value: number; unit: string; source: string }>)[s.fuel] : undefined;
    if (!f) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'Choose the fuel' };
    if (s.adUnit !== f.unit) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: `Quantity must be in ${f.unit} for this fuel` };
    if (ad < 0) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'Quantity cannot be negative' };
    const t = (ad * f.value) / 1000;
    return { tco2e: t, energyTJ: 0, biogenic: 0, formula: `${fmt(ad)} ${f.unit} x ${f.value} kg CO2/${f.unit} (${f.source}) / 1000` };
  }
  if (s.method === 'measured') {
    const m = num(s.measuredTco2e);
    if (!Number.isFinite(m) || m < 0) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'Measured total missing' };
    return { tco2e: m, energyTJ: 0, biogenic: 0, formula: `${fmt(m)} t CO2e reported` };
  }
  if (s.method === 'combustion') {
    const ncv = num(s.ncv), ef = num(s.ef);
    if (!Number.isFinite(ncv) || !Number.isFinite(ef) || ncv < 0 || ef < 0 || ad < 0) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'NCV and emission factor needed, not negative' };
    const tj = (ad * ncv) / 1000;
    const gross = tj * ef * ox;
    return { tco2e: gross * (1 - bio), energyTJ: tj, biogenic: gross * bio, formula: `${fmt(ad)} ${s.adUnit} x ${ncv} GJ/${s.adUnit} x ${ef} t CO2/TJ x ${r(ox * 100, 2)}% OxF${bio ? ` x ${r((1 - bio) * 100, 2)}% fossil` : ''}` };
  }
  if (s.method === 'process') {
    const ef = num(s.ef);
    if (!Number.isFinite(ef) || ef < 0 || ad < 0) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'Emission factor needed, not negative' };
    const gross = ad * ef * conv;
    return { tco2e: gross * (1 - bio), energyTJ: 0, biogenic: gross * bio, formula: `${fmt(ad)} ${s.adUnit} x ${ef} t CO2/${s.adUnit} x ${r(conv * 100, 2)}% ConvF${bio ? ` x ${r((1 - bio) * 100, 2)}% fossil` : ''}` };
  }
  const c = num(s.carbonContent);
  if (!Number.isFinite(c) || c < 0) return { tco2e: 0, energyTJ: 0, biogenic: 0, formula: '', problem: 'Carbon content needed' };
  const gross = ad * c * (44 / 12);
  return { tco2e: gross * (1 - bio), energyTJ: 0, biogenic: gross * bio, formula: `${fmt(ad)} ${s.adUnit} x ${c} t C/${s.adUnit} x 44/12${bio ? ` x ${r((1 - bio) * 100, 2)}% fossil` : ''}` };
}

/** Pick the benchmark value for a good: route codes (1)/(2) by year, others by the chosen route code. */
export function pickBenchmark(entries: BenchmarkEntry[], year: number, routeCode?: string): { value: number | null; note: string } {
  if (!entries.length) return { value: null, note: 'No benchmark listed' };
  if (entries.length === 1) return { value: entries[0].value, note: entries[0].route ? `route ${entries[0].route}` : '' };
  const yearCode = year <= 2027 ? '(1)' : '(2)';
  const byYear = entries.find((e) => e.route === yearCode);
  if (byYear && entries.every((e) => e.route === '(1)' || e.route === '(2)')) return { value: byYear.value, note: `${yearCode} ${ROUTE_CODES[yearCode]}` };
  const chosen = routeCode ? entries.find((e) => e.route === routeCode) : undefined;
  if (chosen) return { value: chosen.value, note: `route ${routeCode} ${ROUTE_CODES[routeCode!] ?? ''}`.trim() };
  return { value: null, note: `Choose the benchmark route: ${entries.map((e) => e.route).join(', ')}` };
}

/** Benchmark for a good. A short CN code resolves only when every listed code under it has the same value. */
export function benchmarkForGood(cn: string): Benchmark | null {
  const direct = benchmarkFor(cn);
  if (direct) return direct;
  const q = String(cn).replace(/\D/g, '');
  if (q.length < 4) return null;
  const under = BENCHMARKS.filter((b) => b.cn.startsWith(q));
  if (!under.length) return null;
  const key = (b: Benchmark) => JSON.stringify([b.colA, b.colB]);
  return under.every((b) => key(b) === key(under[0])) ? { ...under[0], cn: q } : null;
}

export interface DefaultSee { direct: number; indirect: number; total: number; source: string; sector: CbamSector; route: string | null }

/** Default SEE for a CN code produced in a country, before mark-up. India: Annex I; elsewhere Annex IV (highest value). */
export function defaultSeeFor(cn: string, country: string): DefaultSee | null {
  if ((country || '').toUpperCase() === 'IN') {
    const d = defaultFor(cn);
    if (!d || d.total === null) return null;
    return { direct: d.direct ?? d.total, indirect: d.indirect ?? 0, total: d.total, source: `Annex I, India, CN ${d.cn}`, sector: d.sector, route: d.route };
  }
  const a = annexIVFor(cn);
  if (!a || a.highest === null) return null;
  return { direct: a.highest, indirect: 0, total: a.highest, source: `Annex IV (highest value), CN ${a.cn}`, sector: a.sector, route: a.route };
}

export function categoryForCn(cn: string): string | null {
  const q = String(cn).replace(/\D/g, '');
  let best: { cn: string; category: string } | null = null;
  for (const e of CN_CATEGORIES) if (q.startsWith(e.cn) && (!best || e.cn.length > best.cn.length)) best = e;
  return best?.category ?? null;
}

function priceFor(year: number): { eur: number; period: string } {
  const list = CERTIFICATE_PRICES.filter((p) => p.period.startsWith(String(year)));
  const last = (list.length ? list : CERTIFICATE_PRICES)[(list.length ? list : CERTIFICATE_PRICES).length - 1];
  return { eur: last.eur, period: last.period };
}

export function compute(w: Workbook): Result {
  const issues: Issue[] = [];
  const add = (level: Level, code: string, message: string, ref: string) => issues.push({ level, code, message, ref });
  const year = reportingYear(w);
  const cbamF = CBAM_FACTOR[Math.min(Math.max(year, 2026), 2034)] ?? 0;
  const cscf = CSCF_PRELIMINARY[Math.min(Math.max(year, 2026), 2034)] ?? 1;
  const procById = new Map(w.processes.map((p) => [p.id, p]));

  const { periodStart, periodEnd } = w.installation;
  if (!periodStart || !periodEnd || periodStart > periodEnd) add('error', 'period', 'Reporting period start and end are needed, start before end.', 'installation');
  if (!w.installation.nameEn?.trim()) add('error', 'name', 'Installation name (English) is needed.', 'installation');
  if (!w.installation.country) add('error', 'country', 'Country of the installation is needed.', 'installation');

  // Source streams and their split over processes.
  const dirByProc = new Map<string, { tco2e: number; parts: string[] }>();
  let unallocated = 0, biogenic = 0, energyTJ = 0;
  const streams: StreamResult[] = w.streams.map((s) => {
    const e = streamEmissions(s);
    if (e.problem) add('error', 'stream', `${s.name || 'Source stream'}: ${e.problem}.`, `stream:${s.id}`);
    if (!s.factorSource?.trim()) add('warning', 'stream-source', `${s.name || 'Source stream'}: state where the factors come from.`, `stream:${s.id}`);
    const shareSum = s.allocations.reduce((a, b) => a + (Number.isFinite(b.share) ? b.share : 0), 0);
    if (s.allocations.some((a) => !procById.has(a.processId))) add('error', 'alloc-target', `${s.name}: split points to a process that does not exist.`, `stream:${s.id}`);
    if (s.allocations.some((a) => !(a.share >= 0))) add('error', 'alloc-negative', `${s.name}: shares cannot be negative.`, `stream:${s.id}`);
    if (Math.abs(shareSum - 1) > 1e-6) {
      if (shareSum < 1) { unallocated += e.tco2e * (1 - shareSum); add(shareSum === 0 ? 'error' : 'warning', 'alloc-sum', `${s.name}: ${r((1 - shareSum) * 100, 2)}% is not assigned to a CBAM process. Assign it, or confirm it belongs to non-CBAM goods.`, `stream:${s.id}`); }
      else add('error', 'alloc-over', `${s.name}: shares add up to ${r(shareSum * 100, 2)}%, more than 100%.`, `stream:${s.id}`);
    }
    for (const a of s.allocations) {
      if (!procById.has(a.processId) || !(a.share > 0)) continue;
      const cur = dirByProc.get(a.processId) ?? { tco2e: 0, parts: [] };
      cur.tco2e += e.tco2e * a.share;
      cur.parts.push(`${s.name} ${fmt(e.tco2e)} x ${r(a.share * 100, 2)}%`);
      dirByProc.set(a.processId, cur);
    }
    biogenic += e.biogenic; energyTJ += e.energyTJ;
    return { id: s.id, name: s.name, tco2e: e.tco2e, energyTJ: e.energyTJ, biogenicTco2e: e.biogenic, formula: e.formula };
  });

  // Order processes so own precursors are computed before the processes that use them.
  const order: Process[] = [];
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (p: Process, path: string[]): void => {
    const s = state.get(p.id);
    if (s === 2) return;
    if (s === 1) { add('error', 'cycle', `Precursor loop: ${[...path, p.name].join(' -> ')}. A process cannot use its own output through a chain.`, `process:${p.id}`); return; }
    state.set(p.id, 1);
    for (const u of p.precursors) if (u.kind === 'own' && u.fromProcessId && procById.has(u.fromProcessId)) visit(procById.get(u.fromProcessId)!, [...path, p.name]);
    state.set(p.id, 2);
    order.push(p);
  };
  w.processes.forEach((p) => visit(p, []));

  // Internal consumption of each process's output.
  const consumedBy = new Map<string, number>();
  for (const p of w.processes) for (const u of p.precursors) if (u.kind === 'own' && u.fromProcessId) consumedBy.set(u.fromProcessId, (consumedBy.get(u.fromProcessId) ?? 0) + (Number.isFinite(u.quantity) ? u.quantity : 0));

  const results = new Map<string, ProcessResult>();
  for (const p of order) {
    const trail: string[] = [];
    const activity = p.goods.reduce((a, g) => a + (Number.isFinite(g.tonnes) && g.tonnes > 0 ? g.tonnes : 0), 0);
    if (!p.goods.length) add('error', 'goods', `${p.name}: add the goods (CN codes) this process produces.`, `process:${p.id}`);
    if (p.goods.some((g) => !(g.tonnes >= 0) || !Number.isFinite(g.tonnes))) add('error', 'tonnes', `${p.name}: tonnes produced must be a number, not negative.`, `process:${p.id}`);
    if (activity <= EPS) add('error', 'activity', `${p.name}: activity level is zero, so specific embedded emissions cannot be calculated.`, `process:${p.id}`);
    const cat = GOODS_CATEGORIES.find((c) => c.name === p.category);
    if (!cat) add('error', 'category', `${p.name}: choose the aggregated goods category.`, `process:${p.id}`);
    for (const g of p.goods) {
      const c = categoryForCn(g.cn);
      if (!c) add('warning', 'cn-unknown', `${p.name}: CN ${g.cn || '(empty)'} is not on the template's CBAM goods list.`, `process:${p.id}`);
      else if (cat && c !== cat.name) add('warning', 'cn-category', `${p.name}: CN ${g.cn} belongs to "${c}", not "${cat.name}". One process should cover one aggregated goods category.`, `process:${p.id}`);
    }
    const consumed = consumedBy.get(p.id) ?? 0;
    if (consumed - activity > 1e-6) add('error', 'mass-balance', `${p.name}: other processes use ${fmt(consumed)} t of its output, more than the ${fmt(activity)} t it produced.`, `process:${p.id}`);

    // Directly attributable emissions.
    let dirEm: number;
    if (p.directOverride && Number.isFinite(p.directOverride.tco2e)) {
      dirEm = p.directOverride.tco2e;
      trail.push(`DirEm = ${fmt(dirEm)} t CO2e entered (${p.directOverride.source || 'source not stated'})`);
      if (!p.directOverride.source?.trim()) add('warning', 'override-source', `${p.name}: state the source of the directly attributable emissions entered.`, `process:${p.id}`);
      if (dirByProc.has(p.id)) add('error', 'double-count', `${p.name}: emissions are both entered as a total and split from source streams. Use one.`, `process:${p.id}`);
    } else {
      const d = dirByProc.get(p.id);
      dirEm = d?.tco2e ?? 0;
      trail.push(d ? `DirEm = ${d.parts.join(' + ')} = ${fmt(dirEm)} t CO2e` : 'DirEm = 0 (no source stream assigned)');
    }
    if (dirEm < -EPS) add('error', 'negative-dir', `${p.name}: directly attributable emissions are negative. Check the mass balance signs.`, `process:${p.id}`);

    // Indirect.
    const el = p.electricity ?? { mwh: 0, ef: null, efSource: null };
    const mwh = Number.isFinite(el.mwh) ? el.mwh : 0;
    let indirEm = 0;
    if (mwh < 0) add('error', 'elec-negative', `${p.name}: electricity cannot be negative.`, `process:${p.id}`);
    if (mwh > 0) {
      if (el.ef === null || !Number.isFinite(el.ef) || el.ef < 0) add('error', 'elec-ef', `${p.name}: electricity emission factor is needed to report SEE (indirect).`, `process:${p.id}`);
      else {
        indirEm = mwh * el.ef;
        trail.push(`AttrEm(indirect) = ${fmt(mwh)} MWh x ${el.ef} t CO2/MWh (${el.efSource ?? 'source not stated'}) = ${fmt(indirEm)} t CO2e`);
      }
      if (!el.efSource) add('warning', 'elec-source', `${p.name}: choose the source of the electricity emission factor (D.4).`, `process:${p.id}`);
      if (el.efSource === 'D.4.3.1' || el.efSource === 'D.4.3.2') add('note', 'elec-evidence', `${p.name}: an actual electricity factor needs the D.4.3 evidence (single line diagram or one PPA contract, plus hourly smart meter data).`, `process:${p.id}`);
    }

    // Precursors.
    const precs: PrecursorResult[] = [];
    let embDirPrec = 0, embIndPrec = 0, defaultEmb = 0, sefaPrec = 0, sefaKnown = true;
    for (const u of p.precursors) {
      const q = Number.isFinite(u.quantity) ? u.quantity : NaN;
      if (!(q >= 0)) { add('error', 'prec-qty', `${p.name}: precursor quantity must be a number, not negative.`, `process:${p.id}`); continue; }
      let sd = 0, si = 0, basis: PrecursorResult['basis'] = 'own', label = '', sefa: number | null = null, defShare = 0, formula = '';
      if (u.kind === 'own') {
        const src = u.fromProcessId ? results.get(u.fromProcessId) : undefined;
        if (!src) { add('error', 'prec-own', `${p.name}: choose which process produces this precursor.`, `process:${p.id}`); continue; }
        sd = src.seeDirect; si = src.seeIndirect; label = src.name; sefa = src.sefa; defShare = src.defaultShare;
        formula = `${fmt(q)} t x SEE of ${src.name} (${fmt(sd)} direct, ${fmt(si)} indirect)`;
      } else if (u.basis === 'supplier') {
        basis = 'supplier'; label = u.name || u.cn || 'Purchased precursor';
        if (!Number.isFinite(u.seeDirect as number) || (u.seeDirect as number) < 0) { add('error', 'prec-supplier', `${p.name}: ${label} needs the supplier's SEE (direct).`, `process:${p.id}`); continue; }
        sd = u.seeDirect as number; si = Number.isFinite(u.seeIndirect as number) ? (u.seeIndirect as number) : 0;
        if (!Number.isFinite(u.seeIndirect as number)) add('warning', 'prec-supplier-ind', `${p.name}: ${label} has no SEE (indirect) from the supplier; 0 is used.`, `process:${p.id}`);
        if (!u.evidence?.trim()) add('warning', 'prec-evidence', `${p.name}: ${label} supplier data should cite the supplier's verified report.`, `process:${p.id}`);
        sefa = Number.isFinite(u.sefa as number) ? (u.sefa as number) : null;
        if (sefa === null) add('warning', 'prec-sefa', `${p.name}: ${label} needs the supplier's embedded free allocation (SEFA) for the certificate estimate.`, `process:${p.id}`);
        formula = `${fmt(q)} t x supplier SEE (${fmt(sd)} direct, ${fmt(si)} indirect)`;
      } else {
        basis = 'default'; label = u.name || u.cn || 'Purchased precursor';
        const d = defaultSeeFor(u.cn || '', u.country || '');
        if (!d) { add('error', 'prec-default', `${p.name}: no default value for CN ${u.cn || '(empty)'}${u.country ? ` from ${u.country}` : ''}. Enter supplier data instead.`, `process:${p.id}`); continue; }
        const py = u.year && u.year >= 2026 ? u.year : year;
        const mk = markupFor(d.sector, py);
        sd = d.direct * (1 + mk); si = d.indirect * (1 + mk); defShare = 1;
        const bm = benchmarkForGood(u.cn || '');
        const pick = bm ? pickBenchmark(bm.colB, py, u.benchmarkRoute || d.route || undefined) : { value: null, note: 'No benchmark listed' };
        sefa = pick.value === null ? null : (CBAM_FACTOR[Math.min(Math.max(py, 2026), 2034)] ?? 0) * (CSCF_PRELIMINARY[Math.min(Math.max(py, 2026), 2034)] ?? 1) * pick.value;
        if (pick.value === null) add('warning', 'prec-bm', `${p.name}: ${label}: ${pick.note} (Column B).`, `process:${p.id}`);
        formula = `${fmt(q)} t x default (${d.source}) ${fmt(d.direct)} direct, ${fmt(d.indirect)} indirect, x (1 + ${r(mk * 100, 2)}% mark-up ${py})`;
      }
      const ed = q * sd, ei = q * si;
      embDirPrec += ed; embIndPrec += ei; defaultEmb += (ed + ei) * defShare;
      if (sefa === null) sefaKnown = false; else sefaPrec += q * sefa;
      precs.push({ id: u.id, label, quantity: q, seeDirect: sd, seeIndirect: si, embeddedDirect: ed, embeddedIndirect: ei, sefa, basis, defaultShare: defShare, formula });
      trail.push(`Precursor ${label}: ${formula} = ${fmt(ed)} + ${fmt(ei)} t CO2e`);
    }

    const embDir = dirEm + embDirPrec, embInd = indirEm + embIndPrec;
    const act = activity > EPS ? activity : NaN;
    const seeDirect = embDir / act, seeIndirect = embInd / act;
    const counted = INDIRECT_COUNTED.includes(p.sector);
    const seeCounted = seeDirect + (counted ? seeIndirect : 0);
    const totalEmb = embDir + embInd;
    const defaultShare = totalEmb > EPS ? defaultEmb / totalEmb : 0;
    const elecPrec = p.precursors.reduce((a, u) => a + (u.kind === 'own' && u.fromProcessId && results.get(u.fromProcessId) ? (Number.isFinite(u.quantity) ? u.quantity : 0) * results.get(u.fromProcessId)!.embeddedElectricityPerT : 0), 0);
    const embeddedElectricityPerT = (mwh + elecPrec) / act;
    trail.push(`SEE (direct) = (${fmt(dirEm)} + ${fmt(embDirPrec)}) / ${fmt(activity)} t = ${fmt(seeDirect, 4)} t CO2e/t`);
    trail.push(`SEE (indirect) = (${fmt(indirEm)} + ${fmt(embIndPrec)}) / ${fmt(activity)} t = ${fmt(seeIndirect, 4)} t CO2e/t${counted ? '' : ' (reported, not counted for this sector)'}`);

    // Embedded free allocation, Column A on the process's first good.
    let sfaProc: number | null = null, sefa: number | null = null;
    const firstCn = p.goods[0]?.cn;
    const bm: Benchmark | null = firstCn ? benchmarkForGood(firstCn) : null;
    if (bm) {
      const pick = pickBenchmark(bm.colA, year, p.benchmarkRoute);
      if (pick.value === null) add('warning', 'bm-route', `${p.name}: ${pick.note}.`, `process:${p.id}`);
      else {
        sfaProc = cbamF * cscf * pick.value;
        const distinct = new Set(p.goods.map((g) => { const b = benchmarkForGood(g.cn); return b ? pickBenchmark(b.colA, year, p.benchmarkRoute).value : null; }));
        if (distinct.size > 1) add('warning', 'bm-mixed', `${p.name}: its goods have different benchmarks; the first good's is used for the process.`, `process:${p.id}`);
        sefa = sefaKnown && Number.isFinite(act) ? sfaProc + sefaPrec / act : null;
        trail.push(`SFAProc = CBAM factor ${cbamF} x CSCF ${cscf} x BM ${pick.value} (Column A, ${pick.note || 'single value'}) = ${fmt(sfaProc, 4)}`);
        if (sefa !== null) trail.push(`SEFA = ${fmt(sfaProc, 4)} + ${fmt(sefaPrec)} / ${fmt(activity)} t = ${fmt(sefa, 4)} t CO2e/t`);
        else add('warning', 'sefa-missing', `${p.name}: free allocation of a precursor is unknown, so SEFA is not calculated.`, `process:${p.id}`);
      }
    } else if (firstCn) add('warning', 'bm-none', `${p.name}: no single CBAM benchmark for CN ${firstCn}. Use the 8-digit CN code.`, `process:${p.id}`);

    results.set(p.id, {
      id: p.id, name: p.name, sector: p.sector, category: p.category,
      activity, consumedInternally: consumed, forMarket: Math.max(0, activity - consumed),
      dirEm, indirEm, electricityMwh: mwh, precursors: precs,
      embeddedDirect: embDir, embeddedIndirect: embInd, seeDirect, seeIndirect, indirectCounted: counted, seeCounted,
      embeddedElectricityPerT, defaultShare, sfaProc, sefa, trail,
    });
  }

  const price = priceFor(year);
  const goods: GoodResult[] = [];
  for (const p of w.processes) {
    const pr = results.get(p.id);
    if (!pr) continue;
    for (const g of p.goods) {
      const d = defaultSeeFor(g.cn, w.installation.country);
      const mk = d ? markupFor(d.sector, year) : 0;
      const defaultSee = d ? (pr.indirectCounted ? d.total : d.direct) * (1 + mk) : null;
      const cp = p.carbonPrice && Number.isFinite(p.carbonPrice.eurPerTonne) ? p.carbonPrice.eurPerTonne : 0;
      const certs = pr.sefa === null || !Number.isFinite(pr.seeCounted) ? null : Math.max(0, g.tonnes * (pr.seeCounted - pr.sefa) - (cp * g.tonnes) / price.eur);
      const bmB = benchmarkForGood(g.cn);
      const sefaB = bmB ? pickBenchmark(bmB.colB, year, p.benchmarkRoute || d?.route || undefined).value : null;
      const certsDef = defaultSee === null || sefaB === null ? null : Math.max(0, g.tonnes * (defaultSee - cbamF * cscf * sefaB));
      goods.push({
        processId: p.id, goodId: g.id, cn: g.cn, name: g.name, category: pr.category, tonnes: g.tonnes,
        seeDirect: pr.seeDirect, seeIndirect: pr.seeIndirect, seeTotal: pr.seeDirect + pr.seeIndirect, seeCounted: pr.seeCounted, indirectCounted: pr.indirectCounted,
        defaultSee, defaultSource: d?.source ?? null, markup: mk,
        sefa: pr.sefa, certificates: certs, certificatesAtDefault: certsDef,
        priceEur: price.eur, pricePeriod: price.period,
        costEur: certs === null ? null : certs * price.eur, costAtDefaultEur: certsDef === null ? null : certsDef * price.eur,
      });
    }
  }

  const direct = streams.reduce((a, s) => a + s.tco2e, 0) + w.processes.reduce((a, p) => a + (p.directOverride && Number.isFinite(p.directOverride.tco2e) ? p.directOverride.tco2e : 0), 0);
  const indirect = [...results.values()].reduce((a, p) => a + p.indirEm, 0);
  if (!w.processes.length) add('error', 'no-process', 'Add at least one production process.', 'processes');
  if (!w.verification.internal.signedHash) add('note', 'unverified', 'Not verified yet. Actual values can replace default values only once verified.', 'verify');

  return {
    year, streams, processes: w.processes.map((p) => results.get(p.id)).filter(Boolean) as ProcessResult[], goods,
    totals: { direct, indirect, total: direct + indirect, biogenic, energyTJ, unallocated },
    issues,
  };
}

/** Stable JSON (sorted keys) so the same workbook always hashes the same. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash of the report content: the workbook without its log and sign-off fields. */
export function reportHash(w: Workbook): Promise<string> {
  const { log: _log, updatedAt: _u, ...rest } = w;
  const verification = { ...rest.verification, internal: { ...rest.verification.internal, signedHash: undefined } };
  return sha256Hex(canonicalJson({ ...rest, verification }));
}

export const isFrozen = (w: Workbook) => Boolean(w.verification.internal.signedHash);
export type { PrecursorUse };
