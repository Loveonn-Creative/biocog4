import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LockedBody } from '@/components/dashboard/Locked';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { useFinanceDetail } from '@/hooks/useFinanceDetail';
import { computeFinanceEvidence, type BillingPeriods, type FinanceLedgerRow } from '@/lib/financeEvidence';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { applyScope, scopeKey } from '@/lib/workspaceScope';

// What a lender can check in the verified records, beyond the invoice and
// month counts shown at the top of the Dashboard. Pro and Scale see it once
// "Finance detail" is on in Settings; other plans see the module locked.
// Figures come only from verified ledger rows; a line is hidden when the
// records do not support it.

const pct = (n: number) => `${Math.round(n * 100)}%`;
const num = (n: number, dp = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: dp });
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const Row = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
    <span className="text-[13px] text-muted-foreground">{label}{note && <span className="block text-xs">{note}</span>}</span>
    <span className="shrink-0 text-right text-[13.5px] font-medium tabular-nums">{value}</span>
  </div>
);

export function FinanceEvidenceCard() {
  const { entries } = useComplianceLedger();
  const { available, enabled } = useFinanceDetail();
  const { scope, ready } = useWorkspace();
  const key = scopeKey(scope);
  const [periods, setPeriods] = useState<BillingPeriods>({});

  // Billing periods printed on electricity bills (stored with the reading); only needed for the detail view.
  useEffect(() => {
    if (!enabled || !ready) return;
    let cancelled = false;
    // JSON-path select: typed loosely, the generated types cannot follow it.
    const docs = supabase.from('documents') as unknown as { select: (cols: string) => { not: (c: string, op: string, v: null) => { limit: (n: number) => PromiseLike<{ data: unknown[] | null }> } } };
    const query = applyScope(docs.select('document_hash, bill:cached_result->electricityBill').not('cached_result->electricityBill', 'is', null).limit(500), scope);
    if (!query) return;
    void query.then(({ data }) => {
      if (cancelled || !data) return;
      const next: BillingPeriods = {};
      for (const d of data as Array<{ document_hash: string | null; bill: { billingPeriodStart?: string | null; billingPeriodEnd?: string | null } | null }>) {
        if (d.document_hash && d.bill?.billingPeriodStart && d.bill.billingPeriodEnd) next[d.document_hash] = { start: d.bill.billingPeriodStart, end: d.bill.billingPeriodEnd };
      }
      setPeriods(next);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures scope
  }, [enabled, ready, key]);

  const fe = useMemo(() => computeFinanceEvidence(entries as unknown as FinanceLedgerRow[], periods), [entries, periods]);
  if (fe.summary.invoices === 0) return null;
  const { detail: d } = fe;

  return (
    <section aria-labelledby="lender-title" className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
      <h2 id="lender-title" className="text-[15px] font-semibold">Lender detail</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">Energy, spend and supplier figures a lender can check.</p>
      {!available ? <LockedBody plan="Pro" /> : !enabled ? (
        <p className="mt-4 text-[13.5px]"><Link to="/settings" className="font-medium underline underline-offset-4">Turn on Finance detail</Link> <span className="text-muted-foreground">to see it here.</span></p>
      ) : (
        <div className="mt-3">
          <Row label="Scope 1 · 2 · 3" value={`${num(d.scopeTonnes[1], 2)} · ${num(d.scopeTonnes[2], 2)} · ${num(d.scopeTonnes[3], 2)} t`} />
          {d.electricity.kwh > 0 && (
            <>
              <Row label="Electricity billed" value={`${num(d.electricity.kwh, 0)} kWh`} note={`${d.electricity.months} month${d.electricity.months === 1 ? '' : 's'} of bills`} />
              {d.electricity.impliedFactor !== null && <Row label="Grid factor applied" value={`${d.electricity.impliedFactor} kg/kWh`} />}
              <Row label="Missing electricity months" value={d.electricity.missingMonths.length ? String(d.electricity.missingMonths.length) : 'None'}
                note={d.electricity.missingMonths.length ? d.electricity.missingMonths.slice(0, 4).map(monthName).join(', ') + (d.electricity.missingMonths.length > 4 ? '…' : '') : undefined} />
            </>
          )}
          {d.kgPerThousandInr !== null && <Row label="Spend intensity" value={`${num(d.kgPerThousandInr, 2)} kg per ₹1,000`} note={`from ₹${num(d.spendInr, 0)} of invoices`} />}
          {d.topSupplier && <Row label="Largest supplier share" value={pct(d.topSupplier.share)} note={d.topSupplier.name} />}
          <Row label="Fingerprinted · factor sourced · method pinned" value={`${pct(d.trail.fingerprinted)} · ${pct(d.trail.factorSourced)} · ${pct(d.trail.methodPinned)}`} />
          {d.trail.methodVersions.length > 0 && <Row label="Methodology" value={d.trail.methodVersions.join(', ')} />}
        </div>
      )}
    </section>
  );
}
