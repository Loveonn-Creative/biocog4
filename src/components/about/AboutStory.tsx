import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "@/components/platform/Reveal";

// /about as one scroll-driven story: a sticky rail follows the reader through
// four chapters, and the "replacement" lines turn each document into what it
// becomes. Without motion, every chapter and outcome is simply shown.

export interface Chapter { id: string; label: string; body: ReactNode }

export function ChapterStory({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
    }, { rootMargin: "-45% 0px -50% 0px" });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [chapters.length]);

  return (
    <div className="grid gap-10 md:grid-cols-[9rem_minmax(0,1fr)]">
      <nav aria-label="Chapters" className="hidden md:block">
        <ol className="sticky top-28 grid gap-5">
          <svg className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-0.5" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M1 0 V100" stroke="hsl(var(--border))" strokeWidth="2" />
            <path d="M1 0 V100" stroke="hsl(var(--primary))" strokeWidth="2" className="ab-fill" style={{ transform: `scaleY(${(active + 1) / chapters.length})` }} />
          </svg>
          {chapters.map((c, i) => (
            <li key={c.id} className="relative flex items-center gap-3">
              <span className={`relative z-10 h-4 w-4 rounded-full border-2 transition-colors ${i <= active ? "border-primary bg-primary" : "border-border bg-background"}`} />
              <a href={`#${c.id}`} className={`text-sm transition-colors ${i === active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{c.label}</a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="grid gap-20">
        {chapters.map((c, i) => (
          <section key={c.id} id={c.id} data-i={i} ref={(el) => { refs.current[i] = el; }} className="scroll-mt-24">
            <p className="mb-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">{String(i + 1).padStart(2, "0")} · {c.label}</p>
            {c.body}
          </section>
        ))}
      </div>
    </div>
  );
}

const DOC_DOODLES: Record<string, string> = {
  invoice: "M6 3 h14 l6 6 v20 H6 Z M20 3 v6 h6 M10 15 h12 M10 20 h12 M10 25 h7",
  bill: "M6 3 h20 v26 l-4 -3 l-4 3 l-4 -3 l-4 3 l-4 -3 Z M10 10 h12 M10 15 h12 M16 20 l-3 5 h6 l-3 5",
  receipt: "M8 3 h16 v26 l-3 -2 l-2 2 l-3 -2 l-3 2 l-2 -2 l-3 2 Z M12 10 h8 M12 15 h8 M12 20 h5",
};

/** "An invoice becomes a carbon calculation": the source is struck through and the outcome writes in. */
export function BecomesLine({ doc, from, to }: { doc: keyof typeof DOC_DOODLES; from: string; to: string }) {
  const { ref, inView } = useInView<HTMLLIElement>(0.7);
  return (
    <li ref={ref} className="flex items-center gap-4">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <path d={DOC_DOODLES[doc]} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <p className="min-w-0 text-lg text-foreground">
        <span className={`ab-from ${inView ? "ab-from-on" : ""}`}>{from}</span>{" "}
        <span className="text-muted-foreground">becomes</span>{" "}
        <span className={`ab-to font-medium text-primary ${inView ? "ab-to-on" : ""}`}>{to}</span>
      </p>
    </li>
  );
}
