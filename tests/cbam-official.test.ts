import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import crypto from 'crypto';
import XLSX from 'xlsx';
import {
  INDIA_DEFAULTS, ANNEX_IV_DEFAULTS, BENCHMARKS, OFFICIAL_SOURCES, CBAM_FACTOR, DEFAULT_MARKUP, FERTILISER_MARKUP,
  markupFor, defaultFor, benchmarkFor, CERTIFICATE_PRICES, INDIRECT_COUNTED,
} from '../src/lib/cbam/official';
// @ts-expect-error plain JS module
import { parseDefaults, parseBenchmarks, dvNumber } from '../scripts/cbam/build-official.mjs';

const DV = 'scripts/cbam/source/cbam-default-values-v2-2026-08-06.xlsx';
const BM = 'scripts/cbam/source/cbam-benchmarks-2026-02-06.xlsx';
const sheet = (f: string, s: string) => XLSX.utils.sheet_to_json(XLSX.read(fs.readFileSync(f), { type: 'buffer' }).Sheets[s], { header: 1, raw: true, defval: null }) as unknown[][];
const sha = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

describe('official CBAM data matches the Commission files cell by cell', () => {
  test('source files are the recorded ones', () => {
    expect(OFFICIAL_SOURCES.find((s) => s.id === 'dv-v2')!.sha256).toBe(sha(DV));
    expect(OFFICIAL_SOURCES.find((s) => s.id === 'bm-2026')!.sha256).toBe(sha(BM));
  });

  test('every India default value equals its cell', () => {
    const raw = sheet(DV, 'India');
    const byCn = new Map(INDIA_DEFAULTS.map((d) => [d.cn, d]));
    let checked = 0;
    for (const r of raw) {
      const c0 = String(r[0] ?? '').trim();
      if (!/^\d/.test(c0) || String(r[2] ?? '').trim().toLowerCase() === 'see below') continue;
      const d = byCn.get(c0.replace(/\D/g, ''))!;
      expect(d).toBeDefined();
      expect(d.direct).toBe(dvNumber(r[2]));
      expect(d.indirect).toBe(dvNumber(r[3]));
      expect(d.total).toBe(dvNumber(r[4]));
      checked++;
    }
    expect(checked).toBe(INDIA_DEFAULTS.length);
    expect(checked).toBeGreaterThan(250);
  });

  // The Commission rounds each column on its own, so a published total can sit
  // up to 0.01 away from direct + indirect (e.g. white clinker 1.35 + 0.07 vs
  // 1.41). The published figures are used as they are; this only catches
  // a misread column.
  test('total = direct + indirect within the published rounding', () => {
    for (const d of INDIA_DEFAULTS) {
      if (d.direct !== null && d.total !== null) expect(Math.abs((d.direct + (d.indirect ?? 0)) - d.total)).toBeLessThan(0.0105);
    }
  });

  test('every Annex IV and benchmark value equals the parser output from the file', () => {
    expect(ANNEX_IV_DEFAULTS).toEqual(parseDefaults(sheet(DV, 'Annex IV'), { annexIV: true }));
    expect(BENCHMARKS).toEqual(parseBenchmarks(sheet(BM, 'Benchmarks')));
    expect(INDIA_DEFAULTS).toEqual(parseDefaults(sheet(DV, 'India')));
  });

  test('benchmark values: every numeric cell of the sheet is in the data', () => {
    const raw = sheet(BM, 'Benchmarks').slice(1);
    const a = BENCHMARKS.flatMap((b) => b.colA.map((e) => e.value));
    const b = BENCHMARKS.flatMap((x) => x.colB.map((e) => e.value));
    expect(a.length).toBe(raw.filter((r) => typeof r[2] === 'number').length);
    expect(b.length).toBe(raw.filter((r) => typeof r[4] === 'number').length);
  });
});

describe('spot checks against the published tables', () => {
  test('hot-rolled flat steel 7208: 4.28 direct, BF-BOF route', () => {
    const d = defaultFor('7208 10 00')!;
    expect(d.direct).toBe(4.28);
    expect(d.route).toBe('(C)');
  });
  test('grey clinker 1.390 / 0.050 / 1.440', () => {
    const d = defaultFor('2523 10 00 90')!;
    expect([d.direct, d.indirect, d.total]).toEqual([1.39, 0.05, 1.44]);
  });
  test('grey Portland cement 1.48 total', () => expect(defaultFor('25232900')!.total).toBe(1.48));
  test('hydrogen 14.03', () => expect(defaultFor('28041000')!.total).toBe(14.03));
  test('unwrought aluminium 1.87', () => expect(defaultFor('7601')!.direct).toBe(1.87));
  test('cement clinker benchmarks: grey 0.666, white 0.859', () => {
    expect(benchmarkFor('25231000')!.colB.map((e) => e.value)).toEqual([0.666, 0.859]);
  });
  test('unknown code returns null rather than a guess', () => expect(defaultFor('9999')).toBeNull());
});

describe('parameters from the guidance documents', () => {
  test('CBAM factor phase-out', () => {
    expect(CBAM_FACTOR[2026]).toBe(0.975);
    expect(CBAM_FACTOR[2030]).toBe(0.515);
    expect(CBAM_FACTOR[2034]).toBe(0);
  });
  test('mark-ups', () => {
    expect(DEFAULT_MARKUP).toEqual({ 2026: 0.1, 2027: 0.2, 2028: 0.3 });
    expect(FERTILISER_MARKUP).toBe(0.01);
    expect(markupFor('iron_steel', 2031)).toBe(0.3);
    expect(markupFor('fertilisers', 2027)).toBe(0.01);
  });
  test('2026 certificate prices and indirect sectors', () => {
    expect(CERTIFICATE_PRICES.map((p) => p.eur)).toEqual([75.36, 75.28, 82.32]);
    expect(INDIRECT_COUNTED).toEqual(['cement', 'fertilisers']);
  });
});
