import { useState, type ReactNode } from "react";
import { DefaultVsPrimary, DocToUses, EvidenceChain } from "@/components/doodles/Doodles";

export interface WhyItem { key: string; eyebrow: ReactNode; title: ReactNode; body: ReactNode }

const VISUAL: Record<string, () => JSX.Element> = { positioning: DocToUses, what: EvidenceChain, problem: DefaultVsPrimary };

/**
 * Three questions a first-time visitor brings. The questions stay visible for
 * scanning; one answer is open at a time, with a drawing of what it says.
 * Every answer stays in the page for search engines and screen readers.
 */
export function WhySwitcher({ items }: { items: WhyItem[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-14">
      <div role="tablist" aria-label="Questions" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {items.map((it, i) => (
          <button key={it.key} id={`why-tab-${it.key}`} role="tab" type="button" aria-selected={open === i} aria-controls={`why-panel-${it.key}`} onClick={() => setOpen(i)}
            className={`group relative shrink-0 rounded-full border px-4 py-2.5 text-left text-sm transition-all lg:rounded-xl lg:border-0 lg:px-4 lg:py-3.5 ${open === i ? "border-primary bg-primary text-primary-foreground lg:bg-primary/10 lg:text-foreground" : "border-border text-muted-foreground hover:text-foreground lg:hover:bg-secondary/60"}`}>
            <span className={`absolute left-0 top-3 bottom-3 hidden w-0.5 rounded-full lg:block ${open === i ? "bg-primary" : "bg-transparent"}`} aria-hidden="true" />
            <span className="whitespace-nowrap font-medium lg:whitespace-normal">{it.eyebrow}</span>
          </button>
        ))}
      </div>
      <div>
        {items.map((it, i) => {
          const Visual = VISUAL[it.key];
          return (
            <div key={it.key} id={`why-panel-${it.key}`} role="tabpanel" aria-labelledby={`why-tab-${it.key}`} hidden={open !== i}
              className={`${open === i ? "grid" : "hidden"} gap-8 md:grid-cols-[1.3fr_1fr] md:items-center motion-safe:animate-[lm-pop_350ms_ease-out]`}>
              <div>
                <h2 className="text-[1.65rem] leading-[1.15] md:text-[2.2rem] font-semibold tracking-tight text-foreground [text-wrap:balance]">{it.title}</h2>
                <div className="mt-4 text-[17px] text-muted-foreground leading-relaxed">{it.body}</div>
              </div>
              {Visual && <div className="mx-auto aspect-[28/17] w-full max-w-[320px] text-foreground/70"><Visual /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WhySwitcher;
