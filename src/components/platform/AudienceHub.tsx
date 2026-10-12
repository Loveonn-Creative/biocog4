import { useEffect, useState } from "react";

export interface Audience { key: string; label: string; line: string }

/**
 * "Six audiences. One verified record." drawn literally: the record in the
 * middle, the six readers around it. Choosing one draws its line to the
 * record and shows what it gets. On phones the same choice is a list.
 */
export function AudienceHub({ audiences, centre }: { audiences: Audience[]; centre: string }) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setActive(a => (a + 1) % audiences.length), 3200);
    return () => window.clearInterval(t);
  }, [held, audiences.length]);
  const pick = (i: number) => { setHeld(true); setActive(i); };
  const pos = (i: number) => {
    const a = (Math.PI * 2 * i) / audiences.length - Math.PI / 2;
    return { x: 50 + 40 * Math.cos(a), y: 50 + 38 * Math.sin(a) };
  };
  const a = audiences[active];

  return (
    <div onMouseEnter={() => setHeld(true)}>
      {/* desktop: the hub */}
      <div className="relative mx-auto hidden aspect-[16/9] max-w-4xl md:block">
        <svg viewBox="0 0 100 56.25" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {audiences.map((_, i) => {
            const p = pos(i);
            return <line key={i} x1="50" y1="28.1" x2={p.x} y2={p.y * 0.5625} vectorEffect="non-scaling-stroke"
              stroke={i === active ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={i === active ? 2 : 1} strokeDasharray={i === active ? undefined : "3 5"}
              className="transition-[stroke] duration-500" />;
          })}
        </svg>
        <div className="absolute left-1/2 top-1/2 w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-primary/60 bg-background p-4 text-center shadow-[0_24px_50px_-30px_hsl(var(--primary)/.6)]">
          <div className="text-[11px] uppercase tracking-[0.14em] text-primary">{centre}</div>
          <p key={a.key} className="mt-2 text-sm leading-snug text-foreground motion-safe:animate-[lm-pop_300ms_ease-out]">{a.line}</p>
        </div>
        {audiences.map((au, i) => {
          const p = pos(i);
          return (
            <button key={au.key} type="button" onClick={() => pick(i)} onFocus={() => pick(i)} aria-pressed={i === active}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ${i === active ? "scale-105 border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-background text-foreground hover:border-primary/50"}`}>
              {au.label}
            </button>
          );
        })}
      </div>

      {/* phones: a list with the active one expanded */}
      <ul className="border-t border-border md:hidden">
        {audiences.map((au, i) => (
          <li key={au.key} className="border-b border-border">
            <button type="button" onClick={() => pick(i)} aria-expanded={i === active} className="flex w-full items-center justify-between py-4 text-left">
              <span className={`font-medium ${i === active ? "text-primary" : "text-foreground"}`}>{au.label}</span>
              <span className={`h-2 w-2 rounded-full ${i === active ? "bg-primary" : "bg-border"}`} aria-hidden="true" />
            </button>
            <p className={`pb-4 text-sm leading-relaxed text-muted-foreground ${i === active ? "" : "hidden"}`}>{au.line}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AudienceHub;
