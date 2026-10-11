/**
 * Climate Credibility Score (0-100)
 * 
 * How far a business's climate data can be trusted: evidence quality only.
 * It says nothing about how green the business is, and it is not a credit,
 * loan or payment eligibility decision.
 *
 * Formula:
 * - 40% average evidence score (share of records passing checks)
 * - 40% data completeness (% of ledger rows with vendor, date, amount, HSN)
 * - 20% history depth (verifications, capped at 50)
 *
 * The green-benefit ratio used to carry 25% of the weight; it measures
 * performance, not credibility, so it is reported separately (greenRatio)
 * and no longer moves the score.
 */

interface VerificationInput {
  verification_score: number | null;
}

interface LedgerInput {
  is_green_benefit: boolean | null;
  vendor: string | null;
  invoice_date: string | null;
  amount: number | null;
  hsn_code: string | null;
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
}

export function computeCredibilityScore(
  verifications: VerificationInput[],
  ledgerEntries: LedgerInput[]
): CredibilityResult {
  // 1. Average verification score (0-100)
  const validScores = verifications
    .map(v => v.verification_score)
    .filter((s): s is number => s != null && s > 0);
  const avgVerification = validScores.length > 0
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100
    : 0;

  // 2. Green benefit ratio (0-100)
  const totalEntries = ledgerEntries.length;
  const greenCount = ledgerEntries.filter(e => e.is_green_benefit === true).length;
  const greenRatio = totalEntries > 0 ? (greenCount / totalEntries) * 100 : 0;

  // 3. Data completeness (0-100)
  const completeCount = ledgerEntries.filter(e =>
    e.vendor != null && e.vendor.trim() !== '' &&
    e.invoice_date != null &&
    e.amount != null && e.amount > 0 &&
    e.hsn_code != null && e.hsn_code.trim() !== ''
  ).length;
  const dataCompleteness = totalEntries > 0 ? (completeCount / totalEntries) * 100 : 0;

  // 4. History depth (0-100, capped at 50 docs)
  const verifiedCount = verifications.filter(v => v.verification_score != null && v.verification_score > 0).length;
  const historyDepth = Math.min(verifiedCount / 50, 1) * 100;

  // Weighted score
  const score = Math.round(
    0.40 * avgVerification +
    0.40 * dataCompleteness +
    0.20 * historyDepth
  );

  const clampedScore = Math.max(0, Math.min(100, score));

  const grade: CredibilityResult['grade'] =
    clampedScore >= 90 ? 'A+' :
    clampedScore >= 75 ? 'A' :
    clampedScore >= 55 ? 'B' :
    clampedScore >= 35 ? 'C' : 'D';

  return {
    score: clampedScore,
    grade,
    breakdown: {
      verificationAvg: Math.round(avgVerification),
      greenRatio: Math.round(greenRatio),
      dataCompleteness: Math.round(dataCompleteness),
      historyDepth: Math.round(historyDepth),
    },
  };
}