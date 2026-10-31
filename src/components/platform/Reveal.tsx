import { useEffect, useRef, useState, type ReactNode } from "react";

/** Shared once-only in-view flag. Starts visible when IntersectionObserver is missing. */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/** Content settles into place once, as it enters the viewport. Content is always in the DOM. */
export const Reveal = ({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) => {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/**
 * Section heading with a sequence number and a hand-drawn underline that is
 * drawn once when the heading arrives. The number tells the reader where
 * they are in the page; the line marks the one phrase to remember.
 */
export const SectionHead = ({
  n, eyebrow, title, className = "", center = false,
}: { n?: string; eyebrow?: ReactNode; title: ReactNode; className?: string; center?: boolean }) => {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  return (
    <div ref={ref} className={`${center ? "text-center" : ""} ${className}`}>
      {(n || eyebrow) && (
        <div className={`flex items-center gap-3 mb-4 text-xs uppercase tracking-[0.14em] text-primary ${center ? "justify-center" : ""}`}>
          {n && <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{n}</span>}
          {n && <span aria-hidden="true" className="h-px w-6 bg-primary/40" />}
          {eyebrow && <span>{eyebrow}</span>}
        </div>
      )}
      <h2 className="relative inline-block text-[1.75rem] leading-[1.15] md:text-[2.5rem] font-semibold tracking-tight text-foreground [text-wrap:balance]">
        {title}
        <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-2.5 w-24 md:w-32 text-primary/50">
          <path
            d="M2 8 C 60 2, 120 11, 180 6 S 270 3, 298 7"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: inView ? 0 : 1, transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1) 200ms" }}
          />
        </svg>
      </h2>
    </div>
  );
};
