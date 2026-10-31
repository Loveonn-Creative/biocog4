import { describe, expect, test } from 'bun:test';
import { mathToText, parseMath } from '../src/lib/mathMarkup';
import { printedNumber, roundingCheck, sharedFactorUncertainty } from '../src/lib/whitePaperMath';
import { WP_NUMBERS, WP_SECTIONS, resolveRefs, type WPBlock } from '../src/data/whitePaper';
import { whitePaperBlocks, wpText } from '../src/lib/seo/whitePaperBlocks';
import { STATIC_PAGE_META } from '../src/lib/seo/seoMeta';
import { STATIC_CONTENT } from '../src/lib/seo/staticContent';
import { FUEL_FACTORS } from '../supabase/functions/_shared/emissionFactors';
import { evidenceGaps, validateEmission, type EmissionRecord } from '../supabase/functions/_shared/verifyGate';
import { MAX_PDF_PAGES } from '../supabase/functions/_shared/pdfPages';
import { PROJECTION_MIN_MONTHS, projectTrend } from '../supabase/functions/_shared/intelligence';

const allBlocks = (): WPBlock[] => WP_SECTIONS.flatMap((s) => s.blocks);
const allText = (): string => JSON.stringify(WP_SECTIONS);

describe('equation markup', () => {
  test('parses sub, sup, frac, sqrt and bar', () => {
    const n = parseMath('EF_{CO₂} = CC × OF × \\frac{44}{12}');
    expect(n.some((x) => x.t === 'sub')).toBe(true);
    expect(n.some((x) => x.t === 'frac')).toBe(true);
    expect(mathToText('u_{E} = \\sqrt{u_{A}^{2} + u_{EF}^{2}}')).toBe('uE = √(uA² + uEF²)');
    expect(mathToText('T = E_{1} + E_{2}')).toBe('T = E₁ + E₂');
    expect(mathToText('\\frac{a + b}{c}')).toBe('(a + b) / c');
    expect(mathToText('\\bar{y}')).toBe('y\u0304');
  });
  test('literal braces stay text', () => {
    expect(mathToText('h ∈ {0,1}^{256}')).toBe('h ∈ {0,1}²⁵⁶');
  });
  test('unclosed groups throw rather than render wrong', () => {
    expect(() => parseMath('x_{1')).toThrow();
  });
  test('every equation in the paper parses and has a number', () => {
    for (const b of allBlocks()) {
      if (!('eq' in b)) continue;
      for (const part of b.eq) expect(() => parseMath(part)).not.toThrow();
      expect(WP_NUMBERS.eq.get(b.id)).toBeGreaterThan(0);
    }
  });
});

describe('content rules', () => {
  test('no em dashes', () => {
    expect(allText()).not.toContain('—');
    expect(JSON.stringify(whitePaperBlocks())).not.toContain('—');
  });
  test('every reference resolves and ids are unique', () => {
    const ids = allBlocks().flatMap((b) => ('eq' in b || 'figure' in b ? [b.id] : []));
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of allBlocks()) {
      for (const v of Object.values(b)) {
        const strings = typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
        for (const s of strings) expect(() => resolveRefs(s)).not.toThrow();
      }
    }
    expect(() => resolveRefs('{eq:nope}')).toThrow();
  });
  test('the original equations keep their order', () => {
    const order = ['core', 'gases', 'carbon', 'freight', 'spend', 'scope2', 'total', 'prorate', 'line-uncertainty', 'total-uncertainty', 'quality', 'argmax', 'rounding', 'hash'];
    const nums = order.map((id) => WP_NUMBERS.eq.get(id)!);
    expect([...nums].sort((a, b) => a - b)).toEqual(nums);
  });
  test('every plain-English block follows an equation, and every equation has one', () => {
    for (const s of WP_SECTIONS) {
      s.blocks.forEach((b, i) => {
        if ('eq' in b) expect('plain' in s.blocks[i + 1]).toBe(true);
        if ('plain' in b) expect('eq' in s.blocks[i - 1]).toBe(true);
      });
    }
  });
  test('confidential inboxes never appear', () => {
    expect(allText()).not.toContain('gmail.com');
  });
});

describe('the paper matches the code it describes', () => {
  test('LPG and furnace oil derivations reproduce the registry factors', () => {
    expect(Math.round(17.2 * 44 / 12 * 10) / 10).toBe(63.1);
    expect(Math.round((63_100 * 47.3) / 1e6 * 100) / 100).toBe(FUEL_FACTORS.LPG.value);
    expect(Math.round((77_400 * 40.4) / 1e6 * 0.95 * 100) / 100).toBe(FUEL_FACTORS.FURNACE_OIL.value);
    expect(FUEL_FACTORS.NAPHTHA.unit).toBe('kg');
  });

  const base: EmissionRecord = {
    id: 'x', category: 'diesel', scope: 1, co2_kg: 268, activity_data: 100, activity_unit: 'litre', emission_factor: 2.68, data_quality: null,
    documents: { vendor: 'v', invoice_number: '1', amount: 1, confidence: 95 },
  };
  test('penalty table equals validateEmission', () => {
    const lost = (r: Partial<EmissionRecord>) => 100 - validateEmission({ ...base, ...r }).confidence;
    const table = allBlocks().find((b): b is Extract<WPBlock, { table: unknown }> => 'table' in b && b.table.head[1] === 'Penalty pₖ')!;
    const penalties = table.table.rows.map((r) => Number(r[1]));
    expect(penalties).toEqual([
      lost({ activity_data: 0 }),
      lost({ activity_unit: null }),
      lost({ emission_factor: null }),
      lost({ activity_data: 1_000_001, co2_kg: 1_000_001 * 2.68 }),
      lost({ documents: { ...base.documents!, confidence: 69 } }),
    ]);
    expect(validateEmission({ ...base, category: 'electricity', activity_data: 100_000_000 }).confidence).toBe(100);
    expect(validateEmission({ ...base, activity_unit: null }).valid).toBe(true); // 85 passes
    expect(validateEmission({ ...base, activity_unit: null, emission_factor: null }).valid).toBe(false); // 75 fails
  });
  test('recompute tolerance is max(0.01, 0.1%)', () => {
    const rec = { ...base, document_id: 'd', documents: { ...base.documents!, document_hash: 'h' }, verification_notes: JSON.stringify({ factorSource: 'BIOCOG_MVR_INDIA_v1.0:DIESEL', sourceDescription: 'Diesel' }) };
    const mismatch = (co2: number) => evidenceGaps({ ...rec, co2_kg: co2 }, true).includes('quantity × factor does not match stored emissions');
    expect(mismatch(268.2)).toBe(false);
    expect(mismatch(268.3)).toBe(true);
  });
  test('long PDFs are split in 10-page parts', () => {
    expect(MAX_PDF_PAGES).toBe(10);
    expect(Math.ceil(23 / MAX_PDF_PAGES)).toBe(3);
  });
  test('projection: OLS line, 12-month sum floored at 0, ±1.28·s·√12', () => {
    expect(PROJECTION_MIN_MONTHS).toBe(4);
    const monthly = [
      { month: '2026-01', kg: 1000, records: 1 },
      { month: '2026-02', kg: 1100, records: 1 },
      { month: '2026-04', kg: 1180, records: 1 }, // March missing: spacing stays real
      { month: '2026-05', kg: 1350, records: 1 },
    ];
    const xs = [0, 1, 3, 4], ys = monthly.map((m) => m.kg);
    const mx = xs.reduce((a, b) => a + b) / 4, my = ys.reduce((a, b) => a + b) / 4;
    const b1 = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const b0 = my - b1 * mx;
    const s = Math.sqrt(xs.reduce((a, x, i) => a + (ys[i] - (b0 + b1 * x)) ** 2, 0) / 2);
    let y = 0; for (let k = 1; k <= 12; k++) y += Math.max(0, b0 + b1 * (4 + k));
    const p = projectTrend(monthly)!;
    expect(p.next12Kg).toBeCloseTo(y, 0);
    expect(p.highKg - p.next12Kg).toBeCloseTo(1.28 * s * Math.sqrt(12), 0);
    expect(p.label).toBe('Projection');
    expect(projectTrend(monthly.slice(0, 3))).toBeNull();
  });
});

describe('worked examples in the paper', () => {
  test('rounding check: the paper example passes with τ = 6.71375', () => {
    const r = roundingCheck('1,250.50', '91.25', '114,108.13')!;
    expect(r.tau).toBeCloseTo(6.71375, 10);
    expect(r.gap).toBeCloseTo(0.005, 9);
    expect(r.pass).toBe(true);
    expect(roundingCheck('1,250.50', '91.25', '114,180.13')!.pass).toBe(false);
    expect(roundingCheck('abc', '1', '1')).toBeNull();
    expect(printedNumber('1,250.50')).toEqual({ value: 1250.5, decimals: 2 });
  });
  test('uncertainty: 5% and 3% combine to about 5.8%; the shared factor is the floor', () => {
    expect(sharedFactorUncertainty(3, 5, 1)).toBeCloseTo(5.83, 2);
    expect(sharedFactorUncertainty(3, 5, 1e9)).toBeCloseTo(3, 3);
  });
  test('correlated total: 824 variance, 4.78%, independent 4.35%, 544 to 656', () => {
    const variance = 300 ** 2 * 0.06 ** 2 + 2 ** 2 * (5 ** 2 + 10 ** 2);
    expect(variance).toBeCloseTo(824, 6);
    expect(Math.sqrt(variance) / 600 * 100).toBeCloseTo(4.78, 2);
    const independent = Math.sqrt((100 * 0.06) ** 2 + (200 * 0.06) ** 2 + 4 * 125) / 600 * 100;
    expect(independent).toBeCloseTo(4.35, 2);
    expect(Math.round(600 - 1.96 * Math.sqrt(variance))).toBe(544);
    expect(Math.round(600 + 1.96 * Math.sqrt(variance))).toBe(656);
  });
  test('Scope 2 example: 8,000 location, 3,600 market; proration 40/60; freight 2,100', () => {
    expect(10_000 * 0.8).toBe(8000);
    expect((10_000 - 6000) * 0.9).toBeCloseTo(3600, 9);
    expect(12 / 30).toBeCloseTo(0.4, 9);
    expect((30_000 / 1000) * 1400 * 0.05).toBeCloseTo(2100, 9);
  });
  test('hash collision bound for a trillion files is about 4 × 10⁻⁵⁴', () => {
    const p = (1e12) ** 2 / 2 ** 257;
    expect(p).toBeGreaterThan(3e-54);
    expect(p).toBeLessThan(5e-54);
  });
});

describe('SEO wiring', () => {
  test('meta and prerendered content exist and carry the full text', () => {
    const m = STATIC_PAGE_META['/white-paper'];
    expect(m.title.length).toBeLessThanOrEqual(60);
    expect(m.description.length).toBeLessThanOrEqual(160);
    const c = STATIC_CONTENT['/white-paper'];
    expect(c.h1).toBe('Senseible White Paper');
    const text = JSON.stringify(c.blocks);
    for (const s of WP_SECTIONS) expect(text).toContain(s.title);
    expect(text).toContain('Equation (1): E = A × EF');
    expect(text).toContain('What it means.');
    expect(text).not.toMatch(/\{eq:|\$[A-Za-z\\]/);
  });
  test('inline math is written out in plain text', () => {
    expect(wpText('see $A_{p}$ and {eq:core}')).toBe('see Aₚ and (1)');
  });
});
