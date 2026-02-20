/**
 * Climate Credibility Score (0-100)
 * 
 * A unified trust metric computed from MSME invoice history,
 * verification performance, green benefit ratio, and data completeness.
 * 
 * Formula:
 * - 30% avg verification_score across verifications
 * - 25% green benefit ratio (green invoices / total)
 * - 25% data completeness (% with vendor+date+amount+HSN)
 * - 20% history depth (verified doc count, capped at 50)
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
    0.30 * avgVerification +
    0.25 * greenRatio +
    0.25 * dataCompleteness +
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