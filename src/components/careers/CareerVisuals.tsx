import { useEffect, useState } from "react";
import { useInView } from "@/components/platform/Reveal";
import { Doodle } from "@/components/doodles/Doodles";
import { prefersReducedMotion } from "@/components/decarbonize/useScrollProgress";

/**
 * "Months → seconds.": the old state is struck through as the row arrives and
 * the new state lands in green. Text without an arrow shows as written.
 * Reduced motion shows the final state straight away.
 */
export function BeforeAfter({ text }: { text: string }) {
  const { ref, inView } = useInView<HTMLParagraphElement>(0.5);
  const parts = text.split("→");
  if (parts.length !== 2) return <p className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">{text}</p>;
  const [from, to] = parts.map((p) => p.trim());
  return (
    <p ref={ref} className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1] [text-wrap:balance]">
      <span className="relative inline-block text-muted-foreground">
        {from}
        <span
          aria-hidden="true"
          className={`absolute left-0 top-1/2 h-[3px] w-full origin-left rounded-full bg-amber-500 transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${inView ? "scale-x-100" : "scale-x-0"}`}
        />
      </span>
      <span aria-hidden="true" className="mx-3 text-muted-foreground/60">→</span>
      <span className="sr-only"> to </span>
      <span
        className={`inline-block text-[#184d37] dark:text-emerald-400 transition-[opacity,transform] duration-700 delay-300 motion-reduce:transition-none ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      >
        {to}
      </span>
    </p>
  );
}

/** The eleven languages, with one lit at a time; still and unlit under reduced motion. */
export function LanguageRoll({ glyphs }: { glyphs: string[] }) {
  const [lit, setLit] = useState(-1);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let i = 0;
    setLit(0);
    const id = window.setInterval(() => { i = (i + 1) % glyphs.length; setLit(i); }, 1600);
    return () => window.clearInterval(id);
  }, [glyphs.length]);
  return (
    <div aria-hidden="true" className="flex flex-wrap gap-x-2 gap-y-2">
      {glyphs.map((g, i) => (
        <span
          key={g}
          className={`rounded-full border px-3 py-1 text-sm transition-colors duration-500 ${i === lit ? "border-[#184d37] bg-[#184d37] text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-background" : "border-border text-muted-foreground"}`}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

/** "We don't …": the line is crossed out as it scrolls in, next to what we do instead. */
export function StruckLine({ text }: { text: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.6);
  return (
    <span ref={ref} className="relative inline">
      <span className="text-muted-foreground">{text}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-1/2 h-px w-full origin-left bg-muted-foreground/70 transition-transform duration-700 delay-150 motion-reduce:transition-none ${inView ? "scale-x-100" : "scale-x-0"}`}
      />
    </span>
  );
}

/* Line drawings for the four work surfaces; each draws itself once in view. */
const G = "hsl(var(--primary))";
export const SurfaceDoodle = ({ kind }: { kind: "mrv" | "finance" | "ai" | "trust" }) => {
  if (kind === "mrv") return (
    <Doodle viewBox="0 0 120 60" className="h-12 w-24">
      <path pathLength={1} d="M8 12 h22 l7 7 v30 h-29z" />
      <path pathLength={1} d="M40 30 h24" stroke={G} />
      <path pathLength={1} d="M60 24 l6 6 -6 6" stroke={G} />
      <path pathLength={1} d="M74 18 h38 v24 h-38z" />
      <path pathLength={1} d="M82 30 h22" />
    </Doodle>
  );
  if (kind === "finance") return (
    <Doodle viewBox="0 0 120 60" className="h-12 w-24">
      <path pathLength={1} d="M10 50 h100" />
      <path pathLength={1} d="M18 50 v-10 M40 50 v-18 M62 50 v-26 M84 50 v-34" stroke={G} />
      <path pathLength={1} d="M14 38 C 40 30, 70 22, 104 10" />
    </Doodle>
  );
  if (kind === "ai") return (
    <Doodle viewBox="0 0 120 60" className="h-12 w-24">
      <path pathLength={1} d="M8 30 C 16 10, 24 50, 32 30 S 48 10, 56 30 S 72 50, 80 30" stroke={G} />
      <path pathLength={1} d="M88 18 h24 v24 h-24z" />
      <path pathLength={1} d="M94 26 h12 M94 34 h8" />
    </Doodle>
  );
  return (
    <Doodle viewBox="0 0 120 60" className="h-12 w-24">
      <path pathLength={1} d="M60 6 l24 9 v14 c0 14 -11 22 -24 26 c-13 -4 -24 -12 -24 -26 v-14z" />
      <path pathLength={1} d="M50 30 l7 7 13 -14" stroke={G} />
    </Doodle>
  );
};
