import { useEffect, useRef, useState } from "react";
import { useInView } from "@/components/platform/Reveal";
import { ownerSpeak } from "@/data/decarbonizeIndia";
import { prefersReducedMotion } from "./useScrollProgress";

/**
 * A frosted translator over a smog-to-clear backdrop. Pick what you would say;
 * it dissolves into what the owner actually hears. Cycles on its own until the
 * visitor takes over.
 */
export function OwnerTranslator() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const [i, setI] = useState(0);
  const manual = useRef(false);
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const t = window.setInterval(() => { if (!manual.current) setI(n => (n + 1) % ownerSpeak.pairs.length); }, 3200);
    return () => window.clearInterval(t);
  }, [inView]);
  const pick = (n: number) => { manual.current = true; setI(n); };
  const pair = ownerSpeak.pairs[i];

  return (
    <div ref={ref} className="relative overflow-hidden rounded-[2rem] p-3 sm:p-5"
      style={{ background: "linear-gradient(120deg, #4a4d52 0%, #6b6e72 30%, #9fc9b0 70%, #f4d9a0 100%)" }}>
      <div aria-hidden="true" className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div aria-hidden="true" className="absolute bottom-0 right-10 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="relative grid gap-3 rounded-[1.5rem] border border-white/40 bg-white/25 p-4 backdrop-blur-xl sm:p-6 md:grid-cols-[0.9fr_1.1fr] md:gap-6 dark:bg-black/25">
        <div role="tablist" aria-label="What you say" className="flex flex-col gap-1.5">
          <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-[#12321f]/70 dark:text-white/70">You say</p>
          {ownerSpeak.pairs.map((p, n) => (
            <button key={p.say} role="tab" aria-selected={n === i} onClick={() => pick(n)}
              className={`rounded-xl px-4 py-3 text-left text-base transition ${n === i ? "bg-white/80 font-medium text-[#12321f] shadow-sm dark:bg-white/90" : "text-[#12321f]/70 hover:bg-white/40 dark:text-white/80"}`}>
              {p.say}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="relative flex min-h-[180px] flex-col justify-end rounded-2xl bg-[#184d37] p-6 text-[#f7f3e8] shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300">The owner hears</p>
          <p key={`s-${i}`} className="mt-3 text-lg text-[#f7f3e8]/45 line-through decoration-amber-400/70 motion-safe:animate-[di-dissolve_900ms_ease-out_forwards]">{pair.say}</p>
          <p key={`h-${i}`} className="text-3xl font-semibold leading-tight sm:text-4xl motion-safe:animate-[di-resolve_700ms_200ms_ease-out_both]">{pair.hear}</p>
        </div>
      </div>
      <p className="relative mt-4 px-2 text-center text-base font-semibold text-[#12321f]">{ownerSpeak.rule}</p>
    </div>
  );
}

export default OwnerTranslator;
