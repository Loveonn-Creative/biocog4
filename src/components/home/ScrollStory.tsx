import { lazy, Suspense, useEffect, useRef, useState } from "react";

const ProductPipeline = lazy(() => import("@/components/product/ProductPipeline"));

export interface StoryStep { n: string; title: string; body: string }

/**
 * Scroll-driven "how it works". The words scroll; one picture stays put and
 * moves to the step the reader is on, so the reader controls the pace and
 * never has to match a caption to a diagram. Steps map to the walkthrough's
 * stages: Capture (read and classify), Multiply, Verify, Use.
 */
const STAGE_FOR_STEP = [1, 2, 3, 4];

export const ScrollStory = ({ title, steps }: { title: string; steps: StoryStep[] }) => {
  const [active, setActive] = useState(-1);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setActive(0); return; }
    // A step is "current" while it crosses the middle band of the viewport.
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      }
    }, { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  const stage = active < 0 ? 0 : STAGE_FOR_STEP[Math.min(active, STAGE_FOR_STEP.length - 1)];
  const progress = active < 0 ? 0 : (active + 1) / steps.length;

  return (
    <section aria-labelledby="how-title" className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-20 sm:pt-28">
      <h2 id="how-title" className="text-[clamp(1.6rem,4vw,2.5rem)] font-semibold tracking-tight leading-tight max-w-2xl [text-wrap:balance]">
        {title}
      </h2>

      <div className="mt-8 lg:mt-12 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        {/* The picture: sticky under the fold on phones, beside the words on desktop. */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-3 pb-4 bg-background/90 backdrop-blur-sm lg:order-2 lg:top-20 lg:mx-0 lg:px-0 lg:pt-0 lg:pb-0 lg:bg-transparent lg:backdrop-blur-0 lg:h-[calc(100vh-7rem)] lg:flex lg:items-center">
          <div className="w-full max-w-md mx-auto lg:max-w-none">
            <Suspense fallback={<div className="h-[260px] sm:h-[330px]" aria-hidden="true" />}>
              <ProductPipeline stage={stage} bare />
            </Suspense>
          </div>
          {/* Progress: how far through the four steps the reader is. */}
          <div className="mt-2 h-0.5 w-full max-w-md mx-auto rounded-full bg-border lg:hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <ol className="relative lg:order-1">
          {/* Desktop progress rail beside the steps. */}
          <span aria-hidden="true" className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-border" />
          <span aria-hidden="true" className="hidden lg:block absolute left-0 top-0 w-px bg-primary transition-[height] duration-500" style={{ height: `${progress * 100}%` }} />
          {steps.map((s, i) => {
            const on = i === active;
            return (
              <li
                key={s.n}
                ref={el => { refs.current[i] = el; }}
                data-i={i}
                className="min-h-[52vh] lg:min-h-[72vh] flex flex-col justify-center lg:pl-10"
              >
                <div className={`transition-all duration-500 ${on ? "opacity-100 translate-y-0" : "opacity-35 translate-y-1"}`}>
                  <p className={`font-mono text-xs tracking-widest ${on ? "text-primary" : "text-muted-foreground"}`}>{s.n}</p>
                  <h3 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
