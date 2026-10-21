import { useMemo, useState } from 'react';
import { recordInsights, type Insight, type QualityLevel } from '../../../supabase/functions/_shared/recordInsights';

// What moved, from the shared insight rules over the records already loaded
// (the same rules as History). Each line shows its formula on request.

interface Row {
  id: string; scope: number; category: string; co2_kg: number; verified: boolean | null;
  activity_data: number | null; activity_unit: string | null; document_id: string | null;
  data_quality: string | null; verification_notes: string | null; created_at: string; activity_date?: string;
}

const ORDER: Record<Insight['kind'], number> = { spike: 0, missing: 1, unit_cost: 2, mom: 3 };
const QUALITY: Record<QualityLevel, { text: string; cls: string }> = {
  good: { text: 'Good data', cls: 'text-success' },
  check: { text: 'Check data', cls: 'text-warning' },
  weak: { text: 'Weak data', cls: 'text-destructive' },
};
const DOT: Record<Insight['kind'], string> = { spike: 'bg-warning', missing: 'bg-warning', unit_cost: 'bg-accent', mom: 'bg-primary' };

export function WhatChanged({ emissions, documents }: { emissions: Row[]; documents: Array<{ id: string; amount: number | null; currency?: string | null }> }) {
  const [all, setAll] = useState(false);
  const result = useMemo(() => recordInsights(emissions.map((e) => ({ ...e, date: e.activity_date || e.created_at })), documents), [emissions, documents]);
  const items = [...result.insights].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  if (emissions.length === 0) return null;
  const list = all ? items : items.slice(0, 3);

  return (
    <section aria-labelledby="changed-title" className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="changed-title" className="text-[15px] font-semibold">What changed</h2>
        {result.basis && <span className="text-[12px] text-muted-foreground">{result.basis === 'verified' ? 'Verified records' : 'Unverified estimates'}</span>}
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-muted-foreground">Nothing stands out yet. Changes show once two months have records.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {list.map((i) => (
            <li key={i.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex gap-2.5">
                <span aria-hidden="true" className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[i.kind]}`} />
                <div className="min-w-0">
                  <p className="text-[13.5px] leading-snug">{i.title}</p>
                  <details className="mt-1 text-[12px] text-muted-foreground">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className={QUALITY[i.quality.level].cls}>{QUALITY[i.quality.level].text}</span> · <span className="underline-offset-4 hover:underline">How it was worked out</span>
                    </summary>
                    <dl className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-[6rem_minmax(0,1fr)]">
                      <dt className="font-medium">Formula</dt><dd className="break-words">{i.formula}</dd>
                      <dt className="font-medium">Units</dt><dd>{i.units}</dd>
                      {i.assumptions.length > 0 && <><dt className="font-medium">Assumes</dt><dd>{i.assumptions.join(' ')}</dd></>}
                      {i.quality.reasons.length > 0 && <><dt className="font-medium">Data</dt><dd>{i.quality.reasons.join(' ')}</dd></>}
                    </dl>
                  </details>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 3 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
