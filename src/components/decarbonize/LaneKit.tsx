import type { ReactNode } from "react";
import { lanes } from "@/data/decarbonizeIndia";
import { LIMITS, type LaneId } from "@/lib/ambassadorApplication";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** A hand-drawn emblem for each lane: what the work looks like, not a stock icon. */
const EMBLEM: Record<LaneId, ReactNode> = {
  content: <><rect x="14" y="6" width="20" height="36" rx="4" {...S} /><path d="M21 19 l8 5 l-8 5z" {...S} /><path d="M20 37 h8" {...S} /></>,
  design: <><path d="M24 6 l10 18 l-10 18 l-10 -18z" {...S} /><circle cx="24" cy="24" r="3" {...S} /><path d="M24 27 v15" {...S} /></>,
  on_ground: <><path d="M8 20 v8 h6 l14 9 v-26 l-14 9z" {...S} /><path d="M33 18 c3 3 3 9 0 12 M37 14 c6 6 6 14 0 20" {...S} /></>,
  msme_talks: <><path d="M6 40 V26 l8 -5 v5 l8 -5 v5 l8 -5 v19z" {...S} /><path d="M26 8 h16 v10 h-9 l-4 4 v-4 h-3z" {...S} /></>,
  esg_interviews: <><rect x="18" y="6" width="12" height="20" rx="6" {...S} /><path d="M12 22 a12 12 0 0 0 24 0 M24 34 v8 M17 42 h14" {...S} /></>,
  code: <><path d="M15 15 l-8 9 l8 9 M33 15 l8 9 l-8 9" {...S} /><path d="M28 12 c-6 6 -8 14 -8 24 c6 -2 10 -8 10 -14" {...S} /></>,
  creative: <><path d="M24 6 l3 12 l12 3 l-12 3 l-3 12 l-3 -12 l-12 -3 l12 -3z" {...S} /><circle cx="38" cy="38" r="3" {...S} /></>,
};

/**
 * Lanes are badges, not form options. Tapping one pins it to the kit beside
 * them; the same picks carry into the application.
 */
export function LaneKit({ picked, toggle, onNext }: { picked: LaneId[]; toggle: (id: LaneId) => void; onNext: () => void }) {
  const full = picked.length >= LIMITS.lanes[1];
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Lane badges">
        {lanes.map(l => {
          const on = picked.includes(l.id);
          return (
            <li key={l.id}>
              <button type="button" aria-pressed={on} onClick={() => toggle(l.id)} disabled={!on && full}
                className={`group flex h-full w-full flex-col items-center rounded-[1.5rem] px-3 pb-4 pt-5 text-center transition duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${on ? "bg-[#184d37]/[.06]" : "hover:bg-[#184d37]/[.04]"}`}>
                <span className={`relative grid h-20 w-20 place-items-center rounded-full border-2 transition duration-300 ${on ? "scale-90 border-dashed border-[#184d37]/40 text-[#184d37]/40" : "border-[#184d37] text-[#184d37] group-hover:-translate-y-1 group-hover:shadow-[0_14px_24px_-14px_rgba(24,77,55,.8)] dark:border-emerald-400 dark:text-emerald-400"}`}>
                  <svg viewBox="0 0 48 48" className="h-10 w-10">{EMBLEM[l.id]}</svg>
                  {on && <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-xs font-bold text-[#12321f]">{picked.indexOf(l.id) + 1}</span>}
                </span>
                <span className="mt-3 text-[15px] font-semibold leading-tight">{l.label}</span>
                <span className="mt-1 text-xs leading-snug text-muted-foreground">{l.line}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* the kit the badges pin onto */}
      {/* phones: the kit rides along at the bottom while badges are tapped */}
      <div className="sticky bottom-3 z-20 lg:bottom-auto lg:top-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#184d37] p-5 lg:p-6 text-[#f7f3e8] shadow-[0_40px_70px_-40px_rgba(0,0,0,.7)] [transform:perspective(900px)_rotateY(-6deg)_rotateX(4deg)]">
          <div aria-hidden="true" className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">Your ambassador kit</p>
          <div className="mt-4 grid grid-cols-3 gap-3 lg:mt-5">
            {[0, 1, 2].map(slot => {
              const id = picked[slot];
              const lane = lanes.find(l => l.id === id);
              return (
                <div key={`${slot}-${id ?? ""}`} className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 text-center transition duration-500 ${lane ? "border-transparent bg-[#f7f3e8] text-[#184d37] motion-safe:animate-[di-pin_.45s_cubic-bezier(.2,1.4,.4,1)]" : "border-dashed border-[#f7f3e8]/25 text-[#f7f3e8]/35"}`}>
                  {lane ? <><svg viewBox="0 0 48 48" className="h-9 w-9">{EMBLEM[lane.id]}</svg><span className="mt-1 px-1 text-[10px] font-semibold leading-tight">{lane.label}</span></> : <span className="text-xs">{slot < 2 ? "Pick" : "Optional"}</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-sm text-[#f7f3e8]/75">
            {picked.length < LIMITS.lanes[0] ? `Pin ${LIMITS.lanes[0] - picked.length} more to set your lanes.` : picked.length === 2 ? "Two lanes set. Add a third, or move on." : "Your three lanes are set."}
          </p>
          <button type="button" onClick={onNext} disabled={picked.length < LIMITS.lanes[0]}
            className="mt-4 w-full rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-[#12321f] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40">
            Take these lanes into my application
          </button>
        </div>
      </div>
    </div>
  );
}

export default LaneKit;
