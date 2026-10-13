import { useEffect, useState } from "react";
import { formatParam, type Param } from "@/lib/netZeroEngine";

/**
 * A number input for one labelled assumption. Numbers inside the range apply
 * as you type; anything else is clamped or restored when the field loses focus.
 */
export const AssumptionField = ({ id, param, onChange }: {
  id: string;
  param: Param;
  onChange: (key: string, value: number | null) => void;
}) => {
  const [draft, setDraft] = useState(String(param.value));
  useEffect(() => { setDraft(String(param.value)); }, [param.value]);
  if (!param.key) return null;
  const key = param.key;
  const min = param.min ?? 0;
  const max = param.max ?? 100;
  const edited = param.default !== undefined && param.value !== param.default;
  const unit = param.unit === '%' ? '%' : param.unit;

  const apply = (n: number) => onChange(key, n === param.default ? null : n);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <label htmlFor={id} className="min-w-0 flex-1 basis-40">{param.label}</label>
      <span className="inline-flex items-center gap-1">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={param.step ?? 1}
          value={draft}
          onChange={e => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) apply(n);
          }}
          onBlur={() => {
            const n = Number(draft);
            if (draft.trim() === '' || !Number.isFinite(n)) { setDraft(String(param.value)); return; }
            const clamped = Math.min(max, Math.max(min, n));
            setDraft(String(clamped));
            if (clamped !== param.value) apply(clamped);
          }}
          className={`w-20 rounded-md border bg-background px-2 py-1 text-right font-medium tabular-nums ${edited ? 'border-warning' : 'border-border'}`}
        />
        {unit && <span className="text-muted-foreground">{unit}</span>}
      </span>
      {edited && (
        <button type="button" onClick={() => onChange(key, null)} className="w-full text-left text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Reset to default ({formatParam({ ...param, value: param.default! })})
        </button>
      )}
    </div>
  );
};
