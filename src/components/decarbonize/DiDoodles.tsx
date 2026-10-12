import { Doodle } from "@/components/doodles/Doodles";

/** A brush stroke in the three colours of the flag, drawn under "India". */
export const TricolorStroke = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 320 34" preserveAspectRatio="none" className={className} aria-hidden="true">
    <path d="M6 10 C 80 2, 180 4, 312 8" stroke="#f4a21a" strokeWidth="7" strokeLinecap="round" fill="none" className="di-stroke" />
    {/* white needs an edge to show on paper: a soft shadow stroke underneath */}
    <path d="M10 20 C 90 13, 190 15, 306 18" stroke="#d8cfb8" strokeWidth="8" strokeLinecap="round" fill="none" className="di-stroke [animation-delay:.18s] dark:stroke-transparent" />
    <path d="M10 19 C 90 12, 190 14, 306 17" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" className="di-stroke [animation-delay:.18s]" />
    <path d="M14 28 C 96 21, 196 23, 300 26" stroke="#3fae6b" strokeWidth="7" strokeLinecap="round" fill="none" className="di-stroke [animation-delay:.36s]" />
  </svg>
);

/** A single drop next to an ocean: the habits versus the industry. */
export const DropVsOcean = () => (
  <Doodle viewBox="0 0 220 90" className="h-20 w-full" label="One drop beside an ocean">
    <path pathLength={1} d="M30 30 C 30 30, 18 46, 18 54 a12 12 0 0 0 24 0 C 42 46, 30 30, 30 30z" />
    <path pathLength={1} d="M70 62 C 90 52, 110 72, 130 62 S 170 52, 190 62 S 210 70, 216 64" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M64 76 C 86 66, 108 86, 130 76 S 172 66, 194 76" stroke="hsl(var(--primary))" opacity=".7" />
  </Doodle>
);

/** Smokestacks; one of them sprouting a leaf. */
export const StacksToLeaf = () => (
  <Doodle viewBox="0 0 220 90" className="h-20 w-full" label="Factory stacks, one turning green">
    <path pathLength={1} d="M10 84 V52 l22 -12 v12 l22 -12 v12 l22 -12 v44z" />
    <path pathLength={1} d="M92 84 V22 h12 v62" />
    <path pathLength={1} d="M124 84 V30 h12 v54" />
    <path pathLength={1} d="M6 84 h200" />
    <path pathLength={1} d="M96 18 C 92 8, 104 4, 100 -4" className="dot" />
    <path pathLength={1} d="M150 70 C 150 40, 176 28, 204 30 C 202 58, 182 72, 150 70z" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M150 70 L186 42" stroke="hsl(var(--primary))" />
  </Doodle>
);

/** A seal with a ribbon: the certificate. */
export const Seal = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <circle pathLength={1} cx="44" cy="28" r="18" />
    <circle pathLength={1} cx="44" cy="28" r="12" className="dot" />
    <path pathLength={1} d="M36 44 l-6 16 l8 -4 l4 7 l2 -17" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M52 44 l6 16 l-8 -4 l-4 7" stroke="hsl(var(--primary))" />
  </Doodle>
);

/** A sapling growing out of coins: money that becomes a community project. */
export const CoinSapling = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <ellipse pathLength={1} cx="40" cy="54" rx="24" ry="6" />
    <path pathLength={1} d="M16 54 v-8 M64 54 v-8" />
    <ellipse pathLength={1} cx="40" cy="46" rx="24" ry="6" />
    <path pathLength={1} d="M40 40 V18" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M40 26 C 30 26, 26 18, 26 12 C 34 12, 40 18, 40 26z" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M40 22 C 50 22, 56 14, 56 8 C 46 8, 40 14, 40 22z" stroke="hsl(var(--primary))" />
  </Doodle>
);

/** A paper plane looping over a globe. */
export const PlaneGlobe = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <circle pathLength={1} cx="40" cy="38" r="22" />
    <ellipse pathLength={1} cx="40" cy="38" rx="9" ry="22" opacity=".7" />
    <path pathLength={1} d="M18 38 h44" opacity=".7" />
    <path pathLength={1} d="M10 18 C 30 0, 70 2, 86 16" className="dot" />
    <path pathLength={1} d="M78 8 l12 6 l-10 6 l-2 -5z" stroke="hsl(var(--primary))" />
  </Doodle>
);

/** Stacked work: posts, a mic, a sheet. */
export const WorkStack = () => (
  <Doodle viewBox="0 0 96 64" className="h-14 w-20">
    <rect pathLength={1} x="10" y="22" width="34" height="34" rx="4" />
    <rect pathLength={1} x="22" y="12" width="34" height="34" rx="4" opacity=".8" />
    <path pathLength={1} d="M30 22 h18 M30 30 h14 M30 38 h18" />
    <rect pathLength={1} x="66" y="14" width="12" height="22" rx="6" stroke="hsl(var(--primary))" />
    <path pathLength={1} d="M62 30 a10 10 0 0 0 20 0 M72 40 v10 M64 50 h16" stroke="hsl(var(--primary))" />
  </Doodle>
);
