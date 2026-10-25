import { describe, expect, test } from 'bun:test';
import {
  FRAMEWORKS, EMPTY_AVAILABILITY, assessFramework, availabilityFromRecords, coveredKind, determineApplicableFrameworks,
  type DataAvailability,
} from '../src/lib/reportFrameworks';

const only = (over: Partial<DataAvailability>): DataAvailability => ({ ...EMPTY_AVAILABILITY, ...over });
const assess = (id: string, a: DataAvailability) => assessFramework(FRAMEWORKS[id], a);

describe('framework coverage follows the uploaded evidence', () => {
  test('no records: every framework is not covered, so every export stays disabled', () => {
    for (const id of Object.keys(FRAMEWORKS)) {
      expect(assess(id, EMPTY_AVAILABILITY).coverage).toBe('not_covered');
      expect(assess(id, EMPTY_AVAILABILITY).satisfied).toEqual([]);
    }
  });

  test('electricity bills only (Scope 2): totals count, Scope 1 and 3 lines stay gaps', () => {
    const a = availabilityFromRecords({ scope1Kg: 0, scope2Kg: 1200, scope3Kg: 0, hasEnergyRecords: true });
    const iso = assess('ISO_14064', a);
    expect(iso.satisfied).toEqual(['Category 2: Indirect emissions from imported energy', 'Quantification of CO2 (clause 6)']);
    expect(iso.missing).toContain('Category 1: Direct GHG emissions');
    const investor = assess('INVESTOR_VIEW', a);
    expect(investor.satisfied).toContain('Total emissions');
    expect(investor.satisfied).toContain('Document trail for every figure');
    // A total exists, but no reason may claim Scope 1 is missing for it.
    expect(iso.dataGaps.find(g => g.reference === 'Quantification of CO2 (clause 6)')).toBeUndefined();
  });

  test('combined disclosures need every scope they combine', () => {
    const s12 = only({ scope1: true, scope2: true });
    const e16 = 'E1-6 Gross Scope 1, 2, 3 and total emissions';
    expect(assess('CSRD_ESRS', s12).satisfied).not.toContain(e16);
    expect(assess('CSRD_ESRS', only({ scope1: true, scope2: true, scope3: true })).satisfied).toContain(e16);
    expect(assess('SBTI', only({ scope2: true })).satisfied).not.toContain('Scope 1 and 2 base year emissions');
    expect(assess('SBTI', s12).satisfied).toContain('Scope 1 and 2 base year emissions');
    const gap = assess('CSRD_ESRS', s12).dataGaps.find(g => g.reference === e16);
    expect(gap?.reason).toContain('value chain');
  });

  test('CPCB pollutant norms are never satisfied by greenhouse gas records', () => {
    const all = only({ scope1: true, scope2: true, scope3: true, energy: true, intensity: true, targets: true, productLevel: true });
    const cpcb = assess('INDIA_CPCB', all);
    expect(cpcb.satisfied).toEqual(['Energy and fuel records']);
    expect(cpcb.notApplicable.map(n => n.reference)).toEqual(['Emission norms (stack and ambient monitoring)']);
    expect(cpcb.coverage).toBe('partial');
  });

  test('company-written narratives stay not covered, never data gaps; Section A comes from the profile', () => {
    const brsr = assess('INDIA_BRSR', only({ scope1: true }));
    expect(brsr.notApplicable.map(n => n.reference)).toEqual(['Section B: Management and process']);
    expect(brsr.satisfied).toEqual(['Section A: General disclosures', 'Section C, Principle 6: GHG emissions']);
    // Each narrative names what it covers instead of one pasted sentence.
    const s1 = assess('ISSB_S1', only({ scope1: true }));
    expect(new Set(s1.notApplicable.map(n => n.reason)).size).toBe(3);
  });

  test('a target is stated by the company, never evidenced', () => {
    const lender = FRAMEWORKS.LENDER_VIEW;
    expect(coveredKind(lender.metricsMapping['Reduction target'])).toBe('stated');
    expect(coveredKind(lender.metricsMapping['Baseline: Scope 1'])).toBe('evidenced');
    // GRI 305-5 asks for achieved reductions, which a target does not show.
    const all = only({ scope1: true, scope2: true, scope3: true, energy: true, intensity: true, targets: true, productLevel: true });
    expect(assess('GRI_305', all).missing).toEqual(['GRI 305-5']);
  });

  test('nature disclosures are never covered by emissions records', () => {
    const all = only({ scope1: true, scope2: true, scope3: true, energy: true, intensity: true, targets: true, productLevel: true, governance: true, risks: true });
    expect(assess('TNFD', all).satisfied).toEqual([]);
  });

  test('product-level frameworks need HSN/CN coded evidence', () => {
    const noHsn = assess('CBAM', only({ scope1: true, scope2: true }));
    expect(noHsn.missing).toEqual(['Embedded emissions per good (CN code)']);
    expect(assess('CBAM', only({ scope1: true, scope2: true, productLevel: true })).coverage).toBe('covered');
  });

  test('applicable list is unchanged for the default Indian MSME profile', () => {
    expect(determineApplicableFrameworks({ country: 'IN', size: 'small', seekingFinance: true })).toEqual([
      'SENSEIBLE_SUMMARY', 'GHG_PROTOCOL', 'ISO_14064', 'INDIA_CPCB', 'GOVERNMENT_VIEW',
      'GRI_305', 'ISSB_S2', 'CDP', 'SASB', 'LENDER_VIEW', 'INVESTOR_VIEW',
    ]);
  });
});
