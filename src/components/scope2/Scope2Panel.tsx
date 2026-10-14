import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import { RECORDS_KEY } from '@/lib/queryClient';
import { useSession } from '@/hooks/useSession';
import { useScope2Summary } from '@/hooks/useScope2';
import type { Scope2MethodTotal, Scope2Year } from '@/lib/scope2Summary';
import { SCOPE2_REASONS } from '../../../supabase/functions/_shared/electricity';

const fmtT = (kg: number) => `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t`;
const fmtKwh = (kwh: number) => `${Math.round(kwh).toLocaleString('en-IN')} kWh`;
const TYPE_LABEL: Record<string, string> = { eac: 'Certificate (I-REC, REC, GO)', ppa: 'Power purchase agreement', green_tariff: 'Green tariff', supplier_contract: 'Supplier contract' };

/** One method's bar on the year's shared scale. */
function MethodBar({ label, total, max, tone }: { label: string; total: Scope2MethodTotal | null; max: number; tone: string }) {
  const kg = total?.kg ?? null;
  const width = kg !== null && max > 0 ? Math.max(2, (kg / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={`h-full rounded-full ${tone} motion-safe:transition-[width] motion-safe:duration-700`} style={{ width: `${width}%` }} />
      </div>
      <span className="font-mono text-sm tabular-nums">{kg !== null ? fmtT(kg) : 'Not calculated'}</span>
    </div>
  );
}

function YearRow({ y }: { y: Scope2Year }) {
  const max = Math.max(y.location?.kg ?? 0, y.market?.kg ?? 0);
  const kwh = y.location?.kwh ?? y.market?.kwh ?? 0;
  const covered = y.market?.instrumentKwh ?? 0;
  const unresolved = Math.max(y.location?.unresolvedKwh ?? 0, y.market?.unresolvedKwh ?? 0);
  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{y.year.startsWith('FY') ? `FY ${y.year.slice(2)}` : y.year}</span>
        <span className="text-xs text-muted-foreground">{fmtKwh(kwh)}{covered > 0 ? ` · ${fmtKwh(covered)} covered by certificates (${Math.round((covered / kwh) * 100)}%)` : ''}</span>
      </div>
      <MethodBar label="Location" total={y.location} max={max} tone="bg-yellow-500" />
      <MethodBar label="Market" total={y.market} max={max} tone="bg-primary" />
      {unresolved > 0 && <p className="text-xs text-warning">{fmtKwh(unresolved)} not calculated: no approved grid factor for that country and period</p>}
    </li>
  );
}

function InstrumentForm({ onDone }: { onDone: () => void }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [f, setF] = useState({ type: 'eac', scheme: 'I-REC', certificateRef: '', mwh: '', generationCountry: 'IN', vintageStart: '', vintageEnd: '', kgPerKwh: '0', retired: false, retirementRef: '', beneficiaryConfirmed: false, evidenceDocumentId: '' });
  const [busy, setBusy] = useState(false);
  const docs = useQuery({
    queryKey: [RECORDS_KEY, 'scope2', 'evidence-docs', user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = await loadSupabase();
      const { data } = await supabase.from('documents').select('id, vendor, invoice_number, document_type, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = await loadSupabase();
      const { error } = await supabase.functions.invoke('scope2-engine', { body: { action: 'register_instrument', instrument: {
        ...f, mwh: Number(f.mwh), kgPerKwh: Number(f.kgPerKwh), generationCountry: f.generationCountry.trim().toUpperCase(),
        certificateRef: f.certificateRef || null, retirementRef: f.retirementRef || null, evidenceDocumentId: f.evidenceDocumentId || null,
      } } });
      if (error) { toast.error(await getFunctionErrorMessage(error, 'Could not record the instrument.')); return; }
      toast.success('Recorded. Scope 2 recalculated.');
      await qc.invalidateQueries({ queryKey: [RECORDS_KEY, 'scope2'] });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const field = 'grid gap-1.5 min-w-0';
  const select = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
      <div className={field}><Label htmlFor="s2-type">Type</Label>
        <select id="s2-type" className={select} value={f.type} onChange={set('type')}>{Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div className={field}><Label htmlFor="s2-scheme">Scheme or registry</Label><Input id="s2-scheme" value={f.scheme} onChange={set('scheme')} required maxLength={60} /></div>
      <div className={field}><Label htmlFor="s2-ref">Certificate reference</Label><Input id="s2-ref" value={f.certificateRef} onChange={set('certificateRef')} maxLength={120} placeholder="Registry serial range" /></div>
      <div className={field}><Label htmlFor="s2-mwh">Quantity (MWh)</Label><Input id="s2-mwh" type="number" inputMode="decimal" min="0" step="any" value={f.mwh} onChange={set('mwh')} required /></div>
      <div className={field}><Label htmlFor="s2-country">Country of generation (ISO code)</Label><Input id="s2-country" value={f.generationCountry} onChange={set('generationCountry')} required maxLength={2} /></div>
      <div className={field}><Label htmlFor="s2-rate">Emission rate (kg per kWh)</Label><Input id="s2-rate" type="number" inputMode="decimal" min="0" step="any" value={f.kgPerKwh} onChange={set('kgPerKwh')} required /></div>
      <div className={field}><Label htmlFor="s2-vs">Generation from</Label><Input id="s2-vs" type="date" value={f.vintageStart} onChange={set('vintageStart')} required /></div>
      <div className={field}><Label htmlFor="s2-ve">Generation to</Label><Input id="s2-ve" type="date" value={f.vintageEnd} onChange={set('vintageEnd')} required /></div>
      <div className={`${field} sm:col-span-2`}><Label htmlFor="s2-doc">Evidence document</Label>
        <select id="s2-doc" className={select} value={f.evidenceDocumentId} onChange={set('evidenceDocumentId')}>
          <option value="">None yet (kept, but not applied)</option>
          {(docs.data ?? []).map((d) => <option key={d.id} value={d.id}>{[d.vendor, d.invoice_number, d.document_type].filter(Boolean).join(' · ') || 'Document'} ({String(d.created_at).slice(0, 10)})</option>)}
        </select></div>
      <label className="flex items-start gap-2 text-sm sm:col-span-2" htmlFor="s2-retired">
        <Checkbox id="s2-retired" checked={f.retired} onCheckedChange={(v) => setF({ ...f, retired: v === true })} />
        <span>Retired or cancelled in the registry</span>
      </label>
      {f.retired && <div className={`${field} sm:col-span-2`}><Label htmlFor="s2-rref">Retirement reference</Label><Input id="s2-rref" value={f.retirementRef} onChange={set('retirementRef')} required maxLength={120} /></div>}
      <label className="flex items-start gap-2 text-sm sm:col-span-2" htmlFor="s2-ben">
        <Checkbox id="s2-ben" checked={f.beneficiaryConfirmed} onCheckedChange={(v) => setF({ ...f, beneficiaryConfirmed: v === true })} />
        <span>Retired in this company's name</span>
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? 'Recording…' : 'Record and recalculate'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        It lowers market-based Scope 2 only when it has evidence, is retired in this company's name, was generated in the same market and falls in the reporting year. Location-based Scope 2 never changes. A certificate can be claimed once.
      </p>
    </form>
  );
}

/** Location- and market-based Scope 2 per reporting year, with the certificates behind the market figure. */
export function Scope2Panel() {
  const { data } = useScope2Summary();
  const [adding, setAdding] = useState(false);
  if (!data?.enabled || (data.years.length === 0 && data.needsData.length === 0 && data.instruments.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scope 2 electricity: location and market based</CardTitle>
        <p className="text-sm text-muted-foreground">Location-based uses the grid average where the electricity was used. Market-based applies your certificates and contracts first.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.years.length > 0 && <ul className="divide-y divide-border">{data.years.map((y) => <YearRow key={y.year} y={y} />)}</ul>}

        {data.warnings.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {data.warnings.map((w) => <li key={w}>{SCOPE2_REASONS[w] ?? w}</li>)}
          </ul>
        )}

        {data.needsData.length > 0 && (
          <div>
            <p className="text-sm font-medium">Bills that need data</p>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {data.needsData.map((r) => <li key={r.reason}><span className="font-mono tabular-nums">{r.count}</span> · {SCOPE2_REASONS[r.reason] ?? r.reason}</li>)}
            </ul>
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Certificates and contracts</p>
            <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              {adding ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}{adding ? 'Close' : 'Add'}
            </Button>
          </div>
          {data.instruments.length === 0 && !adding && <p className="mt-1 text-sm text-muted-foreground">None recorded. Market-based equals the fallback shown above until one is added.</p>}
          {data.instruments.length > 0 && (
            <ul className="mt-2 divide-y divide-border text-sm">
              {data.instruments.map((i) => {
                const missing = [!i.hasEvidence && 'evidence', !i.retired && 'retirement', !i.beneficiaryConfirmed && 'beneficiary'].filter(Boolean);
                return (
                  <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <span className="min-w-0 break-words">{i.scheme}{i.certificateRef ? ` · ${i.certificateRef}` : ''} <span className="text-muted-foreground">· {i.mwh.toLocaleString('en-IN')} MWh · {i.generationCountry} · {i.vintageStart} to {i.vintageEnd}</span></span>
                    <span className={`text-xs ${i.allocatedKwh > 0 ? 'text-primary' : 'text-warning'}`}>
                      {i.allocatedKwh > 0 ? `${fmtKwh(i.allocatedKwh)} applied` : missing.length ? `Not applied: needs ${missing.join(', ')}` : 'Not applied: outside the market or reporting year'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {adding && <InstrumentForm onDone={() => setAdding(false)} />}
        </div>
      </CardContent>
    </Card>
  );
}
