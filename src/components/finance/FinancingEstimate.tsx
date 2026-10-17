import { AlertTriangle } from 'lucide-react';
import { DISCLOSURE, type ApplicantEstimate } from '../../../supabase/functions/_shared/financeApplication';

// One rendering of the applicant Estimate for every entry point (the green
// loan application, Monetize). The numbers come from the finance-application
// function; nothing is calculated or filled in here.

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const POSITION: Record<NonNullable<ApplicantEstimate['position']>, string> = {
  within: 'Your request sits within this range.',
  below: 'Your request is below this range.',
  above: 'Your request is above this range, so expect questions on repayment sources or collateral.',
};

export function FinancingEstimate({ estimate, compact = false }: { estimate: ApplicantEstimate; compact?: boolean }) {
  return (
    <section aria-label="Financing estimate" className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-medium">Estimate</p>
      <p className="text-xs text-muted-foreground">{estimate.label}</p>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Indicative loan size</dt>
          <dd className="text-base font-semibold">{estimate.rangeInr ? `${inr(estimate.rangeInr[0])} to ${inr(estimate.rangeInr[1])}` : 'Not estimated'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Monthly instalment on your request</dt>
          <dd className="text-base font-semibold">{estimate.monthlyInstalmentInr !== null ? inr(estimate.monthlyInstalmentInr) : 'Not estimated'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Repayment coverage</dt>
          <dd className="text-base font-semibold">{estimate.coverage !== null ? `${estimate.coverage.toFixed(2)}x` : 'Not estimated'}</dd>
        </div>
      </dl>
      {estimate.position && <p className="mt-2 text-sm">{POSITION[estimate.position]}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        Request {inr(estimate.requestInr)}, {estimate.requestShareOfTurnoverPct}% of yearly turnover.
        {estimate.usedDocuments ? ' Checked against your uploaded documents.' : ''}
      </p>

      {estimate.warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {estimate.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />{w}
            </li>
          ))}
        </ul>
      )}
      {!compact && (
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer">How this is estimated</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {estimate.assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </details>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{DISCLOSURE}</p>
    </section>
  );
}
