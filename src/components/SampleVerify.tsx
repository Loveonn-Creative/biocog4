import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { SAMPLE_BILL, SAMPLE_COMPANY } from "@/lib/sampleBill";

const fmt = (n: number) => n.toLocaleString("en-IN");

/**
 * Verify step of the sample bill run. The checks tick in the browser (nothing
 * is sent anywhere), then a watermarked sample certificate shows. Ends on the
 * real upload.
 */
export function SampleVerify({ onOwnBill }: { onOwnBill: () => void }) {
  const checks = [
    "Figures match the bill",
    `Maths checked: ${fmt(SAMPLE_BILL.kwh)} kWh × ${SAMPLE_BILL.factor.toFixed(3)}`,
    "No duplicate of an earlier bill",
    "Emission factor and its source recorded",
  ];
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [done, setDone] = useState(reduce ? checks.length : 0);

  useEffect(() => {
    if (done >= checks.length) return;
    const id = window.setTimeout(() => setDone((d) => d + 1), 650);
    return () => window.clearTimeout(id);
  }, [done, checks.length]);

  const finished = done >= checks.length;
  return (
    <div className="w-full max-w-sm flex flex-col gap-5 text-left animate-fade-in">
      <span className="self-start rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning-foreground dark:text-warning">Sample</span>
      <ul className="flex flex-col gap-3" aria-live="polite">
        {checks.map((c, i) => (
          <li key={c} className={`flex items-start gap-2.5 text-sm transition-opacity duration-300 ${i < done ? "opacity-100" : "opacity-30"}`}>
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {i < done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <span className="text-foreground">{c}</span>
          </li>
        ))}
      </ul>

      {finished && (
        <>
          <div className="relative overflow-hidden rounded-lg border-[3px] border-primary p-5 text-center animate-fade-in">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-extrabold text-primary/10 -rotate-12">SAMPLE</span>
            <p className="text-xs font-semibold tracking-[0.08em] text-primary">VERIFIED EMISSIONS CERTIFICATE</p>
            <p className="mt-3 font-semibold text-foreground">{SAMPLE_COMPANY}</p>
            <p className="mt-1 text-2xl font-semibold text-primary tabular-nums">{(SAMPLE_BILL.kg / 1000).toFixed(2)} t CO₂e</p>
            <p className="mt-1 text-xs text-muted-foreground">{SAMPLE_BILL.periodLabel}</p>
            <p className="mt-3 text-[11px] text-muted-foreground">Sample on fictional data.</p>
          </div>
          <button type="button" onClick={onOwnBill} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Read my own bill
          </button>
        </>
      )}
    </div>
  );
}

export default SampleVerify;
