// One activation path for paid plans, used by verify-razorpay-payment (the
// browser callback), razorpay-webhook (Razorpay's server-to-server events) and
// reconcile-razorpay-payments (recovery for payments whose callback never
// arrived). Pure: storage and the Razorpay API are passed in, so the website
// test runner exercises every branch without network or database.
//
// A plan is activated only after Razorpay itself reports a captured payment
// for this exact order and amount. Activation is a conditional update of the
// pending row, so retries, duplicate events and concurrent callers activate a
// plan at most once and never extend it twice.

export interface SubscriptionRow {
  id: string;
  user_id: string;
  tier: string;
  billing_cycle: string | null;
  amount: number | null; // rupees, as stored by create-razorpay-order
  status: string | null;
  razorpay_order_id: string | null;
  expires_at?: string | null;
  created_at?: string | null;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number; // paise
  currency: string;
  status: string; // created | authorized | captured | refunded | failed
}

export interface RazorpayApi {
  getPayment(paymentId: string): Promise<RazorpayPayment | null>;
  listOrderPayments(orderId: string): Promise<RazorpayPayment[]>;
  capture(paymentId: string, amount: number, currency: string): Promise<RazorpayPayment | null>;
}

export interface SubscriptionStore {
  findByOrderId(orderId: string): Promise<SubscriptionRow | null>;
  /** Sets the row active only if it is still pending; returns true when this call activated it. */
  activateIfPending(orderId: string, patch: { razorpay_payment_id: string; billing_cycle: 'monthly' | 'yearly'; starts_at: string; expires_at: string }): Promise<boolean>;
  updateProfileTier(userId: string, tier: string, expiresAt: string): Promise<{ ok: boolean }>;
}

export type ActivationResult =
  | { ok: true; activated: boolean; tier: string; cycle: 'monthly' | 'yearly'; expiresAt: string | null; subscriptionId: string; userId: string; payment: RazorpayPayment; profileUpdated: boolean }
  | { ok: false; code: 'order_missing' | 'no_payment' | 'payment_mismatch' | 'not_captured' | 'order_not_activatable'; detail?: string };

export const normalizeCycle = (c: unknown): 'monthly' | 'yearly' => (c === 'monthly' ? 'monthly' : 'yearly');

export function computeExpiry(cycle: 'monthly' | 'yearly', from = new Date()): Date {
  const d = new Date(from);
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/** Expected charge in paise for a stored subscription row. */
export const expectedPaise = (row: Pick<SubscriptionRow, 'amount'>): number => Math.round(Number(row.amount ?? 0) * 100);

/**
 * Whether a Razorpay payment is the payment for this order: same order, INR,
 * exact amount. Status is checked separately because an authorised payment
 * can still be captured.
 */
export function paymentMatchesOrder(p: RazorpayPayment, orderId: string, paise: number): boolean {
  return p.order_id === orderId && (p.currency || '').toUpperCase() === 'INR' && Number.isFinite(paise) && paise > 0 && p.amount === paise;
}

/** Order of preference when an order has several payment attempts. */
function pickPayment(payments: RazorpayPayment[], orderId: string, paise: number): RazorpayPayment | null {
  const matching = payments.filter(p => paymentMatchesOrder(p, orderId, paise));
  return matching.find(p => p.status === 'captured') ?? matching.find(p => p.status === 'authorized') ?? null;
}

export async function activateOrder(
  deps: { store: SubscriptionStore; razorpay: RazorpayApi; now?: () => Date },
  input: { orderId: string; paymentId?: string | null; expectedUserId?: string },
): Promise<ActivationResult> {
  const now = deps.now ?? (() => new Date());
  const row = await deps.store.findByOrderId(input.orderId);
  if (!row) return { ok: false, code: 'order_missing' };
  if (input.expectedUserId && row.user_id !== input.expectedUserId) return { ok: false, code: 'order_missing' };

  const paise = expectedPaise(row);

  // Ask Razorpay, never the caller, whether this order was paid.
  let payment: RazorpayPayment | null = null;
  if (input.paymentId) {
    payment = await deps.razorpay.getPayment(input.paymentId);
    if (payment && !paymentMatchesOrder(payment, input.orderId, paise)) {
      return { ok: false, code: 'payment_mismatch', detail: 'payment does not belong to this order or amount differs' };
    }
  } else {
    payment = pickPayment(await deps.razorpay.listOrderPayments(input.orderId), input.orderId, paise);
  }
  if (!payment) return { ok: false, code: 'no_payment' };

  if (payment.status === 'authorized') {
    // Orders normally auto-capture; capture explicitly if this one did not,
    // so the customer is not left with an authorisation that lapses.
    const captured = await deps.razorpay.capture(payment.id, paise, 'INR');
    if (captured && paymentMatchesOrder(captured, input.orderId, paise)) payment = captured;
  }
  if (payment.status !== 'captured') return { ok: false, code: 'not_captured', detail: payment.status };

  if (row.status === 'active') {
    return { ok: true, activated: false, tier: row.tier, cycle: normalizeCycle(row.billing_cycle), expiresAt: row.expires_at ?? null, subscriptionId: row.id, userId: row.user_id, payment, profileUpdated: false };
  }

  const cycle = normalizeCycle(row.billing_cycle);
  const startsAt = now();
  const expiresAt = computeExpiry(cycle, startsAt).toISOString();
  const activated = await deps.store.activateIfPending(input.orderId, {
    razorpay_payment_id: payment.id,
    billing_cycle: cycle,
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt,
  });

  if (!activated) {
    // Someone else activated it between our read and write: report the stored state.
    const current = await deps.store.findByOrderId(input.orderId);
    if (current?.status === 'active') {
      return { ok: true, activated: false, tier: current.tier, cycle: normalizeCycle(current.billing_cycle), expiresAt: current.expires_at ?? null, subscriptionId: current.id, userId: current.user_id, payment, profileUpdated: false };
    }
    return { ok: false, code: 'order_not_activatable', detail: current?.status ?? 'unknown' };
  }

  const profile = await deps.store.updateProfileTier(row.user_id, row.tier, expiresAt);
  return { ok: true, activated: true, tier: row.tier, cycle, expiresAt, subscriptionId: row.id, userId: row.user_id, payment, profileUpdated: profile.ok };
}

/** HTTP status and a customer-safe message for a failed activation. */
export function activationFailure(code: Extract<ActivationResult, { ok: false }>['code']): { status: number; error: string } {
  switch (code) {
    case 'order_missing': return { status: 404, error: 'Order record missing' };
    case 'payment_mismatch': return { status: 400, error: 'Payment does not match this order' };
    case 'no_payment':
    case 'not_captured': return { status: 202, error: 'Payment not yet confirmed by Razorpay' };
    case 'order_not_activatable': return { status: 409, error: 'Order is no longer valid' };
  }
}

const RANK: Record<string, number> = { snapshot: 0, basic: 1, essential: 1, pro: 2, scale: 3 };

/**
 * Whether an existing active plan should stop a new checkout: an active plan
 * of the same or a higher tier with more than `renewWindowDays` left. Earlier
 * renewal and upgrades stay possible.
 */
export function blocksNewOrder(requestedTier: string, active: { tier: string; expires_at: string | null }[], now = new Date(), renewWindowDays = 30): { until: string } | null {
  const want = RANK[requestedTier] ?? 0;
  const horizon = now.getTime() + renewWindowDays * 86_400_000;
  const blocking = active
    .filter(a => a.expires_at && Date.parse(a.expires_at) > horizon && (RANK[a.tier] ?? 0) >= want)
    .sort((x, y) => Date.parse(y.expires_at!) - Date.parse(x.expires_at!))[0];
  return blocking ? { until: blocking.expires_at! } : null;
}
