// Razorpay Checkout display configuration per payment method. UPI orders are
// created without the platform fee, so Checkout shows only UPI for them; the
// Razorpay option shows card, netbanking and wallets and hides UPI.
import type { PaymentMethod } from '../../../supabase/functions/_shared/checkoutTotals';

export function checkoutDisplayConfig(method: PaymentMethod) {
  if (method === 'upi') {
    return {
      display: {
        blocks: { upi: { name: 'Pay with UPI', instruments: [{ method: 'upi' }] } },
        sequence: ['block.upi'],
        preferences: { show_default_blocks: false },
      },
    };
  }
  return {
    display: {
      blocks: {
        other: {
          name: 'Card, netbanking or wallet',
          instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }],
        },
      },
      sequence: ['block.other'],
      preferences: { show_default_blocks: false },
    },
  };
}
