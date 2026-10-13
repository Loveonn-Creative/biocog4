import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, ExternalLink } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/platform/Reveal";
import { StickyCta } from "@/components/lead/LeadKit";
import { BeforeAfter, LanguageRoll, StruckLine, SurfaceDoodle } from "@/components/careers/CareerVisuals";
import {
  careersRoles,
  APPLY_EMAIL,
  FRESHER_FORM_URL,
  type CareerRole,
} from "@/data/careersRoles";
import { useTranslation } from "@/lib/i18n/useTranslation";
import careersOg from "@/assets/og/careers.jpg";

const ALL = "all";
const SURFACE_KINDS = ["mrv", "finance", "ai", "trust"] as const;
const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

// Decarbonize India's eyebrow: a short amber bar, then the label.
const Eyebrow = ({ children, light = false }: { children: string; light?: boolean }) => (
  <p className={`mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] ${light ? "text-primary-foreground/80" : "text-[#184d37] dark:text-emerald-400"}`}>
    <span aria-hidden="true" className="h-[3px] w-6 rounded-full bg-amber-500" />
    {children}
  </p>
);

/** One row of tap-to-filter chips; replaces a dropdown so every option is visible at once. */
const ChipGroup = ({ label, value, onChange, allLabel, options, labelFor }: {
  label: string; value: string; onChange: (v: string) => void; allLabel: string; options: string[]; labelFor: (o: string) => string;
}) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
    {[ALL, ...options].map((o) => {
      const on = value === o;
      return (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o)}
          className={`min-h-9 rounded-full border px-3.5 text-sm transition-colors ${on ? "border-[#184d37] bg-[#184d37] text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-background" : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}
        >
          {o === ALL ? allLabel : labelFor(o)}
        </button>
      );
    })}
  </div>
);

const isFresherTrack = (r: CareerRole) =>
  r.level === "Fresher" || r.level === "Intern";

const mailtoFor = (r: CareerRole) => {
  const subject = encodeURIComponent(`Application: ${r.title}`);
  const body = encodeURIComponent(
    `Hi Senseible team,\n\nRole: ${r.title}\nFunction: ${r.function}\nLocation: ${r.location}\n\nIn 3–5 lines: what have you built, and how will it help Senseible move faster?\n\n(Attach CV or share links.)\n\n`
  );
  return `mailto:${APPLY_EMAIL}?subject=${subject}&body=${body}`;
};

// 11 languages the platform already ships in — used as a diversity motif, no flags/stock.
const LANGUAGE_GLYPHS = [
  "English",
  "हिन्दी",
  "বাংলা",
  "தமிழ்",
  "मराठी",
  "Español",
  "Bahasa",
  "Tiếng Việt",
  "ไทย",
  "Filipino",
  "اردو",
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

  // Copy blocks — kept inline so the narrative reads top-to-bottom in one place.
  const whyItMatters: Array<[string, string, string]> = [
    [
      t("careers.why.a.h", "Months → seconds."),
      t(
        "careers.why.a.b",
        "MRV that used to take a consultant a quarter now clears from a single upload. The work you ship compresses time for millions of businesses."
      ),
      t("careers.why.a.tag", "Speed"),
    ],
    [
      t("careers.why.b.h", "Cost → revenue."),
      t(
        "careers.why.b.b",
        "Compliance stops being a burden and becomes a payout. Green invoices, factoring, credits: proof that being clean pays."
      ),
      t("careers.why.b.tag", "Fairness"),
    ],
    [
      t("careers.why.c.h", "A few → four hundred million."),
      t(
        "careers.why.c.b",
        "Verification cheap enough to reach every MSME across ten emerging markets, in eleven languages. This is the scale we're built for."
      ),
      t("careers.why.c.tag", "Scale"),
    ],
  ];

  const belongingLines: Array<[string, string]> = [
    [
      t("careers.belong.a.h", "Your language belongs here."),
      t(
        "careers.belong.a.b",
        "We ship in eleven languages because the people using this platform don't all think in English. If yours isn't listed yet, help us add it."
      ),
    ],
    [
      t("careers.belong.b.h", "Your background is a feature, not a footnote."),
      t(
        "careers.belong.b.b",
        "Self-taught, graduate, career-switcher, PhD, first job: the problem is too big for one kind of resume. Show us how you think."
      ),
    ],
    [
      t("careers.belong.c.h", "Your discipline is welcome across surfaces."),
      t(
        "careers.belong.c.b",
        "Engineer, researcher, designer, operator, writer, policy mind: every one of them touches this product. None of them are ornamental."
      ),
    ],
    [
      t("careers.belong.d.h", "Your distance from us is not the point."),
      t(
        "careers.belong.d.b",
        "Gurugram, Remote (India), or Hybrid today, with the discipline to work asynchronously well. We hire for judgement, not proximity."
      ),
    ],
  ];

  const workSurfaces = [
    {
      h: t("careers.work.mrv.h", "The MRV pipeline."),
      b: t(
        "careers.work.mrv.b",
        "Deterministic carbon math on real documents. OCR, HSN-to-scope, evidence hashing, methodology versioning. Numbers that survive audit."
      ),
      to: "/platform",
      cta: t("careers.work.mrv.cta", "See the platform"),
    },
    {
      h: t("careers.work.finance.h", "Climate finance signals."),
      b: t(
        "careers.work.finance.b",
        "Turn verified baselines into underwriting inputs for green loans, factoring, and SLLs, with a credibility score a lender can read."
      ),
      to: "/climate-finance",
      cta: t("careers.work.finance.cta", "See climate finance"),
    },
    {
      h: t("careers.work.ai.h", "Applied AI and voice."),
      b: t(
        "careers.work.ai.b",
        "Document extraction, Scope 3 inference, multilingual voice for owners who don't type in English. Production traffic, not demos."
      ),
      to: "/intelligence",
      cta: t("careers.work.ai.cta", "See intelligence"),
    },
    {
      h: t("careers.work.trust.h", "The trust and data layer."),
      b: t(
        "careers.work.trust.b",
        "Immutable evidence, greenwashing prevention, framework mapping (CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD). The audit case for everything upstream."
      ),
      to: "/trust",
      cta: t("careers.work.trust.cta", "See the trust layer"),
    },
  ];

  const doDont: Array<[string, string]> = [
    [
      t("careers.do.a", "We ship the week you join."),
      t("careers.dont.a", "We don't run six-week onboarding."),
    ],
    [
      t("careers.do.b", "We give you the surface."),
      t("careers.dont.b", "We don't micromanage the brushstroke."),
    ],
    [
      t("careers.do.c", "We say yes or no in two weeks."),
      t("careers.dont.c", "We don't ghost."),
    ],
    [
      t("careers.do.d", "We argue with data and move."),
      t("careers.dont.d", "We don't defend decisions with seniority."),
    ],
    [
      t("careers.do.e", "We compensate the work honestly."),
      t("careers.dont.e", "We don't dress up perks as a salary."),
    ],
  ];

  const faqs = [
    {
      question: t("careers.faq.q1", "Do I need climate experience?"),
      answer: t(
        "careers.faq.a1",
        "No. We need strong builders who care. The carbon and finance context is teachable in weeks; the taste for hard problems is not."
      ),
    },
    {
      question: t("careers.faq.q2", "I'm a fresher or intern. How do I apply?"),
      answer: t(
        "careers.faq.a2",
        "Use the freshers and interns form on this page. It goes to the founding team. Reply within a week, usually faster."
      ),
    },
    {
      question: t("careers.faq.q3", "What is the compensation like?"),
      answer: t(
        "careers.faq.a3",
        "Market-competitive base for the stage, meaningful ESOPs, performance incentives. No unlimited-leave theatre. We move fast because we're resource-conscious, not resource-loose."
      ),
    },
    {
      question: t("careers.faq.q4", "Remote, hybrid, or in-office?"),
      answer: t(
        "careers.faq.a4",
        "Roles are Gurugram, Hybrid, or Remote (India) today. We hire for outcomes and judgement, not desks."
      ),
    },
    {
      question: t("careers.faq.q5", "Do you sponsor visas or relocation?"),
      answer: t(
        "careers.faq.a5",
        "Not today. We revisit as we grow. If you're extraordinary and outside India, still write. We'll be honest about what's possible."
      ),
    },
    {
      question: t("careers.faq.q6", "What does day one actually look like?"),
      answer: t(
        "careers.faq.a6",
        "You ship something real. A pipeline change, a design pass, a research note, a partner conversation. No manufactured onboarding."
      ),
    },
  ];

  const pickRole = (r: CareerRole) => { setFn(r.function); setLvl(ALL); setLoc(ALL); go("roles"); };

  return (
    <div className="min-h-screen bg-[#faf6ec] text-foreground dark:bg-background flex flex-col">
      <SEOHead
        title={t(
          "careers.seo.title",
          "Life at Senseible | Careers"
        )}
        description={t(
          "careers.seo.desc",
          "We're removing what stands between small businesses and the green economy. If you want difficult, meaningful work, this is the door."
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

      <main className="flex-1 overflow-x-clip">
        {/* 1. Life at Senseible: the promise on the left, the open roles on the right, so the door is visible from the first screen */}
        <section aria-labelledby="life-at-senseible" className="px-4 sm:px-6 pt-24 md:pt-32 pb-16 md:pb-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <Reveal>
              <Eyebrow>{t("careers.life.eyebrow", "Life at Senseible")}</Eyebrow>
              <h1
                id="life-at-senseible"
                className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] [text-wrap:balance]"
              >
                {t(
                  "careers.life.title",
                  "Life at Senseible is life inside a system that has to work, for small businesses that can't afford it not to."
                )}
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-[1.7]">
                {t(
                  "careers.life.sub",
                  "We compress months of carbon proof into seconds so being clean pays instead of costing. Come build the parts that don't exist yet."
                )}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href="#roles"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#184d37] px-6 text-[15px] font-medium text-white hover:bg-[#123b2a] dark:bg-emerald-500 dark:text-background"
                >
                  {t("careers.life.cta.roles", "See open roles")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href="#apply" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {t("careers.life.cta.apply", "Or apply directly")}
                </a>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="rounded-3xl border border-border bg-background p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {t("careers.life.cta.roles", "See open roles")}
                  </p>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-xs text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                    {careersRoles.length}
                  </span>
                </div>
                <ul className="mt-4 divide-y divide-border">
                  {careersRoles.map((r, i) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => pickRole(r)}
                        className="group flex w-full items-center justify-between gap-3 py-2.5 text-left animate-fade-in motion-reduce:animate-none"
                        style={{ animationDelay: `${120 + i * 60}ms`, animationFillMode: "both" }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium group-hover:text-[#184d37] dark:group-hover:text-emerald-400">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {t(`careers.function.${r.function}`, r.function)} · {t(`careers.location.${r.location}`, r.location)}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 2. Why it matters: each before state is struck out and the after state lands */}
        <section aria-labelledby="why-matters" className="border-y border-border/60 bg-background px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-20 md:py-28">
            <h2 id="why-matters" className="sr-only">
              {t("careers.why.title", "Why the work matters")}
            </h2>
            <div className="space-y-14 md:space-y-20">
              {whyItMatters.map(([h, b, tag], i) => (
                <div key={h} className="grid gap-4 md:grid-cols-12 md:gap-10 md:items-baseline">
                  <div className="md:col-span-3">
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")} · {tag}
                    </span>
                  </div>
                  <div className="md:col-span-9">
                    <BeforeAfter text={h} />
                    <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground leading-[1.7]">{b}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Who belongs here: the languages light up one at a time */}
        <section aria-labelledby="belonging" className="px-4 sm:px-6 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <Eyebrow>{t("careers.belong.eyebrow", "Who belongs here")}</Eyebrow>
              <h2 id="belonging" className="max-w-3xl text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] [text-wrap:balance]">
                {t(
                  "careers.belong.title",
                  "Eleven languages, ten markets, one bar: you can think, you can ship, and the problem won't let you sleep."
                )}
              </h2>
            </Reveal>
            <div className="mt-8">
              <LanguageRoll glyphs={LANGUAGE_GLYPHS} />
            </div>
            <ol className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {belongingLines.map(([h, b], i) => (
                <li key={h} className="grid grid-cols-[auto_1fr] gap-4">
                  <span aria-hidden="true" className="mt-1 font-mono text-xs text-amber-600 dark:text-amber-400">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="mb-2 text-lg md:text-xl font-medium">{h}</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-[1.7]">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. The work itself: four surfaces, each drawn as it arrives */}
        <section aria-labelledby="the-work" className="border-y border-border/60 bg-background px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-20 md:py-28">
            <Reveal>
              <Eyebrow>{t("careers.work.eyebrow", "The work itself")}</Eyebrow>
              <h2 id="the-work" className="mb-12 max-w-3xl text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] [text-wrap:balance]">
                {t("careers.work.title", "Four surfaces. Each one shipped by someone who owns it end-to-end.")}
              </h2>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-2">
              {workSurfaces.map((w, i) => (
                <Reveal key={w.h} delay={i * 80}>
                  <div className="flex h-full flex-col rounded-3xl border border-border p-6 md:p-7">
                    <div className="mb-4 text-foreground/70">
                      <SurfaceDoodle kind={SURFACE_KINDS[i] ?? "trust"} />
                    </div>
                    <h3 className="mb-3 text-xl md:text-2xl font-medium">{w.h}</h3>
                    <p className="mb-5 flex-1 text-base text-muted-foreground leading-[1.7]">{w.b}</p>
                    <Link
                      to={w.to}
                      className="inline-flex items-center gap-1 self-start border-b border-foreground/30 pb-0.5 text-sm hover:border-foreground transition-colors"
                    >
                      {w.cta}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 5. How we work: each habit sits beside the one it replaces, which is crossed out */}
        <section aria-labelledby="how-we-work" className="px-4 sm:px-6 py-20 md:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <Eyebrow>{t("careers.how.eyebrow", "How we work")}</Eyebrow>
              <h2 id="how-we-work" className="mb-10 max-w-3xl text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] [text-wrap:balance]">
                {t("careers.how.title", "Your work is as meaningful to us as it is to you.")}
              </h2>
            </Reveal>
            <div className="hidden md:grid md:grid-cols-2 md:gap-10 border-b border-border pb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span>{t("careers.how.we_do", "We do")}</span>
              <span>{t("careers.how.we_dont", "We don't")}</span>
            </div>
            <ul className="divide-y divide-border">
              {doDont.map(([d, dn]) => (
                <li key={d} className="grid gap-1 py-4 md:grid-cols-2 md:gap-10">
                  <span className="text-base md:text-lg font-medium leading-relaxed">
                    <span className="mr-2 text-[#184d37] dark:text-emerald-400" aria-hidden="true">✓</span>
                    <span className="sr-only">{t("careers.how.we_do", "We do")}: </span>
                    {d}
                  </span>
                  <span className="text-base md:text-lg leading-relaxed">
                    <span className="sr-only">{t("careers.how.we_dont", "We don't")}: </span>
                    <StruckLine text={dn} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Open roles: one-tap filters, every option visible */}
        <section id="roles" aria-labelledby="roles-heading" className="scroll-mt-24 border-y border-border/60 bg-background px-4 sm:px-6">
          <div className="mx-auto max-w-5xl py-20 md:py-24">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <Eyebrow>{t("careers.roles.eyebrow", "And here is the door")}</Eyebrow>
                <h2 id="roles-heading" className="text-3xl md:text-4xl font-semibold tracking-tight">
                  {t("careers.roles.title", "Open roles: kept short, kept honest.")}
                </h2>
              </div>
              <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
                {t("careers.filter.count", "{visible} of {total} roles shown")
                  .replace("{visible}", String(visible.length))
                  .replace("{total}", String(careersRoles.length))}
              </div>
            </div>

            <div role="group" aria-label={t("careers.filter.title", "Filter open roles")} className="mb-6 space-y-3">
              <ChipGroup
                label={t("careers.filter.by_function", "Filter by function")}
                value={fn}
                onChange={setFn}
                allLabel={t("careers.filter.all_functions", "All functions")}
                options={functions}
                labelFor={(f) => t(`careers.function.${f}`, f)}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <ChipGroup
                  label={t("careers.filter.by_level", "Filter by level")}
                  value={lvl}
                  onChange={setLvl}
                  allLabel={t("careers.filter.all_levels", "All levels")}
                  options={levels}
                  labelFor={(l) => t(`careers.level.${l}`, l)}
                />
                <ChipGroup
                  label={t("careers.filter.by_location", "Filter by location")}
                  value={loc}
                  onChange={setLoc}
                  allLabel={t("careers.filter.all_locations", "All locations")}
                  options={locations}
                  labelFor={(l) => t(`careers.location.${l}`, l)}
                />
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-background">
                <p className="text-sm text-muted-foreground">
                  {t(
                    "careers.roles.empty.title",
                    "No open roles match those filters right now."
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t(
                    "careers.roles.empty.body",
                    "Send a note to {email}. We track strong builders for the next opening."
                  )
                    .split("{email}")
                    .flatMap((part, i, arr) =>
                      i < arr.length - 1
                        ? [
                            part,
                            <a
                              key={i}
                              href={`mailto:${APPLY_EMAIL}`}
                              className="text-primary hover:underline"
                            >
                              {APPLY_EMAIL}
                            </a>,
                          ]
                        : [part]
                    )}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-background">
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
                          <span className="px-2 py-0.5 rounded-full bg-secondary">
                            {t(`careers.function.${r.function}`, r.function)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary">
                            {t(`careers.level.${r.level}`, r.level)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary">
                            {t(`careers.location.${r.location}`, r.location)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 md:min-w-[220px] md:justify-end">
                        {fresher ? (
                          <Button asChild size="sm" className="min-h-11">
                            <a
                              href={FRESHER_FORM_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${t("careers.role.apply_form", "Apply via form")}: ${r.title}`}
                            >
                              {t("careers.role.apply_form", "Apply via form")}
                              <ExternalLink
                                className="ml-2 h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span className="sr-only">
                                {t(
                                  "careers.role.opens_new_tab",
                                  "(opens in new tab)"
                                )}
                              </span>
                            </a>
                          </Button>
                        ) : (
                          <>
                            <Button asChild size="sm" className="min-h-11">
                              <a
                                href={mailtoFor(r)}
                                aria-label={`${t("careers.role.email_cv", "Email CV")}: ${r.title}`}
                              >
                                <Mail
                                  className="mr-2 h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {t("careers.role.email_cv", "Email CV")}
                              </a>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="min-h-11"
                            >
                              <a
                                href={FRESHER_FORM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${t("careers.role.apply", "Apply")}: ${r.title}`}
                              >
                                {t("careers.role.apply", "Apply")}
                                <ArrowRight
                                  className="ml-2 h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">
                                  {t(
                                    "careers.role.opens_new_tab",
                                    "(opens in new tab)"
                                  )}
                                </span>
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
          </div>
        </section>

        {/* 7. Straight answers */}
        <section
          aria-labelledby="faqs"
          className="container max-w-3xl mx-auto px-6 py-20 md:py-24"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
            {t("careers.faq.eyebrow", "Straight answers")}
          </p>
          <h2
            id="faqs"
            className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-8"
          >
            {t("careers.faq.title", "What people actually ask.")}
          </h2>
          <Accordion
            type="single"
            collapsible
            className="w-full"
            aria-label={t("careers.faq.title", "What people actually ask.")}
          >
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-sm">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm md:text-base text-muted-foreground leading-[1.7]">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* 8. Apply — the single saturated moment on the page */}
        <section
          id="apply"
          aria-labelledby="apply-heading"
          className="bg-primary text-primary-foreground scroll-mt-24"
        >
          <div className="container max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-primary-foreground/70 mb-4">
              {t("careers.cta.eyebrow", "Come do the best work of your life")}
            </p>
            <h2
              id="apply-heading"
              className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6"
            >
              {t("careers.cta.title", "If this is your problem, this is your seat.")}
            </h2>
            <p className="text-base md:text-lg text-primary-foreground/85 max-w-2xl mx-auto leading-[1.7]">
              {t(
                "careers.cta.body",
                "Spend ten minutes on the platform, then tell us in 3–5 lines (or a 2–3 minute video) how you'd make it faster. Freshers use the form; everyone else, email."
              )}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="min-h-11"
              >
                <Link to="/platform">
                  {t("careers.cta.platform", "See the platform")}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <a
                  href={FRESHER_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(
                    "careers.hero.cta.form_aria",
                    "Open the applications form in a new tab"
                  )}
                >
                  {t("careers.cta.form", "Freshers & interns form")}
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">
                    {t("careers.role.opens_new_tab", "(opens in new tab)")}
                  </span>
                </a>
              </Button>
              <a
                href={`mailto:${APPLY_EMAIL}?subject=Building%20with%20Senseible`}
                aria-label={t(
                  "careers.hero.cta.email_aria",
                  "Email the founding team at build@senseible.earth"
                )}
                className="inline-flex items-center gap-2 text-sm text-primary-foreground/85 hover:text-primary-foreground underline underline-offset-4 min-h-11 px-2"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {APPLY_EMAIL}
              </a>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-primary-foreground/70">
              <Link to="/mission" className="hover:text-primary-foreground">
                {t("nav.mission", "Mission")}
              </Link>
              <Link to="/about" className="hover:text-primary-foreground">
                {t("nav.about", "About")}
              </Link>
              <Link to="/principles" className="hover:text-primary-foreground">
                {t("careers.principles.link", "Principles")}
              </Link>
              <Link to="/platform" className="hover:text-primary-foreground">
                {t("careers.cta.platform", "Platform")}
              </Link>
              <Link to="/contact" className="hover:text-primary-foreground">
                {t("nav.contact", "Contact")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <StickyCta
        label={t("careers.life.cta.roles", "See open roles")}
        onClick={() => go("roles")}
        hideWhenVisible={["roles", "apply"]}
      />
      <Footer />
    </div>
  );
};

export default Careers;
