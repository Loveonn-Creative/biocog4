import { describe, expect, test } from 'bun:test';
import {
  activateOrder, blocksNewOrder, expectedPaise, paymentMatchesOrder,
  type RazorpayApi, type RazorpayPayment, type SubscriptionRow, type SubscriptionStore,
} from '../supabase/functions/_shared/razorpayActivation';
import { strongerPlan } from '../supabase/functions/_shared/planLimits';

// In-memory store with the same conditional-update semantics as the
// Postgres query (UPDATE ... WHERE status = 'pending').
function memStore(rows: SubscriptionRow[], opts: { profileFails?: boolean } = {}) {
  const profiles = new Map<string, { tier: string; expiresAt: string }>();
  const store: SubscriptionStore & { profiles: typeof profiles; rows: SubscriptionRow[]; activations: number } = {
    rows, profiles, activations: 0,
    async findByOrderId(id) { const r = rows.find(x => x.razorpay_order_id === id); return r ? { ...r } : null; },
    async activateIfPending(id, patch) {
      const r = rows.find(x => x.razorpay_order_id === id && x.status === 'pending');
      if (!r) return false;
      Object.assign(r, { status: 'active', expires_at: patch.expires_at, billing_cycle: patch.billing_cycle });
      store.activations++;
      return true;
    },
    async updateProfileTier(userId, tier, expiresAt) {
      if (opts.profileFails) return { ok: false };
      profiles.set(userId, { tier, expiresAt });
      return { ok: true };
    },
  };
  return store;
}

function fakeRazorpay(payments: RazorpayPayment[], opts: { captureTo?: string } = {}) {
  const calls = { capture: 0 };
  const api: RazorpayApi & { calls: typeof calls } = {
    calls,
    async getPayment(id) { return payments.find(p => p.id === id) ?? null; },
    async listOrderPayments(orderId) { return payments.filter(p => p.order_id === orderId); },
    async capture(id) {
      calls.capture++;
      const p = payments.find(x => x.id === id);
      if (p && opts.captureTo) p.status = opts.captureTo;
      return p ? { ...p } : null;
    },
  };
  return api;
}

const ORDER = 'order_TEST1';
const USER = '00000000-0000-4000-8000-000000000001';
const pending = (over: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  id: 'sub1', user_id: USER, tier: 'pro', billing_cycle: 'yearly', amount: 59988, status: 'pending', razorpay_order_id: ORDER, ...over,
});
const pay = (over: Partial<RazorpayPayment> = {}): RazorpayPayment => ({ id: 'pay_1', order_id: ORDER, amount: 5998800, currency: 'INR', status: 'captured', ...over });
const NOW = () => new Date('2026-10-13T10:00:00Z');

describe('activateOrder', () => {
  test('captured payment activates the plan and updates the profile', async () => {
    const store = memStore([pending()]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1', expectedUserId: USER });
    expect(r.ok && r.activated).toBe(true);
    expect(store.rows[0].status).toBe('active');
    expect(store.rows[0].expires_at).toBe('2027-10-13T10:00:00.000Z');
    expect(store.profiles.get(USER)).toEqual({ tier: 'pro', expiresAt: '2027-10-13T10:00:00.000Z' });
  });

  test('replayed callback, webhook after callback and reconcile do not activate twice or extend expiry', async () => {
    const store = memStore([pending()]);
    const rp = fakeRazorpay([pay()]);
    const a = await activateOrder({ store, razorpay: rp, now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    const later = () => new Date('2026-12-01T00:00:00Z');
    const b = await activateOrder({ store, razorpay: rp, now: later }, { orderId: ORDER, paymentId: 'pay_1' });
    const c = await activateOrder({ store, razorpay: rp, now: later }, { orderId: ORDER });
    expect(a.ok && a.activated).toBe(true);
    expect(b.ok && !b.activated).toBe(true);
    expect(c.ok && !c.activated).toBe(true);
    expect(store.activations).toBe(1);
    expect(store.rows[0].expires_at).toBe('2027-10-13T10:00:00.000Z');
  });

  test('concurrent callers activate exactly once', async () => {
    const store = memStore([pending()]);
    const rp = fakeRazorpay([pay()]);
    const results = await Promise.all(Array.from({ length: 8 }, () => activateOrder({ store, razorpay: rp, now: NOW }, { orderId: ORDER, paymentId: 'pay_1' })));
    expect(store.activations).toBe(1);
    expect(results.every(r => r.ok)).toBe(true);
    expect(results.filter(r => r.ok && r.activated).length).toBe(1);
  });

  test('payment not captured (created/failed) never grants the plan', async () => {
    for (const status of ['created', 'failed', 'refunded']) {
      const store = memStore([pending()]);
      const r = await activateOrder({ store, razorpay: fakeRazorpay([pay({ status })]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
      expect(r.ok).toBe(false);
      expect(store.rows[0].status).toBe('pending');
      expect(store.profiles.size).toBe(0);
    }
  });

  test('authorised payment is captured, then activates; a failed capture does not', async () => {
    const okStore = memStore([pending()]);
    const rp = fakeRazorpay([pay({ status: 'authorized' })], { captureTo: 'captured' });
    const ok = await activateOrder({ store: okStore, razorpay: rp, now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(ok.ok && ok.activated).toBe(true);
    expect(rp.calls.capture).toBe(1);

    const badStore = memStore([pending()]);
    const bad = await activateOrder({ store: badStore, razorpay: fakeRazorpay([pay({ status: 'authorized' })]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(bad.ok).toBe(false);
    expect(badStore.rows[0].status).toBe('pending');
  });

  test('wrong amount, wrong order or wrong currency is refused', async () => {
    for (const p of [pay({ amount: 100 }), pay({ order_id: 'order_OTHER' }), pay({ currency: 'USD' })]) {
      const store = memStore([pending()]);
      const r = await activateOrder({ store, razorpay: fakeRazorpay([p]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
      expect(r.ok).toBe(false);
      expect(store.rows[0].status).toBe('pending');
    }
  });

  test("another user's order cannot be activated through someone else's session", async () => {
    const store = memStore([pending()]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1', expectedUserId: '00000000-0000-4000-8000-0000000000ff' });
    expect(r.ok).toBe(false);
    expect(store.rows[0].status).toBe('pending');
  });

  test('unknown order is refused', async () => {
    const r = await activateOrder({ store: memStore([]), razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok === false && r.code).toBe('order_missing');
  });

  test('reconcile without payment id picks the captured attempt among failed ones', async () => {
    const store = memStore([pending()]);
    const rp = fakeRazorpay([pay({ id: 'pay_a', status: 'failed' }), pay({ id: 'pay_b', status: 'captured' })]);
    const r = await activateOrder({ store, razorpay: rp, now: NOW }, { orderId: ORDER });
    expect(r.ok && r.activated && r.payment.id).toBe('pay_b');
  });

  test('no payment on the order yet leaves it pending', async () => {
    const store = memStore([pending()]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([]), now: NOW }, { orderId: ORDER });
    expect(r.ok === false && r.code).toBe('no_payment');
    expect(store.rows[0].status).toBe('pending');
  });

  test('a failed profile write still activates the subscription and reports it', async () => {
    const store = memStore([pending()], { profileFails: true });
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok && r.activated && !r.profileUpdated).toBe(true);
    expect(store.rows[0].status).toBe('active');
  });

  test('cancelled or expired order is not re-activated by a late payment event', async () => {
    const store = memStore([pending({ status: 'cancelled' })]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok === false && r.code).toBe('order_not_activatable');
  });

  test('monthly cycle expires one month later; Essential amount in paise', async () => {
    const store = memStore([pending({ tier: 'basic', billing_cycle: 'monthly', amount: 1999 })]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay({ amount: 199900 })]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok && r.expiresAt).toBe('2026-11-13T10:00:00.000Z');
    expect(expectedPaise({ amount: 1999 })).toBe(199900);
    expect(paymentMatchesOrder(pay({ amount: 199900 }), ORDER, 199900)).toBe(true);
  });
});

describe('blocksNewOrder (no double charge)', () => {
  const now = new Date('2026-10-13T00:00:00Z');
  test('same or higher active plan with >30 days left blocks a new checkout', () => {
    expect(blocksNewOrder('pro', [{ tier: 'pro', expires_at: '2027-06-01T00:00:00Z' }], now)).not.toBeNull();
    expect(blocksNewOrder('basic', [{ tier: 'pro', expires_at: '2027-06-01T00:00:00Z' }], now)).not.toBeNull();
  });
  test('upgrades and renewals within 30 days are allowed', () => {
    expect(blocksNewOrder('pro', [{ tier: 'basic', expires_at: '2027-06-01T00:00:00Z' }], now)).toBeNull();
    expect(blocksNewOrder('pro', [{ tier: 'pro', expires_at: '2026-11-01T00:00:00Z' }], now)).toBeNull();
    expect(blocksNewOrder('pro', [], now)).toBeNull();
  });
});

describe('strongerPlan (server scan limits)', () => {
  const now = new Date('2026-10-13T00:00:00Z');
  test('an active paid subscription wins over a stale profile copy', () => {
    const p = strongerPlan({ tier: 'snapshot', expiresAt: null }, { tier: 'pro', expiresAt: '2027-10-13T00:00:00Z' }, now);
    expect(p.tier).toBe('pro');
  });
  test('an expired subscription does not raise the plan', () => {
    const p = strongerPlan({ tier: 'snapshot', expiresAt: null }, { tier: 'pro', expiresAt: '2026-01-01T00:00:00Z' }, now);
    expect(p.tier).toBe('snapshot');
  });
  test('no subscription leaves the profile plan unchanged (manual grants preserved)', () => {
    const p = strongerPlan({ tier: 'scale', expiresAt: null }, { tier: undefined, expiresAt: undefined }, now);
    expect(p.tier).toBe('scale');
  });
});

describe('signature helpers', () => {
  test('HMAC matches Node crypto and comparison is exact', async () => {
    const { hmacSha256Hex, timingSafeEqual } = await import('../supabase/functions/_shared/razorpayServer');
    const { createHmac } = await import('node:crypto');
    const body = '{"event":"payment.captured","payload":{}}';
    const mine = await hmacSha256Hex(body, 'whsec_test');
    expect(mine).toBe(createHmac('sha256', 'whsec_test').update(body).digest('hex'));
    expect(timingSafeEqual(mine, mine)).toBe(true);
    expect(timingSafeEqual(mine, mine.slice(0, -1) + (mine.endsWith('0') ? '1' : '0'))).toBe(false);
    expect(timingSafeEqual(mine, '')).toBe(false);
  });
});
