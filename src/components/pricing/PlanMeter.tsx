import { useEffect, useRef, useState } from 'react';
import { PLAN_INVOICE_SCANS_PER_MONTH, type PlanTier } from '../../../supabase/functions/_shared/planLimits';
import { invoicesToSlider, recommendPlan, sliderToInvoices } from '@/lib/pricing/pricingMath';

const NAMES: Record<PlanTier, string> = { snapshot: 'Snapshot', essential: 'Essential', pro: 'Pro', scale: 'Scale' };

/**
 * "How many invoices a month?" Dragging stacks invoices into a tray and names
 * the smallest plan that covers the volume (the allowance the server enforces).
 * Pure CSS 3D; no canvas, no library.
 */
export function PlanMeter({ onRecommend }: { onRecommend: (plan: PlanTier) => void }) {
  const [pos, setPos] = useState(invoicesToSlider(60));
  const n = sliderToInvoices(pos);
  const plan = recommendPlan(n);
  const [shown, setShown] = useState(n);
  const raf = useRef(0);

  useEffect(() => { onRecommend(plan); }, [plan, onRecommend]);

  // Odometer roll toward the new count.
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(n); return; }
    const from = shown, t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 320);
      setShown(Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from the last shown value
  }, [n]);

  const sheets = Math.min(14, Math.max(1, Math.round(Math.log10(n + 1) * 3.6)));

  return (
    <div className="mx-auto mt-10 grid max-w-3xl items-center gap-6 rounded-3xl border border-border bg-card/70 p-5 text-left backdrop-blur sm:grid-cols-[1fr_1.1fr] sm:p-7">
      <div className="pr-tray relative h-24 sm:h-44" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="pr-sheet" style={{ opacity: i < sheets ? 1 : 0, transform: i < sheets ? `translateY(${-i * 5}px) rotateX(56deg) rotateZ(${-8 + (i % 2 ? 1 : -1) * (1 + (i % 3))}deg)` : 'translateY(-90px) rotateX(56deg)' }} />
        ))}
      </div>
      <div className="grid gap-3 min-w-0">
        <label htmlFor="plan-meter" className="text-sm text-muted-foreground">How many bills and invoices do you add each month?</label>
        <p className="font-semibold leading-none tracking-tight tabular-nums text-5xl sm:text-6xl" aria-live="polite">
          <output htmlFor="plan-meter">{shown.toLocaleString('en-IN')}</output>
          <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">a month</span>
        </p>
        <input id="plan-meter" type="range" min={0} max={1000} value={pos} onChange={(e) => setPos(Number(e.target.value))}
          className="w-full accent-[hsl(var(--primary))]" aria-valuetext={`${n} invoices a month`} />
        <p className="text-sm">
          Fits <b>{NAMES[plan]}</b>: up to {PLAN_INVOICE_SCANS_PER_MONTH[plan].toLocaleString('en-IN')} new invoices a month.
          <span className="text-muted-foreground"> Invoices you already stored open free.</span>
        </p>
      </div>
    </div>
  );
}
