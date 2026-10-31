import { SectionHead } from "@/components/platform/Reveal";
import { BillArt, TotalArt, span, useScrollProgress } from "@/components/privacy/parts";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Privacy by design, told by scroll: the bill slides into a locked vault in
 * the owner's account and stays there; only a computed total comes out.
 * Reduced motion shows the final state: bill inside, vault locked, total out.
 */
export const PrivacyVault = () => {
  const { ref, p } = useScrollProgress<HTMLDivElement>();
  const into = span(p, 0.05, 0.45); // bill travels into the vault
  const lock = span(p, 0.45, 0.6); // door closes, lock drops
  const out = span(p, 0.62, 1); // only the total comes out

  const bill = { x: lerp(34, 286, into), y: lerp(64, 76, into), w: lerp(84, 68, into) };
  const chipX = lerp(272, 520, out);

  return (
    <div>
      <SectionHead className="mb-10" eyebrow="What stays, what moves" title="Privacy by design" />
      <div ref={ref}>
        <svg viewBox="0 0 640 230" className="w-full h-auto" role="img" aria-label="Your bill goes into a locked vault in your account and stays there. Only its total comes out.">
          {/* Vault */}
          <rect x="236" y="36" width="168" height="168" rx="20" className="fill-secondary stroke-foreground/30" strokeWidth="2" />
          {/* Bill (drawn before the door so it sits inside) */}
          <BillArt x={bill.x} y={bill.y} width={bill.w} height={bill.w * 1.3} />
          {/* Door: closes from the top, translucent so the bill stays visible inside */}
          <g style={{ transform: `scaleY(${lock})`, transformOrigin: "320px 36px", transformBox: "view-box" }}>
            <rect x="236" y="36" width="168" height="168" rx="20" className="fill-primary/10 stroke-primary" strokeWidth="2" />
            {[76, 116, 156].map(y => <line key={y} x1="252" x2="388" y1={y} y2={y} className="stroke-primary/25" strokeWidth="1.5" />)}
          </g>
          {/* Lock on the vault: the shackle drops shut as the door closes */}
          <g style={{ transform: `translateY(${lerp(-10, 0, lock)}px)` }}>
            <path d="M308 30 V20 a12 12 0 0 1 24 0 V30" fill="none" className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
          </g>
          <rect x="300" y="26" width="40" height="26" rx="6" className="fill-primary" />
          <circle cx="320" cy="37" r="3.5" className="fill-primary-foreground" />
          {/* The way out: drawn as the total leaves */}
          <path d="M404 120 H516" fill="none" className="stroke-primary/60" strokeWidth="2" pathLength={1}
            style={{ strokeDasharray: "1", strokeDashoffset: 1 - out }} />
          {/* The total */}
          <g style={{ opacity: span(p, 0.62, 0.72) }}>
            <TotalArt x={chipX} y={104} width={100} height={33} />
          </g>
        </svg>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[13px] sm:text-sm leading-snug">
          <p className="text-muted-foreground">Your bill</p>
          <p className="font-medium text-foreground">Stays in your account</p>
          <p className="text-muted-foreground">Totals leave only when you share</p>
        </div>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-border pt-6 font-mono text-[12px] text-muted-foreground">
          <li>Private storage, no public links</li>
          <li>SHA-256 fingerprint on every bill</li>
          <li>Encrypted in transit and at rest</li>
        </ul>
      </div>
    </div>
  );
};
