import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Footer } from "@/components/Footer";
import { LeadHeader, StickyCta } from "@/components/lead/LeadKit";
import { leadEvents } from "@/components/lead/leadEvents";
import { ReportAccessCard } from "@/components/lead/ReportAccessCard";
import {
  ESG_SAMPLE_ANSWER, ESG_SAMPLE_ASKERS, ESG_SAMPLE_COMPARE, ESG_SAMPLE_FACTS, ESG_SAMPLE_INTRO, ESG_SAMPLE_META,
  ESG_SAMPLE_OBJECTIONS, ESG_SAMPLE_PREVIEWS, ESG_SAMPLE_PROBLEMS, ESG_SAMPLE_TAKEAWAYS, type AskerId,
} from "@/data/esgReportSample";

const PAGE = "esg_report_sample";

const toForm = (where: string) => {
  leadEvents.cta(PAGE, `to_form_${where}`);
  const el = document.getElementById("report-access");
  el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => (document.getElementById("rp-name") as HTMLInputElement | null)?.focus({ preventScroll: true }), 450);
};

const Check = () => (
  <svg viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true"><path d="M3 11 L8 15 L17 4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const EsgReportSample = () => {
  const [asker, setAsker] = useState<AskerId>("listed_customer");
  const [ready, setReady] = useState(false);
  const active = ESG_SAMPLE_ASKERS.find(a => a.id === asker)!;
  useEffect(() => { leadEvents.view(PAGE); }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SEOHead
        title={ESG_SAMPLE_META.title}
        description={ESG_SAMPLE_META.description}
        canonical={ESG_SAMPLE_META.path}
        image="/resources/esg-report-sample/cover.webp"
        keywords={["sample ESG report India", "ESG report example", "BRSR Core report sample", "GRI content index example", "TCFD disclosure example", "ESG report for MSME"]}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Sample ESG report", url: ESG_SAMPLE_META.path }]}
        faqSchema={ESG_SAMPLE_OBJECTIONS.map(f => ({ question: f.q, answer: f.a }))}
      />
      <LeadHeader />

      <main>
        {/* 1. What it is, and how to get it, in the first screen */}
        <section className="pt-20 md:pt-24">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 sm:px-5 md:pb-20 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-x-12 lg:gap-y-8">
            <div className="min-w-0">
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">Free sample · 64 pages · PDF</p>
              <h1 className="mt-4 text-[2.1rem] font-semibold leading-[1.08] tracking-tight [text-wrap:balance] md:text-[3.1rem]">{ESG_SAMPLE_META.h1}</h1>
              <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-muted-foreground md:text-lg">{ESG_SAMPLE_INTRO}</p>
              <dl className="mt-7 grid max-w-md grid-cols-3 gap-3">
                {ESG_SAMPLE_FACTS.map(f => (
                  <div key={f.label} className="border-l-2 border-primary/60 pl-3">
                    <dt className="sr-only">{f.label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums md:text-3xl">{f.value}</dd>
                    <dd className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{f.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div id="report-access" className="min-w-0 scroll-mt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-2">
              <ReportAccessCard onReady={() => setReady(true)} />
              {ready && (
                <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-5" role="status">
                  <p className="font-medium">Want one built for your company?</p>
                  <p className="mt-1 text-[14px] text-muted-foreground">Start from the bills and invoices you already have. We scope the rest with you.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/esg-reporting" onClick={() => leadEvents.cta(PAGE, "esg_reporting")} className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground">See ESG reporting</Link>
                    <Link to="/" onClick={() => leadEvents.cta(PAGE, "upload_after")} className="inline-flex h-10 items-center rounded-full border border-border px-5 text-[14px] font-medium">Upload a bill, free</Link>
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              {/* Page previews: what you get, before you give anything */}
              <div className="flex gap-3 lg:mt-1" aria-label="Pages from the report">
                {ESG_SAMPLE_PREVIEWS.map((p, i) => (
                  <figure key={p.src} className={`w-[30%] max-w-[9.5rem] ${i === 1 ? "translate-y-3" : ""}`}>
                    <img src={p.src} alt={p.alt} width={440} height={620} loading={i === 0 ? "eager" : "lazy"} decoding="async"
                      className="aspect-[440/620] w-full rounded-lg border border-border bg-white object-cover shadow-[0_18px_40px_-28px_hsl(var(--foreground)/.5)]" />
                    <figcaption className="mt-2 text-[12px] text-muted-foreground">{p.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Three problems it solves */}
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 md:py-20">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight [text-wrap:balance] md:text-3xl">Three problems this report helps you solve</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
              {ESG_SAMPLE_PROBLEMS.map((p, i) => (
                <li key={p.title} className="min-w-0">
                  <span className="text-sm font-semibold tabular-nums text-primary">0{i + 1}</span>
                  <h3 className="mt-2 text-[18px] font-semibold leading-snug">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3. Inside the 64 pages, and the pages for whoever is asking */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-5 md:py-20 lg:grid-cols-2 lg:gap-14">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What you will take away</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{ESG_SAMPLE_ANSWER}</p>
            <ul className="mt-6 space-y-4">
              {ESG_SAMPLE_TAKEAWAYS.map(t => (
                <li key={t.text} className="flex gap-3 text-[15px] leading-relaxed">
                  <Check />
                  <span>{t.text} <span className="whitespace-nowrap text-[13px] text-muted-foreground">{t.pages}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 lg:pt-1">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <h3 className="text-lg font-semibold">Who is asking you for ESG data?</h3>
              <p className="mt-1 text-[14px] text-muted-foreground">Pick one to see where the report answers them.</p>
              <div role="radiogroup" aria-label="Who is asking" className="mt-4 flex flex-wrap gap-2">
                {ESG_SAMPLE_ASKERS.map(a => (
                  <button key={a.id} type="button" role="radio" aria-checked={asker === a.id}
                    onClick={() => { setAsker(a.id); leadEvents.cta(PAGE, `asker_${a.id}`); }}
                    className={`min-h-10 rounded-full border px-4 py-2 text-[14px] transition-colors ${asker === a.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="mt-5 border-t border-border pt-5" aria-live="polite">
                <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">They usually ask for</p>
                <p className="mt-1 text-[17px] font-semibold">{active.frameworks}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{active.why}</p>
                <ul className="mt-4 divide-y divide-border">
                  {active.sections.map(s => (
                    <li key={s.name} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                      <span className="min-w-0">{s.name}</span>
                      <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">page {s.page}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => toForm("finder")} className="mt-4 text-[14px] font-medium text-primary underline underline-offset-2">Get the report to read these pages →</button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Fears, answered plainly, and an honest comparison */}
        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5 md:py-20">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight [text-wrap:balance] md:text-3xl">Before you download</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {ESG_SAMPLE_OBJECTIONS.map(o => (
                <div key={o.q} className="rounded-2xl border border-border bg-background p-5 sm:p-6">
                  <h3 className="text-[17px] font-semibold leading-snug">{o.q}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{o.a}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-14 text-xl font-semibold tracking-tight">How it compares with the usual ways to get a report</h3>
            {/* Cards on phones, a table from md up: no sideways scrolling at 390px. */}
            <div className="mt-5 space-y-3 md:hidden">
              {ESG_SAMPLE_COMPARE.rows.map(r => (
                <div key={r.label} className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-[14px] font-semibold">{r.label}</p>
                  <dl className="mt-2 space-y-1.5 text-[14px]">
                    {ESG_SAMPLE_COMPARE.columns.map((c, i) => (
                      <div key={c} className="flex justify-between gap-3">
                        <dt className={i === 2 ? "font-medium text-primary" : "text-muted-foreground"}>{c}</dt>
                        <dd className={`text-right ${i === 2 ? "font-medium" : ""}`}>{r.cells[i]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-border bg-background md:block">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="w-[22%] p-4 font-medium text-muted-foreground"><span className="sr-only">Question</span></th>
                    {ESG_SAMPLE_COMPARE.columns.map((c, i) => (
                      <th key={c} scope="col" className={`p-4 font-semibold ${i === 2 ? "bg-primary/5 text-primary" : ""}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ESG_SAMPLE_COMPARE.rows.map(r => (
                    <tr key={r.label} className="border-b border-border last:border-0">
                      <th scope="row" className="p-4 font-medium">{r.label}</th>
                      {r.cells.map((cell, i) => <td key={i} className={`p-4 ${i === 2 ? "bg-primary/5 font-medium" : "text-muted-foreground"}`}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">The first two columns describe common practice, not any named firm. Assurance is always a separate, independent engagement.</p>
          </div>
        </section>

        {/* 5. The one next step */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-5 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight [text-wrap:balance] md:text-3xl">Read it before your next buyer or lender asks.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">Six quick answers and a private link in your inbox. Signed in? Download it in one click.</p>
          <button type="button" onClick={() => toForm("final")} className="mt-6 h-12 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground transition-transform hover:-translate-y-px">Get the sample report</button>
          <p className="mt-6 text-[13px] text-muted-foreground">Questions about the report: <a href="mailto:impact@senseible.earth" className="underline underline-offset-2">impact@senseible.earth</a>. How data is handled: <Link to="/trust" className="underline underline-offset-2">Trust and methodology</Link>.</p>
        </section>
      </main>

      <Footer />
      <StickyCta label="Get the sample report" onClick={() => toForm("sticky")} hideWhenVisible="report-access" />
    </div>
  );
};

export default EsgReportSample;
