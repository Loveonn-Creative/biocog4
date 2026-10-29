import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import type { PlanTier } from '../../../supabase/functions/_shared/planLimits';
import { ADDONS, addonTotals, inr, type BillingCycle } from '@/lib/pricing/pricingMath';

const NAMES: Record<PlanTier, string> = { snapshot: 'Snapshot', essential: 'Essential', pro: 'Pro', scale: 'Scale' };

/**
 * Add-ons as tokens you drop onto a receipt. Prices are the published ones;
 * totals are worked out here for planning. Add-ons are arranged with our team,
 * so the button opens a filled-in request, and nothing is charged on this page.
 */
export function AddonBuilder({ plan, cycle }: { plan: PlanTier; cycle: BillingCycle }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const totals = useMemo(() => addonTotals(plan, cycle, qty), [plan, cycle, qty]);
  const bump = (id: string, d: number, max = 99) => setQty((q) => ({ ...q, [id]: Math.min(max, Math.max(0, (q[id] ?? 0) + d)) }));

  const summary = [
    `Plan: ${NAMES[plan]}${totals.planPerMonth ? ` (${inr(totals.planPerMonth)}/month, billed ${cycle})` : ''}`,
    ...totals.lines.map((l) => `${l.name}: ${inr(l.amount)} ${l.when}`),
  ].join('\n');
  const contactHref = `/contact?topic=sales&msg=${encodeURIComponent(`I would like these add-ons.\n${summary}`)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Add-ons">
        {ADDONS.map((a) => {
          const q = qty[a.id] ?? 0;
          const countable = a.cadence === 'per-pack' || a.cadence === 'per-report' || a.cadence === 'per-run';
          return (
            <li key={a.id} className={`pr-token rounded-2xl border p-4 transition-colors ${q ? 'border-primary bg-primary/5' : 'border-border bg-card'}`} data-on={q ? 'true' : 'false'}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{a.name}</p>
                  {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
                  <p className="text-sm text-muted-foreground">{a.price}</p>
                </div>
                {countable ? (
                  <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`${a.name} quantity`}>
                    <button type="button" onClick={() => bump(a.id, -1)} disabled={!q} className="grid h-8 w-8 place-items-center rounded-full border border-border disabled:opacity-40" aria-label={`Fewer ${a.unit}`}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center tabular-nums" aria-live="polite">{q}</span>
                    <button type="button" onClick={() => bump(a.id, 1)} className="grid h-8 w-8 place-items-center rounded-full border border-border" aria-label={`More ${a.unit}`}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => bump(a.id, q ? -1 : 1, 1)} aria-pressed={!!q}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${q ? 'bg-primary text-primary-foreground' : 'border border-border hover:border-primary/50'}`}>
                    {q ? 'Added' : 'Add'}
                  </button>
                )}
              </div>
              {countable && !a.note && <p className="mt-2 text-xs text-muted-foreground">{a.unit}</p>}
            </li>
          );
        })}
      </ul>

      <aside className="pr-receipt self-start rounded-2xl border border-dashed border-border bg-card p-5 font-mono text-sm" aria-live="polite" aria-label="Your estimate">
        <p className="mb-3 font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">Your estimate</p>
        <div className="flex justify-between gap-3"><span>{NAMES[plan]} plan</span><span>{totals.planPerMonth === null ? 'Quoted' : totals.planPerMonth === 0 ? 'Free' : `${inr(totals.planPerMonth)}/mo`}</span></div>
        {totals.planPerMonth ? <p className="text-xs text-muted-foreground">Billed {cycle === 'yearly' ? `yearly (${inr(totals.planPerMonth * 12)} a year)` : 'monthly'}</p> : null}
        {totals.lines.map((l) => (
          <div key={l.name} className="pr-receipt-line mt-2 flex justify-between gap-3"><span className="min-w-0">{l.name}</span><span className="shrink-0">{inr(l.amount)} {l.when === 'a month' ? '/mo' : l.when === 'once' ? 'once' : ''}</span></div>
        ))}
        <div className="my-3 border-t border-dashed border-border" />
        <div className="flex justify-between gap-3 font-semibold"><span>Every month</span><span>{totals.planPerMonth === null ? `Quote + ${inr(totals.monthly)}` : inr(totals.planPerMonth + totals.monthly)}</span></div>
        {totals.oneTime > 0 && <div className="mt-1 flex justify-between gap-3 font-semibold"><span>One-time</span><span>{inr(totals.oneTime)}</span></div>}
        <p className="mt-3 font-sans text-xs text-muted-foreground">An estimate for planning. Add-ons are set up with our team; nothing is charged on this page.</p>
        <Link to={contactHref} className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 font-sans text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          aria-disabled={totals.lines.length === 0}>
          {totals.lines.length ? 'Ask for these add-ons' : 'Pick an add-on to continue'}
        </Link>
      </aside>
    </div>
  );
}

export default AddonBuilder;
