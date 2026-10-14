/**
 * Keeps one person's data from showing up for the next person on a shared
 * device. When the signed-in identity changes (sign-out, or a different
 * account signing in), every per-person cache is cleared and pages are told
 * to drop in-memory results. No imports, so the home page can use it.
 */

const LAST_UID_KEY = 'senseible_last_uid';

/** Browser keys that hold one person's data or plan. Device preferences (language, tour) stay. */
export const PERSONAL_STORAGE_KEYS = [
  'senseible_premium_tier',
  'biocog_tier',
  'senseible_invoices_used',
  'senseible_profile_triggers',
  'senseible_trust_layer_prefs',
  'senseible_ambassador_draft',
] as const;

export const IDENTITY_CHANGED_EVENT = 'senseible:identity-changed';

/** from/to: the previous and new identity ('' = guest). */
export interface IdentityTransition { from: string | null; to: string }
type Reset = (t?: IdentityTransition) => void;
const resets = new Set<Reset>();

/** Register a cache to clear on identity change (for example the query cache). Returns an unregister function. */
export function onIdentityReset(fn: Reset): () => void {
  resets.add(fn);
  return () => { resets.delete(fn); };
}

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ }
};

/**
 * Call with the current user id (or null when signed out). Clears personal
 * data when it differs from the last identity seen on this device. Safe to
 * call repeatedly: it only acts on a change.
 */
export function syncIdentity(uid: string | null): boolean {
  const last = read(LAST_UID_KEY);
  const next = uid ?? '';
  if (last === next) return false;
  // First sight of a signed-in user on a device that never had one: nothing to clear.
  const changed = last !== null && last !== next;
  write(LAST_UID_KEY, next);
  if (!changed) return false;
  for (const k of PERSONAL_STORAGE_KEYS) write(k, null);
  resets.forEach(fn => { try { fn({ from: last, to: next }); } catch { /* keep clearing the rest */ } });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(IDENTITY_CHANGED_EVENT, { detail: { uid } }));
  return true;
}
