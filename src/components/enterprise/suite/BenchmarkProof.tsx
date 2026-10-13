import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { prefersReducedMotion } from "@/components/services/motion/kit";

// Pilot figures as published on /platform: 29 clusters, 11 countries, 92%
// benchmarking accuracy. The split of clusters across countries below is a
// drawing aid, not a published breakdown.
const GROUPS = [5, 4, 4, 3, 3, 2, 2, 2, 2, 1, 1];

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

const CountUp = ({ to, suffix = "", run }: { to: number; suffix?: string; run: boolean }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) { setN(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{n}{suffix}</>;
};

/** Eleven countries, twenty-nine clusters, drawn in as the section arrives. */
export const BenchmarkProof = () => {
  const t = useT();
  const { ref, seen } = useInViewOnce<HTMLDivElement>();

  const C = 160;
  // Country hubs on an inner ring; each hub's clusters fan outwards from it.
  const hubs = GROUPS.map((count, g) => {
    const a = -Math.PI / 2 + (g / GROUPS.length) * Math.PI * 2;
    const hub = { x: C + Math.cos(a) * 86, y: C + Math.sin(a) * 86 };
    const dots = Array.from({ length: count }, (_, k) => {
      const b = a + (k - (count - 1) / 2) * 0.62;
      return { x: hub.x + Math.cos(b) * 34, y: hub.y + Math.sin(b) * 34 };
    });
    return { hub, dots };
  });
  let order = 0;

  return (
    <div ref={ref} className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center">
      <svg viewBox="0 0 320 320" className="w-full max-w-[380px] mx-auto h-auto" role="img" aria-label={t("ent.bench.aria", "29 pilot clusters across 11 countries")}>
        <circle cx={C} cy={C} r="16" fill="hsl(var(--foreground))" />
        {hubs.map(({ hub, dots }, g) => (
          <g key={g}>
            <line x1={C} y1={C} x2={hub.x} y2={hub.y} stroke="hsl(var(--foreground))" strokeOpacity="0.25" pathLength={1} strokeDasharray="1"
              strokeDashoffset={seen ? 0 : 1} style={{ transition: `stroke-dashoffset 0.6s ease-out ${g * 60}ms` }} />
            <circle cx={hub.x} cy={hub.y} r="4" fill="hsl(var(--foreground))" opacity={seen ? 0.7 : 0} style={{ transition: `opacity 0.3s ${g * 60 + 300}ms` }} />
            {dots.map((d, k) => {
              const i = order++;
              return (
                <g key={k}>
                  <line x1={hub.x} y1={hub.y} x2={d.x} y2={d.y} stroke="hsl(var(--primary))" strokeOpacity="0.5" pathLength={1} strokeDasharray="1"
                    strokeDashoffset={seen ? 0 : 1} style={{ transition: `stroke-dashoffset 0.4s ease-out ${500 + i * 35}ms` }} />
                  <circle cx={d.x} cy={d.y} r="5.5" fill="hsl(var(--primary))" opacity={seen ? 1 : 0}
                    style={{ transition: `opacity 0.3s ${700 + i * 35}ms` }} />
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      <div>
        <dl className="grid grid-cols-3 gap-4">
          {[
            { v: 92, s: "%", k: t("ent.bench.acc", "benchmarking accuracy") },
            { v: 29, s: "", k: t("ent.bench.clusters", "clusters piloted") },
            { v: 11, s: "", k: t("ent.bench.countries", "countries") },
          ].map(m => (
            <div key={m.k}>
              <dt className="sr-only">{m.k}</dt>
              <dd className="text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums"><CountUp to={m.v} suffix={m.s} run={seen} /></dd>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{m.k}</p>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-base sm:text-lg max-w-md">{t("ent.bench.line", "Senseible has been piloted across 29 clusters and 11 countries, with 92% benchmarking accuracy: supplier emissions built from everyday business records, compared across clusters.")}</p>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("ent.bench.note", "Each dot is one pilot cluster; their placement is illustrative.")}</p>
      </div>
    </div>
  );
};
