import { describe, expect, test } from 'bun:test';
import { supplierEvidencePlan, planSummary, SUPPLIER_REQUEST } from '../src/lib/leadMagnets/supplierEvidence';
import { estimateAnnual, replyText, ASKER, estimateBand } from '../src/lib/leadMagnets/msmeCarbonReply';
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '../src/lib/factors';

describe('supplier evidence plan', () => {
  test('counts, pace and coverage are plain arithmetic', () => {
    const p = supplierEvidencePlan({ suppliers: 120, withData: 18, months: 6, pressure: 'assurance' });
    expect(p).toMatchObject({ missing: 102, perMonth: 17, coveragePct: 15 });
    expect(p.waves.reduce((s, w) => s + w.suppliers, 0)).toBe(102);
    expect(p.waves.map(w => w.byMonth)).toEqual([2, 4, 6]);
  });
  test('inputs are clamped; withData never exceeds suppliers', () => {
    const p = supplierEvidencePlan({ suppliers: 10, withData: 50, months: 0, pressure: 'board' });
    expect(p).toMatchObject({ suppliers: 10, withData: 10, missing: 0, months: 1, perMonth: 0, coveragePct: 100 });
  });
  test('picture never exceeds 60 dots and states its scale', () => {
    const p = supplierEvidencePlan({ suppliers: 900, withData: 300, months: 12, pressure: 'customer' });
    expect(p.perDot).toBe(15);
    expect(p.dots.evidence + p.dots.estimate).toBeLessThanOrEqual(60);
    expect(p.dots.evidence).toBe(20);
  });
  test('each pressure has three reviewer questions; summary has no personal data', () => {
    for (const k of ['assurance', 'customer', 'cbam', 'board'] as const) expect(supplierEvidencePlan({ suppliers: 5, withData: 1, months: 3, pressure: k }).questions).toHaveLength(3);
    const s = planSummary(supplierEvidencePlan({ suppliers: 120, withData: 18, months: 6, pressure: 'assurance' }), 'assurance');
    expect(s).toContain('102 to bring on in 6 months: about 17 a month');
  });
  test('supplier request asks for documents, not a questionnaire', () => {
    expect(SUPPLIER_REQUEST).toMatch(/Instead of a questionnaire/);
  });
});

describe('MSME estimate and reply', () => {
  test('uses the pipeline factors exactly', () => {
    const e = estimateAnnual({ kwhPerMonth: 2000, dieselLitresPerMonth: 100 })!;
    const kg = 2000 * 12 * INDIA_GRID_FACTOR_KG_PER_KWH + 100 * 12 * FUEL_FACTORS.DIESEL.value;
    expect(e.totalTonnes).toBe(Math.round(kg / 100) / 10);
    expect(e.electricityPct).toBe(Math.round((100 * 2000 * 12 * INDIA_GRID_FACTOR_KG_PER_KWH) / kg));
  });
  test('nothing typed gives no number', () => {
    expect(estimateAnnual({ kwhPerMonth: 0, dieselLitresPerMonth: 0 })).toBeNull();
    expect(estimateAnnual({ kwhPerMonth: -5, dieselLitresPerMonth: NaN })).toBeNull();
  });
  test('reply calls it an estimate and names the recipient', () => {
    const e = estimateAnnual({ kwhPerMonth: 2000, dieselLitresPerMonth: 0 })!;
    const r = replyText('bank', e);
    expect(r).toContain('estimated');
    expect(r).toContain('our bank');
    expect(r).not.toMatch(/verified emissions/i);
  });
  test('every asker has a reason and a checklist', () => {
    for (const a of Object.values(ASKER)) { expect(a.why.length).toBeGreaterThan(40); expect(a.needs.length).toBeGreaterThan(1); }
    expect(estimateBand(17)).toBe('10-100t');
  });
});
