import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import type { GraphSupplier } from "./supplyGraph";

/** Illustrative network: a few primary-data suppliers, more document-based, a long tail of estimates. */
export const GRAPH_SUPPLIERS: GraphSupplier[] = Array.from({ length: 42 }, (_, i) => ({
  id: `s${i}`,
  tier: i % 7 === 0 ? "primary" : i % 3 === 0 ? "estimate" : i < 24 ? "document" : "estimate",
  channel: ["pdf", "photo", "meter", "spend"][i % 4],
}));

function prefersStatic(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return !!conn?.saveData;
  } catch {
    return false;
  }
}

/** Static network shown first and kept for reduced motion and Save-Data. */
const StaticGraph = () => (
  <svg viewBox="0 0 400 400" aria-hidden="true" className="absolute inset-0 w-full h-full">
    {[184, 148, 112, 76, 40].map((r, i) => (
      <circle key={r} cx="200" cy="200" r={r * 0.95} fill="none" stroke="hsl(var(--border))" strokeDasharray={i === 3 ? "2 4" : undefined} />
    ))}
    {GRAPH_SUPPLIERS.map((s, i) => {
      const ring = s.tier === "primary" ? 0.62 : s.tier === "document" ? 0.8 : 0.96;
      const a = (i / GRAPH_SUPPLIERS.length) * Math.PI * 2;
      const fill = s.tier === "primary" ? "hsl(var(--primary))" : s.tier === "document" ? "hsl(var(--success))" : "hsl(var(--warning))";
      return <circle key={s.id} cx={200 + Math.cos(a) * 184 * ring} cy={200 + Math.sin(a) * 184 * ring} r={s.tier === "primary" ? 6 : s.tier === "document" ? 4.5 : 3.2} fill={fill} />;
    })}
    <circle cx="200" cy="200" r="11" fill="hsl(var(--foreground))" />
  </svg>
);

/**
 * The buyer-and-suppliers network. Canvas loads after first paint, when in
 * view, never for reduced motion or Save-Data. Tapping a node selects an
 * example supplier record (onSelect receives the node index).
 */
export const SupplyGraphVisual = ({ onSelect }: { onSelect: (index: number) => void }) => {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (prefersStatic() || !boxRef.current) return;
    let handle: { stop: () => void; highlight: (id: string | null) => void } | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const begin = () =>
        import("./supplyGraph").then(({ startGraph }) => {
          if (cancelled || !canvasRef.current) return;
          setLive(true);
          handle = startGraph(canvasRef.current, GRAPH_SUPPLIERS, id => {
            handle?.highlight(id);
            onSelect(Number(id.slice(1)));
          });
        });
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
      if (idle) idle(begin); else setTimeout(begin, 200);
    }, { rootMargin: "200px" });
    io.observe(boxRef.current);
    return () => { cancelled = true; io.disconnect(); handle?.stop(); };
  }, [onSelect]);

  return (
    <figure className="w-full">
      <div ref={boxRef} className="relative mx-auto w-full max-w-[34rem] aspect-square">
        {!live && <StaticGraph />}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${live ? "cursor-pointer" : "invisible"}`}
          aria-label={t("ent.graph.aria", "Network of suppliers sending records to the buyer at the centre")}
          role="img"
        />
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" />{t("ent.graph.primary", "Primary data")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-success" />{t("ent.graph.document", "From documents")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-warning" />{t("ent.graph.estimate", "Spend estimate")}</span>
      </figcaption>
    </figure>
  );
};
