import { describe, expect, test } from 'bun:test';
import { compute, canonicalJson, defaultSeeFor, pickBenchmark, reportHash, streamEmissions } from '../src/lib/cbam/suite/engine';
import { sampleWorkbook, emptyWorkbook } from '../src/lib/cbam/suite/sample';
import { CN_CATEGORIES, GOODS_CATEGORIES } from '../src/lib/cbam/suite/templateGoods';
import { IPCC_FUELS } from '../src/lib/cbam/suite/fuels';
import { materiality, reviewReadiness, MATERIALITY } from '../src/lib/cbam/suite/verify';
import { CBAM_FACTOR, markupFor, defaultFor } from '../src/lib/cbam/official';
import type { Workbook, Process } from '../src/lib/cbam/suite/types';

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

// The Commission's worked example "CBAM SEE V2.1_Example Steel 3 Screws and nuts"
// (Communication-template-examples.zip, cbam-communication-and-news page).
// Inputs from sheets B_EmInst, D_Processes, E_PurchPrec; expected SEE from Summary_Products.
function screwsExample(): Workbook {
  const w = emptyWorkbook();
  w.installation = { ...w.installation, nameEn: 'Example Screw Production Plant', country: 'US', periodStart: '2026-01-01', periodEnd: '2026-12-31', economicActivity: 'Iron & steel production', street: 'x', city: 'x', postcode: 'x' };
  w.streams = [{ id: 'ng', name: 'Natural gas', method: 'combustion', ad: 1837.5, adUnit: 't', ncv: 48, ef: 56.1, factorSource: 'example', allocations: [{ processId: 'p1', share: 3337.95 / 4948.02 }, { processId: 'p2', share: 1610.07 / 4948.02 }] }];
  const base = (id: string, name: string, cn: string, t: number, mwh: number, prec: { see: number; ind: number; q: number }): Process => ({
    id, name, category: 'Iron or steel products', sector: 'iron_steel', goods: [{ id: id + 'g', cn, name, tonnes: t }],
    precursors: [{ id: id + 'pp', kind: 'purchased', basis: 'supplier', name: 'steel', cn: '7207', quantity: prec.q, seeDirect: prec.see, seeIndirect: prec.ind, evidence: 'example' }],
    electricity: { mwh, ef: 0.833, efSource: 'D.4(b)' },
  });
  w.processes = [base('p1', 'Carbon steel screws and nuts', '73181542', 17000, 3400, { see: 1.539, ind: 0.204, q: 20000 }), base('p2', 'High alloy steel screws and nuts', '73181535', 8200, 1640, { see: 1.44, ind: 1.732, q: 10000 })];
  return w;
}

describe('CBAM suite engine', () => {
  test('reproduces the Commission screws-and-nuts example (Summary_Products)', () => {
    const res = compute(screwsExample());
    const [p1, p2] = res.processes;
    expect(res.streams[0].tco2e).toBeCloseTo(4948.02, 6); // B_EmInst row 17
    close(p1.dirEm, 3337.95, 1e-9);
    close(p1.seeDirect, 2.0069382352941174, 1e-12);
    close(p1.seeIndirect, 0.4066, 1e-12);
    close(p2.seeDirect, 1.9524475609756098, 1e-12);
    close(p2.seeIndirect, 2.2787951219512195, 1e-12);
    expect(p1.indirectCounted).toBe(false); // iron and steel: indirect reported, not counted
    close(p1.seeCounted, p1.seeDirect);
  });

  test('source stream formulas follow the template examples', () => {
    expect(streamEmissions({ id: 'a', name: 'HFO', method: 'combustion', ad: 252000, adUnit: 't', ncv: 45, ef: 73, oxidation: 1, factorSource: 'x', allocations: [] }).tco2e).toBeCloseTo(827820, 6);
    expect(streamEmissions({ id: 'b', name: 'Raw meal', method: 'process', ad: 121000, adUnit: 't', ef: 0.08794, conversion: 1, factorSource: 'x', allocations: [] }).tco2e).toBeCloseTo(10640.74, 6);
    expect(streamEmissions({ id: 'c', name: 'Steel', method: 'mass_balance', ad: -1808226, adUnit: 't', carbonContent: 0.003878, factorSource: 'x', allocations: [] }).tco2e).toBeCloseTo(-1808226 * 0.003878 * 44 / 12, 6);
    expect(streamEmissions({ id: 'd', name: 'x', method: 'combustion', ad: 10, adUnit: 't', factorSource: 'x', allocations: [] }).problem).toBeTruthy();
  });

  test('purchased precursor on India default gets the year mark-up', () => {
    const w = sampleWorkbook();
    const res = compute(w);
    const wire = res.processes.find((p) => p.id === 'p-wire')!;
    const d = defaultFor('72071114')!;
    const pr = wire.precursors[0];
    close(pr.seeDirect, (d.direct ?? d.total!) * (1 + markupFor('iron_steel', 2026)));
    expect(pr.basis).toBe('default');
    expect(wire.defaultShare).toBeGreaterThan(0);
  });

  test('indirect is counted for cement and fertilisers only', () => {
    const w = screwsExample();
    w.processes[0].sector = 'cement';
    const res = compute(w);
    close(res.processes[0].seeCounted, res.processes[0].seeDirect + res.processes[0].seeIndirect);
    expect(res.processes[1].seeCounted).toBeCloseTo(res.processes[1].seeDirect, 12);
  });

  test('own precursor chains use the producing process SEE and catch loops and over-use', () => {
    const w = screwsExample();
    w.processes[1].precursors = [{ id: 'own', kind: 'own', fromProcessId: 'p1', quantity: 1000 }];
    let res = compute(w);
    const p1 = res.processes.find((p) => p.id === 'p1')!, p2 = res.processes.find((p) => p.id === 'p2')!;
    close(p2.embeddedDirect, p2.dirEm + 1000 * p1.seeDirect);
    expect(p1.forMarket).toBe(16000);
    w.processes[0].precursors.push({ id: 'loop', kind: 'own', fromProcessId: 'p2', quantity: 1 });
    res = compute(w);
    expect(res.issues.some((i) => i.code === 'cycle')).toBe(true);
    const w2 = screwsExample();
    w2.processes[1].precursors = [{ id: 'own', kind: 'own', fromProcessId: 'p1', quantity: 99999 }];
    expect(compute(w2).issues.some((i) => i.code === 'mass-balance')).toBe(true);
  });

  test('explicit errors instead of silent fallbacks', () => {
    const w = screwsExample();
    w.streams[0].allocations = [{ processId: 'p1', share: 0.7 }, { processId: 'p2', share: 0.7 }];
    w.processes[0].electricity.ef = null;
    w.processes[1].goods[0].tonnes = 0;
    const codes = compute(w).issues.map((i) => i.code);
    expect(codes).toContain('alloc-over');
    expect(codes).toContain('elec-ef');
    expect(codes).toContain('activity');
  });

  test('SEFA uses CBAM factor x CSCF x Column A benchmark', () => {
    const res = compute(screwsExample());
    const p1 = res.processes[0];
    expect(p1.sfaProc === null || p1.sfaProc >= 0).toBe(true);
    expect(pickBenchmark([{ value: 1, route: '(1)' }, { value: 2, route: '(2)' }], 2026).value).toBe(1);
    expect(pickBenchmark([{ value: 1, route: '(1)' }, { value: 2, route: '(2)' }], 2029).value).toBe(2);
    expect(pickBenchmark([{ value: 1, route: '(C)' }, { value: 2, route: '(E)' }], 2026).value).toBeNull();
    expect(pickBenchmark([{ value: 1, route: '(C)' }, { value: 2, route: '(E)' }], 2026, '(E)').value).toBe(2);
    expect(CBAM_FACTOR[2026]).toBe(0.975);
  });

  test('defaults: India uses Annex I, other countries Annex IV', () => {
    expect(defaultSeeFor('7213', 'IN')?.source).toContain('Annex I');
    expect(defaultSeeFor('7213', 'CN')?.source ?? 'Annex IV').toContain('Annex IV');
  });

  test('randomised: SEE x activity equals embedded totals, no NaN, no negatives', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const sectors = ['cement', 'fertilisers', 'iron_steel', 'aluminium', 'hydrogen'] as const;
    for (let k = 0; k < 400; k++) {
      const w = screwsExample();
      w.streams[0].ad = 1 + rnd() * 5000;
      const a = rnd();
      w.streams[0].allocations = [{ processId: 'p1', share: a }, { processId: 'p2', share: 1 - a }];
      for (const p of w.processes) {
        p.sector = sectors[Math.floor(rnd() * sectors.length)];
        p.goods[0].tonnes = 1 + rnd() * 50000;
        p.electricity = { mwh: rnd() * 9000, ef: rnd(), efSource: 'D.4(b)' };
        p.precursors[0].quantity = rnd() * 30000;
        p.precursors[0].seeDirect = rnd() * 5;
        p.precursors[0].seeIndirect = rnd();
      }
      const res = compute(w);
      expect(res.issues.filter((i) => i.level === 'error')).toEqual([]);
      for (const p of res.processes) {
        for (const v of [p.seeDirect, p.seeIndirect, p.seeCounted, p.embeddedDirect, p.embeddedIndirect]) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
        close(p.seeDirect * p.activity, p.embeddedDirect, 1e-9);
        close(p.seeIndirect * p.activity, p.embeddedIndirect, 1e-9);
        if (['iron_steel', 'aluminium', 'hydrogen'].includes(p.sector)) close(p.seeCounted, p.seeDirect, 1e-12);
      }
      const totalDir = res.processes.reduce((s, p) => s + p.dirEm, 0);
      close(totalDir, res.streams[0].tco2e, 1e-9);
      for (const g of res.goods) if (g.certificates !== null) expect(g.certificates).toBeGreaterThanOrEqual(0);
    }
  });

  test('report hash is stable and ignores the log', async () => {
    const w = sampleWorkbook();
    const h1 = await reportHash(w);
    w.log.push({ at: 'x', action: 'viewed' });
    expect(await reportHash(w)).toBe(h1);
    w.processes[0].goods[0].tonnes += 1;
    expect(await reportHash(w)).not.toBe(h1);
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
  });

  test('internal review needs every check, a site visit decision and no material misstatement', () => {
    const w = sampleWorkbook();
    const res = compute(w);
    const rows = materiality(w.verification.internal, res.processes);
    expect(reviewReadiness(w, rows, 0).ready).toBe(false);
    const p = res.processes[0];
    w.verification.internal.misstatements = [{ id: 'm', where: p.id, description: 'x', impactTco2e: p.activity * (p.seeDirect + p.seeIndirect) * (MATERIALITY + 0.01), resolved: false, resolution: '' }];
    expect(materiality(w.verification.internal, res.processes)[0].material).toBe(true);
  });

  test('template data shape', () => {
    expect(GOODS_CATEGORIES.length).toBe(18);
    expect(CN_CATEGORIES.length).toBeGreaterThan(500);
    for (const c of CN_CATEGORIES) expect(GOODS_CATEGORIES.some((g) => g.name === c.category)).toBe(true);
    for (const f of IPCC_FUELS) { expect(f.ncvGJperT).toBeGreaterThan(0); expect(f.efTco2PerTJ).toBeGreaterThan(0); }
  });

  test('sample workbook computes without errors', () => {
    const res = compute(sampleWorkbook());
    expect(res.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(res.goods.length).toBe(2);
  });
});

import * as XLSX from 'xlsx';
import { FUEL_FACTORS } from '../supabase/functions/_shared/emissionFactors';
import { reportSheets, verifierSheets, verificationStatus, signOffDetail } from '../src/lib/cbam/suite/exports';
import { INTERNAL_LABEL } from '../src/lib/cbam/suite/verify';
import { DRAFT_STATUS, headerFromWorkbook, lineFromQuick, linesFromWorkbook, packIssues, packSheets } from '../src/lib/cbam/suite/supplierPack';
import { parseWorkbookFile } from '../src/lib/cbam/suite/storage';

describe('CBAM suite outputs', () => {
  test('platform factor method uses FUEL_FACTORS exactly and refuses a unit mismatch', () => {
    const f = FUEL_FACTORS.CNG;
    const s = { id: 's', name: 'gas', method: 'factor' as const, fuel: 'CNG', ad: 1000, adUnit: f.unit, factorSource: f.source, allocations: [] };
    expect(streamEmissions(s).tco2e).toBeCloseTo((1000 * f.value) / 1000, 9);
    expect(streamEmissions({ ...s, adUnit: f.unit === 'kg' ? 'litre' : 'kg' }).problem).toBeTruthy();
  });

  test('labels: in-house sign-off reads exactly "Verified by Senseible", never accredited', async () => {
    expect(INTERNAL_LABEL).toBe('Verified by Senseible');
    const w = sampleWorkbook();
    expect(verificationStatus(w)).toBe('Not verified');
    w.verification.internal.reviewerName = 'A Reviewer'; w.verification.internal.reviewerRole = 'Senseible verifier';
    w.verification.internal.signedHash = await reportHash(w);
    expect(verificationStatus(w)).toBe('Verified by Senseible');
    expect(signOffDetail(w)).toContain(w.verification.internal.signedHash!);
    expect(signOffDetail(w)).toContain('A Reviewer, Senseible verifier');
    w.verification.mode = 'external'; w.verification.external.company = 'Example Verifier GmbH';
    expect(verificationStatus(w)).toBe('Verified by external verifier: Example Verifier GmbH');
    const all = JSON.stringify(reportSheets(w, compute(w), 'h')).toLowerCase();
    expect(all.includes('accredited verification')).toBe(false);
  });

  test('report and verifier sheets write to xlsx and parse back with the same numbers', async () => {
    const w = sampleWorkbook();
    const r = compute(w);
    const h = await reportHash(w);
    const book = XLSX.utils.book_new();
    for (const s of [...reportSheets(w, r, h), ...verifierSheets(w, r, h)]) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31));
    const back = XLSX.read(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
    expect(back.SheetNames).toEqual(['A_InstData', 'B_EmInst', 'C_Emissions&Energy', 'D_Processes', 'E_PurchPrec', 'Summary_Products', 'Summary_Communication', 'Calculation_Trail', 'Data_Checks', 'Verifier_Pack', 'Checklist']);
    const text = JSON.stringify(XLSX.utils.sheet_to_json(back.Sheets['Summary_Products'], { header: 1 }));
    expect(text).toContain('72139110');
    expect(text).toContain(String(Number(r.goods[0].seeDirect.toFixed(6))));
    expect(JSON.stringify(XLSX.utils.sheet_to_json(back.Sheets['A_InstData'], { header: 1 }))).toContain(h);
  });

  test('workbook file round-trips', () => {
    const w = sampleWorkbook();
    expect(parseWorkbookFile(JSON.stringify({ workbook: w }))).toEqual(w);
    expect(() => parseWorkbookFile('{"a":1}')).toThrow();
    expect(() => parseWorkbookFile('not json')).toThrow();
  });

  test('supplier pack: draft unless signed, default basis uses Annex I with mark-up, no invented actuals', async () => {
    const w = sampleWorkbook();
    const r = compute(w);
    const lines = linesFromWorkbook(r);
    expect(lines.map((l) => l.seeDirect)).toEqual(r.goods.map((g) => g.seeDirect));
    expect(headerFromWorkbook(w, 'Buyer', 'h').status).toBe(DRAFT_STATUS);
    w.verification.internal.signedHash = 'abc';
    expect(headerFromWorkbook(w, 'Buyer', 'h').status).toBe('Verified by Senseible');

    const d = defaultFor('72071114')!;
    const def = lineFromQuick({ cn: '72071114', name: 'Billets', tonnes: 10, basis: 'default' }, 'IN', 2026);
    expect(def.seeDirect).toBeCloseTo((d.direct ?? d.total!) * 1.1, 9);
    const act = lineFromQuick({ cn: '72071114', name: 'Billets', tonnes: 10, basis: 'actual' }, 'IN', 2026);
    expect(act.seeDirect).toBeNull();
    expect(packIssues([act]).length).toBe(1);
    expect(packIssues([def])).toEqual([]);
    const sheet = packSheets(headerFromWorkbook(sampleWorkbook(), '', ''), lines)[0];
    expect(JSON.stringify(sheet.rows)).toContain(DRAFT_STATUS);
  });
});
