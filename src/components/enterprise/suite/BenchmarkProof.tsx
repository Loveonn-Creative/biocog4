import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { prefersReducedMotion, useMotionGate } from "@/components/services/motion/kit";

// Pilot figures as published on /platform: 29 clusters, 11 countries, 92%
// benchmarking accuracy. The split of clusters across countries below is a
// drawing aid, not a published breakdown.
const GROUPS = [5, 4, 4, 3, 3, 2, 2, 2, 2, 1, 1];

// Geometry (viewBox 360 x 300): records on the left, one row per country,
// its clusters along the row, the cross-cluster benchmark on the right.
const REC = { x: 62, y: 150 };
const HUB_X = 122;
const NODE_X = 150;
const NODE_STEP = 22;
const BAND_X = 318;
const rowY = (g: number) => 34 + g * 23.2;

const ROWS = GROUPS.map((count, g) => {
  const y = rowY(g);
  const nodes = Array.from({ length: count }, (_, k) => ({ x: NODE_X + k * NODE_STEP, y }));
  const last = nodes[nodes.length - 1].x;
  return {
    y, nodes,
    inbound: `M${REC.x} ${REC.y} C ${REC.x + 40} ${REC.y}, ${HUB_X - 40} ${y}, ${HUB_X} ${y}`,
    along: `M${HUB_X} ${y} L ${last} ${y}`,
    outbound: `M${last} ${y} L ${BAND_X} ${y}`,
    // The whole trace for one cluster row, for the travelling pulse.
    trace: `M${REC.x} ${REC.y} C ${REC.x + 40} ${REC.y}, ${HUB_X - 40} ${y}, ${HUB_X} ${y} L ${BAND_X} ${y}`,
  };
});

// Draw timing, on the page's shared easing (index.css --ease-draw).
const STAGGER = 80;
const draw = (seen: boolean, delay: number, dur = 600) => ({
  strokeDashoffset: seen ? 0 : 1,
  transition: `stroke-dashoffset ${dur}ms var(--ease-draw) ${delay}ms`,
});

function useInViewOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, seen };
}

const CountUp = ({ to, suffix = "", run, ms }: { to: number; suffix?: string; run: boolean; ms: number }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) { setN(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, ms]);
  return <>{n}{suffix}</>;
};

/**
 * Traceability, drawn: threads run from business records to each pilot
 * cluster and on to the cross-cluster benchmark; a cluster is marked once its
 * thread arrives. The figures count up as the threads land. Afterwards a pulse
 * walks one trace at a time; tap a row to follow its trace.
 */
export const BenchmarkProof = () => {
  const t = useT();
  const { ref, seen } = useInViewOnce<HTMLDivElement>();
  const svgBox = useRef<SVGSVGElement>(null);
  const moving = useMotionGate(svgBox as unknown as React.RefObject<Element>, 0.3);
  const [focus, setFocus] = useState<number | null>(null);
  const [pulse, setPulse] = useState<{ row: number; n: number } | null>(null);
  const total = 800 + (GROUPS.length - 1) * STAGGER + 500;

  // After the first draw, walk one trace every few seconds while on screen.
  useEffect(() => {
    if (!seen || !moving) return;
    let n = 0;
    const tick = () => { n++; setPulse({ row: focus ?? (n * 7) % GROUPS.length, n }); };
    const first = window.setTimeout(tick, total);
    const id = window.setInterval(tick, 2600);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [seen, moving, focus, total]);

  let clusterNo = 0;

  return (
    <div ref={ref} className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <figure className="w-full">
        <svg ref={svgBox} viewBox="0 0 360 300" className="w-full max-w-[460px] mx-auto h-auto" role="img"
          aria-label={t("ent.bench.aria", "29 pilot clusters across 11 countries")}>
          {/* Business records */}
          <g aria-hidden="true">
            {[0, 1, 2].map(i => (
              <g key={i} transform={`translate(${28 + i * 3} ${126 + i * 4})`} opacity={1 - i * 0.25}>
                <rect width="26" height="32" rx="3" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.2" />
                {[8, 13, 18, 23].map(y => <line key={y} x1="5" x2={y === 23 ? 14 : 21} y1={y} y2={y} stroke="hsl(var(--foreground))" strokeOpacity="0.5" />)}
              </g>
            ))}
            <text x="42" y="186" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">{t("ent.bench.records", "Business records")}</text>
          </g>

          {/* Benchmark band */}
          <g aria-hidden="true">
            <rect x={BAND_X} y="22" width="22" height="256" rx="11" fill="hsl(var(--primary))" fillOpacity={seen ? 0.12 : 0}
              style={{ transition: `fill-opacity 500ms var(--ease-out) ${total - 300}ms` }} />
            <text x={BAND_X + 11} y="292" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">{t("ent.bench.band", "Benchmark")}</text>
          </g>

          {ROWS.map((row, g) => {
            const d0 = g * STAGGER;
            const dim = focus !== null && focus !== g;
            return (
              <g key={g} role="button" tabIndex={0} aria-label={t("ent.bench.row", "Follow a trace")}
                onClick={() => setFocus(g)}
                onPointerEnter={e => { if (e.pointerType === "mouse") setFocus(g); }} onPointerLeave={e => { if (e.pointerType === "mouse") setFocus(null); }}
                onFocus={() => setFocus(g)} onBlur={() => setFocus(null)}
                className="cursor-pointer outline-none" style={{ opacity: dim ? 0.25 : 1, transition: "opacity var(--motion-base) var(--ease-out)" }}>
                <path d={row.inbound} fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.35" strokeWidth="1" pathLength={1} strokeDasharray="1" style={draw(seen, d0)} />
                <path d={row.along} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.6" strokeWidth="1.2" pathLength={1} strokeDasharray="1" style={draw(seen, 450 + d0, 300)} />
                <path d={row.outbound} fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="1 3" style={{ opacity: seen ? 1 : 0, transition: `opacity 400ms var(--ease-out) ${750 + d0}ms` }} />
                <rect x={HUB_X - 3} y={row.y - 3} width="6" height="6" rx="1" fill="hsl(var(--foreground))" opacity={seen ? 0.8 : 0} style={{ transition: `opacity 300ms var(--ease-out) ${380 + d0}ms` }} />
                {row.nodes.map((n, k) => {
                  clusterNo++;
                  return (
                    <circle key={k} cx={n.x} cy={n.y} r="5" stroke="hsl(var(--primary))" strokeWidth="1.4"
                      fill={seen ? "hsl(var(--primary))" : "hsl(var(--background))"}
                      style={{ transition: `fill 300ms var(--ease-out) ${600 + d0 + k * 60}ms` }}>
                      <title>{t("ent.bench.cluster", "Pilot cluster")} {clusterNo}</title>
                    </circle>
                  );
                })}
                {/* Arrived at the benchmark */}
                <path d={`M${BAND_X + 6} ${row.y} l3 3 l6 -6`} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                  pathLength={1} strokeDasharray="1" style={draw(seen, 850 + d0, 260)} />
                {/* Wide invisible hit area for taps */}
                <rect x={HUB_X - 8} y={row.y - 10} width={BAND_X - HUB_X + 30} height="20" fill="transparent" />
              </g>
            );
          })}

          {pulse && (
            <circle key={pulse.n} r="3.2" fill="hsl(var(--foreground))" aria-hidden="true">
              <animateMotion dur="1.6s" fill="freeze" path={ROWS[pulse.row].trace} calcMode="spline" keyTimes="0;1" keySplines="0.6 0 0.2 1" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="1.6s" fill="freeze" />
            </circle>
          )}
        </svg>
        <figcaption className="mt-2 text-center text-[11px] text-muted-foreground min-h-[1rem]" aria-live="polite">
          {focus !== null
            ? t("ent.bench.trace", "Trace: business records → cluster footprint → cross-cluster benchmark")
            : t("ent.bench.hint", "Tap a row to follow its trace")}
        </figcaption>
      </figure>

      <div>
        <dl className="grid grid-cols-3 gap-4">
          {[
            { v: 92, s: "%", k: t("ent.bench.acc", "benchmarking accuracy") },
            { v: 29, s: "", k: t("ent.bench.clusters", "clusters piloted") },
            { v: 11, s: "", k: t("ent.bench.countries", "countries") },
          ].map(m => (
            <div key={m.k}>
              <dt className="sr-only">{m.k}</dt>
              <dd className="text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums"><CountUp to={m.v} suffix={m.s} run={seen} ms={total} /></dd>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{m.k}</p>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-base sm:text-lg max-w-md">{t("ent.bench.line", "Senseible has been piloted across 29 clusters and 11 countries, with 92% benchmarking accuracy: supplier emissions built from everyday business records, compared across clusters.")}</p>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("ent.bench.note2", "Each node is one pilot cluster; rows and placement are illustrative.")}</p>
      </div>
    </div>
  );
};
