import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Footer } from "@/components/Footer";
import { LeadHeader } from "@/components/lead/LeadKit";
import { StoryView } from "@/components/stories/StoryView";
import { getPublishedStory, type PublishedStory } from "@/lib/caseStudiesApi";
import { NEXT_STEP } from "@/data/caseStudiesMeta";
import { trackEvent } from "@/lib/analytics";

/** One published, consented customer story. */
const CaseStudy = () => {
  const { slug = "" } = useParams();
  const [data, setData] = useState<PublishedStory | null | undefined>(undefined);
  useEffect(() => { setData(undefined); getPublishedStory(slug).then(setData); }, [slug]);
  useEffect(() => { if (data) trackEvent("story_view", { buyer: data.buyer }); }, [data]);

  if (data === undefined) return <div className="min-h-screen bg-background"><LeadHeader /><p className="px-5 pt-28 text-center text-muted-foreground" role="status">Loading the story…</p></div>;
  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEOHead title="Story not found" description="This story is not available." canonical={`/case-studies/${slug}`} noIndex />
        <LeadHeader />
        <main className="mx-auto max-w-xl px-5 pt-28 text-center">
          <h1 className="text-2xl font-semibold">This story is not available.</h1>
          <p className="mt-3 text-muted-foreground">It may have been withdrawn by the customer.</p>
          <Link to="/case-studies" className="mt-6 inline-block font-medium text-primary underline underline-offset-2">See all case studies</Link>
        </main>
      </div>
    );
  }
  const s = data.story;
  const next = NEXT_STEP[data.buyer] ?? NEXT_STEP.msme;
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SEOHead
        title={s.hook.length > 58 ? `${s.industry} case study` : s.hook}
        description={s.dek}
        canonical={`/case-studies/${data.slug}`}
        type="article"
        article={{ publishedTime: data.published_at, tags: [s.industry, "case study", "carbon data"] }}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Case studies", url: "/case-studies" }, { name: s.hook, url: `/case-studies/${data.slug}` }]}
      />
      <LeadHeader />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-5">
        <Link to="/case-studies" className="text-[14px] text-muted-foreground underline underline-offset-2">All case studies</Link>
        <div className="mt-6"><StoryView story={s} /></div>
        <section className="mt-12 rounded-3xl border border-border bg-card p-6 md:flex md:items-center md:justify-between md:gap-6 md:p-8">
          <div>
            <h2 className="text-xl font-semibold">Facing the same question?</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">{next.line}</p>
          </div>
          <Link to={next.to} onClick={() => trackEvent("story_cta", { buyer: data.buyer })} className="mt-4 inline-flex h-12 shrink-0 items-center rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground md:mt-0">{next.label}</Link>
        </section>
        <p className="mt-8 text-[14px] text-muted-foreground">Has Senseible changed something for you? <Link to="/case-studies/share" className="font-medium text-foreground underline underline-offset-2">Share your story</Link>.</p>
      </main>
      <Footer />
    </div>
  );
};

export default CaseStudy;
