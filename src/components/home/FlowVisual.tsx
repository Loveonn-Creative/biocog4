import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import type { FlowStats } from "./flowModel";

/** True when the visitor asked for less motion or less data. */
function prefersStatic(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return !!conn?.saveData;
  } catch {
    return false;
  }
}

/** Static diagram: shown first, kept for reduced motion and Save-Data. */
const StaticShapes = () => (
  <>
    <rect x="18" y="86" width="30" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
    {[96, 104, 112].map(y => <line key={y} x1="24" y1={y} x2="42" y2={y} stroke="currentColor" strokeWidth="1.2" />)}
    <line x1="215" y1="30" x2="215" y2="190" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 4" />
    <path d="M345 50 C 390 95, 420 102, 545 104" fill="none" stroke="hsl(var(--primary))" opacity=".55" />
    <path d="M345 170 C 390 125, 420 118, 545 116" fill="none" stroke="hsl(var(--primary))" opacity=".55" />
    {[[90, 92, 3], [130, 128, 3], [170, 100, 3], [250, 80, 6], [290, 140, 9], [330, 110, 5], [420, 108, 6], [480, 112, 8]].map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y} r={r} fill={i % 3 === 0 ? "hsl(var(--warning))" : "hsl(var(--primary))"} opacity={x < 215 ? 0.45 : 0.9} />
    ))}
    <rect x="565" y="40" width="56" height="140" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="565" y="110" width="56" height="70" fill="hsl(var(--primary))" opacity=".85" />
  </>
);

const StaticFlow = () => (
  <>
    {/* Phones: the same diagram turned to flow top to bottom. */}
    <svg viewBox="0 0 220 640" aria-hidden="true" className="absolute inset-0 w-full h-full sm:hidden">
      <g transform="translate(220 0) rotate(90)"><StaticShapes /></g>
    </svg>
    <svg viewBox="0 0 640 220" aria-hidden="true" className="absolute inset-0 w-full h-full hidden sm:block">
      <StaticShapes />
    </svg>
  </>
);

/**
 * The invoice → verified → finance model. Renders the static diagram, then
 * loads the canvas simulation after first paint, only when it scrolls into
 * view, and never for reduced-motion or Save-Data visitors.
 */
export const FlowVisual = () => {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const [stats, setStats] = useState<FlowStats>({ verified: 0, bandPct: 18, totalT: 0 });

  useEffect(() => {
    if (prefersStatic() || !boxRef.current) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const begin = () =>
        import("./flowModel").then(({ startFlow }) => {
          if (cancelled || !canvasRef.current) return;
          setLive(true);
          stop = startFlow(canvasRef.current, setStats);
        });
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
      if (idle) idle(begin); else setTimeout(begin, 200);
    }, { rootMargin: "200px" });
    io.observe(boxRef.current);
    return () => { cancelled = true; io.disconnect(); stop?.(); };
  }, []);

  return (
    <figure className="w-full">
      <div ref={boxRef} className="relative w-full aspect-[4/5] sm:aspect-[16/7] rounded-3xl border border-border bg-secondary/30 overflow-hidden text-foreground">
        {!live && <StaticFlow />}
        <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${live ? "" : "invisible"}`} aria-hidden="true" />
        {/* Zone labels sit where the model draws each stage: down the left on
            phones (vertical flow), across the top on wider screens. */}
        {[
          { u: 0.02, label: t("home.flow.zone_invoice", "Invoice") },
          { u: 0.33, label: t("home.flow.zone_factor", "× factor") },
          { u: 0.62, label: t("home.flow.zone_verify", "Verified") },
          { u: 0.88, label: t("home.flow.zone_finance", "Finance") },
        ].map(z => (
          <span
            key={z.u}
            style={{ ["--u" as string]: `${z.u * 100}%` }}
            className="pointer-events-none absolute left-3 top-[calc(var(--u)*0.92+2%)] sm:top-3 sm:left-[calc(var(--u)*0.92+2%)] text-[10px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground"
          >
            {z.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 grid grid-cols-3 gap-2 text-center" aria-live="off">
        <div>
          <p className="font-mono text-lg sm:text-xl">{live ? stats.verified : "n"}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{t("home.flow.stat_items", "line items verified")}</p>
        </div>
        <div>
          <p className="font-mono text-lg sm:text-xl">±{stats.bandPct.toFixed(1)}%</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{t("home.flow.stat_band", "band ≈ k / √n")}</p>
        </div>
        <div>
          <p className="font-mono text-lg sm:text-xl">{live ? stats.totalT.toFixed(2) : "Σ"} t</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{t("home.flow.stat_total", "CO2e ready for finance")}</p>
        </div>
      </figcaption>
    </figure>
  );
};
