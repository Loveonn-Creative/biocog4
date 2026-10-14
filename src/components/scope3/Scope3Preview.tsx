import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScope3Summary } from '@/hooks/useScope3Trail';
import { SCOPE3_CATEGORIES } from '../../../supabase/functions/_shared/scope3';
import { fmtKg } from './scope3Format';

/**
 * Dashboard preview of the Scope 3 evidence trail (paid plans, Enterprise
 * Mode, switched on in Settings). Every figure is read from persisted lines:
 * verified kgCO2e only from verified lines on invoices counted once.
 * The bar is the one visual: how much of the Scope 3 evidence is verified,
 * held for review, or still missing data.
 */
export function Scope3Preview({ fullAvailable }: { fullAvailable: boolean }) {
  const { data, isPending, isError } = useScope3Summary(true);
  if (isPending || isError || !data) return null;

  const title = <CardTitle className="text-base">Scope 3 evidence trail</CardTitle>;
  if (!data.enabled) {
    return <Card><CardHeader className="pb-2">{title}</CardHeader><CardContent className="text-sm text-muted-foreground">The Scope 3 trail is not switched on yet. Supplier lines will appear here with their evidence once it is.</CardContent></Card>;
  }
  if (data.lines === 0) {
    return <Card><CardHeader className="pb-2">{title}</CardHeader><CardContent className="text-sm text-muted-foreground">Your next supplier invoice starts the trail: every line is kept with its source, and counted only once its data and factor are confirmed.</CardContent></Card>;
  }

  const seg = (k: number) => `${(k / data.lines) * 100}%`;
  const coverage = Math.round((data.verifiedLines / data.lines) * 100);
  return (
    <Card>
      <CardHeader className="pb-2">{title}</CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-3xl font-semibold tabular-nums">{fmtKg(data.totalKg)} <span className="text-sm font-normal text-muted-foreground">CO₂e verified</span></p>
          <p className="text-sm text-muted-foreground">{data.verifiedLines} of {data.lines} lines · {data.suppliers.length} supplier{data.suppliers.length === 1 ? '' : 's'}</p>
        </div>
        <div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${coverage}% of Scope 3 lines verified, ${data.needsReview} held for review, ${data.needsData} missing data`}>
            <span className="s3-seg bg-primary" style={{ width: seg(data.verifiedLines) }} />
            <span className="s3-seg bg-warning" style={{ width: seg(data.needsReview), animationDelay: '120ms' }} />
            <span className="s3-seg bg-muted-foreground/40" style={{ width: seg(data.needsData), animationDelay: '240ms' }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Verified {coverage}%</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />Needs review {data.needsReview}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" />Needs data {data.needsData}</span>
          </div>
        </div>
        {data.categories.length > 0 && (
          <ul className="grid grid-cols-1 gap-1.5 text-sm">
            {data.categories.slice(0, 3).map((c) => (
              <li key={c.category} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate"><span className="text-muted-foreground">Cat {c.category}</span> {SCOPE3_CATEGORIES[c.category]}</span>
                <span className="shrink-0 tabular-nums">{fmtKg(c.kg)}</span>
              </li>
            ))}
          </ul>
        )}
        {fullAvailable ? (
          <Link to="/mrv-dashboard#scope3-trail" className="group inline-flex items-center gap-1 text-sm font-medium text-primary">Open the full trail <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
        ) : (
          <p className="text-xs text-muted-foreground">The line-by-line trail is on Pro and Scale. <Link to="/pricing?plan=pro" className="underline underline-offset-2">Compare plans</Link></p>
        )}
      </CardContent>
    </Card>
  );
}
