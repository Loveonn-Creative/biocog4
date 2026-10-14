// Server adapters for razorpayActivation.ts: the Razorpay REST API, the
// service-role Supabase store, and signature helpers. Used only by edge
// functions (they pass in a service-role client and the Razorpay keys).
import type { RazorpayApi, RazorpayPayment, RevocationStore, SubscriptionRow, SubscriptionStore } from './razorpayActivation.ts';

export async function hmacSha256Hex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison, so signature checks do not leak prefixes. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function mask(id: string | null | undefined): string {
  if (!id) return '';
  return id.length > 8 ? `${id.slice(0, 4)}***${id.slice(-4)}` : '***';
}

const toPayment = (p: Record<string, unknown> | null): RazorpayPayment | null =>
  p && typeof p.id === 'string'
    ? { id: p.id, order_id: typeof p.order_id === 'string' ? p.order_id : null, amount: Number(p.amount), currency: String(p.currency ?? ''), status: String(p.status ?? '') }
    : null;

export function razorpayApi(keyId: string, keySecret: string, fetcher: typeof fetch = fetch): RazorpayApi {
  const auth = 'Basic ' + btoa(`${keyId}:${keySecret}`);
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetcher(`https://api.razorpay.com/v1${path}`, { ...init, headers: { Authorization: auth, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    if (!res.ok) {
      // 4xx on capture means "already captured" or invalid; callers re-read state.
      console.error('Razorpay API error', path.split('/').slice(0, 3).join('/'), res.status);
      return null;
    }
    return res.json();
  };
  return {
    async getPayment(id) { return toPayment(await call(`/payments/${encodeURIComponent(id)}`)); },
    async listOrderPayments(orderId) {
      const body = await call(`/orders/${encodeURIComponent(orderId)}/payments`);
      const items = Array.isArray(body?.items) ? body.items : [];
      return items.map((i: Record<string, unknown>) => toPayment(i)).filter(Boolean) as RazorpayPayment[];
    },
    async capture(id, amount, currency) {
      const captured = toPayment(await call(`/payments/${encodeURIComponent(id)}/capture`, { method: 'POST', body: JSON.stringify({ amount, currency }) }));
      // If capture failed because it was already captured, read the current state.
      return captured ?? toPayment(await call(`/payments/${encodeURIComponent(id)}`));
    },
  };
}

// deno-lint-ignore no-explicit-any
export function supabaseStore(admin: any): SubscriptionStore & RevocationStore {
  const cols = 'id, user_id, tier, billing_cycle, amount, status, razorpay_order_id, expires_at, created_at';
  return {
    async findByOrderId(orderId) {
      const { data, error } = await admin.from('subscriptions').select(cols).eq('razorpay_order_id', orderId).maybeSingle();
      if (error) throw new Error(`subscription lookup failed: ${error.code ?? 'unknown'}`);
      return (data as SubscriptionRow) ?? null;
    },
    async listActiveForUser(userId) {
      const { data, error } = await admin.from('subscriptions').select(cols).eq('user_id', userId).eq('status', 'active');
      if (error) throw new Error(`active lookup failed: ${error.code ?? 'unknown'}`);
      return (data as SubscriptionRow[]) ?? [];
    },
    async findByPaymentId(paymentId) {
      const { data, error } = await admin.from('subscriptions').select(cols).eq('razorpay_payment_id', paymentId).maybeSingle();
      if (error) throw new Error(`subscription lookup failed: ${error.code ?? 'unknown'}`);
      return (data as SubscriptionRow) ?? null;
    },
    async cancelIfActive(subscriptionId) {
      const { data, error } = await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', subscriptionId).eq('status', 'active').select('id');
      if (error) throw new Error(`cancel write failed: ${error.code ?? 'unknown'}`);
      return Array.isArray(data) && data.length > 0;
    },
    async activateIfPending(orderId, patch) {
      const { data, error } = await admin
        .from('subscriptions')
        .update({ ...patch, status: 'active' })
        .eq('razorpay_order_id', orderId)
        .eq('status', 'pending')
        .select('id');
      if (error) throw new Error(`activation write failed: ${error.code ?? 'unknown'}`);
      return Array.isArray(data) && data.length > 0;
    },
    async updateProfileTier(userId, tier, expiresAt) {
      // Retry once: the subscription row is already active, and the extraction
      // function also reads active subscriptions, so a failed profile write
      // cannot cost the customer access, but it is logged for follow-up.
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await admin.from('profiles').update({ subscription_tier: tier, subscription_expires_at: expiresAt }).eq('id', userId);
        if (!error) return { ok: true };
        console.error('Profile tier update failed', { user: mask(userId), attempt, code: error.code ?? 'unknown' });
      }
      return { ok: false };
    },
  };
}

/** Pending orders for a user, newest first, created within `days`. */
// deno-lint-ignore no-explicit-any
export async function recentPendingOrders(admin: any, userId: string, days = 30): Promise<string[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await admin
    .from('subscriptions')
    .select('razorpay_order_id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('created_at', since)
    .not('razorpay_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`pending lookup failed: ${error.code ?? 'unknown'}`);
  return (data ?? []).map((r: { razorpay_order_id: string }) => r.razorpay_order_id);
}

/** Fire the invoice email for a newly activated plan. Never throws. */
// deno-lint-ignore no-explicit-any
export async function triggerInvoice(admin: any, supabaseUrl: string, serviceKey: string, a: { userId: string; tier: string; cycle: string; subscriptionId: string; amount: number; currency: string; paymentId: string; orderId: string }) {
  try {
    const { data } = await admin.auth.admin.getUserById(a.userId);
    const email = data?.user?.email;
    if (!email) return;
    await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}`, 'x-internal-service-role': serviceKey },
      body: JSON.stringify({
        userId: a.userId, email, tier: a.tier, billingCycle: a.cycle, subscriptionId: a.subscriptionId,
        amount: a.amount, currency: a.currency, transactionId: a.paymentId, orderId: a.orderId,
      }),
    });
  } catch {
    console.error('Failed to trigger invoice generation');
  }
}

/** Order amount, currency and notes, as Razorpay holds them (notes are set server-side at order creation). */
export async function fetchOrder(keyId: string, keySecret: string, orderId: string): Promise<{ amount: number; currency: string; notes: Record<string, unknown> } | null> {
  try {
    const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`) } });
    if (!res.ok) return null;
    const o = await res.json();
    return { amount: Number(o.amount) || 0, currency: String(o.currency || 'INR'), notes: (o.notes && typeof o.notes === 'object') ? o.notes : {} };
  } catch {
    return null;
  }
}

/**
 * Marks the admin-issued Scale quote behind a paid order as consumed so it
 * cannot fund another order. Tolerates the table not existing yet (pending
 * migration) and never blocks activation: the customer has already paid.
 */
// deno-lint-ignore no-explicit-any
export async function consumeScaleQuote(admin: any, quoteId: string, userId: string, orderId: string) {
  try {
    const { data, error } = await admin
      .from('scale_price_quotes')
      .update({ status: 'consumed', consumed_at: new Date().toISOString(), consumed_order_id: orderId })
      .eq('id', quoteId).eq('user_id', userId).eq('status', 'active')
      .select('id');
    if (error) console.error('Scale quote consume failed:', error.code === '42P01' ? 'table missing' : error.code);
    else if (!data || data.length === 0) console.error('Scale quote was not active at consumption time; review manually:', { order: mask(orderId) });
  } catch {
    console.error('Scale quote consume error');
  }
}

/** Everything that follows a first-time activation: Scale quote, invoice email. */
// deno-lint-ignore no-explicit-any
export async function afterActivation(admin: any, env: { supabaseUrl: string; serviceKey: string; keyId: string; keySecret: string }, a: { userId: string; tier: string; cycle: string; subscriptionId: string; paymentId: string; orderId: string }) {
  const order = await fetchOrder(env.keyId, env.keySecret, a.orderId);
  const quoteId = typeof order?.notes?.scale_quote_id === 'string' ? order.notes.scale_quote_id : null;
  if (a.tier === 'scale' && quoteId) await consumeScaleQuote(admin, quoteId, a.userId, a.orderId);
  await triggerInvoice(admin, env.supabaseUrl, env.serviceKey, { ...a, amount: order?.amount ?? 0, currency: order?.currency ?? 'INR' });
}
