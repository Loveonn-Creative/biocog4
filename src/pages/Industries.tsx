import { useEffect, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import industriesOg from '@/assets/og/industries.jpg';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { industries, type IndustryData } from '@/data/industriesData';
import { INDUSTRY_PIPELINES } from '@/data/industryPipeline';
import { getAllSolutionSlugs } from '@/data/solutionsData';
import { industryMeta, INDUSTRIES_HUB_META } from '@/lib/seo/seoMeta';
import { SectorDrawing } from '@/components/industry/SectorArt';
import { SourceMap } from '@/components/industry/SourceMap';
import { WorkedExample } from '@/components/industry/WorkedExample';
import { Reveal } from '@/components/platform/Reveal';

const EUR_LEX_CBAM = 'https://eur-lex.europa.eu/eli/reg/2023/956/oj';

/** True of every verified record; used where a sector has no deeper pipeline notes. */
const VERIFY_POINTS = [
  'A bill with an amount but no quantity is returned as a named data gap, never turned into a spend estimate.',
  'Every document is fingerprinted (SHA-256), so the same bill cannot be counted twice or sent to two buyers as new evidence.',
  'The emission factor and its source are recorded against each line, so the number can be reproduced later.',
  'The methodology version is stored with the record.',
];

const solutionLinks = (id: string) => {
  const sector: Record<string, string> = { textile: 'textile', chemical: 'chemicals', steel: 'steel', logistics: 'logistics' };
  const s = sector[id] ?? 'manufacturing';
  const regs = industries.find(i => i.id === id)?.cbam ? ['cbam', 'scope3'] : ['carbon-audit', 'scope3'];
  const existing = new Set(getAllSolutionSlugs());
  return ['india', 'bangladesh', 'indonesia', 'vietnam', 'philippines'].flatMap(c =>
    regs.map(r => ({ slug: `${r}-${s}-${c}`, label: `${r === 'cbam' ? 'CBAM' : r === 'scope3' ? 'Scope 3' : 'Carbon audit'} · ${c[0].toUpperCase()}${c.slice(1)}` })),
  ).filter(l => existing.has(l.slug)).slice(0, 6);
};

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="text-xs uppercase tracking-[0.14em] text-primary">{children}</div>
);

const CbamTag = ({ on }: { on: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${on ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-destructive' : 'bg-muted-foreground/50'}`} aria-hidden="true" />
    {on ? 'Covered by EU CBAM' : 'Asked for by buyers'}
  </span>
);

/** Sector switcher: every sector one tap away, current one marked. */
const Switcher = ({ current }: { current?: string }) => (
  <nav aria-label="Industries" className="-mx-5 overflow-x-auto px-5 pb-1">
    <ul className="flex w-max gap-2">
      <li><Link to="/industries" className={`block rounded-full border px-3.5 py-1.5 text-sm ${!current ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40'}`}>All</Link></li>
      {industries.map(i => (
        <li key={i.id}>
          <Link to={`/industries/${i.id}`} aria-current={current === i.id ? 'page' : undefined}
            className={`block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors ${current === i.id ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40'}`}>
            {i.short}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

/* ---------------- Hub ---------------- */

const Hub = () => {
  const groups: [string, IndustryData[]][] = [
    ['Covered by EU CBAM: actual data beats the default', industries.filter(i => i.cbam)],
    ['Asked for by buyers, lenders and OEMs', industries.filter(i => !i.cbam)],
  ];
  return (
    <>
      <section className="container max-w-6xl mx-auto px-5 pt-10 pb-10 md:pt-16">
        <Switcher />
        <h1 className="mt-10 max-w-3xl text-[2.4rem] leading-[1.06] font-semibold tracking-tight md:text-6xl [text-wrap:balance]">
          Carbon Accounting for Every MSME Industry
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">Pick your sector. See the question your buyer is asking, where your emissions come from, and a worked example with real factors.</p>
      </section>
      {groups.map(([title, list]) => (
        <section key={title} className="container max-w-6xl mx-auto px-5 pb-14">
          <h2 className="mb-5 text-lg font-semibold">{title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((i, n) => (
              <Reveal key={i.id} delay={n * 50}>
                <Link to={`/industries/${i.id}`} className="group flex h-full flex-col rounded-3xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_50px_-34px_hsl(var(--foreground)/.45)]">
                  <div className="aspect-[3/2] w-full text-foreground/60 transition-colors group-hover:text-foreground/80">
                    <SectorDrawing id={i.id} className="h-full w-full" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{i.name}</h3>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">“{i.buyer.question}”</p>
                  <div className="mt-auto pt-4"><CbamTag on={i.cbam} /></div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ))}
    </>
  );
};

/* ---------------- Sector page ---------------- */

const Sector = ({ ind }: { ind: IndustryData }) => {
  const pipe = INDUSTRY_PIPELINES[ind.id];
  const verify = pipe?.verification.points ?? VERIFY_POINTS;
  const links = solutionLinks(ind.id);
  return (
    <>
      {/* 1. The request that brings them here, and the one next step */}
      <section className="container max-w-6xl mx-auto px-5 pt-10 pb-14 md:pt-16 md:pb-20">
        <Switcher current={ind.id} />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <CbamTag on={ind.cbam} />
            <h1 className="mt-4 text-[2.3rem] leading-[1.06] font-semibold tracking-tight md:text-[3.4rem] [text-wrap:balance]">
              {ind.name}
              <span className="block text-muted-foreground font-normal text-[0.55em] mt-2">Carbon Accounting Guide</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground leading-relaxed">{ind.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/" className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-transform hover:-translate-y-px">
                Upload a fuel or power bill <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              {ind.cbam
                ? <Link to="/cbam-calculator" className="inline-flex h-12 items-center rounded-full border border-border px-6 font-medium hover:bg-secondary">CBAM cost calculator</Link>
                : <a href="#example" className="inline-flex h-12 items-center rounded-full border border-border px-6 font-medium hover:bg-secondary">See a worked example</a>}
            </div>
          </div>

          {/* The conversation: their question, your answer */}
          <div className="relative mx-auto w-full max-w-md [perspective:1200px]" aria-label="The request and the reply">
            <div className="[transform:rotateY(-8deg)_rotateX(4deg)] space-y-4">
              <Reveal>
                <div className="mr-10 rounded-3xl rounded-bl-md border border-border bg-card p-5 shadow-[0_24px_50px_-34px_hsl(var(--foreground)/.5)]">
                  <div className="text-xs font-medium text-muted-foreground">{ind.buyer.who}</div>
                  <p className="mt-1.5 text-[17px] leading-snug">{ind.buyer.question}</p>
                </div>
              </Reveal>
              <Reveal delay={500}>
                <div className="ml-10 rounded-3xl rounded-br-md bg-primary p-5 text-primary-foreground shadow-[0_24px_50px_-30px_hsl(var(--primary))]">
                  <div className="text-xs font-medium text-primary-foreground/70">You, with Senseible</div>
                  <p className="mt-1.5 text-[17px] leading-snug">Here is our record: every bill, its emission factor and source, ready to check.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Where it comes from, on their own plant */}
      <section className="border-y border-border bg-secondary/30 py-16 md:py-20">
        <div className="container max-w-6xl mx-auto px-5">
          <Eyebrow>Where your emissions come from</Eyebrow>
          <h2 className="mt-3 mb-10 max-w-2xl text-2xl font-semibold tracking-tight md:text-4xl [text-wrap:balance]">{ind.tagline}</h2>
          <SourceMap ind={ind} />
        </div>
      </section>

      {/* 3. A worked example with the real factors */}
      <section id="example" className="scroll-mt-20 py-16 md:py-20">
        <div className="container max-w-6xl mx-auto px-5">
          <Eyebrow>Worked example</Eyebrow>
          <h2 className="mt-3 mb-8 max-w-2xl text-2xl font-semibold tracking-tight md:text-4xl [text-wrap:balance]">What a typical unit’s bills add up to</h2>
          <WorkedExample ind={ind} />
        </div>
      </section>

      {/* 4. What the asker needs, and why the answer holds up */}
      <section className="border-t border-border py-16 md:py-20">
        <div className="container max-w-6xl mx-auto px-5 grid gap-6 md:grid-cols-2">
          <div className={`rounded-3xl border p-6 md:p-8 ${ind.cbam ? 'border-destructive/30' : 'border-border'}`}>
            <Eyebrow>{ind.cbam ? 'EU CBAM' : 'What the buyer needs'}</Eyebrow>
            {ind.cbam ? (
              <>
                <h3 className="mt-3 text-xl font-semibold">Actual data, or the default value</h3>
                <ul className="mt-4 space-y-2.5 text-[15px] text-muted-foreground">
                  <li>The definitive period began on 1 January 2026: EU importers declare embedded emissions and surrender certificates for them.</li>
                  <li>Without the producer’s actual data, default values apply, with a mark-up from 2026.</li>
                  <li>Importers bringing in 50 tonnes or less of covered goods a year are exempt.</li>
                </ul>
                <div className="mt-5 flex flex-wrap gap-4 text-sm">
                  <Link to="/cbam-calculator" className="font-medium text-primary">Estimate your CBAM cost →</Link>
                  <a href={EUR_LEX_CBAM} target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline underline-offset-2">Regulation (EU) 2023/956</a>
                </div>
              </>
            ) : (
              <>
                <h3 className="mt-3 text-xl font-semibold">A number they can check</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{pipe?.problem ?? `${ind.buyer.who}s use supplier data in their own reporting, so they need a figure built from documents, with the method shown.`}</p>
                <Link to="/scope-3-supplier-evidence" className="mt-5 inline-block text-sm font-medium text-primary">How buyers check supplier data →</Link>
              </>
            )}
          </div>
          <div className="rounded-3xl border border-border p-6 md:p-8">
            <Eyebrow>Why the answer holds up</Eyebrow>
            <h3 className="mt-3 text-xl font-semibold">How Senseible verifies it</h3>
            <ul className="mt-4 space-y-2.5">
              {verify.slice(0, 4).map(p => (
                <li key={p} className="flex gap-3 text-[15px] text-muted-foreground">
                  <svg viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true"><path d="M3 11 L8 15 L17 4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Levers, then the next step */}
      <section className="border-t border-border bg-secondary/30 py-16">
        <div className="container max-w-6xl mx-auto px-5">
          <Eyebrow>Where reductions usually start</Eyebrow>
          <ul className="mt-5 flex flex-wrap gap-2">
            {ind.reductionStrategies.map(r => <li key={r} className="rounded-full border border-border bg-background px-4 py-2 text-sm">{r}</li>)}
          </ul>
          {links.length > 0 && (
            <div className="mt-10">
              <div className="text-sm font-medium">By country</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {links.map(l => <Link key={l.slug} to={`/solutions/${l.slug}`} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary">{l.label}</Link>)}
              </div>
            </div>
          )}
          <div className="mt-14 rounded-3xl bg-foreground px-6 py-12 text-center text-background md:py-14">
            <h2 className="text-2xl font-semibold md:text-3xl [text-wrap:balance]">Answer “{ind.buyer.question}” with evidence</h2>
            <Link to="/" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 font-medium text-primary-foreground">
              Upload a bill, free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

const Industries = () => {
  const { industry: slug } = useParams();
  const ind = slug ? industries.find(i => i.id === slug) : undefined;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Carbon accounting by industry',
    itemListElement: industries.map((i, n) => ({
      '@type': 'ListItem', position: n + 1, url: `https://senseible.earth/industries/${i.id}`, name: i.name,
    })),
  };
  const current = ind ?? industries[0];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        {...(ind ? industryMeta(ind) : INDUSTRIES_HUB_META)}
        canonical={ind ? `/industries/${ind.id}` : '/industries'}
        noIndex={!!slug && !ind}
        image={`https://senseible.earth${industriesOg}`}
        keywords={ind ? ind.keywords : industries.flatMap(i => i.keywords.slice(0, 1))}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Industries', url: '/industries' },
          ...(ind ? [{ name: current.name, url: `/industries/${current.id}` }] : []),
        ]}
      />
      {!ind && <Helmet><script type="application/ld+json">{JSON.stringify(structuredData)}</script></Helmet>}
      <Navigation />
      <main className="overflow-x-clip pt-16">
        {ind ? <Sector ind={ind} /> : <Hub />}
      </main>
      <Footer />
    </div>
  );
};

export default Industries;
