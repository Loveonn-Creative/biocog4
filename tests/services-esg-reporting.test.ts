import { describe, expect, test } from 'bun:test';
import { frameworks, sharedTopics, summarise, FRAMEWORKS } from '../src/components/services/esg-reporting/logic';

const status = (r: ReturnType<typeof frameworks>, id: string) => r.find(f => f.id === id)!.status;

describe('esg reporting frameworks', () => {
  test('top 1,000 listed: BRSR and BRSR Core required, with the SEBI phase year', () => {
    const r = frameworks({ cap: 'top500', buyers: [], euGroup: false });
    expect(status(r, 'brsr')).toBe('required');
    expect(status(r, 'brsrCore')).toBe('required');
    expect(r.find(f => f.id === 'brsrCore')!.why).toContain('FY 2025-26');
    expect(frameworks({ cap: 'top150', buyers: [], euGroup: false }).find(f => f.id === 'brsrCore')!.why).toContain('FY 2023-24');
    expect(frameworks({ cap: 'top1000', buyers: [], euGroup: false }).find(f => f.id === 'brsrCore')!.why).toContain('FY 2026-27');
  });
  test('unlisted supplier: BRSR only when listed customers ask', () => {
    expect(status(frameworks({ cap: 'unlisted', buyers: [], euGroup: false }), 'brsr')).toBe('none');
    expect(status(frameworks({ cap: 'unlisted', buyers: ['listedIn'], euGroup: false }), 'brsr')).toBe('asked');
    expect(status(frameworks({ cap: 'beyond', buyers: [], euGroup: false }), 'brsrCore')).toBe('none');
  });
  test('CBAM and CSRD follow buyers and EU group size', () => {
    const r = frameworks({ cap: 'unlisted', buyers: ['eu', 'cbam'], euGroup: false });
    expect(status(r, 'cbam')).toBe('asked');
    expect(status(r, 'csrd')).toBe('asked');
    expect(status(frameworks({ cap: 'unlisted', buyers: [], euGroup: true }), 'csrd')).toBe('required');
    expect(status(frameworks({ cap: 'unlisted', buyers: [], euGroup: false }), 'csrd')).toBe('none');
  });
  test('ISSB is never required (India adoption not asserted)', () => {
    for (const cap of ['top150', 'beyond', 'unlisted'] as const)
      for (const euGroup of [true, false])
        expect(status(frameworks({ cap, buyers: ['investors', 'eu'], euGroup }), 'issb')).not.toBe('required');
    expect(status(frameworks({ cap: 'unlisted', buyers: ['investors'], euGroup: false }), 'issb')).toBe('asked');
  });
  test('GRI is always optional; TCFD and SASB only with investors', () => {
    const r = frameworks({ cap: 'unlisted', buyers: [], euGroup: false });
    expect(status(r, 'gri')).toBe('optional');
    expect(status(r, 'tcfd')).toBe('none');
    expect(status(frameworks({ cap: 'unlisted', buyers: ['investors'], euGroup: false }), 'tcfd')).toBe('optional');
  });
  test('Scope 1 and 2 is shared by every pair', () => {
    for (const a of FRAMEWORKS) for (const b of FRAMEWORKS) expect(sharedTopics(a, b)).toBeGreaterThanOrEqual(1);
  });
  test('headline counts', () => {
    const s = summarise(frameworks({ cap: 'top1000', buyers: ['eu', 'cbam'], euGroup: false }));
    expect(s.headline).toBe('2 frameworks required and 2 asked by your buyers: BRSR, BRSR Core, CBAM, CSRD / ESRS.');
    expect(summarise(frameworks({ cap: 'unlisted', buyers: [], euGroup: false })).headline).toContain('No framework is required');
  });
});
