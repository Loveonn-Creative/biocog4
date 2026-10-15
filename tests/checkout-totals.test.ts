import { describe, expect, test } from 'bun:test';
import {
  GST_RATE, PLATFORM_FEE_RATE, checkoutTotal, isPaymentMethod, upiSavingPaise,
} from '../supabase/functions/_shared/checkoutTotals';
import { LAUNCH_PRICES } from '../supabase/functions/_shared/planPricing';
import {
  activateOrder, type RazorpayApi, type RazorpayPayment, type SubscriptionRow, type SubscriptionStore,
} from '../supabase/functions/_shared/razorpayActivation';
import { checkoutDisplayConfig } from '../src/lib/pricing/checkoutDisplay';

describe('checkout totals', () => {
  test('rates are the owner-set constants', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.04);
    expect(GST_RATE).toBe(0.18);
  });

  test('Essential yearly: ₹5,988 → UPI ₹7,065.84, Razorpay ₹7,348.47', () => {
    expect(LAUNCH_PRICES.basic.yearly).toBe(598800);
    expect(checkoutTotal(598800, 'upi')).toEqual({ method: 'upi', basePaise: 598800, feePaise: 0, gstPaise: 107784, totalPaise: 706584 });
    expect(checkoutTotal(598800, 'razorpay')).toEqual({ method: 'razorpay', basePaise: 598800, feePaise: 23952, gstPaise: 112095, totalPaise: 734847 });
    expect(upiSavingPaise(598800)).toBe(28263);
  });

  test('every listed plan: fee then GST on price + fee, rounded to the paisa', () => {
    for (const plan of ['basic', 'pro'] as const) {
      for (const cycle of ['monthly', 'yearly'] as const) {
        const base = LAUNCH_PRICES[plan][cycle];
        const r = checkoutTotal(base, 'razorpay');
        expect(r.feePaise).toBe(Math.round(base * 0.04));
        expect(r.gstPaise).toBe(Math.round((base + r.feePaise) * 0.18));
        expect(r.totalPaise).toBe(base + r.feePaise + r.gstPaise);
        expect(Math.abs(r.totalPaise - base * 1.04 * 1.18)).toBeLessThanOrEqual(1);
        const u = checkoutTotal(base, 'upi');
        expect(u.feePaise).toBe(0);
        expect(u.totalPaise).toBe(base + Math.round(base * 0.18));
        expect(r.totalPaise).toBeGreaterThan(u.totalPaise);
      }
    }
    expect(checkoutTotal(LAUNCH_PRICES.pro.yearly, 'razorpay').totalPaise).toBe(7361727);
    expect(checkoutTotal(LAUNCH_PRICES.basic.monthly, 'razorpay').totalPaise).toBe(245317);
  });

  test('bad input is refused; only two methods exist', () => {
    expect(() => checkoutTotal(0, 'upi')).toThrow();
    expect(() => checkoutTotal(100.5, 'upi')).toThrow();
    expect(isPaymentMethod('upi')).toBe(true);
    expect(isPaymentMethod('card')).toBe(false);
    expect(isPaymentMethod(undefined)).toBe(false);
  });

  test('Checkout shows only UPI for a UPI order, and hides UPI for a card order', () => {
    const upi = JSON.stringify(checkoutDisplayConfig('upi'));
    expect(upi).toContain('"method":"upi"');
    expect(upi).not.toContain('"card"');
    const card = JSON.stringify(checkoutDisplayConfig('razorpay'));
    expect(card).not.toContain('"upi"');
    expect(card).toContain('"show_default_blocks":false');
  });
});

// ---- activation against the Razorpay order amount ----

const ORDER = 'order_FEE1';
const USER = '00000000-0000-4000-8000-000000000009';
const row = (): SubscriptionRow => ({ id: 's1', user_id: USER, tier: 'basic', billing_cycle: 'yearly', amount: 5988, status: 'pending', razorpay_order_id: ORDER });

function store(rows: SubscriptionRow[]) {
  const profiles = new Map<string, string>();
  const s: SubscriptionStore & { profiles: Map<string, string> } = {
    profiles,
    async findByOrderId(id) { const r = rows.find((x) => x.razorpay_order_id === id); return r ? { ...r } : null; },
    async activateIfPending(id, patch) {
      const r = rows.find((x) => x.razorpay_order_id === id && x.status === 'pending');
      if (!r) return false;
      Object.assign(r, { status: 'active', ...patch });
      return true;
    },
    async updateProfileTier(userId, tier) { profiles.set(userId, tier); return { ok: true }; },
  };
  return s;
}
const api = (payment: RazorpayPayment, orderPaise: number | null): RazorpayApi => ({
  async getPayment(id) { return id === payment.id ? payment : null; },
  async listOrderPayments() { return [payment]; },
  async capture() { return payment; },
  async getOrderAmount() { return orderPaise; },
});
const NOW = () => new Date('2026-10-15T10:00:00Z');

describe('activation with GST and platform fee', () => {
  const total = checkoutTotal(598800, 'razorpay').totalPaise;
  const pay = (amount: number): RazorpayPayment => ({ id: 'pay_f', order_id: ORDER, amount, currency: 'INR', status: 'captured' });

  test('a card payment of the full total activates Essential and updates the profile', async () => {
    const s = store([row()]);
    const r = await activateOrder({ store: s, razorpay: api(pay(total), total), now: NOW }, { orderId: ORDER, paymentId: 'pay_f', expectedUserId: USER });
    expect(r.ok && r.activated).toBe(true);
    expect(s.profiles.get(USER)).toBe('basic');
  });

  test('a UPI payment of price + GST activates too', async () => {
    const upi = checkoutTotal(598800, 'upi').totalPaise;
    const s = store([row()]);
    const r = await activateOrder({ store: s, razorpay: api(pay(upi), upi), now: NOW }, { orderId: ORDER, paymentId: 'pay_f' });
    expect(r.ok && r.activated).toBe(true);
  });

  test('paying only the list price on a fee order is refused', async () => {
    const s = store([row()]);
    const r = await activateOrder({ store: s, razorpay: api(pay(598800), total), now: NOW }, { orderId: ORDER, paymentId: 'pay_f' });
    expect(r).toEqual({ ok: false, code: 'payment_mismatch', detail: 'payment does not belong to this order or amount differs' });
    expect(s.profiles.size).toBe(0);
  });

  test('order amount not readable: retry later (202), never a refusal or a grant', async () => {
    const s = store([row()]);
    const r = await activateOrder({ store: s, razorpay: api(pay(total), null), now: NOW }, { orderId: ORDER, paymentId: 'pay_f' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('no_payment');
    expect(s.profiles.size).toBe(0);
  });

  test('without getOrderAmount (older callers) the stored list price is used, as before', async () => {
    const s = store([row()]);
    const legacy: RazorpayApi = { ...api(pay(598800), null) };
    delete (legacy as Partial<RazorpayApi>).getOrderAmount;
    const r = await activateOrder({ store: s, razorpay: legacy, now: NOW }, { orderId: ORDER, paymentId: 'pay_f' });
    expect(r.ok && r.activated).toBe(true);
  });
});
