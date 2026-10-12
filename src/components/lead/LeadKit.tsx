import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import senseibleLogo from "@/assets/senseible-logo-384.png";

/** Logo only: a lead page has one job, so there is no menu to leak attention. */
export const LeadHeader = () => (
  <header className="absolute inset-x-0 top-0 z-30">
    <div className="mx-auto flex max-w-6xl items-center px-5 py-5">
      <Link to="/" aria-label="Senseible home">
        <img src={senseibleLogo} alt="Senseible" width={70} height={28} className="h-7 w-auto invert dark:invert-0" />
      </Link>
    </div>
  </header>
);

/**
 * Bottom bar on phones, shown once the visitor has scrolled past the hero and
 * hidden again when the target section is on screen.
 */
export function StickyCta({ label, onClick, hideWhenVisible }: { label: string; onClick: () => void; hideWhenVisible: string }) {
  const [past, setPast] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const el = document.getElementById(hideWhenVisible);
    let io: IntersectionObserver | undefined;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([e]) => setTargetVisible(e.isIntersecting), { threshold: 0.15 });
      io.observe(el);
    }
    return () => { window.removeEventListener("scroll", onScroll); io?.disconnect(); };
  }, [hideWhenVisible]);
  const show = past && !targetVisible;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur md:hidden transition-transform duration-300 motion-reduce:transition-none ${show ? "translate-y-0" : "translate-y-full"}`}
      aria-hidden={!show}
    >
      <button type="button" tabIndex={show ? 0 : -1} onClick={onClick} className="h-12 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground active:scale-[.99]">
        {label}
      </button>
    </div>
  );
}

export function CopyButton({ text, label = "Copy", onCopy }: { text: string; label?: string; onCopy?: () => void }) {
  const [done, setDone] = useState(false);
  const t = useRef<number>();
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); } catch { /* clipboard blocked: the text stays selectable */ }
        setDone(true); onCopy?.();
        window.clearTimeout(t.current); t.current = window.setTimeout(() => setDone(false), 1800);
      }}
      className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

/** Chip group used as a single-choice radio set. */
export function Choice<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-10 rounded-full border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === o.id ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground/40"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A hand-drawn underline that draws itself once, under the words that carry the pain. */
export const Scribble = ({ children }: { children: ReactNode }) => (
  <span className="relative whitespace-nowrap">
    {children}
    <svg aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-3 w-full text-primary">
      <path d="M3 9 C 60 3, 120 12, 180 6 S 270 4, 297 8" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"
        pathLength={1} strokeDasharray={1} className="animate-[lm-draw_900ms_400ms_cubic-bezier(.6,0,.2,1)_both] motion-reduce:animate-none" />
    </svg>
  </span>
);
