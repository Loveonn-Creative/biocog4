import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { answers, answerBySlug, ANSWER_TOPICS, type Answer, type AnswerTopic } from '@/data/answers';
import { answerMeta, STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { TwoVoices } from '@/components/doodles/Doodles';

const TOPICS = Object.keys(ANSWER_TOPICS) as AnswerTopic[];
// Only loaded for an /answers address that has no page.
const QuestionRadar = lazy(() => import('@/components/answers/QuestionRadar'));

/** Renders [label](/path) links inside answer text; everything else stays plain. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return <>{parts.map((p, i) => {
    const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return <Fragment key={i}>{p}</Fragment>;
    return m[2].startsWith('/')
      ? <Link key={i} to={m[2]} className="text-primary underline underline-offset-2">{m[1]}</Link>
      : <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{m[1]}</a>;
  })}</>;
}

const StatusPill = ({ status }: { status?: Answer['status'] }) => {
  if (!status || status === 'available') return null;
  const s = status === 'on-request'
    ? { label: 'Set up on request', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' }
    : { label: 'Not offered', cls: 'bg-secondary text-muted-foreground' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
};

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]/gu, ' ');

/* ---------------- Hub ---------------- */

const Hub = () => {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<AnswerTopic | 'all'>('all');
  const input = useRef<HTMLInputElement>(null);

  // "/" jumps to search, as on most help centres.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return answers.filter(a => (topic === 'all' || a.topic === topic)
      && terms.every(t => norm(`${a.q} ${a.title} ${a.short}`).includes(t)));
  }, [query, topic]);

  return (
    <>
      <section className="container max-w-4xl mx-auto px-5 pt-12 pb-10 md:pt-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[2.6rem] leading-[1.05] font-semibold tracking-tight md:text-6xl">Answers</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">Straight answers about Senseible, carbon data, CBAM and green finance. Including what we do not do.</p>
          </div>
          <div className="hidden shrink-0 text-foreground/50 sm:block"><TwoVoices /></div>
        </div>
        <label htmlFor="answers-search" className="sr-only">Search answers</label>
        <div className="relative mt-8">
          <input id="answers-search" ref={input} type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search, for example “login”, “CBAM” or “free plan”"
            className="h-14 w-full rounded-2xl border border-input bg-background pl-5 pr-14 text-[17px] shadow-[0_20px_40px_-34px_hsl(var(--foreground)/.5)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-xs text-muted-foreground sm:block">/</kbd>
        </div>
        <div className="-mx-5 mt-4 overflow-x-auto px-5">
          <div role="radiogroup" aria-label="Topic" className="flex w-max gap-2">
            {(['all', ...TOPICS] as const).map(t => (
              <button key={t} type="button" role="radio" aria-checked={topic === t} onClick={() => setTopic(t)}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors ${topic === t ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40'}`}>
                {t === 'all' ? 'All' : ANSWER_TOPICS[t].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container max-w-4xl mx-auto px-5 pb-20" aria-live="polite">
        {results.length === 0 ? (
          <div className="rounded-3xl border border-border p-8 text-center">
            <p className="text-lg font-medium">No answer matches yet.</p>
            <p className="mt-2 text-muted-foreground">Ask us directly and we will reply within 24 hours.</p>
            <Link to="/contact" className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-6 font-medium text-primary-foreground">Ask a question</Link>
          </div>
        ) : TOPICS.filter(t => results.some(a => a.topic === t)).map(t => (
          <div key={t} className="mb-12">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-primary">{ANSWER_TOPICS[t].label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ANSWER_TOPICS[t].line}</p>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {results.filter(a => a.topic === t).map(a => (
                <li key={a.slug}>
                  <Link to={`/answers/${a.slug}`} className="group flex items-center justify-between gap-4 py-4">
                    <span className="text-[17px] leading-snug text-foreground group-hover:text-primary transition-colors">{a.q}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
};

/* ---------------- One answer ---------------- */

const Article = ({ a }: { a: Answer }) => {
  const related = answers.filter(x => x.topic === a.topic && x.slug !== a.slug).slice(0, 4);
  return (
    <article className="container max-w-2xl mx-auto px-5 pt-10 pb-20 md:pt-16">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link to="/answers" className="hover:text-foreground">Answers</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{ANSWER_TOPICS[a.topic].label}</span>
      </nav>
      <h1 className="mt-5 text-[2rem] leading-[1.15] font-semibold tracking-tight md:text-[2.6rem] [text-wrap:balance]">{a.q}</h1>
      <div className="mt-3"><StatusPill status={a.status} /></div>

      <div className="mt-8 rounded-3xl border-l-4 border-primary bg-primary/5 p-6">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Short answer</div>
        <p data-speakable className="mt-2 text-[19px] leading-relaxed text-foreground [text-wrap:pretty]">{a.short}</p>
      </div>

      {a.body.length > 0 && (
        <div className="mt-8 space-y-5 text-[17px] leading-[1.75] text-foreground/85">
          {a.body.map(p => <p key={p}><RichText text={p} /></p>)}
        </div>
      )}

      {a.links.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-3">
          {a.links.map((l, i) => (
            <Link key={l.to} to={l.to} className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-secondary'}`}>
              {l.label}{i === 0 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Link>
          ))}
        </div>
      )}

      {a.sources?.length ? (
        <p className="mt-8 text-sm text-muted-foreground">Sources: {a.sources.map((s, i) => (
          <Fragment key={s.url}>{i > 0 && ', '}<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{s.label}</a></Fragment>
        ))}</p>
      ) : null}

      {related.length > 0 && (
        <aside className="mt-16 border-t border-border pt-8">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Related</h2>
          <ul className="mt-3 divide-y divide-border">
            {related.map(r => (
              <li key={r.slug}><Link to={`/answers/${r.slug}`} className="group flex items-center justify-between gap-4 py-3.5 text-[16px] hover:text-primary">{r.q}<ArrowRight className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100" aria-hidden="true" /></Link></li>
            ))}
          </ul>
        </aside>
      )}
      <p className="mt-10 text-sm text-muted-foreground">Still unsure? <Link to="/contact" className="text-primary underline underline-offset-2">Ask us</Link>; we reply within 24 hours.</p>
    </article>
  );
};

const Answers = () => {
  const { slug } = useParams();
  const a = slug ? answerBySlug(slug) : undefined;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);
  const meta: { title: string; description: string } = a ? answerMeta(a) : STATIC_PAGE_META['/answers'];
  const content: ReactNode = slug && !a ? (
    <Suspense fallback={<div className="min-h-[60vh]" />}><QuestionRadar key={slug} slug={slug} /></Suspense>
  ) : a ? <Article a={a} /> : <Hub />;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={meta.title}
        description={meta.description}
        canonical={a ? `/answers/${a.slug}` : '/answers'}
        noIndex={!!slug && !a}
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Answers', url: '/answers' }, ...(a ? [{ name: a.title, url: `/answers/${a.slug}` }] : [])]}
        faqSchema={a ? [{ question: a.q, answer: a.short }] : undefined}
      />
      <Navigation />
      <main className="overflow-x-clip pt-16">{content}</main>
      <Footer />
    </div>
  );
};

export default Answers;
