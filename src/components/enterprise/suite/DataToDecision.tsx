import { useEffect, useRef, useState } from "react";
import { useScrollProgress, prefersReducedMotion } from "@/components/decarbonize/useScrollProgress";
import { useT } from "@/lib/i18n/useT";

// Illustrative records only. The first two match the worked examples in
// RecordTransform (CEA v21.0 grid factor, IPCC diesel basis).
const FRAGMENTS = [
  { key: "bill", kind: "Electricity bill, Hindi", raw: "बिजली बिल · 4,200 यूनिट", src: "PDF", scope: "Scope 2", kg: "2,982", conf: "0.95", x: 2, y: 4, r: -6, edge: "hsl(var(--primary))" },
  { key: "fuel", kind: "Fuel slip photo", raw: "HSD 120.00 L · 14-09-26", src: "Photo", scope: "Scope 1", kg: "322", conf: "0.81", x: 51, y: 0, r: 5, edge: "hsl(var(--accent))" },
  { key: "freight", kind: "Freight invoice", raw: "LR 0921 · 18 t · 640 km", src: "PDF", scope: "Scope 3 · Cat 4", kg: "1,210", conf: "0.88", x: 26, y: 28, r: -2, edge: "hsl(var(--success))" },
  { key: "erp", kind: "ERP export", raw: "PO_4471.xlsx · 312 lines", src: "ERP", scope: "Scope 3 · Cat 1", kg: "8,460", conf: "0.72", x: 51, y: 44, r: 7, edge: "hsl(var(--warning))" },
  { key: "meter", kind: "Meter readings", raw: "ts,kwh · 2,880 rows", src: "CSV", scope: "Scope 2", kg: "932", conf: "0.98", x: 3, y: 54, r: 4, edge: "hsl(var(--primary))" },
  { key: "spend", kind: "Long-tail supplier", raw: "Packaging · Rs 2.4 L", src: "Spend", scope: "Scope 3 · Cat 1", kg: "1,950", conf: "0.40", x: 30, y: 72, r: -5, edge: "hsl(var(--muted-foreground))" },
] as const;

const BOX_H = 400;
const ROW_H = 34;
const ROW_STEP = 40;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);
const band = (v: number, a: number, b: number) => ease(clamp((v - a) / (b - a)));

/**
 * Scattered enterprise data becomes one ledger, then one decision. Driven by
 * scroll: the section pins while the fragments line up. Only transform and
 * opacity change, so nothing around it moves. Reduced motion shows the
 * finished ledger and decision, still.
 */
export const DataToDecision = () => {
  const t = useT();
  const { ref, value } = useScrollProgress<HTMLDivElement>(48);
  const reduced = prefersReducedMotion();
  const p = reduced ? 1 : value;
  const morph = band(p, 0.12, 0.5);
  const decide = band(p, 0.62, 0.86);
  const stage = p < 0.3 ? 0 : p < 0.62 ? 1 : 2;

  // Width of the stage, for the pixel distance each fragment travels.
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(560);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stages = [
    { k: t("ent.d2d.s1", "Scattered"), line: t("ent.d2d.s1.line", "Bills in three languages, photos, ERP exports, meter files and spend lines. Different formats, no shared unit.") },
    { k: t("ent.d2d.s2", "Structured"), line: t("ent.d2d.s2.line", "Each becomes one record: scope, kgCO2e, the factor used, a confidence score and the hash of its source.") },
    { k: t("ent.d2d.s3", "Decided"), line: t("ent.d2d.s3.line", "The ledger ranks what to act on first, and every answer points back to the records behind it.") },
  ];

  const stageText = (s: (typeof stages)[number], i: number) => (
    <>
      <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
      <p className="text-xl sm:text-2xl font-semibold tracking-tight">{s.k}</p>
      <p className="mt-1 text-sm sm:text-base text-muted-foreground max-w-md">{s.line}</p>
    </>
  );

  return (
    <div ref={ref} className={reduced ? "" : "relative h-[230vh] md:h-[260vh]"}>
      <div className={reduced ? "" : "sticky top-0 min-h-[100svh] flex items-center"}>
        <div className="w-full grid gap-6 md:gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center py-8 md:py-10">
          {/* Phones: one stage at a time in a fixed-height slot; larger screens: all three. */}
          {!reduced && (
            <div className="md:hidden relative min-h-[8.5rem]">
              {stages.map((s, i) => (
                <div key={s.k} className="absolute inset-0 transition-opacity duration-300" style={{ opacity: i === stage ? 1 : 0 }} aria-hidden={i !== stage}>
                  {stageText(s, i)}
                </div>
              ))}
            </div>
          )}
          <ol className={`space-y-5 ${reduced ? "" : "hidden md:block"}`} aria-label={t("ent.d2d.aria", "From scattered data to a decision")}>
            {stages.map((s, i) => (
              <li key={s.k} className={`transition-opacity duration-300 ${reduced || i === stage ? "opacity-100" : "opacity-35"}`}>
                {stageText(s, i)}
              </li>
            ))}
          </ol>

          <figure>
            <div ref={boxRef} className="relative" style={{ height: BOX_H }} aria-hidden="true">
              {FRAGMENTS.map((f, i) => {
                const rowTop = i * ROW_STEP;
                // Raw card keeps its layout box and travels by transform to its row, then fades out.
                const dx = (-f.x / 100) * boxW * morph;
                const dy = (rowTop - (f.y / 100) * BOX_H) * morph;
                const rawOpacity = 1 - band(morph, 0.45, 0.8);
                const rowOpacity = band(morph, 0.7, 1) * (1 - decide * 0.55);
                return (
                  <div key={f.key}>
                    <div
                      className="absolute rounded-xl border border-border border-l-[3px] bg-background shadow-sm px-3 py-2"
                      style={{ left: `${f.x}%`, top: `${f.y}%`, width: "47%", transform: `translate(${dx}px, ${dy}px) rotate(${f.r * (1 - morph)}deg)`, opacity: rawOpacity, borderLeftColor: f.edge }}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{f.kind}</p>
                      <p className="font-mono text-[10px] sm:text-[11px] truncate">{f.raw}</p>
                    </div>
                    <div
                      className="absolute inset-x-0 rounded-xl border border-border border-l-[3px] bg-background px-3 grid grid-cols-[3rem_1fr_auto_auto] items-center gap-2 text-[11px] sm:text-xs"
                      style={{ top: rowTop, height: ROW_H, opacity: rowOpacity, transform: `translateY(${(1 - morph) * 8}px)`, borderLeftColor: f.edge }}
                    >
                      <span className="font-mono text-muted-foreground">{f.src}</span>
                      <span className="truncate">{f.scope}</span>
                      <span className="font-mono tabular-nums text-right">{f.kg} kg</span>
                      <span className={`font-mono tabular-nums rounded-full px-1.5 ${Number(f.conf) < 0.6 ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}>{f.conf}</span>
                    </div>
                  </div>
                );
              })}

              <div
                className="absolute inset-x-[4%] rounded-2xl bg-foreground text-background p-4 sm:p-5"
                style={{ top: FRAGMENTS.length * ROW_STEP + 12, opacity: decide, transform: `translateY(${(1 - decide) * 24}px)` }}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-background/60">{t("ent.d2d.decision", "Decision")}</p>
                <p className="mt-1 text-sm sm:text-base font-medium">{t("ent.d2d.decision.line", "Act first on purchased goods from the ERP lines: the largest share, and the lowest confidence after spend estimates.")}</p>
                <p className="mt-2 text-xs text-background/70">{t("ent.d2d.decision.trail", "Based on 6 records, each linked to its source hash.")}</p>
              </div>
            </div>
          </figure>
        </div>
      </div>
    </div>
  );
};
