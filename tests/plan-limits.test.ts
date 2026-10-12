import { describe, expect, test } from 'bun:test';
import { effectivePlanTier, invoiceScanLimit, monthStartIst, normalizePlanTier, PLAN_INVOICE_SCANS_PER_MONTH } from '../supabase/functions/_shared/planLimits';

describe('one plan allowance', () => {
  test('one figure per plan, Pro included', () => {
    expect(PLAN_INVOICE_SCANS_PER_MONTH).toEqual({ snapshot: 10, essential: 100, pro: 1000, scale: 10000 });
  });
  test('legacy and unknown tier names', () => {
    expect(normalizePlanTier('basic')).toBe('essential');
    expect(normalizePlanTier('PRO')).toBe('pro');
    expect(normalizePlanTier(null)).toBe('snapshot');
    expect(normalizePlanTier('enterprise-gold')).toBe('snapshot');
  });
  test('an expired paid plan falls back to Snapshot', () => {
    const now = new Date('2026-10-12T10:00:00Z');
    expect(effectivePlanTier('pro', '2026-10-01T00:00:00Z', now)).toBe('snapshot');
    expect(effectivePlanTier('pro', '2026-11-01T00:00:00Z', now)).toBe('pro');
    expect(effectivePlanTier('pro', null, now)).toBe('pro');
    expect(invoiceScanLimit('scale', '2026-01-01T00:00:00Z', now)).toBe(10);
  });
  test('the month starts at midnight India time', () => {
    // 1 Oct 2026 00:00 IST is 30 Sep 18:30 UTC.
    expect(monthStartIst(new Date('2026-10-12T10:00:00Z'))).toBe('2026-09-30T18:30:00.000Z');
    // 30 Sep 20:00 UTC is already 1 Oct in India.
    expect(monthStartIst(new Date('2026-09-30T20:00:00Z'))).toBe('2026-09-30T18:30:00.000Z');
    expect(monthStartIst(new Date('2026-09-30T17:00:00Z'))).toBe('2026-08-31T18:30:00.000Z');
  });
});
