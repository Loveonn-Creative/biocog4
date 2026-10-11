import { describe, expect, test } from 'bun:test';
import { eprFinding, eprFindings, eprHeadline, massBalance, tonnesPerParticle, NEXT_STEP } from '../src/components/services/circular-economy/logic';

describe('EPR applicability', () => {
  test('producers and importers are obligated in every category', () => {
    for (const c of ['plastic', 'eee', 'battery', 'tyre', 'oil'] as const) {
      expect(eprFinding(c, ['producer']).status).toBe('applies');
      expect(eprFinding(c, ['importer']).status).toBe('applies');
    }
  });
  test('brand owners are PIBOs for plastic; other categories are a check', () => {
    expect(eprFinding('plastic', ['brand_owner']).status).toBe('applies');
    expect(eprFinding('eee', ['brand_owner']).status).toBe('check');
  });
  test('retailers of others\' brands are generally not the obligated producer', () => {
    const f = eprFinding('plastic', ['retailer']);
    expect(f.status).toBe('none');
    expect(f.note).toContain('packaging');
    expect(eprHeadline([f])).toContain('not the obligated producer');
  });
  test('headline lists the regimes that apply', () => {
    expect(eprHeadline(eprFindings(['plastic', 'battery'], ['importer']))).toBe('EPR applies to you for plastic and batteries.');
  });
  test('no numeric targets or dates in the next step', () => {
    expect(NEXT_STEP).toContain('CPCB EPR portal');
    expect(/\d/.test(NEXT_STEP)).toBe(false);
  });
  test('mass balance closes: placed = collected + leaked, virgin tops up the leak', () => {
    const m = massBalance(100, 0.3);
    expect(m.collected).toBeCloseTo(30);
    expect(m.leaked).toBeCloseTo(70);
    expect(m.recycled + m.virgin).toBeCloseTo(m.placed);
    expect(massBalance(10, 2).collected).toBe(10);
  });
  test('particle size uses 1-2-5 steps', () => {
    expect(tonnesPerParticle(86.4, 16)).toBe(10);
    expect(tonnesPerParticle(20, 24)).toBe(1);
    expect(tonnesPerParticle(0)).toBe(1);
  });
});
