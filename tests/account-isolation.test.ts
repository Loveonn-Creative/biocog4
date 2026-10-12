import { beforeEach, describe, expect, test } from 'bun:test';

// Minimal browser stand-ins for the pure modules under test.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};
const events: string[] = [];
(globalThis as any).window = { dispatchEvent: (e: { type: string }) => { events.push(e.type); return true; } };
(globalThis as any).CustomEvent = class { type: string; detail: unknown; constructor(t: string, o?: { detail?: unknown }) { this.type = t; this.detail = o?.detail; } };

const { syncIdentity, onIdentityReset, PERSONAL_STORAGE_KEYS, IDENTITY_CHANGED_EVENT } = await import('../src/lib/identity');
const { hasGuestData, describeGuestCounts, setPendingGuestImport, getPendingGuestImport } = await import('../src/lib/guestImport');

describe('identity switch clears the previous person\'s data', () => {
  beforeEach(() => { store.clear(); events.length = 0; });

  test('first signed-in user on a fresh device clears nothing', () => {
    store.set('senseible_premium_tier', 'pro');
    expect(syncIdentity('user-a')).toBe(false);
    expect(store.get('senseible_premium_tier')).toBe('pro');
  });

  test('sign-out clears plan, profile flags, prefs and drafts, and resets caches', () => {
    let cleared = 0;
    const off = onIdentityReset(() => { cleared++; });
    syncIdentity('user-a');
    for (const k of PERSONAL_STORAGE_KEYS) store.set(k, 'x');
    store.set('senseible_locale', 'hi');
    expect(syncIdentity(null)).toBe(true);
    for (const k of PERSONAL_STORAGE_KEYS) expect(store.has(k)).toBe(false);
    expect(store.get('senseible_locale')).toBe('hi'); // device preference stays
    expect(cleared).toBe(1);
    expect(events).toContain(IDENTITY_CHANGED_EVENT);
    off();
  });

  test('a different account signing in clears, the same account does not', () => {
    syncIdentity('user-a');
    store.set('senseible_premium_tier', 'scale');
    expect(syncIdentity('user-a')).toBe(false);
    expect(store.get('senseible_premium_tier')).toBe('scale');
    expect(syncIdentity('user-b')).toBe(true);
    expect(store.has('senseible_premium_tier')).toBe(false);
  });
});

describe('guest import waits for the person to decide', () => {
  test('only offers when there is something with no owner', () => {
    expect(hasGuestData({ documents: 0, emissions: 0, verifications: 0, reports: 0 })).toBe(false);
    expect(hasGuestData({ documents: 2, emissions: 5, verifications: 0, reports: 0 })).toBe(true);
    expect(describeGuestCounts({ documents: 1, emissions: 3, verifications: 0, reports: 0 })).toBe('1 invoice');
    expect(describeGuestCounts({ documents: 0, emissions: 2, verifications: 0, reports: 0 })).toBe('2 records');
  });
  test('the pending offer is held, not acted on', () => {
    setPendingGuestImport({ sessionId: 's', deviceFingerprint: 'f', counts: { documents: 1, emissions: 1, verifications: 0, reports: 0 } });
    expect(getPendingGuestImport()?.sessionId).toBe('s');
    setPendingGuestImport(null);
    expect(getPendingGuestImport()).toBeNull();
  });
});

describe('merge-session never moves data without explicit confirmation', () => {
  test('server source: preview unless confirm === true, closed sessions refused, stop on first error', async () => {
    const src = await Bun.file('supabase/functions/merge-session/index.ts').text();
    expect(src).toMatch(/if \(confirm !== true\)[\s\S]*preview: true/);
    expect(src).toMatch(/session\.is_active === false/);
    expect(src).toMatch(/for \(const table of GUEST_TABLES\)[\s\S]*if \(error\)[\s\S]*success: false/);
    const client = await Bun.file('src/hooks/useSession.ts').text();
    expect(client).not.toMatch(/confirm:\s*true/); // only GuestImportPrompt confirms
    expect(await Bun.file('src/components/GuestImportPrompt.tsx').text()).toMatch(/confirm: true/);
  });
});
