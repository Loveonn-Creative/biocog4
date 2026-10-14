import { describe, expect, test } from 'bun:test';
import {
  cleanFigures, emi, readiness, reviewSummary, sniffType, updateWindow, validateApplication,
  type FinanceApplicationInput,
} from '../supabase/functions/_shared/financeApplication';

const base = {
  kind: 'green_loan', businessName: 'Green Weaves Pvt Ltd', gstin: '27AAPFU0939F1ZV', sector: 'textiles', location: 'India',
  purpose: 'rooftop_solar', amountInr: '25,00,000', tenureMonths: 60, annualTurnoverInr: 40000000, netProfitInr: 1000000,
  depreciationInr: 200000, existingMonthlyEmiInr: 50000, quotedAnnualRatePct: 10, consent: true,
};
const ok = (over: Record<string, unknown> = {}) => {
  const r = validateApplication({ ...base, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
};

describe('application validation', () => {
  test('accepts a complete application and reads Indian number formats', () => {
    expect(ok().amountInr).toBe(2500000);
  });
  test('refuses without active consent', () => {
    const r = validateApplication({ ...base, consent: 'yes' });
    expect(r.ok === false && r.errors.consent).toBeTruthy();
  });
  test('refuses impossible values instead of guessing', () => {
    const r = validateApplication({ ...base, amountInr: 1000, tenureMonths: 500, annualTurnoverInr: 0, gstin: 'BAD', quotedAnnualRatePct: 99 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['amountInr', 'annualTurnoverInr', 'gstin', 'quotedAnnualRatePct', 'tenureMonths']);
  });
  test('optional figures stay null when blank; a loss is allowed', () => {
    const v = ok({ netProfitInr: '', depreciationInr: null, quotedAnnualRatePct: '' });
    expect([v.netProfitInr, v.depreciationInr, v.quotedAnnualRatePct]).toEqual([null, null, null]);
    expect(ok({ netProfitInr: -200000 }).netProfitInr).toBe(-200000);
  });
});

describe('documents', () => {
  test('type comes from the bytes, not the name', () => {
    expect(sniffType(new TextEncoder().encode('%PDF-1.7 ...'))).toBe('application/pdf');
    expect(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffType(new TextEncoder().encode('MZ executable'))).toBeNull();
  });
  test('only allow-listed figures survive; personal data is dropped', () => {
    const f = cleanFigures({ document_kind: 'itr', financial_year: '2025-26', gross_turnover_inr: '4,00,00,000'.replace(/,/g, ''), pan: 'ABCDE1234F', account_number: '1234567890', name: 'Asha', net_profit_inr: 1000000.4 });
    expect(f).toEqual({ document_kind: 'itr', financial_year: '2025-26', gross_turnover_inr: 40000000, net_profit_inr: 1000000 });
  });
});

describe('what the applicant sees', () => {
  test('readiness lists facts, never a score', () => {
    const r = readiness(ok(), [{ docType: 'itr' }], { verifiedInvoices: 0 });
    expect(r.find((i) => i.id === 'itr')?.done).toBe(true);
    expect(r.find((i) => i.id === 'bank')?.done).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/eligib|approv|score/i);
  });
  test('first update window is 2 to 4 weeks after submission', () => {
    expect(updateWindow(new Date('2026-10-14T10:00:00Z'))).toEqual({ from: '2026-10-28', to: '2026-11-11' });
  });
});

describe('internal review summary (Senseible team only)', () => {
  test('EMI matches the standard level-payment formula', () => {
    expect(Math.round(emi(2500000, 10, 60))).toBe(53118);
    expect(emi(120000, 0, 12)).toBe(10000);
  });
  test('ratios, coverage range across entered and document figures, cross-checks', () => {
    const s = reviewSummary(ok() as FinanceApplicationInput, [
      { document_kind: 'itr', financial_year: '2025-26', gross_turnover_inr: 38000000, net_profit_inr: 900000 },
      { document_kind: 'bank_statement', period_to: '2026-09-30', monthly_loan_repayments_inr: 60000 },
    ], { priority: true });
    expect(s.requestToNetProfit).toBe(2.78); // 25,00,000 / lower profit 9,00,000
    expect(s.requestBand).toBe('within_2_3x');
    expect(s.requestToTurnover).toBe(0.06);
    expect(s.annualDebtServiceExisting).toBe(720000); // the higher of entered 50k and bank 60k, x12
    expect(s.proposedEmi).toBe(53117.61);
    // (900000 or 1000000) + 200000 depreciation, over 720000 + 12 x 53117.6
    expect(s.coverageRange).toEqual([0.81, 0.88]);
    expect(s.crossChecks.length).toBe(3);
    expect(s.label).toMatch(/not a credit decision/);
  });
  test('without a quoted rate, no instalment or coverage is invented', () => {
    const s = reviewSummary(ok({ quotedAnnualRatePct: '' }) as FinanceApplicationInput, [], { priority: false });
    expect(s.proposedEmi).toBeNull();
    expect(s.coverageRange).toBeNull();
    expect(s.missing.join(' ')).toMatch(/No quoted interest rate/);
  });
  test('a loss or missing profit gives no multiple, not a fake one', () => {
    expect(reviewSummary(ok({ netProfitInr: -1 }) as FinanceApplicationInput, [], { priority: false }).requestBand).toBe('no_profit_figure');
    expect(reviewSummary(ok({ netProfitInr: '' }) as FinanceApplicationInput, [], { priority: false }).requestToNetProfit).toBeNull();
  });
});
