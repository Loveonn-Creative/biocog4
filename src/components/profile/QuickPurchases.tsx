import { useEffect, useState } from 'react';
import { Loader2, Minus, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoiceAllowance } from '@/hooks/useInvoiceAllowance';
import { useAddonPurchase } from '@/hooks/useAddonPurchase';
import { checkoutTotal, type PaymentMethod } from '../../../supabase/functions/_shared/checkoutTotals';
import { CREDIT_PACK_BASE_PAISE, CREDIT_PACK_INVOICES, MAX_PACKS, SERVICES } from '../../../supabase/functions/_shared/addonPurchases';
import { packUsableUntil } from '@/lib/invoiceAllowance';

// Quick purchases on the Subscription page, so invoice credits, Fast-track Verification
// and the Expert Climate Audit do not need a trip to the pricing page.
// Prices come from the shared add-on table; the server charges the same.

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const ORDER_STATUS: Record<string, string> = { paid: 'Booked', in_progress: 'In progress', delivered: 'Delivered', refunded: 'Refunded' };

function Stepper({ value, set, max, label }: { value: number; set: (n: number) => void; max: number; label: string }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => set(Math.max(1, value - 1))} disabled={value <= 1} aria-label={`Fewer ${label}`}><Minus className="h-3 w-3" /></Button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label}`}><Plus className="h-3 w-3" /></Button>
    </div>
  );
}

export function QuickPurchases({ planEnd }: { planEnd: string | null }) {
  const allowance = useInvoiceAllowance();
  const { buy, busy } = useAddonPurchase(() => { void allowance.refresh(); });
  const [packs, setPacks] = useState(1);
  const [reports, setReports] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const total = (base: number) => rupees(checkoutTotal(base, method).totalPaise);
  const fast = SERVICES.fast_track, audit = SERVICES.expert_audit;
  const payLabel = method === 'upi' ? 'with UPI' : 'by card';

  // Links such as /subscription#top-up land here; the router does not scroll to hashes.
  useEffect(() => {
    if (window.location.hash === '#top-up') document.getElementById('top-up')?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <Card id="top-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Top up and services</CardTitle>
        <CardDescription>
          {allowance.used !== null
            ? `${allowance.used.toLocaleString('en-IN')} of ${allowance.limit.toLocaleString('en-IN')} invoices used this month · ${allowance.credits.toLocaleString('en-IN')} credits left`
            : 'Buy invoice credits and services here. Prices before GST.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2 text-xs" role="radiogroup" aria-label="Payment method">
          {(['upi', 'razorpay'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)}
              className={`rounded-full border px-3 py-1 ${method === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
              {m === 'upi' ? 'UPI (no fee)' : 'Card, netbanking or wallet (+4%)'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-medium">Invoice credits</p>
            <p className="text-xs text-muted-foreground">₹79 per {CREDIT_PACK_INVOICES} invoices, used after your monthly allowance. Valid 12 months on a yearly plan, 30 days otherwise.</p>
          </div>
          <Stepper value={packs} set={setPacks} max={MAX_PACKS} label="packs of 100" />
          <Button onClick={() => void buy({ item: 'credits', packs }, method)} disabled={busy !== null} className="sm:w-48">
            {busy === 'credits' ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${total(packs * CREDIT_PACK_BASE_PAISE)} ${payLabel}`}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-medium">{fast.name}</p>
            <p className="text-xs text-muted-foreground">₹2,999 per report. Results in {fast.turnaround}.</p>
          </div>
          <Stepper value={reports} set={setReports} max={fast.maxQty} label="reports" />
          <Button onClick={() => void buy({ item: 'fast_track', quantity: reports }, method)} disabled={busy !== null} className="sm:w-48">
            {busy === 'fast_track' ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${total(fast.basePaise * reports)} ${payLabel}`}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-medium">{audit.name}</p>
            <p className="text-xs text-muted-foreground">₹7,999 one-time. Our team contacts you after payment.</p>
          </div>
          <Button onClick={() => void buy({ item: 'expert_audit' }, method)} disabled={busy !== null} className="sm:w-48">
            {busy === 'expert_audit' ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${total(audit.basePaise)} ${payLabel}`}
          </Button>
        </div>

        {(allowance.packs.length > 0 || allowance.orders.length > 0) && (
          <ul className="space-y-1 text-xs text-muted-foreground" aria-label="Your purchases">
            {allowance.packs.map((p) => {
              const until = packUsableUntil(p, planEnd);
              return (
                <li key={p.id}>
                  {p.credits.toLocaleString('en-IN')} credits, {p.used.toLocaleString('en-IN')} used
                  {p.status === 'refunded' ? ' · refunded' : until ? ` · valid until ${day(until)}` : ''}
                </li>
              );
            })}
            {allowance.orders.map((o) => (
              <li key={o.id}>
                {SERVICES[o.kind]?.name ?? o.kind}{o.quantity > 1 ? ` × ${o.quantity}` : ''} · {ORDER_STATUS[o.status] ?? o.status}
                {o.status !== 'delivered' && o.due_at ? ` · due by ${new Date(o.due_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
