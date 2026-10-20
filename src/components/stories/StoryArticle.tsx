import { useEffect, useRef, useState } from "react";
import type { Story } from "@/lib/caseStudy";
import { chapterPoints, readingMinutes } from "@/lib/storyPoints";
import { TickList } from "@/components/lead/LeadMotion";
import { BasisBadge, BUYER_THEME } from "@/components/stories/StoryView";

// The published story, laid out for skimming: the hook and who it is about,
// any numbers first, then the story as numbered steps (before, what got
// easier, what they can see, the evidence, what it opened up), each as short
// points built from the exact phrases the customer chose. A rail on wide
// screens shows where you are. Nothing is reworded or invented: when a chapter
// cannot be split exactly, its paragraph is shown as written.

type ChapterKey = Story["chapters"][number]["key"];
const STEP_LABEL: Record<ChapterKey, string> = {
  problem: "Before",
  friction: "What got easier",
  visibility: "What they can see now",
  evidence: "The evidence",
  opportunity: "What it opened up",
};

const Points = ({ k, text }: { k: ChapterKey; text: string }) => {
  const points = chapterPoints(k, text);
  if (!points) return <p className="text-[17px] leading-[1.7] text-foreground/90">{text}</p>;
  if (k === "problem") {
    return (
      <ul className="space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-[17px] leading-snug text-foreground/75">
            <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-foreground/40" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (k === "evidence") {
    return (
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {points.map((p, i) => (
          <li key={p} className="flex items-baseline gap-4 px-4 py-3.5 text-[16px] leading-snug sm:px-5">
            <span className="shrink-0 whitespace-nowrap font-mono text-[12px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (k === "opportunity") {
    return (
      <ul className="space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-[17px] leading-snug">
            <span aria-hidden="true" className="text-primary">→</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <TickList items={points} className="[&_li]:text-[17px]" />;
};

export function StoryArticle({ story, publishedAt }: { story: Story; publishedAt?: string }) {
  const theme = BUYER_THEME[story.buyer];
  const steps = story.chapters.filter((c) => c.text);
  const minutes = readingMinutes(story);
  const date = publishedAt ? new Date(publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
  const firstAfterProblem = steps.findIndex((c) => c.key !== "problem");

  // Which step is in view, for the rail.
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.step));
        if (seen.length) setActive(Math.min(...seen));
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  return (
    <article className="min-w-0">
      {/* Header */}
      <header className="max-w-3xl">
        <p className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${theme.accent}`}>
          {theme.label} · {story.industry}{story.region ? ` · ${story.region}` : ""}
        </p>
        <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.05] tracking-tight [text-wrap:balance] md:text-[3.5rem]">{story.hook}</h1>
        <p className="mt-5 max-w-2xl text-[19px] leading-relaxed text-muted-foreground md:text-xl">{story.dek}</p>
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
          <span className="w-full font-medium text-foreground sm:w-auto">{story.byline}</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span>{minutes} min read</span>
          {date && <><span aria-hidden="true">·</span><time dateTime={publishedAt}>{date}</time></>}
        </p>
      </header>

      {/* Numbers first, each with how it is known */}
      {story.numbers.length > 0 && (
        <section aria-label="The numbers" className="mt-10 grid grid-cols-2 border-y border-border md:grid-cols-4">
          {story.numbers.map((n, i) => (
            <div key={n.label} className={`py-5 pr-4 ${i % 2 ? "pl-4 border-l border-border md:pl-5" : ""} ${i > 0 && i % 2 === 0 ? "md:border-l md:border-border md:pl-5" : ""}`}>
              <p className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tabular-nums md:text-4xl">{n.value}</span>
                <span className="text-[13px] text-muted-foreground">{n.unit}</span>
              </p>
              <p className="mt-1.5 text-[13.5px] leading-snug text-muted-foreground">{n.label}</p>
              <div className="mt-2" title={n.basisLabel}><BasisBadge basis={n.basis} /></div>
            </div>
          ))}
        </section>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-14">
        {/* Rail: where you are in the story */}
        <nav aria-label="In this story" className="hidden lg:block">
          <ol className="sticky top-28 space-y-3 border-l border-border">
            {steps.map((c, i) => (
              <li key={c.key}>
                <a
                  href={`#story-${c.key}`}
                  className={`-ml-px block border-l-2 pl-4 text-[13px] leading-snug transition-colors motion-reduce:transition-none ${i <= active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <span className="font-mono text-[11px] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mt-0.5 block">{STEP_LABEL[c.key]}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 max-w-[42rem] space-y-14">
          {steps.map((c, i) => (
            <div key={c.key} className="space-y-14">
              <section
                id={`story-${c.key}`}
                data-step={i}
                ref={(el) => { refs.current[i] = el; }}
                aria-labelledby={`story-${c.key}-h`}
                className="scroll-mt-28"
              >
                <h2 id={`story-${c.key}-h`} className="flex items-baseline gap-3">
                  <span className={`font-mono text-[13px] tabular-nums ${c.key === "problem" ? "text-muted-foreground" : theme.accent}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[22px] font-semibold tracking-tight md:text-2xl">{STEP_LABEL[c.key]}</span>
                </h2>
                <div className="mt-5"><Points k={c.key} text={c.text} /></div>
              </section>

              {/* The turning point sits between the problem and what changed. */}
              {i === firstAfterProblem - 1 && story.moment && (
                <blockquote className={`border-l-2 border-current pl-5 text-[1.375rem] font-medium leading-snug [text-wrap:balance] md:text-[1.625rem] ${theme.accent}`}>
                  “{story.moment}”
                </blockquote>
              )}
            </div>
          ))}

          {story.quote && (
            <figure className="border-t border-border pt-10">
              <span aria-hidden="true" className={`block text-6xl leading-none ${theme.accent}`}>“</span>
              <blockquote className="-mt-2 text-[1.5rem] font-medium leading-snug tracking-tight [text-wrap:balance] md:text-[1.875rem]">{story.quote}</blockquote>
              <figcaption className="mt-4 text-[14px] text-muted-foreground">{story.byline}</figcaption>
            </figure>
          )}

          <p className="text-[12.5px] leading-relaxed text-muted-foreground">{story.disclaimer}</p>
        </div>
      </div>
    </article>
  );
}
