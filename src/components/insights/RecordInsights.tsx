import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { recordInsights, type Insight, type QualityLevel } from '../../../supabase/functions/_shared/recordInsights';

// Insights on request (Dashboard, History). Worked out in the browser from the
// records already loaded, by the shared rules; nothing is stored or changed.

interface Row {
  id: string; scope: number; category: string; co2_kg: number; verified: boolean | null;
  activity_data: number | null; activity_unit: string | null; document_id: string | null;
  data_quality: string | null; verification_notes: string | null; created_at: string; activity_date?: string;
}

const KIND_LABEL: Record<Insight['kind'], string> = {
  mom: 'Month on month', spike: 'Spike', missing: 'Missing months', unit_cost: 'Unit cost',
};
const QUALITY: Record<QualityLevel, { text: string; cls: string }> = {
  good: { text: 'Good data', cls: 'border-success/30 text-success' },
  check: { text: 'Check data', cls: 'border-warning/40 text-warning' },
  weak: { text: 'Weak data', cls: 'border-destructive/40 text-destructive' },
};

export function RecordInsights({ emissions, documents }: {
  emissions: Row[];
  documents: Array<{ id: string; amount: number | null; currency?: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const result = useMemo(() => (open ? recordInsights(
    emissions.map((e) => ({ ...e, date: e.activity_date || e.created_at })),
    documents,
  ) : null), [open, emissions, documents]);

  if (emissions.length === 0) return null;
  return (
    <section aria-label="Insights" className="mb-6">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="gap-2">
        <Lightbulb className="h-4 w-4" aria-hidden="true" />
        {open ? 'Hide insights' : 'Show insights'}
      </Button>
      {open && result && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            From your {result.basis === 'verified' ? 'verified records' : 'unverified estimates'}
            {result.latestMonth ? `, latest month ${result.latestMonth}` : ''}. Worked out by fixed rules; open any insight for its records and formula.
          </p>
          {result.insights.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing to point out yet. Insights need records from at least two months.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {result.insights.map((i) => (
                <li key={i.id} className="rounded-lg bg-secondary/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{KIND_LABEL[i.kind]}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${QUALITY[i.quality.level].cls}`}>{QUALITY[i.quality.level].text}</span>
                  </div>
                  <p className="mt-1">{i.title}</p>
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">How this was worked out</summary>
                    <dl className="mt-2 grid gap-1 sm:grid-cols-[8rem_1fr]">
                      <dt className="font-medium">Formula</dt><dd className="break-words">{i.formula}</dd>
                      <dt className="font-medium">Units</dt><dd>{i.units}</dd>
                      <dt className="font-medium">Fields</dt><dd>{i.fields.join(', ')}</dd>
                      <dt className="font-medium">Assumptions</dt><dd>{i.assumptions.join('; ')}</dd>
                      {i.quality.reasons.length > 0 && (<><dt className="font-medium">Data quality</dt><dd>{i.quality.reasons.join('; ')}</dd></>)}
                      <dt className="font-medium">Records</dt>
                      <dd className="flex flex-wrap gap-x-2 gap-y-1">
                        {i.recordIds.map((id) => (
                          <Link key={id} to={`/history?record=${id}`} className="font-mono text-primary hover:underline">{id.slice(0, 8)}</Link>
                        ))}
                      </dd>
                    </dl>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
