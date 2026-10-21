import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { CREDIT_VALUE_WITHHELD } from '@/lib/carbonValue';
import type { PathwayCheck, PathwayId } from '@/lib/monetizationPathways';

// Climate finance the records can open, with the same checks Monetize runs.
// No value, saving or advance is estimated: lenders and schemes set terms.

const ROWS: { id: PathwayId; title: string; line: string }[] = [
  { id: 'green_loan', title: 'Green loan', line: 'Lenders set their own terms' },
  { id: 'govt_incentive', title: 'Government incentives', line: 'Each scheme sets its own rules' },
  { id: 'green_factoring', title: 'Green invoice factoring', line: 'Cash early against green invoices' },
  { id: 'carbon_credit', title: 'Carbon credits', line: 'Issued under a recognised programme' },
];

const REQUESTED = new Set(['applied', 'in_review', 'approved', 'active']);

interface Props {
  verifiedTonnes: number;
  verifiedRecords: number;
  checks: Record<PathwayId, PathwayCheck[]>;
  statuses: Record<string, string>;
  /** False until the verification and pathway rows have loaded. */
  loaded?: boolean;
}

export function FinancePathways({ verifiedTonnes, verifiedRecords, checks, statuses, loaded = true }: Props) {
  return (
    <section aria-labelledby="unlock-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="unlock-title" className="text-lg font-semibold">Climate finance you can unlock</h2>
        <Link to="/monetize" className="text-sm font-medium text-primary hover:underline">Explore options</Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {verifiedTonnes > 0 && (
          <div className="border-b border-border bg-primary/[0.04] px-5 py-4 md:px-6">
            <p className="text-[15px] font-semibold text-primary tabular-nums">{verifiedTonnes.toFixed(3)} t CO₂e verified</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{CREDIT_VALUE_WITHHELD}</p>
          </div>
        )}
        <ul className="divide-y divide-border">
          {ROWS.map((r) => {
            const list = checks[r.id];
            const missing = list.filter((c) => !c.pass).length;
            const requested = REQUESTED.has(statuses[r.id] ?? '');
            const status = requested ? 'Requested' : missing === 0 ? (r.id === 'green_loan' ? 'Ready to apply' : 'Ready to check') : `${missing} ${missing === 1 ? 'step' : 'steps'} left`;
            const line = r.id === 'green_loan' && verifiedRecords > 0
              ? `You have ${verifiedRecords} verified records, the evidence lenders ask for`
              : r.line;
            return (
              <li key={r.id}>
                <Link to={r.id === 'green_loan' && missing === 0 ? '/green-loan' : '/monetize'}
                  className="grid items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_9rem_1rem] md:px-6">
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{r.title}</span>
                    <span className="block text-[12.5px] text-muted-foreground">{line}</span>
                  </span>
                  {!loaded ? <span className="h-3 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" aria-hidden="true" /> : <span className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                    {list.map((c) => (
                      <span key={c.label} className="inline-flex items-center gap-1.5">
                        {c.pass
                          ? <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-success text-success-foreground"><Check className="h-3 w-3" aria-hidden="true" /></span>
                          : <span className="h-[18px] w-[18px] rounded-full border-2 border-warning" aria-hidden="true" />}
                        <span>{c.label}</span><span className="sr-only">{c.pass ? 'met' : 'not met'}</span>
                      </span>
                    ))}
                  </span>}
                  <span className={`text-[13px] font-semibold ${!loaded ? 'invisible' : ''} ${requested ? 'text-foreground' : missing === 0 ? 'text-success' : 'text-warning'}`}>{status}</span>
                  <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
