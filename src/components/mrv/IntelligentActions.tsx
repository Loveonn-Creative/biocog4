import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { IntelligentAction } from '@/lib/intelligentActions';

// MRV: the ranked actions from the business's own records. The first is the
// biggest lever, shown with the records behind it; the rest are one line each.

export function IntelligentActionsList({ actions }: { actions: IntelligentAction[] }) {
  const [first, ...rest] = actions;
  if (!first) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-xl bg-primary/[0.05] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          {first.lever && <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Your biggest lever</p>}
          <p className="text-base font-semibold leading-snug">{first.title}</p>
          <p className="text-sm text-muted-foreground">{first.why}</p>
          {first.evidence.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Records behind this">
              {first.evidence.map((e) => <li key={e} className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">{e}</li>)}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {first.effect && <p className="font-mono text-lg font-semibold text-primary">{first.effect}</p>}
          <Link to={first.cta.to} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {first.cta.label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {rest.length > 0 && (
        <ul className="divide-y divide-border border-y border-border">
          {rest.map((a) => (
            <li key={a.id}>
              <Link to={a.cta.to} className="-mx-2 flex items-start justify-between gap-4 rounded-lg px-2 py-3 hover:bg-secondary/40">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{a.title}</span>
                  <span className="block text-xs text-muted-foreground">{a.why}</span>
                </span>
                <span className="shrink-0 font-mono text-sm text-muted-foreground">{a.effect ?? a.cta.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
