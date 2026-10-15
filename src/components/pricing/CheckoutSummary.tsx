import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LAUNCH_PRICES } from '../../../supabase/functions/_shared/planPricing';
import {
  GST_RATE, PLATFORM_FEE_RATE, checkoutTotal, upiSavingPaise, type PaymentMethod,
} from '../../../supabase/functions/_shared/checkoutTotals';

// Checkout summary: pick UPI (no platform fee) or Razorpay card, netbanking
// or wallet (+4%), see the breakdown, pay. The amounts shown use the same
// function the server charges with (create-razorpay-order).

export type CheckoutPlan = 'essential' | 'pro';

const inr = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (r: number) => `${Math.round(r * 100)}%`;

const OPTIONS: { id: PaymentMethod; label: string; sub: string }[] = [
  { id: 'upi', label: 'UPI', sub: 'No platform fee' },
  { id: 'razorpay', label: 'Card, netbanking, wallet', sub: `+${pct(PLATFORM_FEE_RATE)} platform fee` },
];

interface Props {
  open: boolean;
  plan: CheckoutPlan;
  cycle: 'monthly' | 'yearly';
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onPay: (method: PaymentMethod) => void;
}

export function CheckoutSummary({ open, plan, cycle, busy, onOpenChange, onPay }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const payRef = useRef<HTMLButtonElement>(null);
  const list = LAUNCH_PRICES[plan === 'essential' ? 'basic' : 'pro'];
  const basePaise = list[cycle];
  const t = checkoutTotal(basePaise, method);
  const saving = upiSavingPaise(basePaise);
  const planLabel = `${list.name.replace('Biocog ', '')} ${cycle === 'yearly' ? 'Yearly' : 'Monthly'}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => { e.preventDefault(); payRef.current?.focus(); }}>
        <DialogHeader>
          <DialogTitle>{planLabel}</DialogTitle>
          <DialogDescription>Choose how to pay.</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => {
            const total = checkoutTotal(basePaise, o.id).totalPaise;
            const on = method === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMethod(o.id)}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  on ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40',
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{o.label}</span>
                  <span aria-hidden="true" className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', on ? 'border-primary' : 'border-muted-foreground/50')}>
                    {on && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                </span>
                <span className="mt-1 block text-lg font-semibold tabular-nums text-foreground">{inr(total)}</span>
                <span className="block text-xs text-muted-foreground">{o.sub}</span>
              </button>
            );
          })}
        </div>

        <dl className="mt-1 space-y-1.5 text-sm tabular-nums">
          <div className="flex justify-between"><dt className="text-muted-foreground">Plan price</dt><dd>{inr(t.basePaise)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Platform fee ({pct(PLATFORM_FEE_RATE)})</dt><dd>{inr(t.feePaise)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">GST ({pct(GST_RATE)})</dt><dd>{inr(t.gstPaise)}</dd></div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd>{inr(t.totalPaise)}</dd></div>
        </dl>
        <p className={cn('text-xs', method === 'upi' ? 'text-primary' : 'text-muted-foreground')}>
          {method === 'upi' ? `You save ${inr(saving)} with UPI.` : `Pay with UPI to save ${inr(saving)}.`}
        </p>

        <Button ref={payRef} className="w-full" disabled={busy} onClick={() => onPay(method)}>
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opening checkout...</> : `Pay ${inr(t.totalPaise)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default CheckoutSummary;
