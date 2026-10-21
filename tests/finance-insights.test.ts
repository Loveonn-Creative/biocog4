import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { cleanMonthly, energyCosts, moduleAccess, monthsCsv, monthsFrom, readiness, MONTHLY_PROMPT, type InsightRecord } from '../supabase/functions/_shared/financeInsights';

describe('monthly totals from a bank statement', () => {
  test('keeps totals, checks balances, keeps the split only when it adds up', () => {
    const rows = cleanMonthly({ months: [
      { month: '2026-05', inflow_inr: 500000, outflow_inr: 400000, opening_balance_inr: 100000, closing_balance_inr: 200000,
        outflow_by_category_inr: { electricity: 50000, fuel: 30000, other: 320000 } },
      { month: '2026-04', inflow_inr: 300000, outflow_inr: 250000, opening_balance_inr: 10000, closing_balance_inr: 99999,
        outflow_by_category_inr: { electricity: 10000, other: 100000 } },
    ] });
    expect(rows.map((r) => r.month)).toEqual(['2026-04', '2026-05']);
    const may = rows[1], apr = rows[0];
    expect(may.categories).toEqual({ electricity: 50000, fuel: 30000, other: 320000 });
    expect(may.balanced).toBe(true);
    expect(apr.categories).toBeNull(); // 110000 is not 250000: no split, totals kept
    expect(apr.outflow).toBe(250000);
    expect(apr.balanced).toBe(false); // printed balance does not add up: shown, flagged
  });
  test('drops bad months, unknown keys, negatives and anything that is not a number', () => {
    const rows = cleanMonthly({ months: [
      { month: '26-05', inflow_inr: 1 },
      { month: '2026-13', inflow_inr: 1 },
      { month: '2026-06', inflow_inr: -5, outflow_inr: 'abc', opening_balance_inr: null, closing_balance_inr: null },
      { month: '2026-07', inflow_inr: 1000, outflow_inr: 800, payee: 'ACME', narration: 'NEFT 123', outflow_by_category_inr: { casino: 800 } },
      { month: '2026-07', inflow_inr: 9 },
    ] });
    expect(rows.length).toBe(1);
    expect(rows[0]).toEqual({ month: '2026-07', inflow: 1000, outflow: 800, opening: null, closing: null, categories: null, balanced: null });
    expect(JSON.stringify(rows)).not.toMatch(/ACME|NEFT|payee|narration/);
  });
  test('the reader is told to return totals only, never narrations or account details', () => {
    expect(MONTHLY_PROMPT).toMatch(/Do NOT return any narration, name, payee, account number, IFSC/);
    expect(MONTHLY_PROMPT).toMatch(/never estimate/);
  });
  test('garbage in gives nothing, never a throw', () => {
    expect(cleanMonthly(null)).toEqual([]);
    expect(cleanMonthly('x')).toEqual([]);
    expect(cleanMonthly({ months: 'x' })).toEqual([]);
  });
});

describe('what each plan sees', () => {
  test('Snapshot locked, Essential cash flow only, Pro read-only, Scale full', () => {
    expect(moduleAccess('snapshot')).toEqual({ cashflow: 'locked', readiness: 'locked', energy: 'locked' });
    expect(moduleAccess('essential')).toEqual({ cashflow: 'basic', readiness: 'locked', energy: 'locked' });
    expect(moduleAccess('pro')).toEqual({ cashflow: 'read', readiness: 'read', energy: 'read' });
    expect(moduleAccess('scale')).toEqual({ cashflow: 'full', readiness: 'full', energy: 'full' });
  });
});

const bank = (id: string, at: string, monthly: InsightRecord['monthly'], figures = {}): InsightRecord => ({ id, kind: 'bank_statement', created_at: at, monthly, figures });

describe('readiness and costs use only what is on record', () => {
  const now = new Date('2026-10-21T00:00:00Z');
  test('a month on two statements is counted once, from the newer upload', () => {
    const m = monthsFrom([
      bank('a', '2026-09-01', [{ month: '2026-08', inflow: 1, outflow: 1, opening: null, closing: null }]),
      bank('b', '2026-10-01', [{ month: '2026-08', inflow: 2, outflow: 2, opening: null, closing: null }]),
    ]);
    expect(m.length).toBe(1);
    expect(m[0].inflow).toBe(2);
  });
  test('figures come with their document and period; gaps name what is missing; nothing is filled in', () => {
    const r = readiness([
      { id: 'i', kind: 'itr', created_at: '2026-10-01', figures: { financial_year: '2025-26', gross_turnover_inr: 6000000, net_profit_inr: 400000 } },
      bank('b', '2026-10-02', [{ month: '2026-09', inflow: 1, outflow: 1, opening: null, closing: null }], { cheque_returns_count: 2 }),
    ], now);
    expect(r.figures.find((f) => f.key === 'gross_turnover_inr')).toEqual({ key: 'gross_turnover_inr', label: 'Turnover', value: 6000000, kind: 'itr', period: 'FY 2025-26' });
    expect(r.figures.some((f) => f.key === 'depreciation_inr')).toBe(false);
    expect(r.gaps).toContain('No annual accounts (balance sheet and profit and loss) on record.');
    expect(r.gaps).toContain('Bank statements cover 1 of the last 12 months.');
    expect(r.gaps.some((g) => g.startsWith('2 cheque returns'))).toBe(true);
    expect(r.gaps.some((g) => /tax return/i.test(g))).toBe(false);
  });
  test('no records: gaps only, no figures', () => {
    const r = readiness([], now);
    expect(r.figures).toEqual([]);
    expect(r.gaps).toContain('No tax return on record.');
  });
  test('energy costs only from months with a split, and only energy, freight and materials', () => {
    const rows = energyCosts([
      { month: '2026-08', inflow: 1, outflow: 100, opening: null, closing: null, categories: { electricity: 40, rent: 60 } },
      { month: '2026-09', inflow: 1, outflow: 100, opening: null, closing: null, categories: null },
    ]);
    expect(rows).toEqual([{ month: '2026-08', values: { electricity: 40 }, total: 40 }]);
  });
  test('CSV has totals only', () => {
    const csv = monthsCsv([{ month: '2026-08', inflow: 10, outflow: 5, opening: 1, closing: 6, balanced: true, categories: { fuel: 5 } }]);
    expect(csv.split('\n')[1]).toBe('2026-08,10,5,1,6,yes,,5,,,,,,,');
  });
});

describe('isolation and privacy in code', () => {
  test('the website reads finance data only through the owner-only functions, never the table', () => {
    const hook = readFileSync('src/hooks/useFinanceInsights.ts', 'utf8');
    expect(hook).toContain('my_finance_insights');
    expect(hook).toContain('my_private_records');
    for (const f of ['src/hooks/useFinanceInsights.ts', 'src/components/finance/FinanceInsights.tsx', 'src/components/finance/FinanceInsightsView.tsx', 'src/components/finance/PrivateRecords.tsx']) {
      expect(readFileSync(f, 'utf8')).not.toContain("from('financial_documents')");
      expect(readFileSync(f, 'utf8')).not.toContain('from("financial_documents")');
      expect(readFileSync(f, 'utf8')).not.toMatch(/financial-documents|storage_path|createSignedUrl/);
    }
  });
  test('the database functions use the caller id only and the table keeps no browser grants', () => {
    const sql = readFileSync('supabase/pending-migrations/20261102100000_finance_insights.sql', 'utf8');
    expect(sql).toContain('WHERE user_id = v_uid');
    expect(sql).toContain('user_id = auth.uid()');
    expect(sql).not.toMatch(/GRANT [A-Z, ]+ ON public\.financial_documents TO (authenticated|anon)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.finance_insights_plan\(uuid\) FROM PUBLIC, anon, authenticated/);
  });
  test('Pro cannot download or filter; Scale can', () => {
    const lines = readFileSync('src/components/finance/FinanceInsightsView.tsx', 'utf8').split('\n').filter((l) => /<DownloadButton|<RangePicker/.test(l));
    expect(lines.length).toBe(3);
    for (const l of lines) expect(l).toContain('access === "full"');
  });
});
