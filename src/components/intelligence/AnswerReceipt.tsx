import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { historyLink, type Evidence } from '@/lib/intelligenceClient';

const BASIS: Record<Evidence['basis'], { label: string; className: string }> = {
  verified: { label: 'Verified records', className: 'bg-primary/10 text-primary' },
  unverified: { label: 'Unverified records', className: 'bg-warning/15 text-warning' },
  sample: { label: 'Sample data', className: 'bg-secondary text-foreground' },
  general: { label: 'General knowledge', className: 'bg-secondary text-muted-foreground' },
};

export function BasisTag({ basis, className }: { basis: Evidence['basis']; className?: string }) {
  const b = BASIS[basis];
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide', b.className, className)}>{b.label}</span>;
}

const kg = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t` : `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`);


/** What an answer rests on: records (each opening in History), calculation, basis, projection and further reading. */
export function AnswerReceipt({ evidence }: { evidence: Evidence }) {
  const { records, calculation, projection, resources, basis } = evidence;
  return (
    <div className="space-y-2 border-t border-dashed border-border bg-muted/30 px-4 py-3 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {records.length ? `Evidence · ${records.length} record${records.length === 1 ? '' : 's'}` : 'Basis'}
        </span>
        <BasisTag basis={basis} />
        {projection && <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">{projection.label}</span>}
      </div>
      {records.length > 0 && (
        <ul className="divide-y divide-border/60">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
              <Link to={historyLink(r.id)} className="min-w-0 truncate font-semibold text-primary hover:underline">{r.label}</Link>
              <span className="shrink-0 tabular-nums text-muted-foreground">{kg(r.kgCO2e)} CO₂e</span>
            </li>
          ))}
        </ul>
      )}
      {calculation && <p className="break-words rounded-md bg-secondary px-2 py-1.5 font-mono text-[11px] text-foreground">{calculation}</p>}
      {projection && <p className="text-muted-foreground">{projection.method}</p>}
      {resources.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-muted-foreground">Read more</span>
          {resources.map((r) => (
            <Link key={r.url} to={r.url.replace(/^https:\/\/senseible\.earth/, '')} className="min-w-0 max-w-full truncate text-primary hover:underline">{r.title}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
