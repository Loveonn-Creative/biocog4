import { describe, expect, test } from 'bun:test';
import { listPrice, orderPrice, REGULAR_PRICING_STARTS_AT, regularPricingInForce } from '../supabase/functions/_shared/planPricing';
import { offerEndsLabel, timeLeft, yearlyOffer } from '../src/lib/leadMagnets/launchOffer';
import { tierPricesAt } from '../src/lib/pricing/pricingMath';

const BEFORE = new Date('2026-12-31T18:29:59Z'); // 31 Dec, 23:59:59 IST
const AFTER = new Date('2026-12-31T18:30:00Z');  // 1 Jan, 00:00 IST

describe('launch pricing ends 31 December 2026 (IST)', () => {
  test('one date drives checkout, pages and the countdown', () => {
    expect(REGULAR_PRICING_STARTS_AT).toBe('2027-01-01T00:00:00+05:30');
    expect(offerEndsLabel()).toBe('31 December');
    expect(regularPricingInForce(BEFORE)).toBe(false);
    expect(regularPricingInForce(AFTER)).toBe(true);
  });

  test('checkout charges launch until the deadline, regular from it', () => {
    expect(orderPrice('basic', 'yearly', [], BEFORE).paise).toBe(598800);
    expect(orderPrice('basic', 'yearly', [], AFTER).paise).toBe(1497000);
    expect(listPrice('pro', 'yearly', BEFORE)).toBe(5998800);
    expect(listPrice('pro', 'yearly', AFTER)).toBe(14997000);
  });

  test('the pricing page never quotes less than checkout charges', () => {
    for (const [now, k] of [[BEFORE, 1], [AFTER, 2.5]] as const) {
      const p = tierPricesAt(now);
      expect(Math.round(p.essential.yearly * 12 * 100)).toBe(listPrice('basic', 'yearly', now));
      expect(Math.round(p.pro.yearly * 12 * 100)).toBe(listPrice('pro', 'yearly', now));
      expect(Math.round(p.essential.monthly * 100)).toBe(listPrice('basic', 'monthly', now));
      expect(p.pro.monthly).toBe(9999 * k);
    }
  });

  test('struck price on ad pages is the real regular price', () => {
    expect(yearlyOffer('basic')).toEqual({ launch: 5988, regular: 14970, perMonth: 499, save: 8982, percentOff: 60 });
    expect(yearlyOffer('pro')).toEqual({ launch: 59988, regular: 149970, perMonth: 4999, save: 89982, percentOff: 60 });
  });

  test('countdown ends exactly at the deadline and turns final in the last week', () => {
    const t = timeLeft(new Date('2026-12-30T18:30:00Z')); // one day left
    expect(t).toMatchObject({ over: false, days: 1, hours: 0, mins: 0, secs: 0, finalWeek: true });
    expect(timeLeft(new Date('2026-11-01T00:00:00Z')).finalWeek).toBe(false);
    expect(timeLeft(AFTER).over).toBe(true);
    expect(timeLeft(BEFORE).secs).toBe(1);
  });
});
