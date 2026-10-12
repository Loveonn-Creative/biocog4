/**
 * Climate Credibility Score (0-100)
 *
 * How far a business's climate data can be trusted: evidence quality only.
 * It says nothing about how green the business is, and it is not a credit,
 * loan, scheme or payment eligibility decision. Pathway eligibility uses its
 * own explicit checks; this score is shown for information.
 *
 * Formula:
 * - 40% evidence: average verification score over every attempt, failed
 *   attempts included as 0 (leaving them out would inflate the average).
 * - 40% completeness: share of invoices whose ledger evidence has a vendor,
 *   an invoice date and an amount (stored once per invoice) and an HSN code
 *   on every line.
 * - 20% history: unique invoices with verified records, capped at 50.
 *
 * Ledger rows are read once per emission (the latest row), as the ledger
 * total and the audit export count them. The green-benefit ratio measures
 * performance, not credibility, so it is reported (greenRatio) but does not
 * move the score.
 */
import { latestLedgerRowPerEmission } from '@/lib/emissionLedger';

export interface CredibilityVerificationInput {
  verification_score: number | null;
  verification_status: string | null;
}

export interface CredibilityLedgerInput {
  id: string;
  emission_id: string | null;
  document_id: string | null;
  document_hash: string | null;
  vendor: string | null;
  invoice_date: string | null;
  amount: number | null;
  hsn_code: string | null;
  is_green_benefit: boolean | null;
  verification_status: string | null;
  co2_kg: number;
  created_at: string | null;
  verified_at?: string | null;
}

export interface CredibilityResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  breakdown: {
    verificationAvg: number;
    greenRatio: number;
    dataCompleteness: number;
    historyDepth: number;
  };
  counts: {
    attempts: number;
    invoices: number;
    completeInvoices: number;
    verifiedInvoices: number;
  };
}

export const HISTORY_CAP_INVOICES = 50;

const text = (v: string | null | undefined) => typeof v === 'string' && v.trim() !== '';

export function computeCredibilityScore(
  verifications: CredibilityVerificationInput[],
  ledgerRows: CredibilityLedgerInput[],
): CredibilityResult {
  // 1. Evidence: every finished attempt counts; a failed one scores 0.
  const attempts = verifications.filter((v) => v.verification_status !== 'pending');
  const scores = attempts.map((v) => (typeof v.verification_score === 'number' && Number.isFinite(v.verification_score) ? Math.max(0, Math.min(1, v.verification_score)) : 0));
  const avgVerification = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100 : 0;

  // Ledger: one row per emission, grouped by invoice.
  const rows = latestLedgerRowPerEmission(ledgerRows);
  const invoices = new Map<string, CredibilityLedgerInput[]>();
  for (const r of rows) {
    const key = r.document_id || r.document_hash || r.id;
    invoices.set(key, [...(invoices.get(key) ?? []), r]);
  }

  // 2. Completeness per invoice. The amount is stored on one line only.
  let completeInvoices = 0;
  let verifiedInvoices = 0;
  for (const lines of invoices.values()) {
    const complete =
      lines.some((l) => text(l.vendor)) &&
      lines.some((l) => text(l.invoice_date)) &&
      lines.some((l) => typeof l.amount === 'number' && l.amount > 0) &&
      lines.every((l) => text(l.hsn_code));
    if (complete) completeInvoices++;
    if (lines.some((l) => l.verification_status === 'verified')) verifiedInvoices++;
  }
  const dataCompleteness = invoices.size > 0 ? (completeInvoices / invoices.size) * 100 : 0;

  // 3. History: unique verified invoices, not verification attempts.
  const historyDepth = Math.min(verifiedInvoices / HISTORY_CAP_INVOICES, 1) * 100;

  const greenRatio = rows.length > 0 ? (rows.filter((e) => e.is_green_benefit === true).length / rows.length) * 100 : 0;

  const score = Math.max(0, Math.min(100, Math.round(0.4 * avgVerification + 0.4 * dataCompleteness + 0.2 * historyDepth)));
  const grade: CredibilityResult['grade'] =
    score >= 90 ? 'A+' : score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D';

  return {
    score,
    grade,
    breakdown: {
      verificationAvg: Math.round(avgVerification),
      greenRatio: Math.round(greenRatio),
      dataCompleteness: Math.round(dataCompleteness),
      historyDepth: Math.round(historyDepth),
    },
    counts: { attempts: attempts.length, invoices: invoices.size, completeInvoices, verifiedInvoices },
  };
}
