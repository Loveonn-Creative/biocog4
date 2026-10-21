/**
 * The evidence checks behind each climate-finance pathway, shared by Monetize
 * and the Dashboard so both always show the same result. Checks use explicit
 * evidence only; no value, saving or advance is estimated.
 */

export type PathwayId = 'green_loan' | 'govt_incentive' | 'green_factoring' | 'carbon_credit';

export interface PathwayInputs {
  /** Verified verification records in the workspace. */
  verifiedCount: number;
  /** Quality grade from the latest verified record ('D' when none). */
  qualityGrade: string;
  /** Rows on the compliance ledger. */
  ledgerCount: number;
  /** Distinct invoices on the ledger marked as green benefit. */
  greenInvoiceCount: number;
}

export interface PathwayCheck { label: string; pass: boolean }

export function pathwayChecks(i: PathwayInputs): Record<PathwayId, PathwayCheck[]> {
  const verified = i.verifiedCount > 0;
  return {
    green_loan: [{ label: 'Verified carbon data', pass: verified }],
    govt_incentive: [
      { label: 'Verified emissions', pass: verified },
      { label: 'Carbon reporting compliance', pass: i.ledgerCount > 0 },
    ],
    green_factoring: [
      { label: `Verified green invoices (yours: ${i.greenInvoiceCount})`, pass: i.greenInvoiceCount > 0 },
    ],
    carbon_credit: [
      { label: 'Verified emissions', pass: verified },
      { label: `Quality Grade B+ (yours: ${i.qualityGrade})`, pass: ['A', 'B', 'A+'].includes(i.qualityGrade) },
      { label: 'CCTS eligibility: not assessed', pass: false },
    ],
  };
}

/** Distinct green-benefit invoices on the ledger. */
export function countGreenInvoices(entries: Array<{ is_green_benefit?: boolean | null; document_id?: string | null; document_hash?: string | null; id: string }>): number {
  return new Set(entries.filter((e) => e.is_green_benefit).map((e) => e.document_id || e.document_hash || e.id)).size;
}
