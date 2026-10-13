import { useState } from "react";
import { useInView } from "@/components/platform/Reveal";

// Interactives for /carbon-credits. Each one shows what its section says and
// adds no claim. Motion plays once in view and rests on its final frame,
// which is also the reduced-motion frame.

export interface CreditGate { name: string; desc: string; held: string }

/**
 * A record travels through the three gates to "credit-ready". Any gate can
 * be made to fail: the record then stops at that gate, with its reason.
 */
export function GateRun({ gates }: { gates: CreditGate[] }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const [failed, setFailed] = useState<number | null>(null);
  const stop = failed ?? gates.length; // index the record reaches
  const w = 420, x0 = 24, end = w - 96, step = (end - x0) / gates.length;
  const gx = (i: number) => x0 + step * (i + 0.5);
  const recordX = failed === null ? w - x0 - 34 : gx(failed) - 34;

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${w} 120`} className="mx-auto h-auto w-full max-w-2xl" role="img"
        aria-label={failed === null ? "The record clears all three gates and becomes a credit-ready signal" : `The record is held at ${gates[failed].name}`}>
        <path d={`M${x0} 84 H${w - x0}`} stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 6" />
        {gates.map((g, i) => {
          const isFail = failed === i, passed = i < stop;
          const c = isFail ? "hsl(var(--destructive))" : passed && inView ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
          return (
            <g key={g.name} className="cc-gate">
              <path pathLength={1} d={`M${gx(i) - 22} 96 V52 a22 22 0 0 1 44 0 V96`} fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"
                className={`tr-path ${inView ? "tr-draw-on" : ""}`} style={{ transitionDelay: `${i * 0.15}s` }} />
              {isFail && <path d={`M${gx(i) - 14} 60 l28 28 M${gx(i) + 14} 60 l-28 28`} stroke={c} strokeWidth="3" strokeLinecap="round" />}
              <text x={gx(i)} y="18" textAnchor="middle" fontSize="13" fill="hsl(var(--foreground))">{i + 1}</text>
            </g>
          );
        })}
        <g className={`cc-record ${inView ? "cc-record-on" : ""}`} style={{ transform: `translateX(${inView ? recordX : x0}px)` }}>
          <rect x="-12" y="66" width="24" height="30" rx="3" fill="hsl(var(--background))" stroke={failed === null ? "hsl(var(--primary))" : "hsl(var(--destructive))"} strokeWidth="2" />
          <path d="M-6 75 h12 M-6 81 h12 M-6 87 h7" stroke="hsl(var(--muted-foreground))" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        <path d={`M${w - x0} 96 V58 l-16 6 l16 6`} fill="none" stroke={failed === null ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} strokeWidth="2" strokeLinejoin="round" />
        <text x={w - x0} y="114" textAnchor="end" fontSize="12" fill={failed === null ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}>credit-ready signal</text>
      </svg>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {gates.map((g, i) => {
          const isFail = failed === i;
          return (
            <li key={g.name} className={`rounded-2xl border p-4 transition-colors ${isFail ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
              <div className="flex items-baseline gap-2"><span className="font-mono text-xs text-muted-foreground">{i + 1}</span><h3 className="text-sm font-medium">{g.name}</h3></div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.desc}</p>
              {isFail && <p className="mt-2 text-xs text-destructive" aria-live="polite">Held back: {g.held}</p>}
              <button type="button" onClick={() => setFailed(isFail ? null : i)} aria-pressed={isFail}
                className="mt-3 rounded-full border border-dashed border-border px-3 py-1 text-xs hover:border-foreground/40">
                {isFail ? "Let it pass" : "Make this gate fail"}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Indicative value as an equation whose price term stays withheld until a confirmed market price exists. */
export function ValueEquation({ firstTerm, firstNote }: { firstTerm: string; firstNote: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const terms = [
    { big: firstTerm, note: firstNote },
    { big: "×", note: "" },
    { big: "price", note: "Withheld until a confirmed market price is stated with its source" },
    { big: "=", note: "" },
    { big: "indicative value", note: "Shown with its assumptions, never a promise" },
  ];
  return (
    <div ref={ref} className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-4">
      {terms.map((t, i) => t.note ? (
        <div key={i} className={`cc-term max-w-[12rem] ${inView ? "cc-term-on" : ""}`} style={{ animationDelay: `${i * 0.12}s` }}>
          <p className={`text-2xl font-semibold sm:text-3xl ${t.big === "price" ? "text-muted-foreground underline decoration-dashed decoration-1 underline-offset-8" : ""}`}>{t.big}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.note}</p>
        </div>
      ) : (
        <span key={i} className="text-xl text-muted-foreground sm:pt-1 sm:text-3xl" aria-hidden="true">{t.big}</span>
      ))}
    </div>
  );
}

export interface TrailStep { title: string; body: string }

/** Steps whose markers stamp in sequence while a thread draws between them. */
export function StepTrail({ steps }: { steps: TrailStep[] }) {
  const { ref, inView } = useInView<HTMLOListElement>(0.2);
  return (
    <ol ref={ref} className="relative grid gap-6">
      <svg className="absolute bottom-5 left-[19px] top-5 w-1" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M1 0 V100" stroke="hsl(var(--primary))" strokeOpacity=".4" strokeWidth="2" className={`tr-path ${inView ? "tr-draw-on" : ""}`} />
      </svg>
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex items-start gap-5">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-primary bg-background text-sm font-medium text-primary ${inView ? "cc-stamp" : ""}`}
            style={{ animationDelay: `${0.2 + i * 0.25}s` }}>{i + 1}</span>
          <div className="min-w-0 pt-1.5">
            <h3 className="font-medium text-foreground">{s.title}</h3>
            <p className="mt-1 text-muted-foreground">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
