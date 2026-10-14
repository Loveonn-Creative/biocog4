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
  /**
   * The user's subscriptions with status 'active' (any expiry). Optional for
   * older callers: without it a new period starts at payment time and the
   * profile copy is always set to the plan just bought.
   */
  listActiveForUser?(userId: string): Promise<SubscriptionRow[]>;
  /** Sets the row active only if it is still pending; returns true when this call activated it. */
  activateIfPending(orderId: string, patch: { razorpay_payment_id: string; billing_cycle: 'monthly' | 'yearly'; starts_at: string; expires_at: string }): Promise<boolean>;
  updateProfileTier(userId: string, tier: string, expiresAt: string | null): Promise<{ ok: boolean }>;
}

export type ActivationResult =
  | { ok: true; activated: boolean; tier: string; cycle: 'monthly' | 'yearly'; expiresAt: string | null; subscriptionId: string; userId: string; payment: RazorpayPayment; profileUpdated: boolean }
  | { ok: false; code: 'order_missing' | 'no_payment' | 'payment_mismatch' | 'not_captured' | 'order_not_activatable'; detail?: string };

export const normalizeCycle = (c: unknown): 'monthly' | 'yearly' => (c === 'monthly' ? 'monthly' : 'yearly');

/**
 * End of a paid period. Calendar months and years, clamped to the last day of
 * the target month (31 January + 1 month = 28 or 29 February, not 3 March).
 */
export function computeExpiry(cycle: 'monthly' | 'yearly', from = new Date()): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

const RANK_OF = (tier: string) => ({ snapshot: 0, basic: 1, essential: 1, pro: 2, scale: 3 } as Record<string, number>)[tier] ?? 0;

/**
 * When a newly paid period starts. A renewal of the same plan, or a purchase
 * of a lower plan, starts when the paid time already held on that plan or a
 * higher one ends, so paying early never loses days. An upgrade starts now.
 * Rows in grace (expired) do not push the start: the new period starts at
 * payment, and grace days are not charged.
 */
export function periodStart(tier: string, others: Pick<SubscriptionRow, 'tier' | 'expires_at'>[], now: Date): Date {
  const want = RANK_OF(tier);
  const ends = others
    .filter(o => RANK_OF(o.tier) >= want && o.expires_at)
    .map(o => Date.parse(o.expires_at as string))
    .filter(t => Number.isFinite(t) && t > now.getTime());
  return ends.length ? new Date(Math.max(...ends)) : now;
}

/** Highest plan rank paid and not yet expired among these rows (0 = none). */
function strongestInForce(rows: Pick<SubscriptionRow, 'tier' | 'expires_at'>[], now: Date): number {
  return rows.reduce((m, r) => (r.expires_at && Date.parse(r.expires_at) > now.getTime() ? Math.max(m, RANK_OF(r.tier)) : m), 0);
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
  const at = now();
  const others = deps.store.listActiveForUser ? (await deps.store.listActiveForUser(row.user_id)).filter(o => o.id !== row.id) : [];
  const startsAt = periodStart(row.tier, others, at);
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

  // The profile copy names the plan in force now. A lower plan bought while a
  // higher one runs starts after it, so it does not replace the profile copy;
  // readers fall back to the subscription rows once the higher plan ends.
  if (RANK_OF(row.tier) < strongestInForce(others, at)) {
    return { ok: true, activated: true, tier: row.tier, cycle, expiresAt, subscriptionId: row.id, userId: row.user_id, payment, profileUpdated: true };
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

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------
export interface RevocationStore {
  findByPaymentId(paymentId: string): Promise<SubscriptionRow | null>;
  /** Sets status 'cancelled' only if the row is still active; returns true when this call changed it. expires_at is kept for the record. */
  cancelIfActive(subscriptionId: string): Promise<boolean>;
  listActiveForUser(userId: string): Promise<SubscriptionRow[]>;
  updateProfileTier(userId: string, tier: string, expiresAt: string | null): Promise<{ ok: boolean }>;
}

export type RevocationResult =
  | { ok: true; revoked: boolean; userId: string; subscriptionId: string; profileTier: string }
  | { ok: false; code: 'not_fully_refunded' | 'payment_unknown' | 'subscription_missing'; detail?: string };

/**
 * A fully refunded payment ends the plan it paid for. Razorpay is asked for
 * the payment's state (status 'refunded' means the whole amount came back; a
 * partial refund leaves it 'captured' and changes nothing). The subscription
 * row is marked cancelled once, keeping its payment and dates as the audit
 * record, and the profile copy is set to whatever other paid plan is still in
 * force, or Snapshot. Repeated or late refund events change nothing further.
 */
export async function revokeRefundedPayment(
  deps: { store: RevocationStore; razorpay: Pick<RazorpayApi, 'getPayment'>; now?: () => Date },
  paymentId: string,
): Promise<RevocationResult> {
  const now = (deps.now ?? (() => new Date()))();
  const payment = await deps.razorpay.getPayment(paymentId);
  if (!payment) return { ok: false, code: 'payment_unknown' };
  if (payment.status !== 'refunded') return { ok: false, code: 'not_fully_refunded', detail: payment.status };
  const row = await deps.store.findByPaymentId(paymentId);
  if (!row) return { ok: false, code: 'subscription_missing' };
  if (row.status !== 'active') return { ok: true, revoked: false, userId: row.user_id, subscriptionId: row.id, profileTier: '' };
  const revoked = await deps.store.cancelIfActive(row.id);
  if (!revoked) return { ok: true, revoked: false, userId: row.user_id, subscriptionId: row.id, profileTier: '' };
  const remaining = (await deps.store.listActiveForUser(row.user_id))
    .filter(r => r.id !== row.id && r.expires_at && Date.parse(r.expires_at) > now.getTime())
    .sort((a, b) => RANK_OF(b.tier) - RANK_OF(a.tier) || Date.parse(b.expires_at as string) - Date.parse(a.expires_at as string));
  const next = remaining[0];
  await deps.store.updateProfileTier(row.user_id, next ? next.tier : 'snapshot', next ? next.expires_at ?? null : null);
  return { ok: true, revoked: true, userId: row.user_id, subscriptionId: row.id, profileTier: next ? next.tier : 'snapshot' };
}
