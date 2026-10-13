import { describe, expect, test } from 'bun:test';
import {
  FRAMEWORKS, EMPTY_AVAILABILITY, assessFramework, availabilityFromRecords, determineApplicableFrameworks,
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
    expect(iso.satisfied).toEqual(['5.2 Indirect from energy', '6.4 Quantification methodology']);
    expect(iso.missing).toContain('5.2 Direct GHG emissions');
    const investor = assess('INVESTOR_VIEW', a);
    expect(investor.satisfied).toContain('Absolute emissions');
    expect(investor.satisfied).toContain('Data quality and assurance');
    // A total exists, but no reason may claim Scope 1 is missing for it.
    expect(iso.dataGaps.find(g => g.reference === '6.4 Quantification methodology')).toBeUndefined();
  });

  test('combined disclosures need every scope they combine', () => {
    const s12 = only({ scope1: true, scope2: true });
    expect(assess('CSRD_ESRS', s12).satisfied).not.toContain('ESRS_E1-6');
    expect(assess('CSRD_ESRS', only({ scope1: true, scope2: true, scope3: true })).satisfied).toContain('ESRS_E1-6');
    expect(assess('SBTI', only({ scope2: true })).satisfied).not.toContain('Scope1+2');
    expect(assess('SBTI', s12).satisfied).toContain('Scope1+2');
    const gap = assess('CSRD_ESRS', s12).dataGaps.find(g => g.reference === 'ESRS_E1-6');
    expect(gap?.reason).toContain('value-chain');
  });

  test('CPCB pollutant norms are never satisfied by greenhouse gas records', () => {
    const all = only({ scope1: true, scope2: true, scope3: true, energy: true, intensity: true, targets: true, productLevel: true });
    const cpcb = assess('INDIA_CPCB', all);
    expect(cpcb.satisfied).toEqual(['EnergyAudit']);
    expect(cpcb.notApplicable.map(n => n.reference)).toEqual(['EmissionNorms']);
    expect(cpcb.coverage).toBe('partial');
  });

  test('entity-authored narratives stay not applicable, never data gaps', () => {
    const brsr = assess('INDIA_BRSR', only({ scope1: true }));
    expect(brsr.notApplicable.map(n => n.reference).sort()).toEqual(['Section_A', 'Section_B']);
    expect(brsr.satisfied).toEqual(['Section_C_P6']);
  });

  test('product-level frameworks need HSN/CN coded evidence', () => {
    const noHsn = assess('CBAM', only({ scope1: true, scope2: true }));
    expect(noHsn.missing).toEqual(['EmbeddedEmissions']);
    expect(assess('CBAM', only({ scope1: true, scope2: true, productLevel: true })).coverage).toBe('covered');
  });

  test('applicable list is unchanged for the default Indian MSME profile', () => {
    expect(determineApplicableFrameworks({ country: 'IN', size: 'small', seekingFinance: true })).toEqual([
      'SENSEIBLE_SUMMARY', 'GHG_PROTOCOL', 'ISO_14064', 'INDIA_CPCB', 'GOVERNMENT_VIEW',
      'GRI_305', 'ISSB_S2', 'CDP', 'SASB', 'LENDER_VIEW', 'INVESTOR_VIEW',
    ]);
  });
});
