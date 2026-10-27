import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { SAMPLE_BILL, SAMPLE_COMPANY } from "@/lib/sampleBill";
import { SampleSteps } from "@/components/SampleSteps";

const fmt = (n: number) => n.toLocaleString("en-IN");

/**
 * Verify step of the sample bill run. The checks tick in the browser (nothing
 * is sent anywhere), then a watermarked sample certificate shows. The last
 * step shows what a verified record opens (reports and climate finance), in
 * the same words as the home page. Ends on the real upload.
 */
const REPORTS = ["BRSR", "GHG Protocol", "CBAM", "Lender pack"];
const FINANCE = [
  { title: "Green loans", line: "Lenders can underwrite against figures tied to your own bills, not a self-declared number." },
  { title: "Buyer and export requests", line: "Answer buyer questionnaires and EU CBAM data requests from one verified record." },
  { title: "Carbon credits", line: "Verified reductions that clear additionality can become credit-ready signals for buyers." },
];

export function SampleVerify({ onOwnBill }: { onOwnBill: () => void }) {
  const checks = [
    "Figures match the bill",
    `Maths checked: ${fmt(SAMPLE_BILL.kwh)} kWh × ${SAMPLE_BILL.factor.toFixed(3)} kg/kWh = ${(SAMPLE_BILL.kg / 1000).toFixed(2)} t`,
    "No duplicate of an earlier bill",
    "Emission factor from CEA, source attached",
  ];
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [done, setDone] = useState(reduce ? checks.length : 0);
  const [use, setUse] = useState(false);

  useEffect(() => {
    if (done >= checks.length) return;
    const id = window.setTimeout(() => setDone((d) => d + 1), 650);
    return () => window.clearTimeout(id);
  }, [done, checks.length]);

  const finished = done >= checks.length;
  const ownBill = (
    <button type="button" onClick={onOwnBill} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
      Read my own bill
    </button>
  );

  if (use) {
    return (
      <div className="w-full max-w-sm flex flex-col gap-5 text-left animate-fade-in">
        <SampleSteps at={2} />
        <span className="self-start rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning-foreground dark:text-warning">Sample</span>
        <div>
          <p className="text-sm font-semibold text-foreground">Reports</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {REPORTS.map((r) => <li key={r} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">{r}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Climate finance</p>
          <ul className="mt-1 divide-y divide-border border-y border-border">
            {FINANCE.map((r) => (
              <li key={r.title} className="py-2.5">
                <span className="block text-sm font-medium text-foreground">{r.title}</span>
                <span className="block text-xs text-muted-foreground">{r.line}</span>
              </li>
            ))}
          </ul>
        </div>
        {ownBill}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-5 text-left animate-fade-in">
      <SampleSteps at={1} />
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
            <p className="mt-3 text-[11px] text-muted-foreground">Fictional company. Not an accredited third-party verification or a statutory filing.</p>
          </div>
          <button type="button" onClick={() => setUse(true)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Next: reports and finance<ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

export default SampleVerify;
