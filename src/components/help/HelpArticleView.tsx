// One Help Center article: the answer in a line, fact tiles, a small picture
// where it explains the idea, short steps and the one button that does the
// task. Used by /help/<slug> and the in-app help panel.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, FileText, MessageCircle } from 'lucide-react';
import { checkoutTotal } from '../../../supabase/functions/_shared/checkoutTotals';
import { CREDIT_PACK_BASE_PAISE } from '../../../supabase/functions/_shared/addonPurchases';
import type { HelpArticle } from '../../../supabase/functions/_shared/helpArticles';
import { contactHref, type HelpUi } from '@/lib/help/content';

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function GstVisual({ ui }: { ui: HelpUi }) {
  const upi = checkoutTotal(CREDIT_PACK_BASE_PAISE, 'upi');
  const card = checkoutTotal(CREDIT_PACK_BASE_PAISE, 'razorpay');
  const Row = ({ label, t }: { label: string; t: typeof upi }) => (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ui.price}</dt><dd>{rupees(t.basePaise)}</dd></div>
        {t.feePaise > 0 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ui.fee}</dt><dd>{rupees(t.feePaise)}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{ui.gst}</dt><dd>{rupees(t.gstPaise)}</dd></div>
        <div className="flex justify-between gap-3 border-t border-border pt-1 font-semibold"><dt>{ui.total}</dt><dd>{rupees(t.totalPaise)}</dd></div>
      </dl>
    </div>
  );
  return (
    <figure className="my-5">
      <figcaption className="mb-2 text-xs text-muted-foreground">{ui.example}</figcaption>
      <div className="grid gap-3 sm:grid-cols-2"><Row label={ui.upi} t={upi} /><Row label={ui.card} t={card} /></div>
    </figure>
  );
}

function FormulaVisual({ ui }: { ui: HelpUi }) {
  const chip = 'rounded-xl border border-border bg-background px-3 py-2 text-center text-sm font-medium';
  return (
    <figure className="my-5">
      <div className="flex flex-wrap items-center justify-center gap-2" aria-hidden="true">
        <span className={chip}>{ui.quantity}</span><span className="text-lg text-muted-foreground">×</span>
        <span className={chip}>{ui.factor}</span><span className="text-lg text-muted-foreground">=</span>
        <span className={`${chip} border-primary/40 bg-primary/5 text-primary`}>{ui.result}</span>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{ui.formulaExample}</figcaption>
    </figure>
  );
}

function ScoreVisual({ ui }: { ui: HelpUi }) {
  return (
    <figure className="my-5" aria-hidden="true">
      <div className="relative h-3 rounded-full bg-gradient-to-r from-destructive/30 via-amber-300/50 to-primary/70">
        <span className="absolute -top-1 h-5 w-0.5 bg-foreground" style={{ left: '80%' }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{ui.scoreGaps}</span><span className="font-medium text-foreground">{ui.scorePass}</span><span>{ui.scoreStart}</span>
      </div>
    </figure>
  );
}

function SplitVisual({ ui }: { ui: HelpUi }) {
  return (
    <figure className="my-5 flex items-center justify-center gap-3" aria-hidden="true">
      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><FileText className="h-9 w-9 text-primary" />{ui.splitWhole}</div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
        <div className="flex gap-1">{[0, 1, 2].map((i) => <FileText key={i} className="h-6 w-6 text-primary/70" />)}</div>{ui.splitParts}
      </div>
    </figure>
  );
}

export function HelpArticleBody({ article, ui, compact = false }: { article: HelpArticle; ui: HelpUi; compact?: boolean }) {
  const [voted, setVoted] = useState(false);
  const topic = article.contact ?? 'general';
  return (
    <div>
      <p className={compact ? 'text-base font-medium leading-snug' : 'text-lg font-medium leading-snug sm:text-xl'}>{article.a}</p>

      {article.visual === 'gst' && <GstVisual ui={ui} />}
      {article.visual === 'formula' && <FormulaVisual ui={ui} />}
      {article.visual === 'score' && <ScoreVisual ui={ui} />}
      {article.visual === 'split' && <SplitVisual ui={ui} />}

      {article.facts?.length && article.visual !== 'gst' ? (
        <dl className={`my-4 grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
          {article.facts.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-muted/40 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {article.steps?.length ? (
        <ol className="my-4 space-y-2">
          {article.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {article.cta && (
        article.cta.to.startsWith('mailto:') ? (
          <a href={article.cta.to} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {article.cta.label} <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
        <Link to={article.cta.to} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {article.cta.label} <ArrowRight className="h-4 w-4" />
        </Link>
        )
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-border pt-4 text-sm text-muted-foreground">
        {voted ? (
          <span className="inline-flex items-center gap-1 text-primary"><Check className="h-4 w-4" /> {ui.thanks}</span>
        ) : (
          <>
            <span>{ui.helpful}</span>
            <button type="button" onClick={() => setVoted(true)} className="rounded-lg border border-border px-2.5 py-1 hover:border-primary hover:text-foreground">{ui.yes}</button>
            <Link to={contactHref(topic, article.q)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 hover:border-primary hover:text-foreground">
              <MessageCircle className="h-3.5 w-3.5" /> {ui.no}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
