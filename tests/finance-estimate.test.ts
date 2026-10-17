import { describe, expect, test } from 'bun:test';
import {
  applicantEstimate, emi, reviewSummary, validateApplication, ESTIMATE_LABEL,
  type DocFigures,
} from '../supabase/functions/_shared/financeApplication';

const base = {
  kind: 'green_loan', businessName: 'Green Weaves Pvt Ltd', gstin: '27AAPFU0939F1ZV', sector: 'textiles', location: 'India',
  purpose: 'rooftop_solar', amountInr: 2500000, tenureMonths: 60, annualTurnoverInr: 40000000, netProfitInr: 1000000,
  depreciationInr: 200000, existingMonthlyEmiInr: 50000, quotedAnnualRatePct: 10, consent: true,
};
const app = (over: Record<string, unknown> = {}) => {
  const r = validateApplication({ ...base, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
};
const itr = (profit: number): DocFigures => ({ document_kind: 'itr', financial_year: '2025-26', net_profit_inr: profit, gross_turnover_inr: 39000000 });

describe('applicant Estimate', () => {
  test('range is 2 to 3 times the lower of entered and document profit', () => {
    const e = applicantEstimate(app(), [itr(900000)], { verifiedInvoices: 4 });
    expect(e.rangeInr).toEqual([1800000, 2700000]);
    expect(e.position).toBe('within');
    expect(e.usedDocuments).toBe(true);
    expect(e.label).toBe(ESTIMATE_LABEL);
  });

  test('instalment and coverage match the internal review exactly', () => {
    const a = app();
    const figs = [itr(900000)];
    const e = applicantEstimate(a, figs);
    const s = reviewSummary(a, figs, { priority: false });
    expect(e.monthlyInstalmentInr).toBe(Math.round(emi(2500000, 10, 60)));
    expect(e.monthlyInstalmentInr).toBe(Math.round(s.proposedEmi!));
    expect(e.coverage).toBe(s.coverageRange![0]);
    expect(e.requestShareOfTurnoverPct).toBe(6.3); // 25 lakh of 4 crore
  });

  test('no profit or a loss: no size, and a warning instead of a guess', () => {
    const none = applicantEstimate(app({ netProfitInr: null }), []);
    expect(none.rangeInr).toBeNull();
    expect(none.position).toBeNull();
    expect(none.warnings.join(' ')).toMatch(/Net profit was not entered/);
    const loss = applicantEstimate(app({ netProfitInr: -200000 }), []);
    expect(loss.rangeInr).toBeNull();
    expect(loss.warnings.join(' ')).toMatch(/loss/);
  });

  test('no quoted rate: no instalment or coverage, never a default rate', () => {
    const e = applicantEstimate(app({ quotedAnnualRatePct: null }), [itr(900000)]);
    expect(e.monthlyInstalmentInr).toBeNull();
    expect(e.coverage).toBeNull();
    expect(e.warnings.join(' ')).toMatch(/No interest rate/);
  });

  test('flags a gap between entered and document profit, and unread documents', () => {
    const gap = applicantEstimate(app({ netProfitInr: 2000000 }), [itr(900000)]);
    expect(gap.warnings.join(' ')).toMatch(/differs from your documents/);
    expect(gap.rangeInr).toEqual([1800000, 2700000]);
    const unread = applicantEstimate(app(), []);
    expect(unread.usedDocuments).toBe(false);
    expect(unread.warnings.join(' ')).toMatch(/could not be read/);
  });

  test('missing carbon baseline is a warning, not a change to the size', () => {
    const a = applicantEstimate(app(), [itr(900000)], { verifiedInvoices: 0 });
    const b = applicantEstimate(app(), [itr(900000)], { verifiedInvoices: 5 });
    expect(a.rangeInr).toEqual(b.rangeInr);
    expect(a.warnings.join(' ')).toMatch(/carbon baseline/);
  });

  test('never returns raw document figures or approval language', () => {
    const e = applicantEstimate(app(), [{ ...itr(912345), gross_turnover_inr: 38765432, average_monthly_balance_inr: 4567891 }]);
    const out = JSON.stringify(e);
    expect(out).not.toContain('912345');
    expect(out).not.toContain('38765432');
    expect(out).not.toContain('4567891');
    expect(out).not.toMatch(/approved|guarantee|sanction|eligible\b|simulation/i);
    expect(out).toMatch(/Estimate/);
  });

  test('same inputs give the same Estimate wherever it is shown', () => {
    expect(applicantEstimate(app(), [itr(900000)], { verifiedInvoices: 2 })).toEqual(applicantEstimate(app(), [itr(900000)], { verifiedInvoices: 2 }));
  });
});

describe('document year', () => {
  test('uses the latest year, as the internal review does', () => {
    const older: DocFigures = { document_kind: 'itr', financial_year: '2024-25', net_profit_inr: 700000 };
    const newer: DocFigures = { document_kind: 'itr', financial_year: '2025-26', net_profit_inr: 950000 };
    const e = applicantEstimate(app(), [older, newer]);
    expect(e.rangeInr).toEqual([1900000, 2850000]);
  });
});
