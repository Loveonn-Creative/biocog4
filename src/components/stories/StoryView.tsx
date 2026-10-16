import type { BasisId, BuyerId, Story } from "@/lib/caseStudy";

// Each buyer gets its own accent so the library reads at a glance; all pass contrast on both themes.
export const BUYER_THEME: Record<BuyerId, { accent: string; soft: string; label: string }> = {
  msme: { accent: "text-emerald-700 dark:text-emerald-300", soft: "bg-emerald-50 dark:bg-emerald-950/40", label: "MSME" },
  enterprise: { accent: "text-sky-700 dark:text-sky-300", soft: "bg-sky-50 dark:bg-sky-950/40", label: "Enterprise" },
  finance: { accent: "text-amber-700 dark:text-amber-300", soft: "bg-amber-50 dark:bg-amber-950/40", label: "Finance" },
  lender: { accent: "text-violet-700 dark:text-violet-300", soft: "bg-violet-50 dark:bg-violet-950/40", label: "Lender" },
  importer: { accent: "text-rose-700 dark:text-rose-300", soft: "bg-rose-50 dark:bg-rose-950/40", label: "Supply chain" },
};

const BASIS_MARK: Record<BasisId, { short: string; cls: string }> = {
  reported: { short: "Reported", cls: "border-border text-muted-foreground" },
  estimated: { short: "Estimated", cls: "border-dashed border-border text-muted-foreground" },
  independent: { short: "Verified", cls: "border-foreground/60 text-foreground" },
  calculated: { short: "Calculated", cls: "border-primary/60 text-primary" },
};

export function BasisBadge({ basis }: { basis: BasisId }) {
  const m = BASIS_MARK[basis];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${m.cls}`}>{m.short}</span>;
}

const chapter = (story: Story, key: Story["chapters"][number]["key"]) => story.chapters.find(c => c.key === key);

/**
 * One customer story. `compact` is the live preview inside the journey; the full
 * view is the published page. Layout follows the story: the problem on the left
 * in muted ink, what changed on the right, the evidence as a receipt, numbers
 * with how each is known.
 */
export function StoryView({ story, compact = false, placeholder = false }: { story: Story; compact?: boolean; placeholder?: boolean }) {
  const theme = BUYER_THEME[story.buyer];
  const problem = chapter(story, "problem");
  const friction = chapter(story, "friction");
  const visibility = chapter(story, "visibility");
  const evidence = chapter(story, "evidence");
  const opportunity = chapter(story, "opportunity");
  const h = compact ? "text-xl" : "text-[2rem] md:text-[2.75rem]";

  return (
    <article className={`min-w-0 ${placeholder ? "opacity-60" : ""}`}>
      <p className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${theme.accent}`}>{theme.label} · {story.industry}{story.region ? ` · ${story.region}` : ""}</p>
      <h1 className={`mt-3 font-semibold leading-[1.1] tracking-tight [text-wrap:balance] ${h}`}>{story.hook}</h1>
      <p className={`mt-3 text-muted-foreground ${compact ? "text-[14px]" : "text-lg"}`}>{story.dek}</p>
      <p className={`mt-3 text-[13px] font-medium ${compact ? "" : "md:text-sm"}`}>{story.byline}</p>

      {story.moment && (
        <blockquote className={`mt-6 border-l-2 border-current pl-4 italic ${theme.accent} ${compact ? "text-[15px]" : "text-xl md:text-2xl"} leading-snug`}>
          “{story.moment}”
        </blockquote>
      )}

      {/* Before and after */}
      <div className={`mt-7 grid gap-3 ${compact ? "" : "md:grid-cols-2 md:gap-4"}`}>
        {problem && (
          <section className="rounded-2xl border border-border bg-secondary/50 p-4 md:p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Before</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{problem.text}</p>
          </section>
        )}
        {(friction || visibility) && (
          <section className={`rounded-2xl p-4 md:p-5 ${theme.soft}`}>
            <h2 className={`text-[12px] font-semibold uppercase tracking-[0.14em] ${theme.accent}`}>After</h2>
            {friction && <p className="mt-2 text-[15px] leading-relaxed">{friction.text}</p>}
            {visibility && <p className="mt-2 text-[15px] leading-relaxed">{visibility.text}</p>}
          </section>
        )}
      </div>

      {/* Evidence, as a receipt */}
      {evidence && (
        <section className="mt-4 rounded-2xl border border-dashed border-foreground/25 bg-background p-4 md:p-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Evidence they can show</h2>
          <p className="mt-2 font-mono text-[13.5px] leading-relaxed">{evidence.text}</p>
        </section>
      )}

      {opportunity && (
        <section className="mt-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">What it opened up</h2>
          <p className="mt-2 text-[15px] leading-relaxed">{opportunity.text}</p>
        </section>
      )}

      {story.numbers.length > 0 && (
        <section className="mt-6">
          <h2 className="sr-only">The numbers</h2>
          <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
            {story.numbers.map(n => (
              <div key={n.label} className="rounded-2xl border border-border p-3.5">
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-semibold tabular-nums ${compact ? "text-xl" : "text-2xl md:text-3xl"}`}>{n.value}</span>
                  <span className="text-[12px] text-muted-foreground">{n.unit}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{n.label}</p>
                <div className="mt-2" title={n.basisLabel}><BasisBadge basis={n.basis} /></div>
                {!compact && <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{n.basisLabel}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {story.quote && (
        <figure className="mt-7">
          <blockquote className={`${compact ? "text-[15px]" : "text-xl"} font-medium leading-snug`}>“{story.quote}”</blockquote>
          <figcaption className="mt-2 text-[13px] text-muted-foreground">{story.byline}</figcaption>
        </figure>
      )}

      <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">{story.disclaimer}</p>
    </article>
  );
}
