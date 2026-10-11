// Decides whether an invoice (document) and its derived rows may be deleted.
// Pure: no Deno or Supabase imports, so the website tests run it too.
//
// Rule: a document can be removed only while nothing derived from it is
// verified. Verified emissions and verified ledger rows are audit evidence;
// they are never deleted, so a document that produced them stays.

export interface EmissionRow { id: string; verified: boolean | null }
export interface LedgerRow { id: string; emission_id: string | null; verification_status: string | null }

export type DeleteDecision =
  | { allowed: true; emissionIds: string[]; ledgerIds: string[] }
  | { allowed: false; reason: 'has_verified_records'; verifiedCount: number };

export function decideDocumentDelete(emissions: EmissionRow[], ledger: LedgerRow[]): DeleteDecision {
  const verifiedEmissions = emissions.filter(e => e.verified === true).length;
  const verifiedLedger = ledger.filter(l => (l.verification_status ?? '').toLowerCase() === 'verified').length;
  if (verifiedEmissions + verifiedLedger > 0) {
    return { allowed: false, reason: 'has_verified_records', verifiedCount: Math.max(verifiedEmissions, verifiedLedger) };
  }
  return { allowed: true, emissionIds: emissions.map(e => e.id), ledgerIds: ledger.map(l => l.id) };
}
