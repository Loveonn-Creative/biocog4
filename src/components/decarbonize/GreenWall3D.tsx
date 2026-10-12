import { useEffect, useState } from "react";
import { wall } from "@/data/decarbonizeIndia";

/**
 * A factory wall on a tilted plane. A paint roller sweeps across it, and what
 * an owner fears (grey) becomes what they gain (green). It is the program in
 * one moving picture: the ambassador is the roller.
 */
export function GreenWall3D() {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setPainted(true); return; }
    const first = window.setTimeout(() => setPainted(true), 700);
    const loop = window.setInterval(() => {
      setPainted(false);
      window.setTimeout(() => setPainted(true), 900);
    }, 7600);
    return () => { window.clearTimeout(first); window.clearInterval(loop); };
  }, []);

  const rows = wall.grey.map((g, i) => ({ grey: g, green: wall.green[i] }));

  return (
    <div className="relative mx-auto mt-16 w-full max-w-[460px] pr-12 [perspective:1200px] lg:mt-0 lg:pr-10" aria-hidden="true">
      <div className="relative [transform-style:preserve-3d] [transform:rotateX(10deg)_rotateY(-18deg)] motion-safe:animate-[lm-float_9s_ease-in-out_infinite]">
        {/* chimney and smoke on the grey side */}
        <div className="absolute -top-16 left-[12%] h-16 w-6 rounded-t-sm bg-stone-400 dark:bg-stone-600" />
        <div className={`absolute -top-24 left-[9%] h-10 w-14 rounded-full bg-stone-300/80 blur-[2px] transition-opacity duration-700 dark:bg-stone-500/70 ${painted ? "opacity-0" : "opacity-100"}`} />
        <div className={`absolute -top-[5.5rem] left-[14%] text-[hsl(var(--primary))] transition-opacity duration-700 ${painted ? "opacity-100" : "opacity-0"}`}>
          <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 34 C 8 16, 20 6, 34 6 C 34 22, 24 32, 8 34z" /><path d="M8 34 L26 14" /></svg>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-stone-300 shadow-[0_50px_80px_-50px_rgba(0,0,0,.55)] dark:border-stone-700">
          {/* grey wall */}
          <div className="bg-stone-200 p-6 sm:p-7 dark:bg-stone-800 [background-image:linear-gradient(rgba(0,0,0,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.06)_1px,transparent_1px)] [background-size:44px_22px]">
            <ul className="space-y-3">
              {rows.map(r => (
                <li key={r.grey} className="text-xl font-semibold tracking-tight text-stone-500 line-through decoration-stone-400/70 sm:text-2xl dark:text-stone-400">{r.grey}</li>
              ))}
            </ul>
          </div>
          {/* green paint, revealed left to right */}
          <div
            className="absolute inset-0 bg-[#184d37] p-6 transition-[clip-path] duration-[1600ms] ease-[cubic-bezier(.65,0,.25,1)] sm:p-7"
            style={{ clipPath: painted ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
          >
            <ul className="space-y-3">
              {rows.map(r => (
                <li key={r.green} className="text-xl font-semibold tracking-tight text-[#f7f3e8] sm:text-2xl">{r.green}</li>
              ))}
            </ul>
            <div className="mt-5 h-1.5 w-28 rounded-full bg-[linear-gradient(90deg,#f4a21a_0_33%,#f7f3e8_33%_66%,#3fae6b_66%)]" />
          </div>
        </div>

        {/* the roller */}
        <div
          className="absolute -top-3 bottom-[-12px] w-7 transition-[left] duration-[1600ms] ease-[cubic-bezier(.65,0,.25,1)]"
          style={{ left: painted ? "calc(100% - 14px)" : "-14px" }}
        >
          <div className="h-full w-full rounded-full border-2 border-[#123b2a] bg-[#2f7a55] shadow-lg" />
          <div className="absolute left-1/2 top-1/2 hidden h-[3px] w-16 -translate-y-1/2 rounded bg-[#123b2a] sm:block" />
          <div className="absolute left-[calc(50%+60px)] top-1/2 hidden h-16 w-3 -translate-y-1/2 rounded-full bg-amber-500 sm:block" />
        </div>
      </div>

      <p className="mt-8 text-center text-[13px] text-muted-foreground">
        What an owner fears, painted into what they gain.
      </p>
    </div>
  );
}

export default GreenWall3D;
