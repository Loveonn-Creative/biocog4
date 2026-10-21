import { describe, expect, test } from 'bun:test';
import { axisCo2, categoryLabel, formatCo2, money, nextStep, niceMax, shortDate } from '../src/lib/dashboardView';

const base = { totalRecords: 10, unverified: 0, needsDetail: 0, verifiedInvoices: 6, monthsCovered: 4 };

describe('nextStep: the one action, in order of what blocks the next', () => {
  test('no records: upload', () => {
    expect(nextStep({ ...base, totalRecords: 0 }).kind).toBe('start');
  });
  test('records missing a figure come before verification', () => {
    const s = nextStep({ ...base, unverified: 5, needsDetail: 2 });
    expect(s.kind).toBe('detail');
    expect(s.title).toBe('2 records need a missing figure');
    expect(s.cta.to).toBe('/verify');
  });
  test('unverified records: verify, singular wording', () => {
    const s = nextStep({ ...base, unverified: 1 });
    expect(s.kind).toBe('verify');
    expect(s.title).toBe('1 record is ready to verify');
  });
  test('all verified: share, with real counts', () => {
    const s = nextStep(base);
    expect(s.kind).toBe('ready');
    expect(s.detail).toBe('6 invoices across 4 months, ready to share.');
    expect(s.cta.to).toBe('/reports');
    expect(s.secondary?.to).toBe('/monetize');
  });
  test('no step text uses internal or plan words', () => {
    const all = [nextStep({ ...base, totalRecords: 0 }), nextStep({ ...base, unverified: 3, needsDetail: 1 }), nextStep({ ...base, unverified: 3 }), nextStep(base)];
    for (const s of all) expect(JSON.stringify(s)).not.toMatch(/sample|pipeline|pro user|custom build|MRV|beta|demo/i);
  });
});

describe('formatting', () => {
  test('kg below a tonne, tonnes above, en-IN grouping', () => {
    expect(formatCo2(842)).toEqual({ value: '842', unit: 'kg CO₂e' });
    expect(formatCo2(4.25)).toEqual({ value: '4.3', unit: 'kg CO₂e' });
    expect(formatCo2(2982)).toEqual({ value: '2.98', unit: 't CO₂e' });
    expect(formatCo2(45_600)).toEqual({ value: '45.6', unit: 't CO₂e' });
    expect(formatCo2(1_234_567)).toEqual({ value: '1,235', unit: 't CO₂e' });
  });
  test('unknown or negative is zero, never NaN', () => {
    expect(formatCo2(Number.NaN).value).toBe('0');
    expect(formatCo2(-5).value).toBe('0');
  });
  test('axis ceilings are round and cover the data', () => {
    expect(niceMax(0)).toBe(0);
    expect(niceMax(1700)).toBe(2000);
    expect(niceMax(2100)).toBe(2500);
    expect(niceMax(4200)).toBe(5000);
    expect(niceMax(9)).toBe(10);
    expect(axisCo2(2500)).toBe('2.5 t');
    expect(axisCo2(1250)).toBe('1.3 t');
    expect(axisCo2(500)).toBe('500 kg');
  });
  test('labels, dates and money', () => {
    expect(categoryLabel('purchased_goods')).toBe('Purchased goods');
    expect(categoryLabel('it_hardware')).toBe('IT hardware');
    expect(categoryLabel(null)).toBe('Other');
    expect(shortDate('2026-04-03')).toBe('3 Apr 2026');
    expect(shortDate('nope')).toBe('');
    expect(money(125000, 'INR')).toBe('₹1,25,000');
    expect(money(null, 'INR')).toBe('');
    expect(money(900, 'EUR')).toContain('900');
  });
});
