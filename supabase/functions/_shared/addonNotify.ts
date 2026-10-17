// Paid service orders (Expert Climate Audit, Fast-track Verification) are sent
// to the internal inbox, from server code only. Never throws.
import { internalInbox } from './internalInbox.ts';
import { CREDIT_PACK_INVOICES, SERVICES } from './addonPurchases.ts';
import { checkoutTotal } from './checkoutTotals.ts';

// deno-lint-ignore no-explicit-any
export async function notifyServiceOrder(admin: any, orderRowId: string) {
  const resend = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get('RESEND_API_KEY');
  const inbox = internalInbox();
  if (!resend || !inbox) return;
  try {
    const { data: o } = await admin.from('service_orders').select('id, kind, quantity, due_at, user_id').eq('id', orderRowId).maybeSingle();
    if (!o) return;
    const name = SERVICES[o.kind as keyof typeof SERVICES]?.name ?? o.kind;
    const due = o.due_at ? ` Due by ${new Date(o.due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.` : '';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Senseible Orders <onboarding@resend.dev>', to: [inbox],
        subject: `[Order] ${name}${o.quantity > 1 ? ` × ${o.quantity}` : ''} · ${String(o.id).slice(0, 8)}`,
        html: `<p>A paid order is waiting: ${name}${o.quantity > 1 ? ` × ${o.quantity}` : ''}.${due}</p><p>Order ${o.id}, account ${o.user_id}.</p>`,
      }),
    });
  } catch (e) {
    console.error('Order notification failed:', e instanceof Error ? e.name : 'unknown');
  }
}

/**
 * Sends the tax invoice for a paid add-on through generate-invoice-pdf (which
 * also stores it in invoices, so it appears on the Billing page). Never throws.
 */
// deno-lint-ignore no-explicit-any
export async function sendAddonInvoice(admin: any, env: { supabaseUrl: string; serviceKey: string }, a: { table: 'invoice_credit_packs' | 'service_orders'; rowId: string }) {
  try {
    const cols = a.table === 'invoice_credit_packs' ? 'user_id, credits, base_paise, amount_paise, razorpay_order_id, razorpay_payment_id' : 'user_id, kind, quantity, base_paise, amount_paise, razorpay_order_id, razorpay_payment_id';
    const { data: row } = await admin.from(a.table).select(cols).eq('id', a.rowId).maybeSingle();
    if (!row) return;
    const { data: u } = await admin.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email;
    if (!email) return;
    const itemName = a.table === 'invoice_credit_packs'
      ? `Extra Invoice Scans (${Number(row.credits ?? CREDIT_PACK_INVOICES).toLocaleString('en-IN')} invoices)`
      : `${SERVICES[row.kind as keyof typeof SERVICES]?.name ?? 'Service'}${row.quantity > 1 ? ` x ${row.quantity}` : ''}`;
    // Card, netbanking or wallet orders carry the 4% platform fee as its own line.
    const card = checkoutTotal(row.base_paise, 'razorpay');
    const platformFeePaise = row.amount_paise === card.totalPaise ? card.feePaise : 0;
    await fetch(`${env.supabaseUrl}/functions/v1/generate-invoice-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.serviceKey}`, 'x-internal-service-role': env.serviceKey },
      body: JSON.stringify({
        userId: row.user_id, email, tier: 'addon', itemName, amount: row.amount_paise, currency: 'INR',
        transactionId: row.razorpay_payment_id, orderId: row.razorpay_order_id,
        ...(platformFeePaise ? { platformFeePaise } : {}),
      }),
    });
  } catch (e) {
    console.error('Add-on invoice not sent:', e instanceof Error ? e.name : 'unknown');
  }
}
