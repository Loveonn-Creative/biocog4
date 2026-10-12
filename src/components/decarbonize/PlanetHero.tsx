import { hero, story } from "@/data/decarbonizeIndia";
import { BreathingPlanet } from "./BreathingPlanet";
import { TricolorStroke } from "./DiDoodles";
import { useScrollProgress } from "./useScrollProgress";

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const sky = (t: number, top: [number, number, number], bottom: [number, number, number]) =>
  `linear-gradient(180deg, rgb(${lerp(7, top[0], t)},${lerp(10, top[1], t)},${lerp(14, top[2], t)}) 0%, rgb(${lerp(18, bottom[0], t)},${lerp(22, bottom[1], t)},${lerp(26, bottom[2], t)}) 100%)`;

/**
 * Scroll story: the visitor clears the air by scrolling. The planet, the sky
 * and one line of text change together; the headline and the action stay put.
 */
export function PlanetHero({ onJoin, onSession }: { onJoin: () => void; onSession: () => void }) {
  const { ref, progress, value } = useScrollProgress<HTMLElement>(40);
  const dawn = Math.min(1, Math.max(0, (value - 0.5) / 0.5));
  const lineIndex = Math.min(story.length - 1, Math.floor(value * story.length * 0.999));

  return (
    <section ref={ref} id="di-hero" className="relative h-[240svh] text-[#f7f3e8]" aria-label="Decarbonize India">
      <div className="sticky top-0 h-[100svh] overflow-hidden" style={{ background: sky(dawn, [24, 46, 66], [196, 132, 62]) }}>
        {/* stars fade as the sky brightens */}
        <div aria-hidden="true" className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: 1 - dawn, backgroundImage: "radial-gradient(1px 1px at 12% 20%, #fff8 50%, transparent 51%), radial-gradient(1px 1px at 72% 12%, #fff6 50%, transparent 51%), radial-gradient(1.5px 1.5px at 85% 40%, #fff7 50%, transparent 51%), radial-gradient(1px 1px at 30% 70%, #fff5 50%, transparent 51%), radial-gradient(1px 1px at 55% 30%, #fff6 50%, transparent 51%), radial-gradient(1px 1px at 92% 78%, #fff5 50%, transparent 51%), radial-gradient(1.5px 1.5px at 6% 88%, #fff6 50%, transparent 51%)" }} />

        <div className="relative mx-auto grid h-full max-w-6xl grid-rows-[auto_1fr] gap-4 px-4 pt-24 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:grid-rows-1 lg:items-center lg:pt-16">
          <div className="relative z-10">
            <h1 className="font-semibold tracking-tight">
              <span className="block text-4xl leading-none sm:text-5xl">{hero.title[0]}</span>
              <span className="relative mt-1 inline-block text-7xl leading-[0.95] text-[#7fdca4] sm:text-8xl">
                {hero.title[1]}
                <TricolorStroke className="absolute -bottom-4 left-0 h-6 w-full" />
              </span>
            </h1>
            <p className="mt-8 inline-block -rotate-1 bg-amber-300 px-3 py-1 text-sm font-semibold uppercase tracking-[0.12em] text-[#12321f]">{hero.kicker}</p>

            {/* one line at a time, swapped as the air clears */}
            <div className="relative mt-6 h-[6.5rem] max-w-md sm:h-[5.5rem]" aria-live="polite">
              {story.map((line, i) => (
                <p key={line} className={`absolute inset-0 text-xl leading-snug transition-all duration-700 sm:text-2xl [text-wrap:balance] ${i === lineIndex ? "translate-y-0 opacity-100" : i < lineIndex ? "-translate-y-3 opacity-0" : "translate-y-3 opacity-0"}`}>
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button type="button" onClick={onJoin}
                className="rounded-full bg-[#f7f3e8] px-7 py-4 text-base font-semibold text-[#12321f] shadow-[0_18px_40px_-18px_rgba(0,0,0,.8)] transition hover:-translate-y-0.5">
                {hero.join}
              </button>
              <button type="button" onClick={onSession} className="text-sm font-medium underline decoration-amber-400 decoration-2 underline-offset-[6px] hover:decoration-[#7fdca4]">
                {hero.session}
              </button>
            </div>
          </div>

          <div className="relative -mx-10 self-end sm:mx-auto sm:w-[80%] lg:mx-0 lg:w-full lg:self-center">
            <BreathingPlanet progress={progress} />
          </div>
        </div>

        {/* scroll affordance and the air meter */}
        <div className="pointer-events-none absolute inset-x-0 bottom-5 mx-auto flex w-full max-w-6xl items-center gap-3 px-4 text-xs sm:px-6">
          <span className={`transition-opacity duration-500 ${value < 0.08 ? "opacity-80" : "opacity-0"}`}>{hero.scrollHint}</span>
          <div className="ml-auto flex items-center gap-2" aria-hidden="true">
            <span className="opacity-70">{value >= 0.97 ? "Air cleared" : "Clearing the air"}</span>
            <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
              <span className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#9aa0a6,#7fdca4,#f4c45a)]" style={{ width: `${Math.round(value * 100)}%` }} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PlanetHero;
