import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface Step {
  key: string;
  /** The single question for this step. */
  label: string;
  content: ReactNode;
  /** False disables Next until the step is answered. */
  ready?: boolean;
}

/**
 * One question at a time, with progress. The last button carries the
 * result-stating CTA (e.g. "See my footprint"), never "Submit".
 */
export const Steps = ({ steps, cta, onFinish, onFirstTouch }: { steps: Step[]; cta: string; onFinish: () => void; onFirstTouch?: () => void }) => {
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  const ready = step.ready !== false;

  return (
    <div onFocusCapture={onFirstTouch} onPointerDownCapture={onFirstTouch}>
      <div className="flex items-center gap-1.5 mb-4" aria-hidden="true">
        {steps.map((s, k) => (
          <span key={s.key} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${k <= i ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-1">Step {i + 1} of {steps.length}</p>
      <fieldset key={step.key} className="animate-in fade-in slide-in-from-right-2 duration-300">
        <legend className="text-[15px] font-medium text-foreground mb-3">{step.label}</legend>
        {step.content}
      </fieldset>
      <div className="mt-5 flex items-center gap-2">
        {i > 0 && (
          <button type="button" onClick={() => setI(i - 1)} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </button>
        )}
        <button
          type="button"
          disabled={!ready}
          onClick={() => (last ? onFinish() : setI(i + 1))}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {last ? cta : "Next"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

/** Numeric input with a unit, sized for thumbs, decimal keypad on phones. */
export const NumberField = ({
  label, unit, value, onChange, min = 0, max, step = 1, hint,
}: { label: string; unit: string; value: number | ""; onChange: (v: number | "") => void; min?: number; max?: number; step?: number; hint?: string }) => (
  <label className="block">
    <span className="block text-sm text-muted-foreground mb-1.5">{label}</span>
    <span className="flex items-stretch overflow-hidden rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary">
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value === "" ? "" : Math.max(min, Number(e.target.value)))}
        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-mono tabular-nums focus:outline-none"
      />
      <span className="flex items-center border-l border-border bg-secondary/60 px-3 text-sm text-muted-foreground">{unit}</span>
    </span>
    {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
  </label>
);

/** Large tappable choices for yes/no and short option lists. */
export function Choice<T extends string>({
  options, value, onChange, multi = false,
}: { options: { value: T; label: string; hint?: string }[]; value: T[] ; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(o => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(multi ? (on ? value.filter(v => v !== o.value) : [...value, o.value]) : [o.value])}
            className={`rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${on ? "border-primary bg-primary/[0.06] text-foreground" : "border-border hover:border-primary/40 text-foreground/85"}`}
          >
            <span className="font-medium">{o.label}</span>
            {o.hint && <span className="block text-xs text-muted-foreground mt-0.5">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
