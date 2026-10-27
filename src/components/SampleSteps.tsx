import { Check } from "lucide-react";

const STEPS = ["Upload", "Verify", "Reports and finance"];

/** The three steps of the sample bill run, so the path is clear without a pop-up. */
export function SampleSteps({ at }: { at: 0 | 1 | 2 }) {
  return (
    <ol className="flex w-full max-w-sm items-center gap-2 text-xs" aria-label="Sample bill steps">
      {STEPS.map((s, i) => (
        <li key={s} className={`flex min-w-0 items-center gap-1.5 ${i === at ? "font-semibold text-foreground" : i < at ? "text-foreground" : "text-muted-foreground"}`} aria-current={i === at ? "step" : undefined}>
          {i > 0 && <span className={`h-px w-4 shrink-0 ${i <= at ? "bg-primary" : "bg-border"}`} aria-hidden="true" />}
          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${i < at ? "bg-primary text-primary-foreground" : i === at ? "border-2 border-primary text-primary" : "border border-border"}`} aria-hidden="true">
            {i < at ? <Check className="h-2.5 w-2.5" /> : i + 1}
          </span>
          <span className="truncate">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export default SampleSteps;
