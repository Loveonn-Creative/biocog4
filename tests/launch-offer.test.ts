import { describe, expect, test } from 'bun:test';
import { listPrice, orderPrice, REGULAR_PRICING_STARTS_AT } from '../supabase/functions/_shared/planPricing';
import { offerEndsLabel, timeLeft, yearlyOffer } from '../src/lib/leadMagnets/launchOffer';
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

  test('the notice and countdown run to 31 December, IST, and then hide', () => {
    expect(offerEndsLabel()).toBe('31 December');
    expect(launchWindowOpen(BEFORE)).toBe(true);
    expect(launchWindowOpen(AFTER)).toBe(false);
    expect(timeLeft(AFTER).over).toBe(true);
    expect(timeLeft(BEFORE).secs).toBe(1);
    expect(timeLeft(new Date('2026-12-30T18:30:00Z'))).toMatchObject({ over: false, days: 1, hours: 0, finalWeek: true });
    expect(timeLeft(new Date('2026-11-01T00:00:00Z')).finalWeek).toBe(false);
  });

  test('struck price is the same plan billed monthly; UPI total is what checkout charges', () => {
    expect(yearlyOffer('basic')).toEqual({ launch: 5988, regular: 23988, perMonth: 499, save: 18000, percentOff: 75, upiTotal: 7065.84 });
    expect(yearlyOffer('pro')).toEqual({ launch: 59988, regular: 119988, perMonth: 4999, save: 60000, percentOff: 50, upiTotal: 70785.84 });
  });
});
