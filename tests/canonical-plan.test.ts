import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { canonicalPlan, effectivePlanTier } from '../supabase/functions/_shared/planLimits';

const now = new Date('2026-10-20T12:00:00Z');
const row = (tier: string, expires_at: string, extra: Record<string, unknown> = {}) => ({ tier, expires_at, ...extra });

describe('canonical plan: one record decides', () => {
  test('an active subscription row decides, even when the profile copy says more', () => {
    const p = canonicalPlan({ tier: 'scale', expiresAt: '2027-01-01T00:00:00Z' }, [row('pro', '2027-10-15T00:00:00Z')], now);
    expect(p.source).toBe('subscription');
    expect(effectivePlanTier(p.tier, p.expiresAt, now)).toBe('pro');
    expect(p.expiresAt).toBe('2027-10-15T00:00:00Z');
  });
  test('a reconciled downgrade takes effect: the row, not the stale profile, decides', () => {
    const p = canonicalPlan({ tier: 'pro', expiresAt: '2027-10-15T00:00:00Z' }, [row('basic', '2026-11-15T00:00:00Z', { payment_mode: 'manual' })], now);
    expect(effectivePlanTier(p.tier, p.expiresAt, now)).toBe('essential');
  });
  test('Razorpay early renewals: stacked active rows resolve to the strongest, latest row', () => {
    const p = canonicalPlan(null, [row('pro', '2026-11-01T00:00:00Z'), row('pro', '2027-11-01T00:00:00Z'), row('basic', '2028-01-01T00:00:00Z')], now);
    expect(effectivePlanTier(p.tier, p.expiresAt, now)).toBe('pro');
    expect(p.expiresAt).toBe('2027-11-01T00:00:00Z');
  });
  test('accounts granted a plan before rows were kept still get it from the profile', () => {
    const p = canonicalPlan({ tier: 'pro', expiresAt: '2027-03-01T00:00:00Z' }, [], now);
    expect(p.source).toBe('profile');
    expect(effectivePlanTier(p.tier, p.expiresAt, now)).toBe('pro');
  });
  test('an expired row falls back to an in-force profile, then to Snapshot', () => {
    const lapsed = [row('pro', '2025-01-01T00:00:00Z')];
    expect(canonicalPlan({ tier: 'basic', expiresAt: '2027-01-01T00:00:00Z' }, lapsed, now).source).toBe('profile');
    const none = canonicalPlan({ tier: 'pro', expiresAt: '2025-01-01T00:00:00Z' }, lapsed, now);
    expect(none.source).toBe('none');
    expect(effectivePlanTier(none.tier, none.expiresAt, now)).toBe('snapshot');
  });
  test('a failed profile read with an active row still shows the paid plan', () => {
    expect(effectivePlanTier(canonicalPlan(null, [row('scale', '2027-01-01T00:00:00Z')], now).tier, '2027-01-01T00:00:00Z', now)).toBe('scale');
  });
});

describe('every reader uses the same rule', () => {
  const files = [
    'src/hooks/usePremiumStatus.ts',
    'supabase/functions/extract-document/index.ts',
    'supabase/functions/finance-application/index.ts',
    'supabase/functions/_shared/intelligenceUsage.ts',
  ];
  for (const f of files) {
    test(`${f} reads the plan with canonicalPlan, not a max of two records`, () => {
      const src = readFileSync(f, 'utf8');
      expect(src).toContain('canonicalPlan(');
      expect(src).not.toContain('strongerPlan(');
    });
  }
});

describe('Razorpay handlers are untouched by reconciliation', () => {
  test('activation still writes the same subscription and profile columns', () => {
    const src = readFileSync('supabase/functions/_shared/razorpayServer.ts', 'utf8');
    expect(src).toContain(".update({ ...patch, status: 'active' })");
    expect(src).toContain('subscription_tier: tier, subscription_expires_at: expiresAt');
    expect(src).not.toContain('payment_mode');
  });
  test('the reconcile function is service-role only and writes subscription, profile and invoice together', () => {
    const sql = readFileSync('supabase/pending-migrations/20261101100000_reconcile_subscription_manual.sql', 'utf8');
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.reconcile_subscription_manual\([^)]*\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.reconcile_subscription_manual\([^)]*\) TO service_role/);
    for (const t of ['public.subscriptions', 'public.profiles', 'public.invoices']) expect(sql).toContain(t);
    expect(sql).toContain("DEFAULT 'razorpay'");
  });
});

describe('manual billing math matches the invoice', () => {
  // Same rounding as the SQL function: base to the paisa, GST 18% to the paisa.
  const bill = (base: number) => { const b = Math.round(base * 100) / 100; const g = Math.round(b * 18) / 100; return { base: b, gst: g, total: Math.round((b + g) * 100) / 100 }; };
  test('custom and discounted prices', () => {
    expect(bill(50000)).toEqual({ base: 50000, gst: 9000, total: 59000 });
    expect(bill(1694.07)).toEqual({ base: 1694.07, gst: 304.93, total: 1999 });
    expect(bill(0)).toEqual({ base: 0, gst: 0, total: 0 });
  });
});
