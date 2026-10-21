import { Link } from 'react-router-dom';
import type { Moment } from '@/lib/proofMoments';

// A one-time milestone, shown inside "Where you stand" the first time it is
// true for the account. Drawn once; with reduced motion it appears finished.

const monthName = (ym: string, long = true) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined, timeZone: 'UTC' });
const kgOrT = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} t CO₂e` : `${Math.round(kg).toLocaleString('en-IN')} kg CO₂e`);

function Seal() {
  return (
    <svg viewBox="0 0 76 76" className="h-14 w-14 shrink-0 sm:h-[76px] sm:w-[76px]" aria-hidden="true">
      <circle cx="38" cy="38" r="32" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
      <circle cx="38" cy="38" r="32" fill="none" stroke="hsl(var(--success))" strokeWidth="4" strokeLinecap="round" pathLength={1}
        className="origin-center -rotate-90 [stroke-dasharray:1] motion-safe:animate-[draw_1s_0.2s_cubic-bezier(.3,.7,.2,1)_both]" style={{ strokeDashoffset: 0 }} />
      <path d="M26 39 l8 8 l16 -18" fill="none" stroke="hsl(var(--success))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
        className="[stroke-dasharray:1] motion-safe:animate-[draw_0.5s_1.1s_ease-out_both]" style={{ strokeDashoffset: 0 }} />
    </svg>
  );
}

export function ProofMoment({ moment, onDismiss }: { moment: Moment; onDismiss: () => void }) {
  let title = '', line: React.ReactNode = null, cta = { label: '', to: '' };
  if (moment.id === 'first_verified') {
    title = 'Your first verified record.';
    cta = { label: 'See the trail', to: '/mrv-dashboard' };
    line = (
      <>
        <p className="text-sm text-muted-foreground">A lender can now trace this line back to your bill.</p>
        <p className="mt-2 font-mono text-xs text-foreground">{[moment.vendor, monthName(moment.month), `${Math.round(moment.quantity).toLocaleString('en-IN')} ${moment.unit}`, kgOrT(moment.kg)].filter(Boolean).join(' · ')}</p>
        {moment.fingerprint && (
          <p className="mt-1 overflow-hidden whitespace-nowrap font-mono text-xs text-primary" aria-label={`Bill fingerprint ${moment.fingerprint.slice(0, 16)}`}>
            {`Fingerprint ${moment.fingerprint.slice(0, 24)}…`.split('').map((c, i) => (
              <span key={i} className="motion-safe:animate-[appear_0.01s_both]" style={{ animationDelay: `${1.2 + i * 0.025}s` }}>{c === ' ' ? ' ' : c}</span>
            ))}
          </p>
        )}
      </>
    );
  } else if (moment.id === 'six_months') {
    title = 'Six months, no gaps.';
    cta = { label: 'Open green loan', to: '/green-loan' };
    line = (
      <>
        <p className="text-sm text-muted-foreground">That’s the first thing a lender looks for, and you have it.</p>
        <ol className="mt-2 flex gap-1.5" aria-label={`${monthName(moment.months[0])} to ${monthName(moment.months[5])}, all on record`}>
          {moment.months.map((m, i) => (
            <li key={m} className="grid h-7 w-8 place-items-center rounded-md bg-success/10 font-mono text-[11px] text-success motion-safe:animate-[pop-in_0.3s_ease-out_both]" style={{ animationDelay: `${0.2 + i * 0.12}s` }}>{monthName(m, false)}</li>
          ))}
        </ol>
      </>
    );
  } else {
    title = 'Your power factor fix is working.';
    cta = { label: 'See the bills', to: '/history' };
    line = (
      <>
        <p className="text-sm text-muted-foreground">{monthName(moment.month)}’s bill shows a better power factor, so you paid for less kVAh.</p>
        <p className="mt-2 flex items-baseline gap-2.5 font-mono" aria-label={`Power factor ${moment.before} before, ${moment.after} now`}>
          <span className="text-xl font-semibold text-muted-foreground line-through decoration-2">{moment.before.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="text-2xl font-semibold text-success">{moment.after.toFixed(2)}</span>
        </p>
      </>
    );
  }
  return (
    <div className="flex flex-col-reverse gap-4 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between md:px-7" role="status">
      <div className="min-w-0">
        <p className="text-base font-semibold">{title}</p>
        {line}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link to={cta.to} className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">{cta.label}</Link>
          <button type="button" onClick={onDismiss} className="rounded-md px-1 py-2 text-sm text-muted-foreground hover:text-foreground">Got it</button>
        </div>
      </div>
      <Seal />
    </div>
  );
}
