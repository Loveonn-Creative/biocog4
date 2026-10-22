import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FileText, Quote, ShieldCheck, Upload } from "lucide-react";
import { listPublishedStories, type PublishedStory } from "@/lib/caseStudiesApi";
import type { BuyerId } from "@/lib/caseStudy";

// Proof a visitor can check for themselves before they talk to anyone: try the
// product on their own bill, read the real sample or the data terms, and the
// newest published customer story (consented and reviewed) when one exists.
// Nothing here is a claim we wrote about ourselves.

interface Item { icon: typeof Upload; title: string; line: string; to: string; cta: string }

const ITEMS: Record<"msme" | "enterprise", Item[]> = {
  msme: [
    { icon: Upload, title: "Try it on one bill now", line: "Upload a bill and see its carbon. Free, no sign-up.", to: "/", cta: "Upload a bill" },
    { icon: ShieldCheck, title: "Your bills stay yours", line: "Read exactly how we hold your data before you share anything.", to: "/legal/dpa", cta: "Read the terms" },
  ],
  enterprise: [
    { icon: FileText, title: "Read a sample report", line: "The full ESG report we produce, sent to your work email.", to: "/esg-report-sample", cta: "Get the sample" },
    { icon: ShieldCheck, title: "Security, before the call", line: "Data processing terms and how records are isolated, ready for your IT team.", to: "/trust", cta: "Open the security page" },
    { icon: Upload, title: "Test one supplier bill", line: "Upload a supplier's bill and see the line-by-line result.", to: "/", cta: "Upload a bill" },
  ],
};

export function ProofStrip({ audience, onOpen }: { audience: "msme" | "enterprise"; onOpen: (what: string) => void }) {
  const [story, setStory] = useState<PublishedStory | null>(null);
  useEffect(() => {
    const want: BuyerId[] = audience === "msme" ? ["msme", "finance", "lender"] : ["enterprise", "importer"];
    let live = true;
    void listPublishedStories().then((all) => { if (live) setStory(all.find((s) => want.includes(s.buyer)) ?? null); });
    return () => { live = false; };
  }, [audience]);

  const headline = story?.story?.hook ?? "";
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <h2 className="lp-display text-2xl md:text-3xl">Don't take our word for it.</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {ITEMS[audience].map(({ icon: Icon, title, line, to, cta }) => (
          <Link key={title} to={to} onClick={() => onOpen(cta)} className="lp-proof group grid content-start gap-2 rounded-2xl p-5">
            <Icon className="h-5 w-5 lp-accent" aria-hidden="true" />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm opacity-80">{line}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">{cta} <ArrowUpRight className="h-4 w-4" /></span>
          </Link>
        ))}
        {story && headline && (
          <Link to={`/case-studies/${story.slug}`} onClick={() => onOpen("story")} className="lp-proof group grid content-start gap-2 rounded-2xl p-5">
            <Quote className="h-5 w-5 lp-accent" aria-hidden="true" />
            <h3 className="font-semibold">{headline}</h3>
            <p className="text-sm opacity-80">{story.story.byline}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">Read it <ArrowUpRight className="h-4 w-4" /></span>
          </Link>
        )}
      </div>
    </section>
  );
}
