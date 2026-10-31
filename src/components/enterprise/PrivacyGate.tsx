import { useEffect, useState, type CSSProperties } from "react";
import { BillArt, TotalArt, prefersReducedMotion, useSeen } from "@/components/privacy/parts";

/**
 * Privacy by design, told as a gate between a supplier and the buyer: bills
 * run at it and bounce back; once the supplier presses Share, only the total
 * passes. Plays once when seen. Reduced motion shows the final state.
 *
 * Source: src/pages/SupplierShare.tsx (the supplier shares emissions totals,
 * energy units, bill count and fingerprints, never the bills, and can stop
 * sharing at any time).
 */
type Phase = 0 | 1 | 2 | 3 | 4; // idle, bills hit, bills back, Share on, total across

const EASE = "cubic-bezier(.2,.8,.2,1)";
const lane: CSSProperties = { containerType: "inline-size" };

export const PrivacyGate = () => {
  const { ref, seen } = useSeen<HTMLDivElement>(0.45);
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 4 : 0));

  useEffect(() => {
    if (!seen) return;
    if (prefersReducedMotion()) { setPhase(4); return; }
    setPhase(1);
    const ts = [setTimeout(() => setPhase(2), 520), setTimeout(() => setPhase(3), 1250), setTimeout(() => setPhase(4), 1550)];
    return () => ts.forEach(clearTimeout);
  }, [seen]);

  const billStyle = (i: number): CSSProperties => ({
    transform: phase === 1 ? "translateX(calc(50cqw - 100% - 3px))" : "translateX(0)",
    transition: `transform ${phase === 1 ? 480 : 420}ms ${phase === 1 ? "cubic-bezier(.5,0,.9,.5)" : EASE} ${phase === 1 ? i * 90 : 0}ms`,
  });
  const shared = phase >= 3;
  const across = phase === 4;

  return (
    <div ref={ref} className="rounded-3xl border border-border p-5 sm:p-8">
      <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">Privacy by design</h3>
      <p className="sr-only">Bills never reach the buyer. Totals pass only after the supplier presses Share, and the supplier can stop sharing at any time.</p>

      <div aria-hidden="true" className="mt-6">
        <div className="flex justify-between text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <span>Supplier</span>
          <span>Your team</span>
        </div>

        <div className="relative mt-3 space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="relative h-12" style={lane}>
              <span className={`absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full transition-colors duration-200 ${phase === 1 ? "bg-destructive" : "bg-foreground/70"}`} />
              <div className="absolute left-0 top-1/2 -translate-y-1/2" style={billStyle(i)}>
                <BillArt className="h-11 w-auto" />
              </div>
            </div>
          ))}
          <div className="relative h-12" style={lane}>
            <span className={`absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full transition-opacity duration-300 bg-primary ${shared ? "opacity-20" : "opacity-100"}`} />
            <div className="absolute left-0 top-1/2 -translate-y-1/2"
              style={{ transform: across ? "translateX(calc(100cqw - 100%))" : "translateX(0)", transition: `transform 700ms ${EASE}` }}>
              <TotalArt className="h-8 w-auto" />
            </div>
          </div>
        </div>

        {/* The supplier's Share switch, sitting at the gate */}
        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm">
            <span className={`h-5 w-9 rounded-full p-0.5 transition-colors duration-200 ${shared ? "bg-primary" : "bg-border"}`}>
              <span className={`block h-4 w-4 rounded-full bg-background shadow-sm transition-transform duration-200 ${shared ? "translate-x-4" : ""}`} />
            </span>
            Share
          </span>
        </div>
      </div>

      <ul className="mt-8 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-3">
        <li className="font-medium">Bills never reach you</li>
        <li className="text-muted-foreground">Totals, only after Share</li>
        <li className="text-muted-foreground">Supplier can stop any time</li>
      </ul>
    </div>
  );
};
