export interface StackLayer { key: string; label: string; done: boolean; optional?: boolean }

/**
 * The account being assembled, one plate per part of the form. A plate rises
 * and turns green the moment its field is complete, so the visitor sees each
 * answer land. Purely visual: the form logic does not depend on it.
 */
export function AccountStack({ layers }: { layers: StackLayer[] }) {
  const required = layers.filter(l => !l.optional);
  const complete = required.every(l => l.done);
  return (
    <div className="flex items-center gap-8" aria-hidden="true">
      <div className="relative mt-6 h-[170px] w-[170px] shrink-0 [perspective:900px]">
        <div className="absolute inset-0 [transform:rotateX(58deg)_rotateZ(-42deg)] [transform-style:preserve-3d]">
          {layers.map((l, i) => (
            <div key={l.key}
              className={`absolute inset-[18%] rounded-2xl border-2 transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${l.done ? "border-primary bg-primary/85 shadow-[0_18px_30px_-12px_hsl(var(--primary)/.6)]" : l.optional ? "border-dashed border-border bg-transparent" : "border-dashed border-muted-foreground/40 bg-background/60"}`}
              style={{ transform: `translateZ(${i * 18 + (l.done ? 6 : 0)}px)` }} />
          ))}
          <div className={`absolute inset-[18%] rounded-2xl border-2 border-primary bg-background transition-all duration-700 ${complete ? "opacity-100" : "opacity-0"}`}
            style={{ transform: `translateZ(${layers.length * 18 + (complete ? 10 : 0)}px)` }} />
        </div>
      </div>
      <ol className="space-y-2.5 text-sm">
        {layers.map(l => (
          <li key={l.key} className={`flex items-center gap-2.5 transition-colors duration-300 ${l.done ? "text-foreground" : "text-muted-foreground"}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] transition-all duration-300 ${l.done ? "scale-110 border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l.done ? "✓" : ""}</span>
            <span className="whitespace-nowrap">{l.label}{l.optional && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}</span>
          </li>
        ))}
        <li className={`flex items-center gap-2.5 font-medium transition-all duration-500 ${complete ? "translate-x-0 text-foreground opacity-100" : "-translate-x-1 opacity-0"}`}>
          <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] text-background">✓</span>Ready
        </li>
      </ol>
    </div>
  );
}

/** The same progress as a thin strip, for phones. */
export function StackStrip({ layers }: { layers: StackLayer[] }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {layers.filter(l => !l.optional).map(l => (
        <div key={l.key} className="flex-1">
          <div className={`h-1.5 rounded-full transition-colors duration-300 ${l.done ? "bg-primary" : "bg-border"}`} />
          <div className={`mt-1 text-[11px] ${l.done ? "text-foreground" : "text-muted-foreground"}`}>{l.label}</div>
        </div>
      ))}
    </div>
  );
}

export default AccountStack;
