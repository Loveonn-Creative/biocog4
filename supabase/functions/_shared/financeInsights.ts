// Finance insights (owner approval, 20 October 2026): what a signed-in user
// may see from their own bank statements and tax returns, opt-in, by plan.
// Shared by extract-document (cleaning what the reader returns) and the
// website (what each plan sees and how figures are labelled). No Deno or
// browser imports, so the website tests run it directly.
//
// Data rules:
// - Only monthly totals are kept: money in, money out, opening and closing
//   balance, and money out by a fixed list of categories. Transaction
//   descriptions are read only to sort a payment into a category and are
//   never returned or stored, nor are payees, account numbers or names.
// - Nothing is guessed. A month whose categories do not add up to its money
//   out keeps its totals and drops the split. A balance that does not add up
//   is shown, marked as not checked.

export const CATEGORIES = ['electricity', 'fuel', 'logistics', 'materials', 'rent', 'salaries', 'loan_repayments', 'tax', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = {
  electricity: 'Electricity', fuel: 'Fuel', logistics: 'Freight and transport', materials: 'Raw materials',
  rent: 'Rent', salaries: 'Salaries and wages', loan_repayments: 'Loan repayments', tax: 'Taxes', other: 'Other payments',
};
/** Categories that are energy, logistics or materials: the climate-cost module. */
export const ENERGY_CATEGORIES: Category[] = ['electricity', 'fuel', 'logistics', 'materials'];

export interface MonthRow {
  month: string; // YYYY-MM
  inflow: number | null;
  outflow: number | null;
  opening: number | null;
  closing: number | null;
  /** Money out by category, only when the parts add up to the month's money out. */
  categories?: Partial<Record<Category, number>> | null;
  /** True when opening + money in - money out = closing (within 0.5%, at least ₹1). */
  balanced?: boolean | null;
}

export const MONTHLY_PROMPT = `You read an Indian business bank statement. Return ONLY a JSON object: {"months": [ ... ]} with one entry per calendar month printed, oldest first:
{"month": "YYYY-MM", "inflow_inr": total credits in that month or null, "outflow_inr": total debits in that month or null,
 "opening_balance_inr": balance at the start of the month or null, "closing_balance_inr": balance at the end of the month or null,
 "outflow_by_category_inr": {"electricity": n, "fuel": n, "logistics": n, "materials": n, "rent": n, "salaries": n, "loan_repayments": n, "tax": n, "other": n}}
Rules: add up only amounts printed in the statement; never estimate. Put a debit in a category only when its narration clearly names it (an electricity board or power distribution company, a fuel station or oil company, a transporter or courier, a raw-material supplier named as such, rent, salary or wages, an EMI or loan account, GST or TDS or income tax); otherwise use "other". The categories must add up to outflow_inr. Amounts in rupees as plain numbers. Do NOT return any narration, name, payee, account number, IFSC, cheque number, address, phone or email. No other keys. No markdown.`;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) < 1e13 ? Math.round(n * 100) / 100 : null;
};
const nonNeg = (v: unknown) => { const n = num(v); return n !== null && n >= 0 ? n : null; };

/** Cleans what the reader returned into month rows. Never throws; [] when nothing usable. */
export function cleanMonthly(raw: unknown): MonthRow[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { months?: unknown }).months) ? (raw as { months: unknown[] }).months : [];
  const seen = new Set<string>();
  const out: MonthRow[] = [];
  for (const m of list.slice(0, 36)) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    const month = String(r.month ?? '').slice(0, 7);
    if (!/^20\d\d-(0[1-9]|1[0-2])$/.test(month) || seen.has(month)) continue;
    const row: MonthRow = {
      month,
      inflow: nonNeg(r.inflow_inr),
      outflow: nonNeg(r.outflow_inr),
      opening: num(r.opening_balance_inr),
      closing: num(r.closing_balance_inr),
    };
    if (row.inflow === null && row.outflow === null && row.opening === null && row.closing === null) continue;
    // Categories: known keys only, non-negative, and kept only when they add up to money out.
    const cats = r.outflow_by_category_inr;
    if (cats && typeof cats === 'object' && row.outflow !== null && row.outflow > 0) {
      const parts: Partial<Record<Category, number>> = {};
      let sum = 0;
      for (const c of CATEGORIES) {
        const v = nonNeg((cats as Record<string, unknown>)[c]);
        if (v !== null && v > 0) { parts[c] = v; sum += v; }
      }
      const tolerance = Math.max(1, row.outflow * 0.01);
      row.categories = sum > 0 && Math.abs(sum - row.outflow) <= tolerance ? parts : null;
    } else {
      row.categories = null;
    }
    if (row.opening !== null && row.closing !== null && row.inflow !== null && row.outflow !== null) {
      const expected = row.opening + row.inflow - row.outflow;
      row.balanced = Math.abs(expected - row.closing) <= Math.max(1, Math.abs(row.closing) * 0.005);
    } else {
      row.balanced = null;
    }
    seen.add(month);
    out.push(row);
  }
  return out.sort((a, b) => a.month.localeCompare(b.month));
}

// ---------------------------------------------------------------------------
// What each plan sees. The database function enforces the same split
// (my_finance_insights): figures never reach a plan that is locked.
// ---------------------------------------------------------------------------
export type Plan = 'snapshot' | 'essential' | 'pro' | 'scale';
export type Access = 'locked' | 'basic' | 'read' | 'full';
export type ModuleId = 'cashflow' | 'readiness' | 'energy';

export function moduleAccess(plan: Plan): Record<ModuleId, Access> {
  switch (plan) {
    case 'scale': return { cashflow: 'full', readiness: 'full', energy: 'full' };
    case 'pro': return { cashflow: 'read', readiness: 'read', energy: 'read' };
    case 'essential': return { cashflow: 'basic', readiness: 'locked', energy: 'locked' };
    default: return { cashflow: 'locked', readiness: 'locked', energy: 'locked' };
  }
}
/** The plan a locked module opens on. */
export const UNLOCKS_ON: Record<ModuleId, Plan> = { cashflow: 'essential', readiness: 'pro', energy: 'pro' };

// ---------------------------------------------------------------------------
// The records the website receives and what it builds from them.
// ---------------------------------------------------------------------------
export type RecordKind = 'itr' | 'bank_statement' | 'financial_statement';
export const KIND_LABEL: Record<RecordKind, string> = { itr: 'Tax return', bank_statement: 'Bank statement', financial_statement: 'Annual accounts' };

export interface InsightRecord {
  id: string;
  kind: RecordKind;
  created_at: string;
  period_from?: string | null;
  period_to?: string | null;
  figures?: Record<string, number | string> | null;
  monthly?: MonthRow[] | null;
}

/** One row per month across all statements; a month covered twice keeps the newest upload. */
export function monthsFrom(records: InsightRecord[]): (MonthRow & { source: string })[] {
  const byMonth = new Map<string, MonthRow & { source: string; at: string }>();
  for (const r of records) {
    if (r.kind !== 'bank_statement') continue;
    for (const m of r.monthly ?? []) {
      const prev = byMonth.get(m.month);
      if (!prev || r.created_at > prev.at) byMonth.set(m.month, { ...m, source: r.id, at: r.created_at });
    }
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).map(({ at: _at, ...m }) => m);
}

export interface ReadinessFigure { key: string; label: string; value: number; kind: RecordKind; period: string | null }
export interface Readiness { figures: ReadinessFigure[]; gaps: string[] }

const FIGURE_LABEL: Record<string, string> = {
  gross_turnover_inr: 'Turnover', net_profit_inr: 'Net profit', depreciation_inr: 'Depreciation', interest_expense_inr: 'Interest paid',
  total_income_inr: 'Total income', tax_paid_inr: 'Tax paid', average_monthly_balance_inr: 'Average monthly balance',
  total_credits_inr: 'Money in over the statement', monthly_loan_repayments_inr: 'Monthly loan repayments', cheque_returns_count: 'Cheque returns',
};

const periodOf = (r: InsightRecord) => {
  const fy = r.figures?.financial_year;
  if (typeof fy === 'string' && fy) return `FY ${fy}`;
  const mon = (d: string) => { const t = Date.parse(`${d.slice(0, 10)}T00:00:00Z`); return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : d; };
  if (r.period_from && r.period_to) return `${mon(r.period_from)} to ${mon(r.period_to)}`;
  return null;
};

/**
 * Figures printed in the user's documents, newest record first for each, and
 * the gaps a lender would ask about. Only facts about what is on record: no
 * score, no estimate, nothing filled in.
 */
export function readiness(records: InsightRecord[], now = new Date()): Readiness {
  const sorted = [...records].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const figures: ReadinessFigure[] = [];
  for (const key of Object.keys(FIGURE_LABEL)) {
    const r = sorted.find((x) => typeof x.figures?.[key] === 'number');
    if (r) figures.push({ key, label: FIGURE_LABEL[key], value: r.figures![key] as number, kind: r.kind, period: periodOf(r) });
  }
  const gaps: string[] = [];
  if (!records.some((r) => r.kind === 'itr')) gaps.push('No tax return on record.');
  if (!records.some((r) => r.kind === 'financial_statement')) gaps.push('No annual accounts (balance sheet and profit and loss) on record.');
  const months = new Set(monthsFrom(records).map((m) => m.month));
  const last12: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    last12.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const covered = last12.filter((m) => months.has(m)).length;
  if (records.some((r) => r.kind === 'bank_statement') || covered === 0) {
    if (covered < 12) gaps.push(`Bank statements cover ${covered} of the last 12 months.`);
  }
  const unread = records.filter((r) => (!r.figures || Object.keys(r.figures).length === 0) && !(r.monthly ?? []).length).length;
  if (unread) gaps.push(`${unread} uploaded ${unread === 1 ? 'record' : 'records'} could not be read. A clearer copy helps.`);
  const returns = figures.find((f) => f.key === 'cheque_returns_count');
  if (returns && returns.value > 0) gaps.push(`${returns.value} cheque ${returns.value === 1 ? 'return is' : 'returns are'} printed on a statement. A lender may ask about these.`);
  return { figures, gaps };
}

/** Money out on energy, logistics and materials per month, only for months with a category split. */
export function energyCosts(months: MonthRow[]): { month: string; values: Partial<Record<Category, number>>; total: number }[] {
  return months
    .filter((m) => m.categories)
    .map((m) => {
      const values: Partial<Record<Category, number>> = {};
      let total = 0;
      for (const c of ENERGY_CATEGORIES) { const v = m.categories?.[c]; if (v) { values[c] = v; total += v; } }
      return { month: m.month, values, total };
    });
}

/** CSV of month rows (Scale only). Totals only; no source text. */
export function monthsCsv(months: MonthRow[]): string {
  const head = ['month', 'money_in_inr', 'money_out_inr', 'opening_balance_inr', 'closing_balance_inr', 'balance_adds_up', ...CATEGORIES.map((c) => `out_${c}_inr`)];
  const rows = months.map((m) => [m.month, m.inflow ?? '', m.outflow ?? '', m.opening ?? '', m.closing ?? '', m.balanced == null ? '' : m.balanced ? 'yes' : 'no', ...CATEGORIES.map((c) => m.categories?.[c] ?? '')].join(','));
  return [head.join(','), ...rows].join('\n');
}
