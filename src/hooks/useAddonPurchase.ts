import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { authedPost } from './useRazorpay';
import { checkoutDisplayConfig } from '@/lib/pricing/checkoutDisplay';
import type { PaymentMethod } from '../../supabase/functions/_shared/checkoutTotals';

// Buys a profile add-on (invoice credits, Expert Climate Audit, Fast-track
// Verification) through Razorpay Checkout, UPI by default. The server prices
// the order; the payment is confirmed on the server, and the webhook
// completes it if this tab closes (UPI app switch).

export type AddonRequest = { item: 'credits'; packs: number } | { item: 'expert_audit' } | { item: 'fast_track'; quantity: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { s.remove(); resolve(false); };
    document.body.appendChild(s);
  });
}

export function useAddonPurchase(onDone: () => void) {
  const [busy, setBusy] = useState<string | null>(null);

  const buy = useCallback(async (req: AddonRequest, paymentMethod: PaymentMethod = 'upi') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Please sign in to buy.'); return; }
    if (!(await loadCheckout())) { toast.error('Payment could not load. If you use an ad-blocker, allow checkout.razorpay.com and try again.'); return; }
    setBusy(req.item);
    try {
      const { status, data } = await authedPost('purchases', { action: 'create', ...req, paymentMethod });
      if (status !== 200 || !data?.orderId) throw new Error(data?.error || 'Could not start checkout.');
      const rz = new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency, name: 'Senseible', description: data.name, order_id: data.orderId,
        prefill: { email: session.user.email },
        config: checkoutDisplayConfig(data.paymentMethod),
        theme: { color: '#22c55e' },
        modal: { ondismiss: () => setBusy(null) },
        handler: async (res: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          toast.loading('Confirming your payment...', { id: 'addon-verify' });
          let done = false, failed: string | null = null;
          for (let i = 0; i < 4 && !done && !failed; i++) {
            if (i) await sleep(1000 * 2 ** (i - 1));
            try {
              const v = await authedPost('purchases', { action: 'verify', ...res });
              if (v.status === 200 && v.data?.success) done = true;
              else if (v.status === 400 || v.status === 403) failed = v.data?.error || 'Payment could not be verified';
            } catch { /* retry */ }
          }
          toast.dismiss('addon-verify');
          setBusy(null);
          if (done) { toast.success(`${data.name}: payment confirmed.`); onDone(); return; }
          if (failed) toast.error(`${failed} Payment reference ${res.razorpay_payment_id}.`, { duration: 15000 });
          else { toast.info('Payment received. It will appear on your Subscription page within a few minutes; please do not pay again.', { duration: 12000 }); setTimeout(onDone, 30_000); }
        },
      });
      rz.open();
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof Error ? e.message : 'Could not start checkout.');
    }
  }, [onDone]);

  return { buy, busy };
}
