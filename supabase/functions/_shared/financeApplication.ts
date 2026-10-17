// Sustainable-finance applications: rules shared by the application page and
// the finance-application edge function, so both accept exactly the same
// thing. Pure: no Deno, zod or Supabase imports.
//
// Built for green loans first. `kind` is open so a verified government-grant,
// tender or contract journey can reuse the same intake, documents, status
// timeline and review without new infrastructure.
//
// Nothing here decides credit. The applicant sees readiness (what is provided
// and what is missing), status and, after submission, an Estimate built only
// from their own entered figures and the allow-listed figures on their own
// documents (owner decision, October 2026). The Estimate shows derived values
// and the assumptions behind them, never raw document figures, and never an
// approval, offer or rate. The internal review summary stays Senseible-only.
// Senseible does not approve, provide or disburse loans, grants or financing.

export const DISCLOSURE = 'Senseible provides data infrastructure to support sustainable-finance applications; it does not itself approve, provide or disburse loans, grants or financing.';

export const KINDS = ['green_loan'] as const;
export type Kind = (typeof KINDS)[number];

/** Status as the applicant sees it. Set by the server and, after submission, by the Senseible team. */
export const STATUSES = ['draft', 'submitted', 'under_review', 'needs_information', 'shared_with_partner', 'closed'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  needs_information: 'More information needed',
  shared_with_partner: 'Shared with a financing partner (with your consent)',
  closed: 'Closed',
};

export const PURPOSES = [
  { id: 'rooftop_solar', label: 'Rooftop or captive solar' },
  { id: 'energy_efficiency', label: 'Energy-efficient machinery or retrofit' },
  { id: 'fuel_switch', label: 'Switching to cleaner fuel or electric process heat' },
  { id: 'ev_fleet', label: 'Electric vehicles or fleet' },
  { id: 'waste_water', label: 'Waste, water or circularity upgrade' },
  { id: 'working_capital', label: 'Working capital for a green product line' },
  { id: 'other', label: 'Other green purpose' },
] as const;
export type PurposeId = (typeof PURPOSES)[number]['id'];

export const DOC_TYPES = [
  { id: 'itr', label: 'Income tax return (ITR)', hint: 'Up to the last 3 financial years' },
  { id: 'bank_statement', label: 'Bank statement', hint: 'Last 12 months of the main business account' },
  { id: 'financial_statement', label: 'Financial statements', hint: 'Balance sheet and profit and loss' },
  { id: 'project_quote', label: 'Project quote or proposal', hint: 'For the asset or upgrade being financed' },
] as const;
export type DocType = (typeof DOC_TYPES)[number]['id'];

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_FILES = 6;
export const RETENTION_DAYS = 365;
/** Indicative window for the first update after submission. */
export const UPDATE_WINDOW_DAYS = [14, 28] as const;

export const CONSENT_VERSION = 'finance-2026-10';
export const CONSENT_TEXT = 'I agree that Senseible may store the details and documents in this application and read the figures needed to review it, only to prepare and review this sustainable-finance application and contact me about it. Senseible will not share my documents with any lender or partner without my separate consent. I can withdraw this consent and ask for deletion at any time by writing to impact@senseible.earth.';

/** File types accepted, identified by their first bytes (the declared type is not trusted). */
export function sniffType(bytes: Uint8Array): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'application/pdf';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  return null;
}

// ---------------------------------------------------------------------------
// Application fields
// ---------------------------------------------------------------------------
export interface FinanceApplicationInput {
  kind: Kind;
  businessName: string;
  gstin: string | null;
  sector: string | null;
  location: string | null;
  purpose: PurposeId;
  purposeNote: string | null;
  amountInr: number;
  tenureMonths: number;
  annualTurnoverInr: number;
  netProfitInr: number | null;
  depreciationInr: number | null;
  existingMonthlyEmiInr: number;
  quotedAnnualRatePct: number | null;
  consent: true;
}
export type FieldErrors = Partial<Record<keyof FinanceApplicationInput | 'form', string>>;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const money = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[,\s₹]/g, '')) : Number(v);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Validates an application as the applicant entered it. Nothing is estimated or filled in. */
export function validateApplication(raw: Record<string, unknown>): { ok: true; value: FinanceApplicationInput; errors?: never } | { ok: false; errors: FieldErrors; value?: never } {
  const e: FieldErrors = {};
  const kind = (KINDS as readonly string[]).includes(String(raw.kind)) ? (raw.kind as Kind) : 'green_loan';
  const businessName = text(raw.businessName, 150);
  if (businessName.length < 2) e.businessName = 'Enter the business name';
  const gstinRaw = text(raw.gstin, 15).toUpperCase();
  if (gstinRaw && !GSTIN_RE.test(gstinRaw)) e.gstin = 'Check the GSTIN (15 characters)';
  const purpose = PURPOSES.some((p) => p.id === raw.purpose) ? (raw.purpose as PurposeId) : null;
  if (!purpose) e.purpose = 'Choose what the financing is for';
  const purposeNote = text(raw.purposeNote, 500) || null;
  if (purpose === 'other' && !purposeNote) e.purposeNote = 'Describe the green purpose';

  const amount = money(raw.amountInr);
  if (amount === null || Number.isNaN(amount) || amount < 50_000 || amount > 500_000_000) e.amountInr = 'Enter an amount between ₹50,000 and ₹50 crore';
  const tenure = Number(raw.tenureMonths);
  if (!Number.isInteger(tenure) || tenure < 3 || tenure > 120) e.tenureMonths = 'Choose a tenure between 3 and 120 months';
  const turnover = money(raw.annualTurnoverInr);
  if (turnover === null || Number.isNaN(turnover) || turnover <= 0 || turnover > 1e12) e.annualTurnoverInr = 'Enter last financial year\'s turnover';
  const profit = money(raw.netProfitInr);
  if (Number.isNaN(profit) || (profit !== null && Math.abs(profit) > 1e12)) e.netProfitInr = 'Enter net profit (negative for a loss), or leave blank';
  const dep = money(raw.depreciationInr);
  if (Number.isNaN(dep) || (dep !== null && (dep < 0 || dep > 1e12))) e.depreciationInr = 'Enter depreciation, or leave blank';
  const emi = money(raw.existingMonthlyEmiInr);
  if (emi === null || Number.isNaN(emi) || emi < 0 || emi > 1e10) e.existingMonthlyEmiInr = 'Enter existing monthly loan repayments (0 if none)';
  const rateRaw = raw.quotedAnnualRatePct;
  const rate = rateRaw === null || rateRaw === undefined || rateRaw === '' ? null : Number(rateRaw);
  if (rate !== null && (!Number.isFinite(rate) || rate <= 0 || rate > 40)) e.quotedAnnualRatePct = 'Enter the quoted annual rate, or leave blank';
  if (raw.consent !== true) e.consent = 'Please agree so we can review your application';

  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      kind, businessName, gstin: gstinRaw || null, sector: text(raw.sector, 80) || null, location: text(raw.location, 80) || null,
      purpose: purpose as PurposeId, purposeNote, amountInr: amount as number, tenureMonths: tenure, annualTurnoverInr: turnover as number,
      netProfitInr: profit, depreciationInr: dep, existingMonthlyEmiInr: emi as number, quotedAnnualRatePct: rate, consent: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Readiness (shown to the applicant): facts about what is provided, no scores
// ---------------------------------------------------------------------------
export interface ReadinessItem { id: string; label: string; done: boolean; note?: string }

export function readiness(app: Pick<FinanceApplicationInput, 'netProfitInr' | 'gstin'>, docs: { docType: string }[], carbon: { verifiedInvoices: number }): ReadinessItem[] {
  const has = (t: string) => docs.some((d) => d.docType === t);
  return [
    { id: 'gstin', label: 'GSTIN on the application', done: !!app.gstin },
    { id: 'profit', label: 'Net profit entered', done: app.netProfitInr !== null },
    { id: 'itr', label: 'Income tax return uploaded', done: has('itr') },
    { id: 'bank', label: 'Bank statement uploaded', done: has('bank_statement') },
    { id: 'fin', label: 'Financial statements uploaded', done: has('financial_statement'), note: 'Optional, and helpful for larger amounts' },
    { id: 'quote', label: 'Project quote uploaded', done: has('project_quote'), note: 'Optional' },
    { id: 'carbon', label: 'Verified carbon records on Senseible', done: carbon.verifiedInvoices > 0, note: carbon.verifiedInvoices > 0 ? `${carbon.verifiedInvoices} verified invoice${carbon.verifiedInvoices === 1 ? '' : 's'}` : 'Upload and verify invoices to add your emissions baseline' },
  ];
}

export function updateWindow(submittedAt: Date): { from: string; to: string } {
  const add = (d: number) => new Date(submittedAt.getTime() + d * 86_400_000).toISOString().slice(0, 10);
  return { from: add(UPDATE_WINDOW_DAYS[0]), to: add(UPDATE_WINDOW_DAYS[1]) };
}

// ---------------------------------------------------------------------------
// Figures read from documents (server side): a fixed allow-list, nothing else
// ---------------------------------------------------------------------------
export const DOC_FIGURE_KEYS = [
  'document_kind', 'financial_year', 'period_from', 'period_to',
  'gross_turnover_inr', 'net_profit_inr', 'depreciation_inr', 'interest_expense_inr', 'total_income_inr', 'tax_paid_inr',
  'average_monthly_balance_inr', 'total_credits_inr', 'monthly_loan_repayments_inr', 'cheque_returns_count',
] as const;
export type DocFigures = Partial<Record<(typeof DOC_FIGURE_KEYS)[number], string | number | null>>;

/** Keeps only allow-listed keys with plain values; drops anything that could carry personal data. */
export function cleanFigures(raw: unknown): DocFigures {
  const out: DocFigures = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of DOC_FIGURE_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (v === null || v === undefined) continue;
    if (k === 'document_kind') { if (['itr', 'bank_statement', 'financial_statement', 'other'].includes(String(v))) out[k] = String(v); continue; }
    if (k === 'financial_year' || k === 'period_from' || k === 'period_to') { const s = String(v).slice(0, 10); if (/^[0-9-]{4,10}$/.test(s)) out[k] = s; continue; }
    const n = Number(v);
    if (Number.isFinite(n) && Math.abs(n) < 1e13) out[k] = Math.round(n);
  }
  return out;
}

export const FIGURES_PROMPT = `You read Indian business financial documents (income tax returns, bank statements, financial statements). Return ONLY a JSON object with these keys, using null when a value is not clearly printed. Never guess and never calculate.
{"document_kind": "itr" | "bank_statement" | "financial_statement" | "other",
 "financial_year": "YYYY-YY" or null, "period_from": "YYYY-MM-DD" or null, "period_to": "YYYY-MM-DD" or null,
 "gross_turnover_inr": number or null, "net_profit_inr": number or null, "depreciation_inr": number or null,
 "interest_expense_inr": number or null, "total_income_inr": number or null, "tax_paid_inr": number or null,
 "average_monthly_balance_inr": number or null, "total_credits_inr": number or null,
 "monthly_loan_repayments_inr": number or null, "cheque_returns_count": number or null}
Rules: amounts in rupees as plain numbers. Do NOT return any name, PAN, Aadhaar, account number, IFSC, address, phone, email, counterparty or transaction description. No other keys. No markdown.`;

// ---------------------------------------------------------------------------
// Internal review summary (Senseible team only; never shown to the applicant)
// ---------------------------------------------------------------------------
export interface ReviewSummary {
  label: string;
  requestToNetProfit: number | null;
  requestToTurnover: number;
  /** Owner guidance: requests are commonly 2 to 3 times the profit in the financial statements, depending on the project. Not an approval rule. */
  requestBand: 'within_2_3x' | 'below_2x' | 'above_3x' | 'no_profit_figure';
  annualDebtServiceExisting: number;
  proposedEmi: number | null;
  /** (net profit + depreciation + interest) / annual debt service, as a range across applicant and document figures. Null without a quoted rate. */
  coverageRange: [number, number] | null;
  crossChecks: string[];
  missing: string[];
  assumptions: string[];
  priority: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Monthly instalment for a level-payment loan. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 1200;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function reviewSummary(app: FinanceApplicationInput, figures: DocFigures[], opts: { priority: boolean }): ReviewSummary {
  const latest = (k: keyof DocFigures, kind?: string) => {
    const hit = figures.filter((f) => (kind ? f.document_kind === kind : true) && typeof f[k] === 'number')
      .sort((a, b) => String(b.financial_year ?? b.period_to ?? '').localeCompare(String(a.financial_year ?? a.period_to ?? '')))[0];
    return hit ? (hit[k] as number) : null;
  };
  const docTurnover = latest('gross_turnover_inr');
  const docProfit = latest('net_profit_inr');
  const docDep = latest('depreciation_inr');
  const docInterest = latest('interest_expense_inr');
  const bankRepay = latest('monthly_loan_repayments_inr', 'bank_statement');
  const checks: string[] = [];
  const missing: string[] = [];
  const assumptions: string[] = ['Figures as entered by the applicant and as printed on uploaded documents; nothing is estimated.', 'Indicative internal review only, not a credit decision or a lender assessment.'];
  const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);
  if (docTurnover !== null) checks.push(`Turnover: entered ₹${app.annualTurnoverInr.toLocaleString('en-IN')}, documents ₹${docTurnover.toLocaleString('en-IN')} (${pct(app.annualTurnoverInr, docTurnover)}%)`);
  else missing.push('Turnover not readable from documents');
  if (app.netProfitInr !== null && docProfit !== null) checks.push(`Net profit: entered ₹${app.netProfitInr.toLocaleString('en-IN')}, documents ₹${docProfit.toLocaleString('en-IN')}`);
  if (app.netProfitInr === null && docProfit === null) missing.push('Net profit not entered or readable');
  if (bankRepay !== null) checks.push(`Existing repayments: entered ₹${app.existingMonthlyEmiInr.toLocaleString('en-IN')}/month, bank statement ₹${bankRepay.toLocaleString('en-IN')}/month`);
  else missing.push('Loan repayments not readable from a bank statement');
  if (app.quotedAnnualRatePct === null) missing.push('No quoted interest rate, so the new instalment and coverage are not calculated');

  const profits = [app.netProfitInr, docProfit].filter((v): v is number => v !== null);
  const profitForBand = profits.length ? Math.min(...profits) : null;
  const ratio = profitForBand !== null && profitForBand > 0 ? round2(app.amountInr / profitForBand) : null;
  const band: ReviewSummary['requestBand'] = ratio === null ? 'no_profit_figure' : ratio < 2 ? 'below_2x' : ratio <= 3 ? 'within_2_3x' : 'above_3x';
  if (ratio !== null) assumptions.push('Request compared with the lower of entered and document net profit.');

  const existingAnnual = 12 * Math.max(app.existingMonthlyEmiInr, bankRepay ?? 0);
  let proposed: number | null = null;
  let coverage: [number, number] | null = null;
  if (app.quotedAnnualRatePct !== null) {
    proposed = round2(emi(app.amountInr, app.quotedAnnualRatePct, app.tenureMonths));
    const service = existingAnnual + 12 * proposed;
    const dep = app.depreciationInr ?? docDep ?? 0;
    const interest = docInterest ?? 0;
    if (profits.length && service > 0) {
      const vals = profits.map((p) => round2((p + dep + interest) / service));
      coverage = [Math.min(...vals), Math.max(...vals)];
      assumptions.push(`Coverage = (net profit + depreciation ${dep ? '' : '(not given, 0) '}+ interest ${interest ? '' : '(not given, 0) '}) / (existing + new annual repayments), at the applicant's quoted ${app.quotedAnnualRatePct}% over ${app.tenureMonths} months.`);
    }
  }
  return {
    label: 'CONFIDENTIAL. Indicative internal review, not a credit decision.',
    requestToNetProfit: ratio,
    requestToTurnover: round2(app.amountInr / app.annualTurnoverInr),
    requestBand: band,
    annualDebtServiceExisting: existingAnnual,
    proposedEmi: proposed,
    coverageRange: coverage,
    crossChecks: checks,
    missing,
    assumptions,
    priority: opts.priority,
  };
}

// ---------------------------------------------------------------------------
// Applicant Estimate (shown after submission; same function for every entry point)
// ---------------------------------------------------------------------------
export const ESTIMATE_LABEL = 'Estimate, not an offer, eligibility decision or approval';

export interface ApplicantEstimate {
  label: string;
  /** Indicative loan size: 2 to 3 times net profit (owner guidance), using the lower of entered and document profit. Null without a positive profit. */
  rangeInr: [number, number] | null;
  requestInr: number;
  /** Where the request sits against that range. */
  position: 'within' | 'below' | 'above' | null;
  /** Monthly instalment at the applicant's own quoted rate and tenure. Null without a quoted rate. */
  monthlyInstalmentInr: number | null;
  /** Lowest debt-service coverage across entered and document figures. Null without a quoted rate or profit. */
  coverage: number | null;
  /** Request as a share of annual turnover, in percent. */
  requestShareOfTurnoverPct: number;
  /** True when allow-listed document figures were available and used. */
  usedDocuments: boolean;
  assumptions: string[];
  warnings: string[];
}

/**
 * Builds the applicant-facing Estimate from the same maths as the internal
 * review, so the two never disagree. Never fills a gap with a default: a
 * missing input removes the figure that needs it and adds a warning.
 */
export function applicantEstimate(app: FinanceApplicationInput, figures: DocFigures[], carbon?: { verifiedInvoices: number }): ApplicantEstimate {
  const s = reviewSummary(app, figures, { priority: false });
  // Latest document profit, chosen exactly as reviewSummary chooses it.
  const docHit = figures.filter((f) => typeof f.net_profit_inr === 'number')
    .sort((a, b) => String(b.financial_year ?? b.period_to ?? '').localeCompare(String(a.financial_year ?? a.period_to ?? '')))[0];
  const docProfit = docHit ? (docHit.net_profit_inr as number) : null;
  const profits = [app.netProfitInr, docProfit].filter((v): v is number => v !== null);
  const basis = profits.length ? Math.min(...profits) : null;
  const warnings: string[] = [];
  const assumptions: string[] = [
    'Indicative size is 2 to 3 times net profit, a common starting point for project loans; lenders decide on their own criteria.',
  ];
  let range: [number, number] | null = null;
  if (basis === null) warnings.push('Net profit was not entered or readable from your documents, so no indicative size is shown. Add net profit or clearer financial statements.');
  else if (basis <= 0) warnings.push('Your figures show a loss, so no indicative size is shown. Lenders usually look for positive profit or other repayment sources.');
  else {
    range = [Math.round(2 * basis), Math.round(3 * basis)];
    assumptions.push(profits.length > 1 ? 'Uses the lower of the net profit you entered and the net profit on your documents.' : docProfit !== null ? 'Uses the net profit on your documents.' : 'Uses the net profit you entered; it was not readable from your documents.');
  }
  if (app.netProfitInr !== null && docProfit !== null && Math.abs(app.netProfitInr - docProfit) > 0.2 * Math.max(Math.abs(docProfit), 1)) {
    warnings.push('The net profit you entered differs from your documents by more than 20%; the lower figure is used.');
  }
  if (app.quotedAnnualRatePct === null) warnings.push('No interest rate was quoted, so the monthly instalment and repayment coverage are not shown.');
  else assumptions.push(`Instalment and coverage use the ${app.quotedAnnualRatePct}% rate you quoted over ${app.tenureMonths} months; a lender's rate may differ.`);
  if (s.coverageRange) assumptions.push('Coverage = (net profit + depreciation + interest) ÷ yearly repayments, existing and new. Missing depreciation or interest counts as 0, which understates coverage.');
  if (!figures.length) warnings.push('Your documents could not be read yet, so this uses only the figures you entered.');
  if (carbon && carbon.verifiedInvoices === 0) warnings.push('No verified invoices yet: the size estimate does not depend on them, but green-loan lenders ask for a measured carbon baseline.');
  return {
    label: ESTIMATE_LABEL,
    rangeInr: range,
    requestInr: app.amountInr,
    position: range ? (app.amountInr < range[0] ? 'below' : app.amountInr > range[1] ? 'above' : 'within') : null,
    monthlyInstalmentInr: s.proposedEmi !== null ? Math.round(s.proposedEmi) : null,
    coverage: s.coverageRange ? s.coverageRange[0] : null,
    requestShareOfTurnoverPct: Math.round((app.amountInr / app.annualTurnoverInr) * 1000) / 10,
    usedDocuments: figures.length > 0,
    assumptions,
    warnings,
  };
}
