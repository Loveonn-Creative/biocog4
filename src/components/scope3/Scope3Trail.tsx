import { useMemo, useState } from 'react';
import { useShowMore } from '@/hooks/useShowMore';
import { ShowMoreButton } from '@/components/ShowMore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import { RECORDS_KEY } from '@/lib/queryClient';
import { useScope3Lines, useScope3Summary, type Scope3TrailLine } from '@/hooks/useScope3Trail';
import { REASONS, SCOPE3_CATEGORIES, type LineStatus } from '../../../supabase/functions/_shared/scope3';
import { DATA_CLASS_LABEL, fmtKg, STATUS_LABEL, STATUS_TONE } from './scope3Format';

type Filter = 'all' | LineStatus;
const FILTERS: Filter[] = ['all', 'verified', 'needs_review', 'needs_data', 'duplicate'];
const CHECK_LABEL: Record<string, string> = {
  invoice_identity: 'Invoice identity', invoice_totals: 'Invoice totals', category: 'Category', duplicate_line: 'No repeated line',
  line_math: 'Quantity x rate', factor: 'Approved factor', quantity: 'Activity data', unit: 'Unit', co2e: 'Calculation',
};

/** One step of the chain: a node on the line, green when it holds. */
function Step({ ok, title, children }: { ok: boolean | null; title: string; children: React.ReactNode }) {
  return (
    <li className="relative pb-4 pl-6 last:pb-0">
      <span className="absolute left-[5px] top-3 h-full w-px bg-border" aria-hidden="true" />
      <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 ${ok === null ? 'border-border bg-background' : ok ? 'border-primary bg-primary' : 'border-warning bg-background'}`} aria-hidden="true" />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-0.5 text-sm">{children}</div>
    </li>
  );
}

function LineTrail({ l }: { l: Scope3TrailLine }) {
  const failed = Object.entries(l.checks ?? {}).filter(([, v]) => v === 'fail').map(([k]) => k);
  return (
    <ol className="mt-3 border-t border-border pt-3">
      <Step ok title="Source document">
        Invoice {l.invoice_number ?? 'without a number'}{l.invoice_date ? `, ${l.invoice_date}` : ''} from {l.supplier_name ?? 'an unnamed supplier'}
        {l.supplier_gstin ? <span className="text-muted-foreground"> · GSTIN {l.supplier_gstin}</span> : null}
        <span className="block break-all font-mono text-xs text-muted-foreground">File {l.document_hash.slice(0, 16)}… · sealed {new Date(l.sealed_at).toLocaleDateString('en-IN')} · fields {l.extraction_sha256.slice(0, 12)}…</span>
      </Step>
      <Step ok title="Read from the invoice">
        {l.description}{l.hsn_code ? <span className="text-muted-foreground"> · HSN/SAC {l.hsn_code}</span> : null}
        <span className="block text-muted-foreground">
          {l.quantity !== null ? `${l.quantity} ${l.unit ?? '(no unit printed)'}` : 'No quantity printed'}{l.line_total !== null ? ` · line total ${l.line_total.toLocaleString('en-IN')}` : ''}{l.source_page ? ` · page ${l.source_page}` : ''}
        </span>
        {l.source_text && <span className="block text-xs italic text-muted-foreground">“{l.source_text}”</span>}
      </Step>
      <Step ok={l.scope3_category !== null && !l.reasons.includes('capitalisation_unconfirmed')} title="Classification">
        {l.scope3_category ? `Category ${l.scope3_category}: ${SCOPE3_CATEGORIES[l.scope3_category]}` : 'Not classified'}
        <span className="block text-muted-foreground">{l.classification_method} · {l.classification_basis}</span>
      </Step>
      <Step ok={l.factor_key ? true : false} title="Emission factor">
        {l.factor_key ? (
          <>{l.factor_key} v{l.factor_version} · {l.factor_value} kgCO₂e/{l.factor_unit}
            <span className="block text-muted-foreground">{l.factor_source} · {l.factor_geography?.startsWith('SUPPLIER:') ? 'this supplier' : l.factor_geography} · {l.factor_material} · {DATA_CLASS_LABEL[l.data_class]}</span></>
        ) : <span className="text-muted-foreground">No approved factor applied</span>}
      </Step>
      <Step ok={l.kg_co2e !== null} title="Calculation">
        {l.formula ? <span className="break-words font-mono text-xs">{l.formula}</span> : <span className="text-muted-foreground">No number: inputs are missing</span>}
      </Step>
      <Step ok={l.status === 'verified'} title="Checks">
        {failed.length === 0 ? 'Every check passes' : <>Open: {failed.map((k) => CHECK_LABEL[k] ?? k).join(', ')}</>}
        {l.reasons.length > 0 && (
          <ul className="mt-1 grid gap-0.5 text-muted-foreground">
            {l.reasons.map((r) => <li key={r}>{REASONS[r]?.label ?? r}</li>)}
          </ul>
        )}
        {l.next_action && <p className="mt-1 font-medium">Next: {l.next_action}</p>}
      </Step>
    </ol>
  );
}

/**
 * The full Scope 3 evidence trail (Pro and Scale, switched on in Profile).
 * Read-only: every row is a persisted, server-written calculation. Verified
 * totals count only verified lines on invoices counted once.
 */
export function Scope3Trail() {
  const summary = useScope3Summary(true);
  const lines = useScope3Lines(true);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => lines.data?.rows ?? [], [lines.data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const more = useShowMore(shown);

  const recalc = async () => {
    setBusy(true);
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('scope3-trail', { body: { action: 'recalculate' } });
      if (error) { toast.error(await getFunctionErrorMessage(error, 'Could not recalculate the trail.')); return; }
      await qc.invalidateQueries({ queryKey: [RECORDS_KEY, 'scope3'] });
      toast.success(data?.written ? `Recalculated: ${data.written} line${data.written === 1 ? '' : 's'} updated.` : 'Recalculated: nothing changed.');
    } finally { setBusy(false); }
  };

  if (summary.isPending || lines.isPending) return null;
  const s = summary.data;
  const header = (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
      <CardTitle className="text-base">Scope 3 evidence trail</CardTitle>
      {s?.enabled && <Button variant="outline" size="sm" onClick={() => { void recalc(); }} disabled={busy}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />Recalculate</Button>}
    </CardHeader>
  );
  if (!s?.enabled || !lines.data?.enabled) {
    return <Card id="scope3-trail">{header}<CardContent className="text-sm text-muted-foreground">The Scope 3 trail is not switched on yet. Once it is, each supplier invoice line appears here with its source, classification, factor, formula and checks.</CardContent></Card>;
  }
  if (!rows.length) {
    return <Card id="scope3-trail">{header}<CardContent className="text-sm text-muted-foreground">No supplier lines yet. Upload a supplier invoice to start the trail.</CardContent></Card>;
  }

  return (
    <Card id="scope3-trail" className="scroll-mt-24">
      {header}
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="text-3xl font-semibold tabular-nums">{fmtKg(s.totalKg)} <span className="text-sm font-normal text-muted-foreground">CO₂e verified</span></p>
            <p className="text-sm text-muted-foreground">{s.verifiedLines} of {s.lines} Scope 3 lines verified · {s.needsReview} need review · {s.needsData} need data</p>
            <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
              {s.categories.map((c) => {
                const share = s.totalKg > 0 ? (c.kg / s.totalKg) * 100 : 0;
                return (
                  <li key={c.category}>
                    <div className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate"><span className="text-muted-foreground">Cat {c.category}</span> {SCOPE3_CATEGORIES[c.category]}</span><span className="shrink-0 tabular-nums">{fmtKg(c.kg)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="s3-seg h-full rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Suppliers</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-2 font-normal">Supplier</th><th className="py-1 pr-2 text-right font-normal">Verified</th><th className="py-1 text-right font-normal">Lines</th></tr></thead>
                <tbody>
                  {s.suppliers.slice(0, 8).map((p) => (
                    <tr key={p.key} className="border-t border-border">
                      <td className="max-w-[160px] py-1.5 pr-2"><span className="block truncate">{p.name ?? 'Unnamed supplier'}</span><span className="block truncate font-mono text-[11px] text-muted-foreground">{p.key === 'unidentified' ? 'No valid GSTIN' : p.key}</span></td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{fmtKg(p.verifiedKg)}</td>
                      <td className="py-1.5 text-right tabular-nums">{p.verifiedLines}/{p.lines}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div role="tablist" aria-label="Filter lines" className="flex flex-wrap gap-1.5">
            {FILTERS.filter((f) => f === 'all' || counts[f]).map((f) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => { setFilter(f); more.reset(); }}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${filter === f ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {f === 'all' ? 'All' : STATUS_LABEL[f]} {counts[f] ?? 0}
              </button>
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-2">
            {more.visible.map((l) => {
              const isOpen = open === l.id;
              return (
                <li key={l.id} className="rounded-xl border border-border p-3">
                  <button type="button" onClick={() => setOpen(isOpen ? null : l.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 text-left">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_TONE[l.status].split(' ')[0]}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{l.description}</span>
                      <span className="block truncate text-xs text-muted-foreground">{l.supplier_name ?? 'Unnamed supplier'} · {l.scope3_category ? `Cat ${l.scope3_category}` : 'Unclassified'} · {STATUS_LABEL[l.status]}</span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums">{l.kg_co2e !== null && l.status === 'verified' ? fmtKg(l.kg_co2e) : <span className="text-xs text-muted-foreground">not counted</span>}</span>
                    <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && <LineTrail l={l} />}
                </li>
              );
            })}
          </ul>
          <ShowMoreButton hidden={more.hidden} all={more.all} onClick={more.toggle} total={shown.length} noun="lines" />
        </div>
      </CardContent>
    </Card>
  );
}
