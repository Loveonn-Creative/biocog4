import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

// A module the current plan does not open: its shape, never its data. The
// bars are a fixed placeholder, not a chart, and nothing is loaded for it.

const BARS = [72, 48, 86, 60, 38];

export function LockedBody({ plan }: { plan: string }) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-lg border border-dashed border-border">
      <div aria-hidden="true" className="space-y-2.5 px-4 py-4 opacity-60 blur-[1.5px]">
        {BARS.map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-2 w-12 rounded-full bg-muted-foreground/20" />
            <span className="h-2 rounded-full bg-muted-foreground/20" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-1.5 text-[12.5px] font-medium shadow-sm hover:bg-secondary">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />Opens on {plan}
        </Link>
      </div>
    </div>
  );
}
