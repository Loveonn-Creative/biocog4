import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { useFinanceDetail } from '@/hooks/useFinanceDetail';
import { computeFinanceEvidence, type BillingPeriods, type FinanceLedgerRow } from '@/lib/financeEvidence';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { applyScope, scopeKey } from '@/lib/workspaceScope';

// What a lender can check in the verified records. Every plan sees the
// summary; Pro and Scale see the detail once "Finance detail" is on in
// Settings. Figures come only from verified ledger rows; a line is hidden
// when the records do not support it. Verified tonnes stay in the panel above
// (one total per screen).

const pct = (n: number) => `${Math.round(n * 100)}%`;
const num = (n: number, dp = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: dp });
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const Fact = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="min-w-0 border-b border-r border-border p-4 [&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(4n)]:border-r-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-0.5 break-words text-lg font-semibold tabular-nums">{value}</p>
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
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
  const { summary: s, detail: d } = fe;

  const facts: { label: string; value: string; note?: string }[] = [
    { label: 'Invoices behind it', value: num(s.invoices, 0) },
    { label: 'Months covered', value: num(s.monthsCovered, 0), note: s.periodStart && s.periodEnd ? `${s.periodStart} to ${s.periodEnd}` : undefined },
  ];
  if (enabled) {
    if (d.electricity.kwh > 0) {
      facts.push({ label: 'Electricity billed', value: `${num(d.electricity.kwh, 0)} kWh`, note: `${d.electricity.months} month${d.electricity.months === 1 ? '' : 's'} of bills` });
      if (d.electricity.impliedFactor !== null) facts.push({ label: 'Grid factor applied', value: `${d.electricity.impliedFactor} kg/kWh` });
      facts.push({ label: 'Missing electricity months', value: d.electricity.missingMonths.length ? String(d.electricity.missingMonths.length) : 'None',
        note: d.electricity.missingMonths.length ? d.electricity.missingMonths.slice(0, 4).map(monthName).join(', ') + (d.electricity.missingMonths.length > 4 ? '…' : '') : undefined });
    }
    if (d.kgPerThousandInr !== null) facts.push({ label: 'Spend intensity', value: `${num(d.kgPerThousandInr, 2)} kg per ₹1,000`, note: `from ₹${num(d.spendInr, 0)} of invoices` });
    if (d.topSupplier) facts.push({ label: 'Largest supplier share', value: pct(d.topSupplier.share), note: d.topSupplier.name });
    facts.push({ label: 'Fingerprinted · factor sourced · method pinned', value: `${pct(d.trail.fingerprinted)} · ${pct(d.trail.factorSourced)} · ${pct(d.trail.methodPinned)}`, note: d.trail.methodVersions.length > 0 ? d.trail.methodVersions.join(', ') : undefined });
  }

  return (
    <section aria-labelledby="fe-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="fe-title" className="text-lg font-semibold">Finance evidence</h2>
        <span className="text-sm text-muted-foreground">Verified records only</span>
      </div>
      <div className="grid grid-cols-2 border-t border-border lg:grid-cols-4">
        {facts.map((f) => <Fact key={f.label} {...f} />)}
      </div>
      <p className="text-sm text-muted-foreground">
        {enabled
          ? <>Full trail per record: <Link to="/reports" className="underline">Reports</Link>.</>
          : available
            ? <>More detail is available: switch on Finance detail in <Link to="/settings" className="underline">Settings</Link>.</>
            : <>Energy, spend and supplier detail come with Pro and Scale. <Link to="/pricing" className="underline">View plans</Link></>}
      </p>
    </section>
  );
}
