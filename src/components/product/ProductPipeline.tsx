import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useT } from "@/lib/i18n/useT";
import { SAMPLE_LINES } from "@/lib/sampleInvoice";
import { indicativeValueFromKg } from "@/lib/carbonValue";

/**
 * The product, as one 3D scene. Every movement is a real step the platform
 * performs on an uploaded bill, using the built-in sample invoice and its
 * published factors (CEA v21.0 grid, IPCC diesel):
 *   0 Read      the bill is scanned; GSTIN, HSN and quantities are picked up
 *   1 Classify  each line lifts off and gets a scope from its HSN code
 *   2 Calculate quantity x factor = kgCO2e, shown as the actual equation
 *   3 Verify    lines pass the evidence gate: pending (amber) to verified (green)
 *   4 Use       verified lines settle into one ledger that feeds reports,
 *               lenders and the indicative carbon value
 * No decorative motion. Pauses off-screen, in background tabs, on hover or
 * focus, and never auto-plays for reduced-motion visitors.
 */

const W = 440;
const H = 330;
const STEP_MS = 2800;

const lines = SAMPLE_LINES.map((l, i) => ({
  ...l,
  hsn: l.scope === 2 ? "2716" : "2710",
  co2Kg: Math.round(l.quantity * l.factor * 10) / 10,
  row: i,
}));
const totalKg = lines.reduce((s, l) => s + l.co2Kg, 0);
const valueInr = indicativeValueFromKg(totalKg);

const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });

const STAGES = [
  { key: "read", label: "Read", caption: "Reads GSTIN, HSN codes and quantities from the bill" },
  { key: "classify", label: "Classify", caption: "Each line gets its scope from the HSN code" },
  { key: "calculate", label: "Calculate", caption: "Quantity × published emission factor" },
  { key: "verify", label: "Verify", caption: "Hashed and checked before it counts" },
  { key: "use", label: "Use", caption: "One ledger for reports, lenders and carbon value" },
] as const;

function prefersStatic(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const EASE = "cubic-bezier(.2,.8,.2,1)";
const move = (x: number, y: number, z = 0, extra = ""): CSSProperties => ({
  transform: `translate3d(${x}px, ${y}px, ${z}px) ${extra}`,
});

export const ProductPipeline = ({ className = "", tone = "hero" }: { className?: string; tone?: "hero" | "page" }) => {
  const t = useT();
  const [stage, setStage] = useState(0);
  const [scale, setScale] = useState(1);
  const [auto, setAuto] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef(false);
  const visibleRef = useRef(false);

  // Fit the fixed-size world to the container width.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1.25, e.contentRect.width / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-advance only while on screen and the tab is visible.
  useEffect(() => {
    if (prefersStatic() || !boxRef.current) return;
    const io = new IntersectionObserver(([e]) => { visibleRef.current = e.isIntersecting; }, { threshold: 0.35 });
    io.observe(boxRef.current);
    setAuto(true);
    const id = window.setInterval(() => {
      if (holdRef.current || !visibleRef.current || document.hidden) return;
      setStage(s => (s + 1) % STAGES.length);
    }, STEP_MS);
    return () => { io.disconnect(); window.clearInterval(id); };
  }, []);

  // Small pointer tilt reveals the depth layers (bill, lines, gate, ledger).
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || prefersStatic() || !worldRef.current || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    worldRef.current.style.setProperty("--tilt-x", `${(-py * 6).toFixed(2)}deg`);
    worldRef.current.style.setProperty("--tilt-y", `${(px * 8).toFixed(2)}deg`);
  }, []);
  const onPointerLeave = useCallback(() => {
    holdRef.current = false;
    worldRef.current?.style.setProperty("--tilt-x", "0deg");
    worldRef.current?.style.setProperty("--tilt-y", "0deg");
  }, []);

  const go = (i: number) => { setStage(i); holdRef.current = true; };

  const s = stage;
  const verified = s >= 3;
  const settled = s >= 4;
  const tr = `transform 900ms ${EASE}, opacity 600ms ${EASE}, background-color 500ms, border-color 500ms, width 700ms ${EASE}`;

  // Where each lifted line sits in each stage.
  const lineStyle = (row: number): CSSProperties => {
    const y0 = 128 + row * 38;
    if (s === 0) return { ...move(28, y0, 0), width: 156, opacity: 1 };
    if (s === 1) return { ...move(150, 96 + row * 56, 46), width: 176, opacity: 1 };
    if (s === 2) return { ...move(130, 96 + row * 56, 46), width: 236, opacity: 1 };
    if (s === 3) return { ...move(286, 96 + row * 56, 46), width: 134, opacity: 1, transitionDelay: "120ms" };
    return { ...move(290, 200 - row * 22, 10, "scale(.92)"), width: 130, opacity: 0 };
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        ref={boxRef}
        className="relative w-full select-none"
        style={{ height: H * scale }}
        onPointerMove={onPointerMove}
        onPointerEnter={() => { holdRef.current = true; }}
        onPointerLeave={onPointerLeave}
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-0 origin-top"
          style={{ width: W, height: H, transform: `translateX(-50%) scale(${scale})`, perspective: 1100 }}
        >
          <div
            ref={worldRef}
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateX(calc(14deg + var(--tilt-x, 0deg))) rotateY(calc(-16deg + var(--tilt-y, 0deg)))",
              transition: `transform 600ms ${EASE}`,
            }}
          >
            {/* Floor grid: the ledger's ground plane, not decoration. */}
            <div
              className="absolute rounded-3xl"
              style={{
                left: 0, top: 40, width: W, height: H - 40,
                transform: "translateZ(-40px)",
                background: "radial-gradient(ellipse at 60% 60%, hsl(var(--primary) / .07), transparent 70%)",
              }}
            />

            {/* The bill */}
            <div
              className="absolute rounded-xl border border-border bg-card shadow-[0_20px_40px_-20px_hsl(var(--foreground)/.25)] overflow-hidden"
              style={{ left: 16, top: 40, width: 172, height: 250, transition: tr, ...move(0, 0, 0, s >= 3 ? "translateZ(-14px)" : "") }}
            >
              <div className="h-1.5 bg-primary/80" />
              <div className="px-3 pt-3 space-y-2">
                <div className="h-2 w-16 rounded-full bg-foreground/70" />
                <div className={`font-mono text-[8.5px] tracking-tight transition-colors duration-500 ${s === 0 ? "text-primary" : "text-muted-foreground"}`}>
                  GSTIN 27AAPFU0939F1ZV
                </div>
                <div className="h-1.5 w-24 rounded-full bg-muted" />
                <div className="h-1.5 w-20 rounded-full bg-muted" />
              </div>
              {/* Row placeholders the lines lift out of */}
              {lines.map(l => (
                <div key={l.row} className="absolute left-3 right-3 h-7 rounded-md border border-dashed border-border" style={{ top: 88 + l.row * 38 }} />
              ))}
              <div className="absolute left-3 right-3 bottom-4 flex justify-between items-center">
                <div className="h-1.5 w-10 rounded-full bg-muted" />
                <div className="h-2 w-12 rounded-full bg-foreground/60" />
              </div>
              {/* Scan beam: reading the bill */}
              <div
                className="absolute left-0 right-0 h-10 pointer-events-none"
                style={{
                  top: 0,
                  background: "linear-gradient(to bottom, transparent, hsl(var(--primary) / .18), transparent)",
                  opacity: s === 0 ? 1 : 0,
                  animation: s === 0 && auto ? "pp-scan 2.4s ease-in-out infinite" : undefined,
                  transition: "opacity 400ms",
                }}
              />
              {/* Evidence hash stamped once verified */}
              <div
                className="absolute right-2 top-2 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] text-primary"
                style={{ opacity: verified ? 1 : 0, transform: verified ? "scale(1)" : "scale(1.4)", transition: `all 500ms ${EASE}` }}
              >
                SHA-256
              </div>
            </div>

            {/* Evidence gate */}
            <div
              className="absolute rounded-2xl border-2"
              style={{
                left: 262, top: 70, width: 14, height: 150,
                borderColor: verified ? "hsl(var(--verified))" : "hsl(var(--pending) / .7)",
                background: verified ? "hsl(var(--verified) / .12)" : "hsl(var(--pending) / .08)",
                opacity: s === 3 ? 1 : 0,
                transform: `translateZ(30px) rotateY(58deg) ${s === 3 ? "scaleY(1)" : "scaleY(.3)"}`,
                transition: tr,
              }}
            />

            {/* The lines */}
            {lines.map(l => {
              const scopeColor = l.scope === 1 ? "hsl(var(--earth))" : "hsl(var(--accent))";
              return (
                <div
                  key={l.row}
                  className="absolute left-0 top-0 h-[42px] rounded-lg border bg-card px-2.5 flex items-center gap-2 shadow-[0_14px_24px_-14px_hsl(var(--foreground)/.35)]"
                  style={{
                    ...lineStyle(l.row),
                    transition: tr,
                    borderColor: verified ? "hsl(var(--verified))" : s >= 2 ? "hsl(var(--pending) / .8)" : "hsl(var(--border))",
                  }}
                >
                  <span
                    className="shrink-0 overflow-hidden rounded font-mono text-[9px] font-semibold text-white"
                    style={{ background: scopeColor, opacity: s >= 1 ? 1 : 0, maxWidth: s >= 1 ? 28 : 0, padding: s >= 1 ? "0 4px" : 0, transition: `all 500ms ${EASE}` }}
                  >
                    S{l.scope}
                  </span>
                  <span className="min-w-0 flex-1 font-mono text-[10px] leading-tight text-foreground whitespace-nowrap overflow-hidden">
                    {s <= 1 && <>{fmt(l.quantity)} {l.unit === "litre" ? "L" : l.unit} <span className="text-muted-foreground">· HSN {l.hsn}</span></>}
                    {s === 2 && <>{fmt(l.quantity)} × {l.factor.toFixed(l.factor < 1 ? 3 : 2)} = <b>{fmt(l.co2Kg, 1)} kg</b></>}
                    {s >= 3 && <b>{fmt(l.co2Kg, 1)} kg</b>}
                  </span>
                  <span
                    className="shrink-0 grid place-items-center h-4 w-4 rounded-full text-[9px] text-white"
                    style={{ background: "hsl(var(--verified))", opacity: verified ? 1 : 0, maxWidth: verified ? 16 : 0, transform: verified ? "scale(1)" : "scale(.4)", transition: `all 500ms ${EASE}` }}
                  >
                    ✓
                  </span>
                </div>
              );
            })}

            {/* The ledger: verified records stack; the label is their sum. A faint outline shows where records are headed. */}
            <div className="absolute" style={{ left: 282, top: 168, width: 146, height: 96, transformStyle: "preserve-3d" }}>
              <div className="absolute inset-x-0 bottom-0 h-3 rounded-md border border-dashed border-border bg-muted/60" />
              {[0, 1].map(i => (
                <div
                  key={i}
                  className="absolute inset-x-0 h-[26px] rounded-md border flex items-center justify-center"
                  style={{
                    bottom: 14 + i * 30,
                    background: "hsl(var(--primary))",
                    borderColor: "hsl(var(--primary))",
                    transform: `translateZ(${settled ? 0 : 40}px)`,
                    opacity: settled ? 1 : 0,
                    transition: `all 700ms ${EASE} ${i * 140}ms`,
                  }}
                >
                  <span className="font-mono text-[10px] text-primary-foreground/90">{fmt(lines[i].co2Kg, 1)} kg</span>
                </div>
              ))}
              <div
                className="absolute inset-x-0 -top-1 text-center font-mono text-[11px] font-semibold text-foreground"
                style={{ opacity: settled ? 1 : 0, transition: "opacity 500ms 350ms" }}
              >
                = {fmt(totalKg, 1)} kg CO₂e
              </div>
            </div>

            {/* What the ledger feeds: one spine, three uses */}
            <svg className="absolute left-0 top-0 overflow-visible" width={W} height={H} style={{ transform: "translateZ(12px)" }}>
              <path
                d="M 294 166 V 56 M 294 62 H 304 M 294 98 H 304 M 294 134 H 304"
                fill="none" strokeWidth="1.4" strokeLinecap="round"
                stroke={settled ? "hsl(var(--primary) / .6)" : "hsl(var(--border))"}
                strokeDasharray={settled ? "0" : "3 4"}
                style={{ transition: "stroke 500ms" }}
              />
            </svg>
            {[
              { k: "report", label: t("pp.out.report", "Report"), y: 50 },
              { k: "finance", label: t("pp.out.finance", "Lender"), y: 86 },
              { k: "value", label: `₹${fmt(valueInr)}`, y: 122 },
            ].map((o, i) => (
              <div
                key={o.k}
                className="absolute rounded-full border px-2.5 py-1 font-mono text-[10px] whitespace-nowrap"
                style={{
                  left: 306, top: o.y,
                  color: settled ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / .6)",
                  borderColor: settled ? "hsl(var(--primary) / .5)" : "hsl(var(--border))",
                  borderStyle: settled ? "solid" : "dashed",
                  background: "hsl(var(--background))",
                  transform: `translateZ(${settled ? 34 : 0}px)`,
                  transition: `all 600ms ${EASE} ${settled ? 250 + i * 120 : 0}ms`,
                }}
              >
                {o.k === "value" && !settled ? "₹" : o.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage rail: the same five steps, tappable */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <div role="group" aria-label={t("pp.rail", "How a bill becomes a verified record")} className="flex items-center gap-1 rounded-full border border-border bg-background/80 p-1 backdrop-blur">
          {STAGES.map((st, i) => (
            <button
              key={st.key}
              type="button"
              onClick={() => go(i)}
              onFocus={() => { holdRef.current = true; }}
              aria-pressed={i === s}
              className={`relative overflow-hidden rounded-full px-2.5 sm:px-3 py-1.5 sm:py-1 text-[11px] sm:text-xs font-medium transition-colors ${
                i === s ? "bg-primary text-primary-foreground" : i < s ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`pp.stage.${st.key}`, st.label)}
              {i === s && auto && !holdRef.current && (
                <span key={`p${s}`} className="absolute bottom-0 left-0 h-0.5 bg-primary-foreground/60" style={{ animation: `pp-progress ${STEP_MS}ms linear forwards` }} />
              )}
            </button>
          ))}
        </div>
        <p aria-live="polite" className={`text-center text-xs text-muted-foreground min-h-[2.25rem] ${tone === "page" ? "sm:text-sm" : ""}`}>
          {t(`pp.caption.${STAGES[s].key}`, STAGES[s].caption)}
        </p>
      </div>
      <style>{`
        @keyframes pp-scan { 0% { transform: translateY(-40px) } 100% { transform: translateY(250px) } }
        @keyframes pp-progress { from { width: 0 } to { width: 100% } }
      `}</style>
    </div>
  );
};

export default ProductPipeline;
