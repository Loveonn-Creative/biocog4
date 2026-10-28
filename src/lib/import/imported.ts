// Records saved from a spreadsheet import hold typed figures. They stay
// unverified until the bill itself is uploaded (owner rule, October 2026):
// verify-carbon refuses them (verifyGate.ts), and the app keeps them out of
// the verify set so they never hold up uploaded bills.
import { isImportedDocument } from '../../../supabase/functions/_shared/verifyGate';

export { isImportedDocument };

/** The import writes this into each imported emission row's assumptions. */
const IMPORTED_NOTE = /^Imported from spreadsheet row \d+$/;

/** True for an emission row saved from a spreadsheet import. */
export function isImportedEmission(row: { verification_notes?: string | null }, cachedResult?: unknown): boolean {
  if (cachedResult !== undefined && isImportedDocument(cachedResult)) return true;
  try {
    const notes = JSON.parse(row.verification_notes || 'null') as { assumptions?: unknown } | null;
    return Array.isArray(notes?.assumptions) && notes!.assumptions.some((a) => typeof a === 'string' && IMPORTED_NOTE.test(a));
  } catch {
    return false;
  }
}
