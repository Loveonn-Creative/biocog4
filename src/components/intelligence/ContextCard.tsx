import { Link } from 'react-router-dom';
import { BasisTag } from './AnswerReceipt';
import type { Audience } from '@/lib/intelligenceClient';

export interface BriefSummary {
  kg: number;
  records: number;
  documents: number;
  firstMonth: string | null;
  lastMonth: string | null;
  topScope: { scope: 1 | 2 | 3; share: number } | null;
}

export interface ContextBrief {
  audience: Audience;
  brief: null | { basis: 'verified' | 'unverified' | 'none'; summary?: BriefSummary; monthly?: Array<{ month: string }> };
  insights: null | Array<{ finding: string; next: { label: string; path: string } }>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mon = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;

/** "Apr to Oct" in one year, "Nov 2025 to Oct 2026" across years. */
function periodText(first: string | null, last: string | null): string {
  if (!first || !last) return '';
  if (first === last) return `${mon(first)} ${first.slice(0, 4)}`;
  return first.slice(0, 4) === last.slice(0, 4) ? `${mon(first)} to ${mon(last)}` : `${mon(first)} ${first.slice(0, 4)} to ${mon(last)} ${last.slice(0, 4)}`;
}

const tonnes = (kg: number) => `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: kg < 10000 ? 2 : 1 })} t`;

/** What answers on this plan rest on: the person's own records, their insights, or a labelled sample. */
export function ContextCard({ data, className = '' }: { data: ContextBrief; className?: string }) {
  const { audience, brief, insights } = data;
  const card = `rounded-2xl border border-border bg-card p-3 text-sm ${className}`;

  if (audience === 'pro' || audience === 'scale') {
    const s = brief?.summary;
    if (!brief || brief.basis === 'none' || !s) {
      return (
        <div className={`${card} flex items-center justify-between gap-3`}>
          <span className="text-muted-foreground">No records yet</span>
          <Link to="/" className="shrink-0 font-semibold text-primary hover:underline">Upload an invoice</Link>
        </div>
      );
    }
    return (
      <div className={card}>
        <div className="flex flex-wrap items-center gap-1.5">
          <BasisTag basis={brief.basis} />
          <span className="text-xs text-muted-foreground">· your data</span>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <dt className="sr-only">Total</dt>
            <dd className="text-lg font-semibold tabular-nums tracking-tight">{tonnes(s.kg)}</dd>
            <dd className="truncate text-[11px] text-muted-foreground">CO₂e, {periodText(s.firstMonth, s.lastMonth)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Invoices</dt>
            <dd className="text-lg font-semibold tabular-nums tracking-tight">{s.documents.toLocaleString('en-IN')}</dd>
            <dd className="truncate text-[11px] text-muted-foreground">invoices read</dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Top scope</dt>
            <dd className="text-lg font-semibold tabular-nums tracking-tight">{s.topScope ? `${Math.round(s.topScope.share * 100)}%` : '–'}</dd>
            <dd className="truncate text-[11px] text-muted-foreground">{s.topScope ? `Scope ${s.topScope.scope} share` : 'top scope'}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (audience === 'essential') {
    if (!insights?.length) {
      return (
        <div className={`${card} flex items-center justify-between gap-3`}>
          <span className="text-muted-foreground">Savings Insights</span>
          <Link to="/" className="shrink-0 font-semibold text-primary hover:underline">Upload an invoice</Link>
        </div>
      );
    }
    return (
      <div className={card}>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Savings Insights</p>
        <ul className="mt-2 space-y-1.5">
          {insights.slice(0, 2).map((i) => (
            <li key={i.finding} className="text-sm">
              {i.finding} <Link to={i.next.path} className="font-semibold text-primary hover:underline">{i.next.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`${card} flex flex-wrap items-center justify-between gap-2`}>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold tracking-wide text-foreground">Sample business</span>
        <span className="text-xs text-muted-foreground">· not your data</span>
      </span>
      <Link to="/pricing" className="shrink-0 font-semibold text-primary hover:underline">See plans</Link>
    </div>
  );
}
