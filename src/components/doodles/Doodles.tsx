import type { ReactNode } from "react";
import { useInView } from "@/components/platform/Reveal";

/**
 * Hand-drawn line art that draws itself once when it scrolls into view.
 * Every drawing shows the thing the copy next to it describes; none is a
 * stock icon. Strokes use currentColor so colour follows the theme.
 */
export function Doodle({ children, viewBox, className = "", label }: { children: ReactNode; viewBox: string; className?: string; label?: string }) {
  const { ref, inView } = useInView<SVGSVGElement>(0.3);
  return (
    <svg ref={ref} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className={`doodle ${inView ? "is-in" : ""} ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </svg>
  );
}

/* --- Platform: the three questions --- */

/** A document whose evidence follows it into reporting, supplier decisions and finance. */
export const DocToUses = () => (
  <Doodle viewBox="0 0 280 170" className="h-full w-full">
    <path pathLength={1} d="M30 40 h44 l14 14 v72 h-58z" />
    <path pathLength={1} d="M74 40 v14 h14" />
    <path pathLength={1} d="M40 72 h36 M40 84 h30 M40 96 h36" className="text-primary" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M98 82 C 140 40, 170 34, 196 36" />
    <path pathLength={1} d="M98 88 C 140 88, 170 86, 196 86" />
    <path pathLength={1} d="M98 94 C 140 132, 170 138, 196 136" />
    <g fontSize="12" stroke="none" fill="currentColor"><text x="204" y="40">reporting</text><text x="204" y="90">suppliers</text><text x="204" y="140">finance</text></g>
  </Doodle>
);

/** The chain of evidence: hash, methodology, confidence band. */
export const EvidenceChain = () => (
  <Doodle viewBox="0 0 280 170" className="h-full w-full">
    <ellipse pathLength={1} cx="62" cy="80" rx="40" ry="22" />
    <ellipse pathLength={1} cx="140" cy="80" rx="40" ry="22" stroke="hsl(var(--primary))" />
    <ellipse pathLength={1} cx="218" cy="80" rx="40" ry="22" />
    <g fontSize="11" stroke="none" fill="currentColor" textAnchor="middle"><text x="62" y="84">hash</text><text x="140" y="84">method</text><text x="218" y="84">± band</text></g>
    <path pathLength={1} d="M40 130 q100 22 200 0" className="dot" />
    <text x="140" y="155" fontSize="11" stroke="none" fill="currentColor" textAnchor="middle" opacity=".7">anyone can check</text>
  </Doodle>
);

/** Default values versus primary numbers. */
export const DefaultVsPrimary = () => (
  <Doodle viewBox="0 0 280 170" className="h-full w-full">
    <path pathLength={1} d="M30 140 h220" />
    <path pathLength={1} d="M70 140 v-100 h50 v100" className="dot" opacity=".7" />
    <path pathLength={1} d="M160 140 v-58 h50 v58" stroke="hsl(var(--primary))" />
    <g fontSize="11" stroke="none" fill="currentColor" textAnchor="middle"><text x="95" y="160">default values</text><text x="185" y="160">primary numbers</text></g>
    <path pathLength={1} d="M126 50 C 150 40, 170 52, 180 74" />
    <path pathLength={1} d="M172 68 l8 7 l3 -10" />
  </Doodle>
);

/* --- Platform: the four outcomes --- */

export const ReportSheets = () => (
  <Doodle viewBox="0 0 120 80" className="h-16 w-24">
    <path pathLength={1} d="M18 22 h56 v46 h-56z" opacity=".5" />
    <path pathLength={1} d="M28 14 h56 v46 h-56z" opacity=".75" />
    <path pathLength={1} d="M38 6 h56 v46 h-56z" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M46 20 h40 M46 30 h32 M46 40 h36" />
  </Doodle>
);
export const FinanceDial = () => (
  <Doodle viewBox="0 0 120 80" className="h-16 w-24">
    <path pathLength={1} d="M20 66 A40 40 0 0 1 100 66" />
    <path pathLength={1} d="M20 66 A40 40 0 0 1 86 38" stroke="hsl(var(--primary))" strokeWidth={3} />
    <path pathLength={1} d="M60 66 L84 42" />
    <text x="60" y="78" fontSize="10" stroke="none" fill="currentColor" textAnchor="middle">A+ to D</text>
  </Doodle>
);
export const DecarbPath = () => (
  <Doodle viewBox="0 0 120 80" className="h-16 w-24">
    <path pathLength={1} d="M12 18 h96" className="dot" opacity=".5" />
    <path pathLength={1} d="M12 18 C 40 22, 52 40, 70 48 S 100 62, 108 66" stroke="hsl(var(--primary))" />
    <circle pathLength={1} cx="12" cy="18" r="3.5" />
    <text x="14" y="10" fontSize="9" stroke="none" fill="currentColor">baseline</text>
  </Doodle>
);
export const CreditToken = () => (
  <Doodle viewBox="0 0 120 80" className="h-16 w-24">
    <circle pathLength={1} cx="60" cy="40" r="28" />
    <circle pathLength={1} cx="60" cy="40" r="20" className="dot" opacity=".6" />
    <path pathLength={1} d="M48 41 l8 8 l16 -18" stroke="hsl(var(--primary))" strokeWidth={2.4} />
  </Doodle>
);

/* --- Grants: what you get, and who it is for --- */

export const KeyAccess = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <rect pathLength={1} x="10" y="10" width="54" height="36" rx="4" />
    <path pathLength={1} d="M4 52 h66" />
    <circle pathLength={1} cx="74" cy="30" r="9" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M80 36 l10 10 M86 42 l-4 4" stroke="hsl(var(--primary))" />
  </Doodle>
);
export const CoinStack = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <ellipse pathLength={1} cx="40" cy="50" rx="22" ry="6" />
    <path pathLength={1} d="M18 50 v-8 M62 50 v-8" />
    <ellipse pathLength={1} cx="40" cy="40" rx="22" ry="6" />
    <path pathLength={1} d="M18 40 v-8 M62 40 v-8" />
    <ellipse pathLength={1} cx="40" cy="30" rx="22" ry="6" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M72 30 l8 -12 l8 12" stroke="hsl(var(--primary))" />
  </Doodle>
);
export const GlobeLines = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <circle pathLength={1} cx="48" cy="32" r="26" />
    <ellipse pathLength={1} cx="48" cy="32" rx="11" ry="26" />
    <path pathLength={1} d="M22 32 h52 M26 20 h44 M26 44 h44" opacity=".7" />
    <circle pathLength={1} cx="60" cy="24" r="3" stroke="hsl(var(--primary))" />
  </Doodle>
);
export const TwoVoices = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <path pathLength={1} d="M8 12 h40 v22 h-26 l-8 8 v-8 h-6z" />
    <path pathLength={1} d="M88 26 h-40 v22 h26 l8 8 v-8 h6z" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M16 20 h24 M16 26 h16 M56 34 h24 M56 40 h16" opacity=".7" />
  </Doodle>
);
export const SparkLeaf = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <path pathLength={1} d="M22 52 C 22 22, 50 10, 78 12 C 76 40, 56 54, 22 52z" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M22 52 L58 24" />
    <path pathLength={1} d="M40 38 h10 M46 32 v10" opacity=".7" />
  </Doodle>
);
export const FactoryRoof = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <path pathLength={1} d="M8 56 V32 l16 -10 v10 l16 -10 v10 l16 -10 v34z" />
    <path pathLength={1} d="M64 56 V14 h10 v42" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M4 56 h88" />
    <path pathLength={1} d="M16 44 h6 M30 44 h6 M44 44 h6" opacity=".7" />
  </Doodle>
);
export const RisingSun = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <path pathLength={1} d="M6 50 h84" />
    <path pathLength={1} d="M26 50 a22 22 0 0 1 44 0" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M48 18 v-8 M24 28 l-6 -5 M72 28 l6 -5 M14 42 h-6 M82 42 h6" opacity=".7" />
  </Doodle>
);
