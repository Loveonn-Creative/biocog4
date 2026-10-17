// Paid service orders (Expert Climate Audit, Fast-track Verification) are sent
// to the internal inbox, from server code only. Never throws.
import { internalInbox } from './internalInbox.ts';
import { SERVICES } from './addonPurchases.ts';

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
