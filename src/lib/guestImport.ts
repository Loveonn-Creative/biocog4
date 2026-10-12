/**
 * Guest uploads found on this device when someone signs in. Nothing is added
 * to the account until that person says the uploads are theirs; declining
 * forgets the guest session on this device. No imports, so useSession (used on
 * the home page) can drive it.
 */

export interface GuestCounts { documents: number; emissions: number; verifications: number; reports: number }
export interface PendingGuestImport { sessionId: string; deviceFingerprint: string; counts: GuestCounts }

let pending: PendingGuestImport | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const getPendingGuestImport = () => pending;
export const subscribeGuestImport = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function setPendingGuestImport(p: PendingGuestImport | null) { pending = p; emit(); }

/** Something worth asking about: at least one invoice or record with no owner yet. */
export const hasGuestData = (c: GuestCounts | undefined | null): c is GuestCounts =>
  !!c && (c.documents > 0 || c.emissions > 0);

export function describeGuestCounts(c: GuestCounts): string {
  const n = c.documents || c.emissions;
  const noun = c.documents ? (n === 1 ? 'invoice' : 'invoices') : (n === 1 ? 'record' : 'records');
  return `${n} ${noun}`;
}
