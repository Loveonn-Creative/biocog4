import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Footer } from "@/components/Footer";
import { LeadHeader } from "@/components/lead/LeadKit";
import { BUYER_THEME } from "@/components/stories/StoryView";
import { BUYERS, type BuyerId } from "@/lib/caseStudy";
import { listPublishedStories, type PublishedStory } from "@/lib/caseStudiesApi";
import { CASE_STUDIES_META } from "@/data/caseStudiesMeta";

/** The public library: real, consented stories only, newest first, MSMEs first in the filter. */
const CaseStudies = () => {
  const [stories, setStories] = useState<PublishedStory[] | null>(null);
  const [filter, setFilter] = useState<BuyerId | "all">("all");
  useEffect(() => { listPublishedStories().then(setStories); }, []);
  const shown = useMemo(() => (stories ?? []).filter(s => filter === "all" || s.buyer === filter), [stories, filter]);
  const empty = stories !== null && stories.length === 0;

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      {/* Indexed only once real stories exist: an empty library is thin content. */}
      <SEOHead title={CASE_STUDIES_META.title} description={CASE_STUDIES_META.description} canonical={CASE_STUDIES_META.path} noIndex={stories === null || empty} />
      <LeadHeader />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-5">
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-primary">Case studies</p>
        <h1 className="mt-4 max-w-3xl text-[2.1rem] font-semibold leading-[1.08] tracking-tight [text-wrap:balance] md:text-[3.1rem]">{CASE_STUDIES_META.h1}</h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">{CASE_STUDIES_META.intro}</p>

        {!empty && (
          <div role="radiogroup" aria-label="Filter stories" className="mt-8 flex flex-wrap gap-2">
            {[{ id: "all", label: "All" }, ...BUYERS.map(b => ({ id: b.id, label: BUYER_THEME[b.id].label }))].map(o => (
              <button key={o.id} type="button" role="radio" aria-checked={filter === o.id} onClick={() => setFilter(o.id as BuyerId | "all")}
                className={`min-h-10 rounded-full border px-4 text-[14px] ${filter === o.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>{o.label}</button>
            ))}
          </div>
        )}

        {stories === null && <p className="mt-10 text-muted-foreground" role="status">Loading stories…</p>}

        {empty && (
          <div className="mt-12 rounded-3xl border border-dashed border-border p-8 text-center md:p-12">
            <h2 className="text-2xl font-semibold tracking-tight">The first stories are with our editors.</h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">Every story here comes from a real customer who approved every word. None are written by us. If Senseible changed something for you, yours could be the first.</p>
            <Link to="/case-studies/share" className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-7 text-[15px] font-medium text-primary-foreground">Share your story</Link>
          </div>
        )}

        {shown.length > 0 && (
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.map(s => {
              const t = BUYER_THEME[s.buyer];
              const lead = s.story.numbers[0];
              return (
                <li key={s.slug} className="min-w-0">
                  <Link to={`/case-studies/${s.slug}`} className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-foreground/40">
                    <p className={`text-[12px] font-semibold uppercase tracking-[0.14em] ${t.accent}`}>{t.label} · {s.story.industry}</p>
                    <h2 className="mt-3 text-[19px] font-semibold leading-snug [text-wrap:balance]">{s.story.hook}</h2>
                    <p className="mt-2 text-[14px] text-muted-foreground">{s.story.byline}</p>
                    {lead && <p className="mt-auto pt-5 text-[14px]"><span className="text-2xl font-semibold tabular-nums">{lead.value}</span> <span className="text-muted-foreground">{lead.unit} · {lead.label.toLowerCase()}</span></p>}
                    <span className="mt-4 text-[14px] font-medium text-primary group-hover:underline">Read the story →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!empty && stories !== null && (
          <p className="mt-12 text-[14px] text-muted-foreground">Has Senseible changed something for you? <Link to="/case-studies/share" className="font-medium text-foreground underline underline-offset-2">Share your story</Link>.</p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CaseStudies;
