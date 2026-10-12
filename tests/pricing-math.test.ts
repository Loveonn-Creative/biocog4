import { describe, expect, test } from 'bun:test';
import { addonTotals, invoicesToSlider, MAX_SAVING_PERCENT, recommendPlan, sliderToInvoices, yearlySaving } from '../src/lib/pricing/pricingMath';

describe('pricing page arithmetic', () => {
  test('yearly savings match the figures the page has always shown', () => {
    expect(yearlySaving('essential')).toEqual({ perYear: 18000, percent: 75, billedYearly: 5988 });
    expect(yearlySaving('pro')).toEqual({ perYear: 60000, percent: 50, billedYearly: 59988 });
    expect(MAX_SAVING_PERCENT).toBe(75);
  });
  test('the meter recommends the smallest plan that covers the volume', () => {
    expect(recommendPlan(1)).toBe('snapshot');
    expect(recommendPlan(10)).toBe('snapshot');
    expect(recommendPlan(11)).toBe('essential');
    expect(recommendPlan(100)).toBe('essential');
    expect(recommendPlan(1000)).toBe('pro');
    expect(recommendPlan(1001)).toBe('scale');
    expect(recommendPlan(50000)).toBe('scale');
  });
  test('slider maps 1 to 12,000 and back', () => {
    expect(sliderToInvoices(0)).toBe(1);
    expect(sliderToInvoices(1000)).toBe(12000);
    expect(Math.abs(sliderToInvoices(invoicesToSlider(100)) - 100)).toBeLessThanOrEqual(2);
  });
  test('add-on totals split monthly and one-time, with the plan price per cycle', () => {
    const t = addonTotals('essential', 'yearly', { scans: 3, dashboard: 1, audit: 1, fasttrack: 2 });
    expect(t.planPerMonth).toBe(499);
    expect(t.monthly).toBe(3 * 49 + 999);
    expect(t.oneTime).toBe(4999 + 2 * 2999);
    expect(addonTotals('pro', 'monthly', {}).planPerMonth).toBe(9999);
    expect(addonTotals('scale', 'yearly', {}).planPerMonth).toBeNull();
    expect(addonTotals('snapshot', 'yearly', { dashboard: -2 }).monthly).toBe(0);
  });
});
