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
  userId: string;
  userEmail: string;
  onSuccess: (tier: string) => void;
  onFailure?: (error: string) => void;
}

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      toast.error('Payment gateway unavailable');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const initiatePayment = useCallback(async ({
    tier,
    teamSize,
    userId,
    userEmail,
    onSuccess,
    onFailure,
  }: RazorpayOptions) => {
    if (!isScriptLoaded) {
      toast.error('Payment gateway is loading, please try again');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Razorpay] Creating order for tier:', tier, 'user:', userId);
      
      // Create order
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ tier, teamSize, userId, userEmail }),
        }
      );

      const responseData = await response.json();
      console.log('[Razorpay] Order response:', response.status, responseData);

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
      
      console.log('[Razorpay] Order created:', { orderId, amount, currency, planName });

      // Initialize Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Senseible',
        description: planName,
        order_id: orderId,
        handler: async (response: any) => {
          console.log('[Razorpay] Payment completed, verifying...', {
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
          });
          
          try {
            // Show processing toast
            toast.loading('Verifying payment...', { id: 'payment-verify' });
            
            // Verify payment
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId,
                  tier,
                }),
              }
            );

            const verifyData = await verifyResponse.json();
            console.log('[Razorpay] Verification response:', verifyResponse.status, verifyData);
            
            toast.dismiss('payment-verify');

            if (!verifyResponse.ok) {
              console.error('[Razorpay] Verification failed:', verifyData);
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            toast.success('🎉 Payment successful! Welcome to ' + planName, { duration: 5000 });
            
            // Update local storage for immediate effect
            localStorage.setItem('biocog_tier', tier);
            
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
  }, [isScriptLoaded]);

  return {
    initiatePayment,
    isLoading,
    isReady: isScriptLoaded,
  };
};
