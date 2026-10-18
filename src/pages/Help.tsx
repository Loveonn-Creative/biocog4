// Help Center: /help (ask box, topics, fixes) and /help/<slug> (one article).
// Copy comes from src/lib/help/content.ts in the reader's language.

import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, BarChart3, ChevronRight, CreditCard, MessageCircle, PlayCircle, Upload, type LucideIcon } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { helpMetaFor } from '@/lib/help/meta';
import { useI18nContext } from '@/lib/i18n/LanguageProvider';
import { contactHref, useHelpContent, type HelpContent } from '@/lib/help/content';
import { helpArticle, HELP_ARTICLES, type HelpSection } from '../../supabase/functions/_shared/helpArticles';
import { HelpAsk } from '@/components/help/HelpAsk';
import { HelpFixer } from '@/components/help/HelpFixer';
import { HelpArticleBody } from '@/components/help/HelpArticleView';

const ICONS: Record<HelpSection, LucideIcon> = { start: PlayCircle, upload: Upload, numbers: BarChart3, billing: CreditCard };

function StillStuck({ content, topic = 'general', about }: { content: HelpContent; topic?: string; about?: string }) {
  const { ui } = content;
  return (
    <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-5 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-base font-semibold">{ui.stillStuck}</h2>
        <p className="text-sm text-muted-foreground">{ui.stillStuckLead}</p>
      </div>
      <Link to={contactHref(topic, about)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary">
        <MessageCircle className="h-4 w-4 text-primary" /> {ui.messageUs}
      </Link>
    </section>
  );
}

function Hub({ content }: { content: HelpContent }) {
  const navigate = useNavigate();
  const [pick, setPick] = useState<HelpSection | null>(null);
  const { ui, sections, articles } = content;
  const open = (slug: string) => navigate(`/help/${slug}`);
  const shown = pick ? sections.filter((s) => s.id === pick) : sections;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pt-14">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{ui.hubTitle}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{ui.hubLead}</p>
      </header>
      <div className="mt-6"><HelpAsk content={content} onOpen={open} /></div>

      <nav aria-label={ui.allTopics} className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
        {sections.map((s) => {
          const Icon = ICONS[s.id];
          const on = pick === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPick(on ? null : s.id)}
              className={`rounded-2xl border bg-background p-4 text-left transition motion-safe:hover:-translate-y-0.5 ${on ? 'border-primary ring-4 ring-primary/10' : 'border-border hover:border-primary/60'}`}
            >
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="mt-2 block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-muted-foreground">{s.blurb}</span>
            </button>
          );
        })}
        <a href="#fix" className="col-span-2 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-primary/60 motion-safe:hover:-translate-y-0.5 md:col-span-1">
          <AlertCircle className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="mt-2 block text-sm font-semibold">{ui.somethingWrong}</span>
          <span className="block text-xs text-muted-foreground">{ui.somethingWrongBlurb}</span>
        </a>
      </nav>

      <div className="mt-10 space-y-8">
        {shown.map((s) => (
          <section key={s.id} aria-labelledby={`sec-${s.id}`}>
            <h2 id={`sec-${s.id}`} className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {articles.filter((a) => a.section === s.id).map((a) => (
                <li key={a.slug}>
                  <Link to={`/help/${a.slug}`} className="group flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 hover:border-primary/60">
                    <span>
                      <span className="block text-sm font-medium">{a.q}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{a.a}</span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10 space-y-4">
        <HelpFixer id="fix" content={content} onOpen={open} />
        <StillStuck content={content} />
      </div>
    </div>
  );
}

function ArticlePage({ slug, content }: { slug: string; content: HelpContent }) {
  const { ui, sections, articles } = content;
  const article = articles.find((a) => a.slug === slug)!;
  const section = sections.find((s) => s.id === article.section)!;
  const more = articles.filter((a) => a.section === article.section && a.slug !== slug);
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link to="/help" className="hover:text-foreground">{ui.helpCenter}</Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span>{section.title}</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{article.q}</h1>
      <div className="mt-5 rounded-2xl border border-border bg-background p-5 sm:p-6">
        <HelpArticleBody article={article} ui={ui} />
      </div>

      {more.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ui.related}</h2>
          <ul className="space-y-1">
            {more.map((a) => (
              <li key={a.slug}>
                <Link to={`/help/${a.slug}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-muted/60">
                  {a.q} <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-8"><StillStuck content={content} topic={article.contact ?? 'general'} about={article.q} /></div>
    </div>
  );
}

const Help = () => {
  const { slug } = useParams();
  const { locale } = useI18nContext();
  const content = useHelpContent(locale);
  const english = useMemo(() => (slug ? helpArticle(slug) : undefined), [slug]);
  if (slug && !english) return <Navigate to="/help" replace />;

  const meta = helpMetaFor(english?.slug);
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={meta.title}
        description={meta.description}
        canonical={english ? `/help/${english.slug}` : '/help'}
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Help Center', url: '/help' }, ...(english ? [{ name: english.q, url: `/help/${english.slug}` }] : [])]}
        faqSchema={english
          ? [{ question: english.q, answer: [english.a, ...(english.steps ?? [])].join(' ') }]
          : HELP_ARTICLES.map((a) => ({ question: a.q, answer: a.a }))}
      />
      <Navigation />
      <main className="overflow-x-clip pt-16" lang={content.locale}>
        {english ? <ArticlePage slug={english.slug} content={content} /> : <Hub content={content} />}
      </main>
      <Footer />
    </div>
  );
};

export default Help;
