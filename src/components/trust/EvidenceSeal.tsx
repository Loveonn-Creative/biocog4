import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PROOF_GROUP_LABEL, proofItems, type ProofGroup, type ProofItem } from "@/data/trustProof";

const GROUPS: ProofGroup[] = ["method", "data", "direction"];

const ProofLink = ({ item, children, className }: { item: ProofItem; children: React.ReactNode; className?: string }) =>
  item.external
    ? <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
    : <Link to={item.href} className={className}>{children}</Link>;

/**
 * A notary-style seal that turns slowly with every standard and safeguard on
 * its rim. Choosing one stops the seal, stamps it in the centre and shows the
 * document to check. Nothing here is a logo or an endorsement: each mark is
 * typeset by us and links to the public source.
 */
export function EvidenceSeal({ compact = false, title }: { compact?: boolean; title?: string }) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const timer = useRef<number>();
  const item = proofItems[active];

  // Cycle until the visitor takes over; respects reduced motion.
  useEffect(() => {
    if (held || typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setActive(a => (a + 1) % proofItems.length), 3800);
    return () => window.clearInterval(timer.current);
  }, [held]);

  const choose = (i: number) => { setHeld(true); setActive(i); };
  const rim = proofItems.map(p => p.mark).join("  •  ") + "  •  ";

  return (
    <div className={`grid items-center gap-10 ${compact ? "" : "lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"}`}>
      {/* the seal */}
      <div className={`relative mx-auto aspect-square w-full ${compact ? "max-w-[220px]" : "max-w-[340px]"}`} aria-hidden="true">
        <svg viewBox="0 0 300 300" className={`absolute inset-0 h-full w-full text-foreground/70 ${held ? "" : "motion-safe:animate-[spin_60s_linear_infinite]"}`}>
          <defs><path id="seal-rim" d="M150,150 m-118,0 a118,118 0 1,1 236,0 a118,118 0 1,1 -236,0" /></defs>
          <circle cx="150" cy="150" r="140" fill="none" stroke="currentColor" strokeOpacity=".25" />
          <circle cx="150" cy="150" r="98" fill="none" stroke="currentColor" strokeOpacity=".25" strokeDasharray="1 5" strokeLinecap="round" />
          <text fontSize="13" letterSpacing="3" fill="currentColor" className="font-mono uppercase">
            <textPath href="#seal-rim" textLength="735" lengthAdjust="spacing">{rim}</textPath>
          </text>
        </svg>
        <div className="absolute inset-[22%] grid place-items-center rounded-full border-2 border-primary/60 bg-background text-center shadow-[0_20px_50px_-30px_hsl(var(--primary)/.6)]">
          <div key={item.key} className="px-3 motion-safe:animate-[lm-pop_350ms_ease-out]">
            <div className={`${compact ? "text-xl" : "text-3xl"} font-semibold tracking-tight text-primary`}>{item.mark}</div>
            <div className={`mt-1 ${compact ? "text-[10px]" : "text-[11px]"} uppercase tracking-[0.14em] text-muted-foreground`}>{PROOF_GROUP_LABEL[item.group]}</div>
          </div>
        </div>
      </div>

      {/* the list: every mark, and the document behind it */}
      <div onMouseEnter={() => setHeld(true)}>
        {title && <h3 className="mb-6 text-2xl font-semibold tracking-tight md:text-3xl [text-wrap:balance]">{title}</h3>}
        {GROUPS.map(g => (
          <div key={g} className="mb-5 last:mb-0">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{PROOF_GROUP_LABEL[g]}</div>
            <div className="flex flex-wrap gap-2">
              {proofItems.map((p, i) => p.group !== g ? null : (
                <button key={p.key} type="button" onClick={() => choose(i)} onFocus={() => choose(i)} aria-pressed={i === active}
                  className={`h-9 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50"}`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-6 min-h-[7.5rem] rounded-2xl border border-border bg-background p-5" aria-live="polite">
          <div className="font-medium text-foreground">{item.name}</div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{item.line}</p>
          <ProofLink item={item} className="group mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Check it <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </ProofLink>
        </div>
      </div>
    </div>
  );
}

export default EvidenceSeal;
