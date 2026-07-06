import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, ExternalLink, Filter } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  careersRoles,
  APPLY_EMAIL,
  FRESHER_FORM_URL,
  type CareerRole,
} from "@/data/careersRoles";
import { useTranslation } from "@/lib/i18n/useTranslation";
import careersOg from "@/assets/og/careers.jpg";

const ALL = "all";

const isFresherTrack = (r: CareerRole) =>
  r.level === "Fresher" || r.level === "Intern";

const mailtoFor = (r: CareerRole) => {
  const subject = encodeURIComponent(`Application — ${r.title}`);
  const body = encodeURIComponent(
    `Hi Senseible team,\n\nRole: ${r.title}\nFunction: ${r.function}\nLocation: ${r.location}\n\nIn 3–5 lines: what have you built, and how will it help Senseible move faster?\n\n(Attach CV or share links.)\n\n— `
  );
  return `mailto:${APPLY_EMAIL}?subject=${subject}&body=${body}`;
};

const faqs = [
  {
    question: "Is Senseible hiring right now?",
    answer:
      "Yes — for the roles listed on this page. We keep the list honest. If we don't have a role open for your skill, apply anyway; we track strong builders for the next opening.",
  },
  {
    question: "I'm a fresher or intern. How do I apply?",
    answer:
      "Use the fresher/intern form on this page. It goes straight to the founding team. We reply fast — usually within a week.",
  },
  {
    question: "What are the compensation and perks?",
    answer:
      "Market-competitive salary for the stage, meaningful ESOPs, and performance incentives. We don't sell you free snacks or unlimited leave. We're a resource-constrained early-stage company moving quickly.",
  },
  {
    question: "Do you sponsor visas or relocation?",
    answer:
      "Not today. Most roles are Gurugram, Hybrid, or Remote (India). We revisit this as we grow.",
  },
  {
    question: "How fast does hiring move?",
    answer:
      "Fast — both ways. First reply within a week, decision usually within two. If it's not a fit we say so quickly so you can move on.",
  },
  {
    question: "What does day one look like?",
    answer:
      "You ship something real in week one — a pipeline change, a design pass, a research note, a partner conversation. No manufactured onboarding.",
  },
];

const Careers = () => {
  const { t } = useTranslation();
  const [fn, setFn] = useState<string>(ALL);
  const [lvl, setLvl] = useState<string>(ALL);
  const [loc, setLoc] = useState<string>(ALL);

  const functions = useMemo(
    () => Array.from(new Set(careersRoles.map((r) => r.function))),
    []
  );
  const levels = useMemo(
    () => Array.from(new Set(careersRoles.map((r) => r.level))),
    []
  );
  const locations = useMemo(
    () => Array.from(new Set(careersRoles.map((r) => r.location))),
    []
  );

  const visible = careersRoles.filter(
    (r) =>
      (fn === ALL || r.function === fn) &&
      (lvl === ALL || r.level === lvl) &&
      (loc === ALL || r.location === loc)
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={t(
          "careers.seo.title",
          "Careers — Build climate infrastructure | Senseible"
        )}
        description={t(
          "careers.seo.desc",
          "Join Senseible to build AI infrastructure for carbon markets, climate finance, and MSME decarbonisation. Open roles from interns to senior engineers."
        )}
        canonical="/careers"
        image={`https://senseible.earth${careersOg}`}
        keywords={[
          "Climate Tech Careers",
          "Carbon Market Jobs",
          "AI Climate Jobs",
          "Climate Finance Careers",
          "Sustainability Careers",
          "ESG AI",
          "Green Fintech",
          "MSME Climate Platform",
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Careers", url: "/careers" },
        ]}
        faqSchema={faqs}
      />
      <MinimalNav />

      <main className="flex-1">
        {/* Hero */}
        <section
          aria-labelledby="careers-hero"
          className="container max-w-4xl mx-auto px-6 pt-24 md:pt-28 pb-16 text-center"
        >
          <Badge variant="secondary" className="mb-6 text-xs">
            {t("careers.eyebrow", "Careers at Senseible")}
          </Badge>
          <h1
            id="careers-hero"
            className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground mb-6"
          >
            {t(
              "careers.hero.title",
              "Build the infrastructure that decarbonises millions of MSMEs."
            )}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t(
              "careers.hero.sub",
              "We're building the AI layer for carbon markets, climate finance, and MSME decarbonisation. If you want difficult problems, real ownership, and speed — read on."
            )}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <a
                href={FRESHER_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("careers.hero.cta.primary", "Apply now")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={`mailto:${APPLY_EMAIL}?subject=Building%20with%20Senseible`}>
                <Mail className="mr-2 h-4 w-4" />
                {APPLY_EMAIL}
              </a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t(
              "careers.hero.note",
              "Freshers & interns: form goes straight to the founding team."
            )}
          </p>
        </section>

        {/* Why Senseible now */}
        <section
          aria-labelledby="why-now"
          className="container max-w-5xl mx-auto px-6 py-16 border-t border-border/60"
        >
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {t("careers.why.eyebrow", "Why now")}
            </p>
            <h2
              id="why-now"
              className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
            >
              {t(
                "careers.why.title",
                "Carbon is becoming financial infrastructure. Someone has to build the rails."
              )}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                h: "The scale is real",
                b: "400 million MSMEs across emerging markets don't have carbon accounting they can trust. CBAM, BRSR, and green finance are already asking for it.",
              },
              {
                h: "Infrastructure leverage",
                b: "Verified evidence is a primitive — lenders, buyers, regulators, ERP tools all need it. Build it once, unlock many downstream markets.",
              },
              {
                h: "Early stage, high ownership",
                b: "Small team. Direct founder access. Your work reaches production the same week. Career acceleration is a side effect, not a promise.",
              },
            ].map((c) => (
              <Card
                key={c.h}
                className="bg-primary/5 border-primary/15"
              >
                <CardContent className="p-6">
                  <h3 className="text-base font-medium text-foreground mb-2">
                    {c.h}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {c.b}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* What you'll build */}
        <section
          aria-labelledby="what-build"
          className="container max-w-5xl mx-auto px-6 py-16 border-t border-border/60"
        >
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {t("careers.build.eyebrow", "What you'll build")}
            </p>
            <h2
              id="what-build"
              className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
            >
              {t(
                "careers.build.title",
                "Four surfaces. Real users on day one."
              )}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                h: "MRV & deterministic carbon math",
                b: "OCR, HSN-to-scope classification, evidence hashing, methodology versioning. Numbers that hold up under audit.",
                to: "/platform",
                cta: "The platform",
              },
              {
                h: "Climate finance signals",
                b: "Turn verified baselines into underwriting inputs for green loans, factoring, and SLLs — with a lender-readable credibility score.",
                to: "/climate-finance",
                cta: "Climate finance",
              },
              {
                h: "Applied AI & voice",
                b: "Document extraction, Scope 3 inference, multilingual voice for MSME owners. Real production traffic, not demos.",
                to: "/intelligence",
                cta: "Intelligence",
              },
              {
                h: "Trust & data layer",
                b: "Immutable evidence, greenwashing prevention, framework mapping (CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD).",
                to: "/trust",
                cta: "Trust layer",
              },
            ].map((c) => (
              <Card
                key={c.h}
                className="border-l-2 border-l-primary/40 hover:border-l-primary transition-colors"
              >
                <CardContent className="p-6">
                  <h3 className="text-base font-medium text-foreground mb-2">
                    {c.h}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {c.b}
                  </p>
                  <Link
                    to={c.to}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {c.cta} <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How we work */}
        <section
          aria-labelledby="how-work"
          className="container max-w-5xl mx-auto px-6 py-16 border-t border-border/60"
        >
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {t("careers.how.eyebrow", "How we work")}
            </p>
            <h2
              id="how-work"
              className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
            >
              {t(
                "careers.how.title",
                "Honest trade-offs. No manufactured perks."
              )}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {[
              ["Aggressive execution", "Ship weekly. Roll back gracefully. Argue with data."],
              ["Direct founder access", "No layers. Every builder talks to the founders."],
              ["Resource-constrained", "We move fast because we have to. Small team, real budget discipline."],
              ["High ownership", "You own a surface end-to-end — problem to production to feedback loop."],
              ["Fast filtering", "We say yes or no quickly. We expect the same from you."],
              ["Career acceleration", "Exposure to AI, carbon markets, climate finance, distributed systems and policy — in one seat."],
            ].map(([h, b]) => (
              <div key={h} className="py-3 border-b border-border/50">
                <div className="text-sm font-medium text-foreground">{h}</div>
                <div className="text-sm text-muted-foreground mt-1">{b}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground max-w-2xl">
            {t(
              "careers.how.principles",
              "We operate on the same principles our platform runs on — deterministic, transparent, regulator-safe."
            )}{" "}
            <Link to="/principles" className="text-primary hover:underline">
              Read our principles →
            </Link>
          </p>
        </section>

        {/* Career growth */}
        <section
          aria-labelledby="growth"
          className="container max-w-5xl mx-auto px-6 py-16 border-t border-border/60"
        >
          <div className="max-w-2xl mb-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {t("careers.growth.eyebrow", "Where your career goes")}
            </p>
            <h2
              id="growth"
              className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
            >
              {t(
                "careers.growth.title",
                "Three deep, transferable domains — at the same time."
              )}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {["Carbon markets", "Climate finance", "Applied AI", "Distributed systems", "Product", "Research"].map(
              (chip) => (
                <span
                  key={chip}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-foreground"
                >
                  {chip}
                </span>
              )
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            {t(
              "careers.growth.body",
              "Most operators pick one. Here you touch all three because the problem demands it — AI for extraction, carbon science for correctness, finance for downstream utility. Two years here compounds like five somewhere narrower."
            )}
          </p>
        </section>

        {/* Open roles */}
        <section
          aria-labelledby="roles"
          className="container max-w-5xl mx-auto px-6 py-16 border-t border-border/60"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                {t("careers.roles.eyebrow", "Open roles")}
              </p>
              <h2
                id="roles"
                className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
              >
                {t("careers.roles.title", "A short, honest list.")}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>{visible.length} of {careersRoles.length}</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <Select value={fn} onValueChange={setFn}>
              <SelectTrigger aria-label="Filter by function">
                <SelectValue placeholder="All functions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All functions</SelectItem>
                {functions.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lvl} onValueChange={setLvl}>
              <SelectTrigger aria-label="Filter by level">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All levels</SelectItem>
                {levels.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={loc} onValueChange={setLoc}>
              <SelectTrigger aria-label="Filter by location">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                No open roles match those filters right now.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Send a note to{" "}
                <a
                  href={`mailto:${APPLY_EMAIL}`}
                  className="text-primary hover:underline"
                >
                  {APPLY_EMAIL}
                </a>{" "}
                — we track strong builders for the next opening.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {visible.map((r) => {
                const fresher = isFresherTrack(r);
                return (
                  <li
                    key={r.id}
                    className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="text-base font-medium text-foreground">
                        {r.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {r.scope}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-secondary">{r.function}</span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary">{r.level}</span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary">{r.location}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 md:min-w-[220px] md:justify-end">
                      {fresher ? (
                        <Button asChild size="sm">
                          <a
                            href={FRESHER_FORM_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Apply via form
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : (
                        <>
                          <Button asChild size="sm">
                            <a
                              href={FRESHER_FORM_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Apply
                              <ArrowRight className="ml-2 h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a href={mailtoFor(r)}>
                              <Mail className="mr-2 h-3.5 w-3.5" />
                              Email CV
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Hiring process */}
        <section
          aria-labelledby="process"
          className="container max-w-5xl mx-auto px-6 py-16 border-t border-border/60"
        >
          <div className="max-w-2xl mb-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              {t("careers.process.eyebrow", "Hiring process")}
            </p>
            <h2
              id="process"
              className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground"
            >
              {t("careers.process.title", "Fast, both ways.")}
            </h2>
          </div>
          <ol className="grid md:grid-cols-4 gap-4">
            {[
              ["01", "Apply", "3–5 lines or a 2–3 min video on how your experience helps."],
              ["02", "First call", "30 minutes with a founder. Real problem discussion, not trivia."],
              ["03", "Work sample", "A small, paid, timeboxed problem from the actual roadmap."],
              ["04", "Decision", "Yes or no within two weeks of first contact. We move on quickly if it's not a fit."],
            ].map(([n, h, b]) => (
              <li
                key={n}
                className="p-5 rounded-lg border border-border bg-card"
              >
                <div className="text-xs font-mono text-muted-foreground mb-2">{n}</div>
                <div className="text-sm font-medium text-foreground mb-1">{h}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{b}</div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQs */}
        <section
          aria-labelledby="faqs"
          className="container max-w-3xl mx-auto px-6 py-16 border-t border-border/60"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            {t("careers.faq.eyebrow", "FAQs")}
          </p>
          <h2
            id="faqs"
            className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-8"
          >
            {t("careers.faq.title", "Straight answers.")}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Apply CTA band */}
        <section
          aria-labelledby="apply"
          className="container max-w-4xl mx-auto px-6 py-20 border-t border-border/60"
        >
          <div className="rounded-2xl bg-primary/5 border border-primary/15 p-8 md:p-12 text-center">
            <h2
              id="apply"
              className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4"
            >
              {t("careers.cta.title", "Ready? Here's how to apply.")}
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t(
                "careers.cta.body",
                "Visit the platform first. Then tell us — in 3–5 lines or a 2–3 minute video — how your experience will help Senseible accelerate its mission. We decide fast and filter fast. If you're a builder, this is one of the best seats in climate tech right now."
              )}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/platform">
                  See the platform
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a
                  href={FRESHER_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply now
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <a href={`mailto:${APPLY_EMAIL}?subject=Building%20with%20Senseible`}>
                  <Mail className="mr-2 h-4 w-4" />
                  {APPLY_EMAIL}
                </a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <Link to="/mission" className="hover:text-foreground">Mission</Link>
              <Link to="/about" className="hover:text-foreground">About</Link>
              <Link to="/principles" className="hover:text-foreground">Principles</Link>
              <Link to="/intelligence" className="hover:text-foreground">Intelligence</Link>
              <Link to="/platform" className="hover:text-foreground">Platform</Link>
              <Link to="/contact" className="hover:text-foreground">Contact</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
