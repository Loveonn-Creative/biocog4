import { useEffect, useRef, useState } from "react";
import { useInView } from "@/components/platform/Reveal";

// Hand-drawn marks and motion for /contact. Each mark stands for one way to
// reach the team; the paper plane flies once when a message is sent. Without
// motion, the final frame is shown.

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const ChannelMark = ({ kind, className = "" }: { kind: "chat" | "mail" | "pin"; className?: string }) => (
  <svg viewBox="0 0 32 32" className={`h-7 w-7 shrink-0 ${className}`} aria-hidden="true">
    {kind === "chat" && <path {...STROKE} d="M6 8 q0 -3 3 -3 h14 q3 0 3 3 v9 q0 3 -3 3 h-9 l-6 5 v-5 q-2 0 -2 -3 Z M11 11 h10 M11 15 h6" />}
    {kind === "mail" && <path {...STROKE} d="M4 9 q0 -2 2 -2 h20 q2 0 2 2 v14 q0 2 -2 2 h-20 q-2 0 -2 -2 Z M5 9 l11 8 l11 -8" />}
    {kind === "pin" && <path {...STROKE} d="M16 28 q-9 -9 -9 -15 a9 9 0 0 1 18 0 q0 6 -9 15 Z M16 9.5 a3.5 3.5 0 1 1 0 7 a3.5 3.5 0 1 1 0 -7" />}
  </svg>
);

const TRAIL = "M10 70 C 50 80, 60 20, 100 30 S 150 80, 120 60 S 150 20, 182 24";

/** A paper plane that loops once along a drawn trail and lands. */
export function PlaneFlight() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const motion = useRef<SVGAnimateMotionElement>(null);
  const [flying, setFlying] = useState(false);
  // animateMotion adds to the element's own transform, so the plane has none and stays hidden until it starts.
  useEffect(() => { if (inView && !still && motion.current) { motion.current.beginElement(); setFlying(true); } }, [inView, still]);
  const plane = <path d="M-12 -8 L12 0 L-12 8 L-6 0 Z M-6 0 L12 0" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />;
  return (
    <div ref={ref} className="mx-auto mb-6 w-48" aria-hidden="true">
      <svg viewBox="0 0 200 90" className="h-auto w-full text-primary">
        <path pathLength={1} d={TRAIL} fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.6" strokeDasharray="1" className={`tr-path ${inView || still ? "tr-draw-on" : ""}`} />
        {still
          ? <g transform="translate(182 24) rotate(-8)">{plane}</g>
          : <g opacity={flying ? 1 : 0}>{plane}<animateMotion ref={motion} begin="indefinite" dur="1.4s" fill="freeze" rotate="auto" path={TRAIL} /></g>}
      </svg>
    </div>
  );
}
