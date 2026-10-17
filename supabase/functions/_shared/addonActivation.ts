// Activates a paid add-on order (credit pack or service order) once Razorpay
// confirms the payment was captured for that order and exact amount. Shared by
// the purchases function (browser callback) and razorpay-webhook, so an order
// activates once even if the callback never arrives or arrives twice.
import type { RazorpayApi } from './razorpayActivation.ts';
import { FAST_TRACK_DUE_HOURS, packExpiry } from './addonPurchases.ts';

export type AddonActivation =
  | { ok: true; activated: boolean; table: 'invoice_credit_packs' | 'service_orders'; userId: string; kind: string; rowId: string }
  | { ok: false; code: 'order_missing' | 'wrong_user' | 'not_captured' | 'amount_mismatch' };

interface Row { id: string; user_id: string; status: string; amount_paise: number; validity?: string; kind?: string; quantity?: number }

// deno-lint-ignore no-explicit-any
export async function activateAddonOrder(admin: any, razorpay: RazorpayApi, a: { orderId: string; paymentId?: string | null; expectedUserId?: string | null; now?: Date }): Promise<AddonActivation> {
  const now = a.now ?? new Date();
  let table: 'invoice_credit_packs' | 'service_orders' = 'invoice_credit_packs';
  let { data: row } = await admin.from('invoice_credit_packs').select('id, user_id, status, amount_paise, validity').eq('razorpay_order_id', a.orderId).maybeSingle() as { data: Row | null };
  if (!row) {
    table = 'service_orders';
    ({ data: row } = await admin.from('service_orders').select('id, user_id, status, amount_paise, kind, quantity').eq('razorpay_order_id', a.orderId).maybeSingle() as { data: Row | null });
  }
  if (!row) return { ok: false, code: 'order_missing' };
  if (a.expectedUserId && row.user_id !== a.expectedUserId) return { ok: false, code: 'wrong_user' };
  const kind = table === 'invoice_credit_packs' ? 'credits' : String(row.kind);
  if (row.status !== 'pending') return { ok: true, activated: false, table, userId: row.user_id, kind, rowId: row.id };

  // The payment must be for this order, in INR, for exactly the stored amount.
  const candidates = a.paymentId ? [await razorpay.getPayment(a.paymentId)] : await razorpay.listOrderPayments(a.orderId);
  let payment = candidates.find((p) => p && p.order_id === a.orderId && p.status === 'captured')
    ?? candidates.find((p) => p && p.order_id === a.orderId && p.status === 'authorized') ?? null;
  if (!payment) return { ok: false, code: 'not_captured' };
  if (payment.currency !== 'INR' || payment.amount !== row.amount_paise) return { ok: false, code: 'amount_mismatch' };
  if (payment.status === 'authorized') payment = await razorpay.capture(payment.id, payment.amount, 'INR');
  if (!payment || payment.status !== 'captured') return { ok: false, code: 'not_captured' };

  const paidAt = now.toISOString();
  const update = table === 'invoice_credit_packs'
    ? { status: 'active', razorpay_payment_id: payment.id, paid_at: paidAt, expires_at: packExpiry(row.validity === 'yearly' ? 'yearly' : 'monthly', now).toISOString() }
    : { status: 'paid', razorpay_payment_id: payment.id, paid_at: paidAt, due_at: row.kind === 'fast_track' ? new Date(now.getTime() + FAST_TRACK_DUE_HOURS * 3_600_000).toISOString() : null };
  // Conditional on 'pending', so two callers cannot both activate.
  const { data: done, error } = await admin.from(table).update(update).eq('id', row.id).eq('status', 'pending').select('id');
  if (error) throw new Error(`activation update failed: ${error.code ?? 'unknown'}`);
  return { ok: true, activated: (done ?? []).length > 0, table, userId: row.user_id, kind, rowId: row.id };
}

/** A refunded add-on payment: the pack stops giving credits; a service order is marked refunded. */
// deno-lint-ignore no-explicit-any
export async function refundAddonPayment(admin: any, paymentId: string): Promise<boolean> {
  const a = await admin.from('invoice_credit_packs').update({ status: 'refunded' }).eq('razorpay_payment_id', paymentId).neq('status', 'refunded').select('id');
  const b = await admin.from('service_orders').update({ status: 'refunded' }).eq('razorpay_payment_id', paymentId).neq('status', 'refunded').select('id');
  return ((a.data ?? []).length + (b.data ?? []).length) > 0;
}
