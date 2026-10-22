import { describe, expect, test } from 'bun:test';
import { listPrice, orderPrice, REGULAR_PRICING_STARTS_AT } from '../supabase/functions/_shared/planPricing';
import { nextBatch, yearlyOffer } from '../src/lib/leadMagnets/launchOffer';
import { launchWindowOpen } from '../src/lib/pricing/launchWindow';
import { tierPricesAt } from '../src/lib/pricing/pricingMath';

const BEFORE = new Date('2026-12-31T18:29:59Z'); // 31 Dec, 23:59:59 IST
const AFTER = new Date('2026-12-31T18:30:00Z');  // 1 Jan, 00:00 IST

describe('launch-price review date (display only)', () => {
  test('checkout is not switched: launch prices on both sides of the date', () => {
    expect(REGULAR_PRICING_STARTS_AT).toBeNull();
    for (const now of [BEFORE, AFTER]) {
      expect(orderPrice('basic', 'yearly', [], now).paise).toBe(598800);
      expect(listPrice('pro', 'yearly', now)).toBe(5998800);
      expect(tierPricesAt(now).essential.yearly).toBe(499);
    }
  });

  test('the /pricing notice runs to 31 December, IST, and then hides', () => {
    expect(launchWindowOpen(BEFORE)).toBe(true);
    expect(launchWindowOpen(AFTER)).toBe(false);
  });

  test('struck price is the same plan billed monthly; UPI total is what checkout charges', () => {
    expect(yearlyOffer('basic')).toEqual({ launch: 5988, regular: 23988, perMonth: 499, save: 18000, percentOff: 75, withGst: 7065.84 });
    expect(yearlyOffer('pro')).toEqual({ launch: 59988, regular: 119988, perMonth: 4999, save: 60000, percentOff: 50, withGst: 70785.84 });
  });
});

describe('onboarding batches every 10 days', () => {
  const at = (iso: string) => nextBatch(new Date(iso));
  test('22 Oct shows the 2 Nov batch; on 2 Nov it rolls to 12 Nov', () => {
    expect(at('2026-10-22T06:00:00Z')).toMatchObject({ label: '2 November', nextLabel: '12 November' });
    expect(at('2026-11-01T18:29:59Z').label).toBe('2 November'); // 1 Nov 23:59:59 IST
    expect(at('2026-11-01T18:30:00Z').label).toBe('12 November'); // 2 Nov 00:00 IST
    expect(at('2026-11-12T18:30:00Z').label).toBe('22 November');
    expect(at('2026-12-31T12:00:00Z').label).toBe('1 January');
  });
  test('counts down daily within the 10 days and turns final in the last two', () => {
    const b = at('2026-11-04T18:30:00Z'); // 5 Nov 00:00 IST
    expect(b.left).toMatchObject({ over: false, days: 7, hours: 0, finalDays: false });
    expect(b.left.fraction).toBeCloseTo(0.7, 5);
    expect(at('2026-11-10T18:30:00Z').left).toMatchObject({ days: 1, finalDays: true });
  });
});
