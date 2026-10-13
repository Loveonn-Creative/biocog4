import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tier, teamSize, billingCycle }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg = responseData.error || 'Failed to create order';
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
          
          try {
            // Show processing toast
            toast.loading('Verifying payment...', { id: 'payment-verify' });
            
            // Verify payment (the function requires the signed-in user's JWT)
            const { data: { session: verifySession } } = await supabase.auth.getSession();
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  ...(verifySession?.access_token ? { 'Authorization': `Bearer ${verifySession.access_token}` } : {}),
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId,
                  tier,
                  billingCycle,
                }),
              }
            );

            const verifyData = await verifyResponse.json();
            
            toast.dismiss('payment-verify');

            if (!verifyResponse.ok) {
              console.error('[Razorpay] Verification failed:', verifyData);
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            toast.success('🎉 Payment successful! Welcome to ' + planName, { duration: 5000 });
            
            onSuccess(tier);
          } catch (error) {
            console.error('[Razorpay] Verification error:', error);
            toast.error('Payment verification failed. Please contact support at billing@senseible.earth');
            onFailure?.('Verification failed');
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
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
      onFailure?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isScriptLoaded, loadScript]);

  return {
    initiatePayment,
    isLoading,
    isReady: isScriptLoaded,
  };
};
