import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { useFinanceDetail } from '@/hooks/useFinanceDetail';
import { computeFinanceEvidence, type FinanceLedgerRow } from '@/lib/financeEvidence';

// What a lender can check in the verified records. Every plan sees the
// summary; Pro and Scale see the detail once "Finance detail" is on in
// Settings. Figures come only from verified ledger rows; a line is hidden
// when the records do not support it. Verified tonnes stay in the panel above
// (one total per screen).

const pct = (n: number) => `${Math.round(n * 100)}%`;
const num = (n: number, dp = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: dp });
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const Row = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
    <span className="text-sm text-muted-foreground">{label}{note && <span className="block text-xs">{note}</span>}</span>
    <span className="shrink-0 text-right font-mono text-sm font-medium">{value}</span>
  </div>
);

export function FinanceEvidenceCard() {
  const { entries } = useComplianceLedger();
  const { available, enabled } = useFinanceDetail();
  const fe = useMemo(() => computeFinanceEvidence(entries as unknown as FinanceLedgerRow[]), [entries]);
  if (fe.summary.invoices === 0) return null;
  const { summary: s, detail: d } = fe;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Finance evidence</h2>
          <span className="text-xs text-muted-foreground">verified records only</span>
        </div>
        <Row label="Invoices behind it" value={num(s.invoices, 0)} />
        <Row label="Months covered" value={num(s.monthsCovered, 0)} note={s.periodStart && s.periodEnd ? `${s.periodStart} to ${s.periodEnd}` : undefined} />

        {enabled && (
          <div className="mt-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Detail</p>
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

        <p className="mt-4 text-xs text-muted-foreground">
          {enabled
            ? <>Full trail per record: <Link to="/reports" className="underline">Reports</Link>.</>
            : available
              ? <>More detail is available: switch on Finance detail in <Link to="/settings" className="underline">Settings</Link>.</>
              : <>Energy, spend and supplier detail come with Pro and Scale. <Link to="/pricing" className="underline">View plans</Link></>}
        </p>
      </CardContent>
    </Card>
  );
}
