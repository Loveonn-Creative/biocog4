import { useEffect, useId, useState, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const inputCls = 'w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60';

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`grid min-w-0 gap-1 text-xs font-medium text-muted-foreground ${className}`}>
      <span>{label}{hint && <span className="ml-1 font-normal opacity-80">{hint}</span>}</span>
      <div className="[&>*]:w-full" id={id}>{children}</div>
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, disabled }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return <input className={inputCls} value={value ?? ''} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

/** Numeric input that keeps what the user types until it is a valid number. */
export function NumInput({ value, onChange, placeholder, disabled, step }: { value: number | null | undefined; onChange: (v: number | undefined) => void; placeholder?: string; disabled?: boolean; step?: string }) {
  const [raw, setRaw] = useState(value === null || value === undefined || Number.isNaN(value) ? '' : String(value));
  useEffect(() => {
    const cur = raw.trim() === '' ? undefined : Number(raw.replace(/,/g, ''));
    if (cur !== value && !(cur === undefined && (value === null || value === undefined))) setRaw(value === null || value === undefined || Number.isNaN(value) ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className={`${inputCls} font-mono tabular-nums`} inputMode="decimal" value={raw} placeholder={placeholder} disabled={disabled} step={step}
      onChange={(e) => {
        const t = e.target.value;
        setRaw(t);
        if (t.trim() === '') return onChange(undefined);
        const v = Number(t.replace(/,/g, ''));
        if (Number.isFinite(v)) onChange(v);
      }}
    />
  );
}

export function Select<T extends string>({ value, onChange, options, disabled, placeholder }: { value: T | '' | undefined; onChange: (v: T) => void; options: { value: T; label: string }[]; disabled?: boolean; placeholder?: string }) {
  return (
    <select className={inputCls} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Trail({ lines, children, title = 'How this is calculated' }: { lines: string[]; children: ReactNode; title?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="rounded-md text-left underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-primary/30">{children}</button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,30rem)] text-xs" align="start">
        <p className="mb-2 font-semibold text-foreground">{title}</p>
        <ul className="grid gap-1.5 font-mono leading-relaxed text-muted-foreground">
          {lines.length ? lines.map((l, k) => <li key={k} className="break-words">{l}</li>) : <li>Nothing entered yet.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export const t = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toLocaleString('en-GB', { maximumFractionDigits: d }));

export function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'muted' | 'brand'; children: ReactNode }) {
  const c = {
    ok: 'border-success/40 bg-success/10 text-success',
    warn: 'border-warning/40 bg-warning/10 text-warning',
    bad: 'border-destructive/40 bg-destructive/10 text-destructive',
    muted: 'border-border bg-muted text-muted-foreground',
    brand: 'border-primary/40 bg-primary/10 text-primary',
  }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>;
}

export function AddButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50">{children}</button>;
}

export function RemoveButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className="rounded-full px-2 py-1 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-40">Remove</button>;
}
