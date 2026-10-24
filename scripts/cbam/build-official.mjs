#!/usr/bin/env node
// Builds src/lib/cbam/official.ts from the Commission's own CBAM files, so no
// default value or benchmark is ever typed by hand.
//
// Sources (public Commission files, copies kept in scripts/cbam/source/):
//   - Default values, definitive period, v2 of 6 Aug 2026 (Annex I and IV of
//     Implementing Regulation (EU) 2026/1740 correcting (EU) 2025/2621), sheets
//     'India' and 'Annex IV'. The file does not contain Annex II/III values
//     (indirect emissions defaults, electricity as a good).
//   - CBAM benchmarks of 6 Feb 2026 (Annex to Implementing Regulation (EU)
//     2025/2620), sheet 'Benchmarks', Column A and Column B.
// Parameters not in those files come from the documents named next to them
// below and are checked by tests/cbam-official.test.ts.
//
// Run: node scripts/cbam/build-official.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DV_FILE = 'scripts/cbam/source/cbam-default-values-v2-2026-08-06.xlsx';
const BM_FILE = 'scripts/cbam/source/cbam-benchmarks-2026-02-06.xlsx';
const OUT = 'src/lib/cbam/official.ts';

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const rows = (f, sheet) => {
  const wb = XLSX.read(fs.readFileSync(path.join(root, f)), { type: 'buffer' });
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`${f}: sheet '${sheet}' missing`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
};

export const digits = (v) => String(v ?? '').replace(/\D/g, '');
/** '1,350' -> 1.35; '-', 'N/A', '' -> null. Anything else is an error, never a guess. */
export function dvNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s === '' || s === '-' || s === 'N/A') return null;
  if (!/^\d+(,\d+)?$/.test(s)) throw new Error(`unexpected default value cell '${s}'`);
  return Number(s.replace(',', '.'));
}

const SECTOR = {
  'cement': 'cement', 'fertilisers': 'fertilisers', 'aluminium': 'aluminium', 'hydrogen': 'hydrogen',
  'iron and steel': 'iron_steel', 'iron & steel': 'iron_steel', 'electricity': 'electricity',
};
const sectorOf = (label) => SECTOR[String(label).trim().toLowerCase()] ?? null;

/** Default values sheet (country sheet or Annex IV): section rows carry the sector. */
export function parseDefaults(table, { annexIV = false } = {}) {
  const out = [];
  let sector = null;
  for (const r of table) {
    const [c0, desc] = r;
    const cn = digits(c0);
    if (!cn || !/^\d/.test(String(c0 ?? '').trim())) {
      const s = sectorOf(c0 ?? '');
      if (s) sector = s;
      continue;
    }
    if (!sector) throw new Error(`row ${c0} before any sector heading`);
    if (annexIV) {
      if (String(r[2] ?? '').trim().toLowerCase() === 'see below') continue;
      out.push({ cn, description: String(desc ?? '').trim(), sector, highest: dvNumber(r[2]), route: (r[3] && String(r[3]).trim()) || null });
      continue;
    }
    if (String(r[2] ?? '').trim().toLowerCase() === 'see below') continue; // heading row, values are on its sub-codes
    out.push({
      cn, description: String(desc ?? '').trim(), sector,
      direct: dvNumber(r[2]), indirect: dvNumber(r[3]), total: dvNumber(r[4]),
      route: (r[5] && String(r[5]).trim()) || null,
    });
  }
  return out;
}

/** Benchmarks sheet: a CN row, then continuation rows (blank CN) for further route values. */
export function parseBenchmarks(table) {
  const out = [];
  let sector = null;
  let cur = null;
  for (const r of table.slice(1)) {
    const [c0, desc, a, ar, b, br] = r;
    if (c0 !== null && c0 !== undefined && !/^\d/.test(String(c0).trim())) {
      const s = sectorOf(c0);
      if (s) sector = s;
      cur = null;
      continue;
    }
    if (c0 !== null && c0 !== undefined) {
      if (!sector) throw new Error(`benchmark ${c0} before any sector heading`);
      cur = { cn: digits(c0), description: String(desc ?? '').trim(), sector, colA: [], colB: [] };
      out.push(cur);
    } else if (!cur) {
      if (a === null && b === null) continue;
      throw new Error('benchmark continuation row without a CN row');
    }
    if (a !== null && a !== undefined) cur.colA.push({ value: Number(a), route: ar ? String(ar).trim() : null });
    if (b !== null && b !== undefined) cur.colB.push({ value: Number(b), route: br ? String(br).trim() : null });
  }
  return out;
}

function main() {
  const india = parseDefaults(rows(DV_FILE, 'India'));
  const annexIV = parseDefaults(rows(DV_FILE, 'Annex IV'), { annexIV: true });
  const benchmarks = parseBenchmarks(rows(BM_FILE, 'Benchmarks'));
  const retrieved = '2026-10-24';
  const sources = [
    { id: 'dv-v2', title: 'CBAM default values, definitive period (Annex I and IV, Implementing Regulation (EU) 2026/1740 correcting (EU) 2025/2621)', url: 'https://taxation-customs.ec.europa.eu/document/download/1c05d211-80cb-4aaa-8ef0-e08005a95d7e_en?filename=DV%20correcting%20act_final%20update_06.08.xlsx', version: 'v2, 6 August 2026', sha256: sha(DV_FILE), retrieved },
    { id: 'bm-2026', title: 'CBAM benchmarks (Annex to Implementing Regulation (EU) 2025/2620)', url: 'https://taxation-customs.ec.europa.eu/document/download/9877523c-2a02-4926-a211-aefae7cf6d0d_en?filename=CBAM%20Benchmarks_20260206.xlsx', version: '6 February 2026', sha256: sha(BM_FILE), retrieved },
    { id: 'guidance-3', title: 'Guidance No. 3: CBAM methods for the calculation of emissions embedded in goods (section 4.10 default value mark-up; section 4.1.3 indirect emissions)', url: 'https://taxation-customs.ec.europa.eu/document/download/29b9eec7-1a4b-4eb6-ab85-96a0c9e35fd0_en?filename=Guidance%20No.%203%20-%20CBAM%20methods%20for%20the%20calculation%20of%20emissions%20embedded%20in%20goods.pdf', version: '14 August 2026', sha256: '', retrieved },
    { id: 'guidance-4', title: 'Guidance No. 4: CBAM calculation of the free allocation adjustment (Table 2-1 CBAM factor and CSCF; Table 2-2 route codes; section 2.2.1.3 Column A and B)', url: 'https://taxation-customs.ec.europa.eu/document/download/3aa2c730-4f1b-4524-8f71-d9cfe4880ac7_en?filename=Guidance%20No.%204%20-%20CBAM%20calculation%20of%20the%20free%20allocation%20adjustment%20to%20the%20number%20of%20CBAM%20certificates%20to%20be%20surrendered.pdf', version: '14 August 2026', sha256: '', retrieved },
    { id: 'price', title: 'Price of CBAM certificates (quarterly, 2026)', url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en', version: 'page as retrieved', sha256: '', retrieved },
  ];
  const json = (v) => JSON.stringify(v, null, 0);
  const ts = `// GENERATED by scripts/cbam/build-official.mjs from the Commission's own files.
// Do not edit by hand: change the source file or the generator, then re-run it.
// tests/cbam-official.test.ts re-reads the source files and checks every value.
/* eslint-disable */

export type CbamSector = 'cement' | 'fertilisers' | 'iron_steel' | 'aluminium' | 'hydrogen' | 'electricity';
export interface OfficialSource { id: string; title: string; url: string; version: string; sha256: string; retrieved: string }
export const OFFICIAL_SOURCES: OfficialSource[] = ${JSON.stringify(sources, null, 2)};

export interface DefaultValue { cn: string; description: string; sector: CbamSector; direct: number | null; indirect: number | null; total: number | null; route: string | null }
/** Every India row of the default values file (heading rows marked 'see below' are skipped; '-' and 'N/A' are null). tCO2e per tonne of good, before mark-up. */
export const INDIA_DEFAULTS: DefaultValue[] = ${json(india)};

export interface AnnexIVValue { cn: string; description: string; sector: CbamSector; highest: number | null; route: string | null }
/** Annex IV: highest default value per good, used where no country value exists. tCO2e per tonne, before mark-up. */
export const ANNEX_IV_DEFAULTS: AnnexIVValue[] = ${json(annexIV)};

export interface BenchmarkEntry { value: number; route: string | null }
export interface Benchmark { cn: string; description: string; sector: CbamSector; colA: BenchmarkEntry[]; colB: BenchmarkEntry[] }
/** Every row of the CBAM benchmarks file; extra route values for one CN are grouped. tCO2e per tonne. */
export const BENCHMARKS: Benchmark[] = ${json(benchmarks)};

/** Guidance No. 4, section 2.2.1.3. */
export const BENCHMARK_COLUMN_RULE = 'Column A holds benchmarks for individual process steps and is used when actual data determine the specific embedded free allocation; Column B covers the whole production chain, precursors included, and is used where default values are used for the specific embedded emissions.';

/** Guidance No. 4, Table 2-2: what a route indicator means. */
export const ROUTE_CODES: Record<string, string> = {
  '(1)': 'Value for production years 2026-27',
  '(2)': 'Value for production years 2028-30',
  '(A)': 'Grey clinker / cement',
  '(B)': 'White clinker / cement',
  '(C)': 'Carbon steel, blast furnace / basic oxygen furnace',
  '(D)': 'Carbon steel, direct reduced iron / electric arc furnace',
  '(E)': 'Carbon steel, scrap / electric arc furnace',
  '(F)': 'Low alloy steel, blast furnace / basic oxygen furnace',
  '(G)': 'Low alloy steel, direct reduced iron / electric arc furnace',
  '(H)': 'Low alloy steel, scrap / electric arc furnace',
  '(J)': 'High alloy steel (electric arc furnace, scrap)',
  '(K)': 'Primary aluminium (electrolysis from alumina)',
  '(L)': 'Secondary aluminium (remelted scrap)',
};

/** Guidance No. 4, Table 2-1. */
export const CBAM_FACTOR: Record<number, number> = { 2026: 0.975, 2027: 0.95, 2028: 0.9, 2029: 0.775, 2030: 0.515, 2031: 0.39, 2032: 0.265, 2033: 0.14, 2034: 0 };
/** Guidance No. 4, Table 2-1: cross-sectoral correction factor, preliminary (1.0 in every year at the time of writing). */
export const CSCF_PRELIMINARY: Record<number, number> = { 2026: 1, 2027: 1, 2028: 1, 2029: 1, 2030: 1, 2031: 1, 2032: 1, 2033: 1, 2034: 1 };

/** Guidance No. 3, section 4.10: 10% in 2026, 20% in 2027, 30% from 2028. */
export const DEFAULT_MARKUP: Record<number, number> = { 2026: 0.1, 2027: 0.2, 2028: 0.3 };
/** Guidance No. 3, section 4.10: fertilisers 1% from 2026. */
export const FERTILISER_MARKUP = 0.01;

export function markupFor(sector: CbamSector, year: number): number {
  if (year < 2026) return 0;
  if (sector === 'fertilisers') return FERTILISER_MARKUP;
  if (sector === 'electricity') return 0;
  return DEFAULT_MARKUP[Math.min(year, 2028)] ?? 0.3;
}

const onlyDigits = (cn: string) => String(cn).replace(/\\D/g, '');
function lookup<T extends { cn: string }>(list: T[], cn: string): T | null {
  const q = onlyDigits(cn);
  if (!q) return null;
  const exact = list.find((e) => e.cn === q);
  if (exact) return exact;
  let best: T | null = null;
  for (const e of list) if (q.startsWith(e.cn) && (!best || e.cn.length > best.cn.length)) best = e;
  return best;
}
/** India default value for a CN code: exact match, else the longest listed code the query starts with. */
export function defaultFor(cn: string): DefaultValue | null { return lookup(INDIA_DEFAULTS, cn); }
/** Annex IV highest default value, same matching. */
export function annexIVFor(cn: string): AnnexIVValue | null { return lookup(ANNEX_IV_DEFAULTS, cn); }
/** CBAM benchmark for a CN code, same matching. */
export function benchmarkFor(cn: string): Benchmark | null { return lookup(BENCHMARKS, cn); }

/** Price of CBAM certificates page: the quarter of import sets the 2026 price. */
export const CERTIFICATE_PRICES: { period: string; eur: number }[] = [
  { period: '2026-Q1', eur: 75.36 },
  { period: '2026-Q2', eur: 75.28 },
  { period: '2026-Q3', eur: 82.32 },
];

/** Guidance No. 3, section 4.1.3: indirect emissions count only for goods in Annex I but not Annex II of the CBAM Regulation, i.e. cement and fertilisers. */
export const INDIRECT_COUNTED: CbamSector[] = ['cement', 'fertilisers'];
`;
  fs.writeFileSync(path.join(root, OUT), ts);
  console.log(`wrote ${OUT}: ${india.length} India defaults, ${annexIV.length} Annex IV, ${benchmarks.length} benchmarks`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
