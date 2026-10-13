import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


const FN = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

async function authedPost(name: string, body: unknown): Promise<{ status: number; data: any }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(FN(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

/**
 * Asks the server to find and activate any captured payment on the signed-in
 * account whose activation did not complete. Safe to call repeatedly.
 */
export async function reconcilePayments(): Promise<{ activated: { tier: string; expiresAt: string | null }[] } | null> {
  try {
    const { status, data } = await authedPost('reconcile-razorpay-payments', {});
    return status === 200 ? data : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  tier: string;
  teamSize?: number;
  billingCycle?: 'monthly' | 'yearly';
  userId: string;
  userEmail: string;
  onSuccess: (tier: string) => void;
  onFailure?: (error: string) => void;
}

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load the checkout script quietly. A failure (often an ad-blocker) is only
  // reported when someone actually tries to pay, never on page load.
  const loadScript = useCallback(() => new Promise<boolean>((resolve) => {
    if (window.Razorpay) { setIsScriptLoaded(true); resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { setIsScriptLoaded(true); resolve(true); };
    script.onerror = () => { script.remove(); console.warn('Razorpay checkout script did not load'); resolve(false); };
    document.body.appendChild(script);
  }), []);

  useEffect(() => { void loadScript(); }, [loadScript]);

  const initiatePayment = useCallback(async ({
    tier,
    teamSize,
    billingCycle = 'yearly',
    userId,
    userEmail,
    onSuccess,
    onFailure,
  }: RazorpayOptions) => {
    if (!isScriptLoaded && !window.Razorpay && !(await loadScript())) {
      toast.error('Payment gateway could not load. If you use an ad-blocker, allow checkout.razorpay.com and try again.');
      return;
    }

    setIsLoading(true);

    try {
      
      // Create order (server derives user identity from the session JWT)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to subscribe');
      }
      const { status: orderStatus, data: responseData } = await authedPost('create-razorpay-order', { tier, teamSize, billingCycle });

      if (orderStatus === 409 && responseData?.alreadyActive) {
        // An earlier payment was confirmed, or the account already holds this plan: no new charge.
        toast.info(responseData.error || 'You already have this plan.', { duration: 10000 });
        setIsLoading(false);
        if (responseData.tier) onSuccess(responseData.tier);
        return;
      }

      if (orderStatus !== 200) {
        const errorMsg = responseData?.error || 'Failed to create order';
        console.error('[Razorpay] Order creation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      const { orderId, amount, currency, keyId, planName } = responseData;
      
      if (!orderId || !keyId) {
        console.error('[Razorpay] Missing order data:', { orderId, keyId });
        throw new Error('Invalid order response from server');
      }
      

      // Initialize Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Senseible',
        description: planName,
        order_id: orderId,
        handler: async (response: any) => {
          // Razorpay has reported this payment as successful. Confirm it on
          // the server (which re-checks with Razorpay) before showing the plan
          // as active. Verification is idempotent, so it is safe to retry.
          toast.loading('Confirming your payment...', { id: 'payment-verify' });
          const payload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };
          let confirmedTier: string | null = null;
          let hardFailure: string | null = null;
          for (let attempt = 0; attempt < 4 && !confirmedTier && !hardFailure; attempt++) {
            if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
            try {
              const { status, data } = await authedPost('verify-razorpay-payment', payload);
              if (status === 200 && data?.success) confirmedTier = data.tier || tier;
              // 400/403/404: the payment or order is not valid for this account; retrying cannot help.
              else if (status === 400 || status === 403 || status === 404) hardFailure = data?.error || 'Payment could not be verified';
              // 202 (not yet captured), 401 (session refresh), 409, 5xx: try again.
            } catch {
              // Network error: try again.
            }
          }
          if (!confirmedTier && !hardFailure) {
            const rec = await reconcilePayments();
            if (rec?.activated?.length) confirmedTier = rec.activated[0].tier;
          }
          toast.dismiss('payment-verify');
          setIsLoading(false);

          if (confirmedTier) {
            toast.success('Payment confirmed. Welcome to ' + planName, { duration: 5000 });
            onSuccess(confirmedTier);
            return;
          }
          const ref = String(response.razorpay_payment_id || '');
          if (hardFailure) {
            toast.error(`${hardFailure}. If money was deducted, email billing@senseible.earth with payment reference ${ref}.`, { duration: 15000 });
            onFailure?.(hardFailure);
          } else {
            toast.warning(`Razorpay reported your payment, but we could not confirm it yet. Please do not pay again: your plan activates automatically once it is confirmed. Payment reference ${ref}.`, { duration: 20000 });
            onFailure?.('Payment pending confirmation');
          }
        },
        prefill: {
          email: userEmail,
        },
        theme: {
          color: '#22c55e',
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      // Keep the button disabled while Checkout is open, so a second click
      // cannot start a second order; dismiss or the handler re-enables it.
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
      onFailure?.(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [isScriptLoaded, loadScript]);

  return {
    initiatePayment,
    isLoading,
    isReady: isScriptLoaded,
  };
};
