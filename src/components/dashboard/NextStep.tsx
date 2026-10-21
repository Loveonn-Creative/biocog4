import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleDot, Upload, Wrench } from 'lucide-react';
import type { NextStep as Step } from '@/lib/dashboardView';

// The one action that moves the account forward, worked out from the records.
// Colour carries state: amber while something blocks, green when clear.

const TONE: Record<Step['kind'], { bar: string; icon: typeof Check; iconCls: string }> = {
  start: { bar: 'bg-primary', icon: Upload, iconCls: 'text-primary bg-primary/10' },
  detail: { bar: 'bg-warning', icon: Wrench, iconCls: 'text-warning bg-warning/10' },
  verify: { bar: 'bg-warning', icon: CircleDot, iconCls: 'text-warning bg-warning/10' },
  ready: { bar: 'bg-success', icon: Check, iconCls: 'text-success bg-success/10' },
};

export function NextStep({ step }: { step: Step }) {
  const t = TONE[step.kind];
  const Icon = t.icon;
  return (
    <section aria-label="Next step" className="relative overflow-hidden rounded-xl border border-border bg-card">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} />
      <div className="flex flex-col gap-4 py-4 pl-5 pr-4 sm:flex-row sm:items-center sm:justify-between md:py-5 md:pl-6 md:pr-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${t.iconCls}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-snug text-foreground [text-wrap:balance]">{step.title}</p>
            <p className="mt-0.5 text-[13.5px] text-muted-foreground">{step.detail}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 pl-11 sm:pl-0">
          {step.secondary && (
            <Link to={step.secondary.to} className="text-[13.5px] font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline">{step.secondary.label}</Link>
          )}
          <Link to={step.cta.to} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {step.cta.label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
