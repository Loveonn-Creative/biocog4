import { useEffect, useState } from "react";

const SECTIONS = ["Your Details", "Company Details", "Your Application"];

/**
 * The application filling itself in, on a card tilted like paper on a desk:
 * three parts complete one after another, then the "Application Received"
 * stamp lands. It shows the founder the whole path before they start.
 */
export function ApplicationCard3D() {
  const [step, setStep] = useState(0); // 0..3 parts done, 4 = stamped
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setStep(4); return; }
    const t = window.setInterval(() => setStep(s => (s >= 5 ? 0 : s + 1)), 1100);
    return () => window.clearInterval(t);
  }, []);
  const done = Math.min(step, 3);

  return (
    <div className="relative mx-auto h-[340px] w-full max-w-[400px] [perspective:1100px]" aria-hidden="true">
      {/* a second sheet behind, for depth */}
      <div className="absolute left-[14%] top-[10%] h-[78%] w-[70%] rounded-2xl border border-border bg-card/60 [transform:rotateX(16deg)_rotateY(-20deg)_rotateZ(-7deg)]" />
      <div className="absolute left-[8%] top-[4%] w-[76%] rounded-2xl border border-border bg-card p-5 shadow-[0_45px_70px_-45px_hsl(var(--foreground)/.5)] [transform:rotateX(14deg)_rotateY(-16deg)_rotateZ(-3deg)] motion-safe:animate-[lm-float_8s_ease-in-out_infinite]">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-2.5 w-24 rounded bg-foreground/70" />
          <div className="font-mono text-[10px] text-muted-foreground">{done}/3</div>
        </div>
        <div className="space-y-4">
          {SECTIONS.map((label, i) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center gap-2 text-[11px]">
                <span className={`grid h-4 w-4 place-items-center rounded-full border text-[9px] transition-colors duration-300 ${i < done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{i < done ? "✓" : i + 1}</span>
                <span className={i < done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary/70 transition-[width] duration-700 ease-out" style={{ width: i < done ? "100%" : i === done && step < 4 ? "35%" : "0%" }} />
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-5 h-9 rounded-full text-center text-[12px] font-medium leading-9 transition-colors duration-300 ${done === 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Submit Application</div>
      </div>

      {/* the stamp */}
      <div className={`absolute bottom-[6%] right-[2%] rotate-[-9deg] rounded-xl border-[3px] border-primary px-4 py-2 text-center font-semibold uppercase tracking-[0.12em] text-primary transition-all duration-300 ${step >= 4 ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}>
        <div className="text-[13px] leading-tight">Application</div>
        <div className="text-[13px] leading-tight">Received</div>
      </div>

      {/* hand-drawn note in the page's own words, below the card */}
      <span className="absolute bottom-0 left-[4%] rotate-[-3deg] text-[12px] text-muted-foreground">less than 5 minutes</span>
      <svg viewBox="0 0 80 50" className="absolute bottom-[14px] left-[34%] h-[40px] w-[64px] text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 44 C 30 40, 48 26, 56 8" />
        <path d="M49 12 l7 -5 l3 8" />
      </svg>
    </div>
  );
}

export default ApplicationCard3D;
