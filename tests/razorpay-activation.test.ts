import { describe, expect, test } from 'bun:test';
import {
  activateOrder, blocksNewOrder, computeExpiry, expectedPaise, paymentMatchesOrder, revokeRefundedPayment,
  type RazorpayApi, type RazorpayPayment, type SubscriptionRow, type SubscriptionStore,
} from '../supabase/functions/_shared/razorpayActivation';
import { effectivePlanTier, planStatus, strongerPlan, strongestRow, GRACE_DAYS } from '../supabase/functions/_shared/planLimits';
import { LAUNCH_PRICES, orderPrice, regularPrice } from '../supabase/functions/_shared/planPricing';

// In-memory store with the same conditional-update semantics as the
// Postgres query (UPDATE ... WHERE status = 'pending').
function memStore(rows: SubscriptionRow[], opts: { profileFails?: boolean } = {}) {
  const profiles = new Map<string, { tier: string; expiresAt: string | null }>();
  const store: SubscriptionStore & { profiles: typeof profiles; rows: SubscriptionRow[]; activations: number } = {
    rows, profiles, activations: 0,
    async findByOrderId(id) { const r = rows.find(x => x.razorpay_order_id === id); return r ? { ...r } : null; },
    async activateIfPending(id, patch) {
      const r = rows.find(x => x.razorpay_order_id === id && x.status === 'pending');
      if (!r) return false;
      Object.assign(r, { status: 'active', expires_at: patch.expires_at, billing_cycle: patch.billing_cycle, starts_at: patch.starts_at, razorpay_payment_id: patch.razorpay_payment_id });
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

// Store with the lookups the lifecycle needs (all active rows, by payment id,
// conditional cancel), same semantics as razorpayServer.supabaseStore.
type Row = SubscriptionRow & { razorpay_payment_id?: string; starts_at?: string };
function lifecycleStore(rows: Row[], profile?: { tier: string; expiresAt: string | null }) {
  const base = memStore(rows);
  if (profile) base.profiles.set(USER, profile);
  return Object.assign(base, {
    async listActiveForUser(userId: string) { return rows.filter(r => r.user_id === userId && r.status === 'active').map(r => ({ ...r })); },
    async findByPaymentId(id: string) { const r = rows.find(x => x.razorpay_payment_id === id); return r ? { ...r } : null; },
    async cancelIfActive(id: string) { const r = rows.find(x => x.id === id && x.status === 'active'); if (!r) return false; r.status = 'cancelled'; return true; },
  });
}
const activeRow = (over: Partial<Row>): Row => ({ id: 'old', user_id: USER, tier: 'pro', billing_cycle: 'yearly', amount: 59988, status: 'active', razorpay_order_id: 'order_OLD', razorpay_payment_id: 'pay_old', expires_at: '2026-11-02T10:00:00.000Z', ...over });

describe('renewals and plan changes', () => {
  test('renewing early starts when the current period ends: no days lost', async () => {
    const store = lifecycleStore([activeRow({}), pending()]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok && r.expiresAt).toBe('2027-11-02T10:00:00.000Z');
    expect(store.rows[1].starts_at).toBe('2026-11-02T10:00:00.000Z');
    expect(store.profiles.get(USER)).toEqual({ tier: 'pro', expiresAt: '2027-11-02T10:00:00.000Z' });
  });
  test('renewing during grace starts at payment: grace days are not charged', async () => {
    const store = lifecycleStore([activeRow({ expires_at: '2026-10-10T10:00:00.000Z' }), pending()]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok && r.expiresAt).toBe('2027-10-13T10:00:00.000Z');
  });
  test('an upgrade starts now and becomes the plan in force', async () => {
    const store = lifecycleStore([activeRow({ tier: 'basic', amount: 5988 }), pending()]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay()]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok && r.expiresAt).toBe('2027-10-13T10:00:00.000Z');
    expect(store.profiles.get(USER)?.tier).toBe('pro');
  });
  test('a lower plan bought while a higher one runs starts after it and never downgrades access', async () => {
    const store = lifecycleStore([activeRow({}), pending({ tier: 'basic', amount: 5988 })], { tier: 'pro', expiresAt: '2026-11-02T10:00:00.000Z' });
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay({ amount: 598800 })]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok && r.expiresAt).toBe('2027-11-02T10:00:00.000Z');
    expect(store.profiles.get(USER)?.tier).toBe('pro');
    expect(strongestRow(store.rows, new Date('2026-10-20T00:00:00Z'))?.tier).toBe('pro');
    expect(strongestRow(store.rows, new Date('2026-12-01T00:00:00Z'))?.tier).toBe('basic');
  });
  test('two orders paid at once: both activate once each and the plan is extended, not lost', async () => {
    const rows = [activeRow({}), pending(), pending({ id: 'sub2', razorpay_order_id: 'order_TEST2' })];
    const store = lifecycleStore(rows);
    const api = fakeRazorpay([pay(), pay({ id: 'pay_2', order_id: 'order_TEST2' })]);
    await activateOrder({ store, razorpay: api, now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    await activateOrder({ store, razorpay: api, now: NOW }, { orderId: 'order_TEST2', paymentId: 'pay_2' });
    expect(store.activations).toBe(2);
    expect(rows[2].expires_at).toBe('2028-11-02T10:00:00.000Z');
  });
  test('monthly on 31 January ends on the last day of February', () => {
    expect(computeExpiry('monthly', new Date('2027-01-31T10:00:00Z')).toISOString()).toBe('2027-02-28T10:00:00.000Z');
    expect(computeExpiry('monthly', new Date('2028-01-31T10:00:00Z')).toISOString()).toBe('2028-02-29T10:00:00.000Z');
    expect(computeExpiry('yearly', new Date('2028-02-29T10:00:00Z')).toISOString()).toBe('2029-02-28T10:00:00.000Z');
  });
});

describe('grace period', () => {
  const end = '2026-10-01T00:00:00.000Z';
  test(`a lapsed plan keeps access for ${GRACE_DAYS} days, then moves to Snapshot`, () => {
    expect(planStatus('pro', end, new Date('2026-09-30T00:00:00Z'))).toMatchObject({ plan: 'pro', state: 'active' });
    expect(planStatus('pro', end, new Date('2026-10-05T00:00:00Z'))).toMatchObject({ plan: 'pro', state: 'grace', graceEndsAt: '2026-10-08T00:00:00.000Z' });
    expect(planStatus('pro', end, new Date('2026-10-08T00:00:01Z'))).toMatchObject({ plan: 'snapshot', state: 'lapsed' });
    expect(effectivePlanTier('basic', end, new Date('2026-10-07T23:59:59Z'))).toBe('essential');
  });
  test('free accounts and manual grants without an end date are unaffected', () => {
    expect(planStatus('snapshot', null)).toMatchObject({ plan: 'snapshot', state: 'none' });
    expect(planStatus('pro', null)).toMatchObject({ plan: 'pro', state: 'active' });
  });
});

describe('refunds', () => {
  const refunded = (status = 'refunded') => fakeRazorpay([pay({ id: 'pay_old', order_id: 'order_OLD', status })]);
  test('a full refund ends the plan it paid for, keeps the record, and the profile falls back', async () => {
    const store = lifecycleStore([activeRow({})], { tier: 'pro', expiresAt: '2026-11-02T10:00:00.000Z' });
    const r = await revokeRefundedPayment({ store, razorpay: refunded(), now: NOW }, 'pay_old');
    expect(r).toMatchObject({ ok: true, revoked: true, profileTier: 'snapshot' });
    expect(store.rows[0]).toMatchObject({ status: 'cancelled', expires_at: '2026-11-02T10:00:00.000Z', razorpay_payment_id: 'pay_old' });
    expect(store.profiles.get(USER)).toEqual({ tier: 'snapshot', expiresAt: null });
  });
  test('another paid plan still in force stays in force', async () => {
    const store = lifecycleStore([activeRow({}), activeRow({ id: 'b', tier: 'basic', razorpay_payment_id: 'pay_b', expires_at: '2027-01-01T00:00:00.000Z' })]);
    const r = await revokeRefundedPayment({ store, razorpay: refunded(), now: NOW }, 'pay_old');
    expect(r.ok && r.profileTier).toBe('basic');
  });
  test('a duplicate refund event changes nothing more; a partial refund changes nothing', async () => {
    const store = lifecycleStore([activeRow({})]);
    await revokeRefundedPayment({ store, razorpay: refunded(), now: NOW }, 'pay_old');
    expect(await revokeRefundedPayment({ store, razorpay: refunded(), now: NOW }, 'pay_old')).toMatchObject({ ok: true, revoked: false });
    const partial = lifecycleStore([activeRow({})]);
    expect(await revokeRefundedPayment({ store: partial, razorpay: refunded('captured'), now: NOW }, 'pay_old')).toMatchObject({ ok: false, code: 'not_fully_refunded' });
    expect(partial.rows[0].status).toBe('active');
  });
  test('a refund that arrives before activation: the order never activates', async () => {
    const store = lifecycleStore([pending()]);
    const r = await activateOrder({ store, razorpay: fakeRazorpay([pay({ status: 'refunded' })]), now: NOW }, { orderId: ORDER, paymentId: 'pay_1' });
    expect(r.ok === false && r.code).toBe('not_captured');
    expect(store.rows[0].status).toBe('pending');
  });
});

describe('launch and regular pricing', () => {
  const T = new Date('2027-03-01T00:00:00Z');
  test('regular pricing off (today): everyone pays the launch price', () => {
    expect(orderPrice('pro', 'yearly', [], T, null)).toEqual({ paise: 5998800, name: 'Biocog Pro', basis: 'launch' });
    expect(orderPrice('basic', 'monthly', [], T, null).paise).toBe(LAUNCH_PRICES.basic.monthly);
  });
  test('regular price is exactly 2.5x launch, in paise', () => {
    expect(regularPrice('basic', 'yearly')).toBe(1497000);
    expect(regularPrice('pro', 'monthly')).toBe(2499750);
  });
  test('once regular pricing starts: a launch customer still in force (or in grace) renews at launch price', () => {
    const from = '2027-01-01T00:00:00Z';
    expect(orderPrice('pro', 'yearly', [{ tier: 'pro', amount: 59988, expires_at: '2027-06-01T00:00:00Z' }], T, from).basis).toBe('launch_retained');
    expect(orderPrice('pro', 'yearly', [{ tier: 'pro', amount: 59988, expires_at: '2027-02-25T00:00:00Z' }], T, from).basis).toBe('launch_retained');
  });
  test('after lapsing past grace, a new customer, or a different plan: regular price', () => {
    const from = '2027-01-01T00:00:00Z';
    expect(orderPrice('pro', 'yearly', [{ tier: 'pro', amount: 59988, expires_at: '2027-02-20T00:00:00Z' }], T, from)).toMatchObject({ paise: 14997000, basis: 'regular' });
    expect(orderPrice('pro', 'yearly', [], T, from).basis).toBe('regular');
    expect(orderPrice('pro', 'yearly', [{ tier: 'basic', amount: 5988, expires_at: '2027-06-01T00:00:00Z' }], T, from).basis).toBe('regular');
    expect(orderPrice('pro', 'yearly', [{ tier: 'pro', amount: 149970, expires_at: '2027-06-01T00:00:00Z' }], T, from).basis).toBe('regular');
  });
});
