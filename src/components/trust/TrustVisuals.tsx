import { useEffect, useState, type ReactNode } from "react";
import { useInView } from "@/components/platform/Reveal";

// Motion and doodles for /trust. Each visual shows what its section's text
// says; none adds a claim. Everything is SVG + CSS, plays once when in view,
// and rests on its finished frame (also the reduced-motion frame).

const INK = "hsl(var(--primary))";

/* ---------------------------------------------------------------- Layers */

export interface TrustLayer { name: string; desc: string }

const SEAL_MARKS = ["M15 24 l6 6 l12 -13", "M14 23 h18 M23 14 v18", "M14 30 l6 -8 l5 4 l8 -11", "M15 16 h16 M15 23 h16 M15 30 h10"];
const ORIGINAL_UNITS = "1240";
const billText = (units: string) => `Sample electricity bill|units_kwh=${units}|factor=0.710`;

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The four layers as a chain of seals that stamp in, beside a sample bill
 * whose real SHA-256 fingerprint is compared with the one taken at upload.
 * Change one number and the chain breaks at the Evidence layer.
 */
export function SealChain({ layers }: { layers: TrustLayer[] }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.1);
  const [units, setUnits] = useState(ORIGINAL_UNITS);
  const [original, setOriginal] = useState("");
  const [now, setNow] = useState("");
  const [stampKey, setStampKey] = useState(0);

  useEffect(() => { void sha256Hex(billText(ORIGINAL_UNITS)).then(setOriginal); }, []);
  useEffect(() => { void sha256Hex(billText(units.trim())).then(setNow); }, [units]);

  const broken = !!original && !!now && original !== now;
  const n = Number(units);
  const restore = () => { setUnits(ORIGINAL_UNITS); setStampKey((k) => k + 1); };

  return (
    <div ref={ref} className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <div className="tr-bill mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-sm" role="group" aria-label="Sample electricity bill">
          <div className="flex items-baseline justify-between gap-3 text-sm"><b>Sample electricity bill</b><span className="text-muted-foreground">Illustration</span></div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <label htmlFor="tr-units">Units billed (kWh)</label>
            <input id="tr-units" inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)}
              className="w-28 rounded-md border border-dashed border-border bg-background px-2 py-1 text-right font-mono text-sm" />
          </div>
          <div className="mt-2 flex justify-between gap-3 text-sm"><span>Grid factor (kg/kWh)</span><span className="font-mono">0.710</span></div>
          <div className="mt-2 flex justify-between gap-3 text-sm font-medium"><span>Emissions</span><span className="font-mono">{Number.isFinite(n) ? (n * 0.71).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "-"} kg</span></div>
          <div className="mt-4 border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground break-all">
            <span className="block font-sans text-xs text-foreground/80">SHA-256 at upload</span>{original || "..."}
            <span className="mt-2 block font-sans text-xs text-foreground/80">SHA-256 now</span>
            <span className={broken ? "text-destructive" : ""}>{now || "..."}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setUnits("1420")} className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground">Change one number</button>
            <button type="button" onClick={restore} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">Restore the original</button>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-sm text-sm" aria-live="polite">
          {broken
            ? <span className="text-destructive">The fingerprint no longer matches the uploaded file, so the Evidence layer refuses the record and nothing downstream can use it.</span>
            : <span className="text-muted-foreground">All four layers hold: this record matches the file that was uploaded.</span>}
        </p>
      </div>

      <ol className="relative grid gap-4" key={stampKey}>
        <svg className="tr-chain absolute left-[22px] top-6 bottom-6 w-2 hidden sm:block" viewBox="0 0 8 100" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength={1} d="M4 0 C 1 20, 7 30, 4 50 S 1 80, 4 100" className={inView ? "tr-draw-on" : ""} />
        </svg>
        {layers.map((l, i) => (
          <li key={l.name} className={`tr-link relative flex gap-4 rounded-2xl border p-4 transition-colors ${broken ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
            <svg className={`tr-seal shrink-0 ${inView ? "tr-seal-on" : ""}`} style={{ animationDelay: `${0.2 + i * 0.35}s` }} viewBox="0 0 46 46" width="46" height="46" aria-hidden="true">
              <circle cx="23" cy="23" r="21" fill={broken ? "hsl(var(--destructive))" : INK} className="transition-colors" />
              <circle cx="23" cy="23" r="16.5" fill="none" stroke="#fff" strokeOpacity=".35" strokeDasharray="2 3" />
              <path pathLength={1} d={SEAL_MARKS[i % 4]} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${0.45 + i * 0.35}s` }} />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2"><h3 className="text-base font-medium">{l.name}</h3><span className="text-xs text-muted-foreground">0{i + 1}</span></div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{l.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------------------------------------------------- Sources */

/** A doodled magnifier that runs once along the line it wraps, when in view. */
export function ScanLine({ children }: { children: ReactNode }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.6);
  return (
    <span ref={ref} className={`tr-scan relative block ${inView ? "tr-scan-on" : ""}`}>
      {children}
      <svg className="tr-glass" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="10" cy="10" r="6.5" fill="hsl(var(--background))" fillOpacity=".55" stroke={INK} strokeWidth="2" />
        <path d="M15 15 l6 6" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* ---------------------------------------------------------------- MRV */

/** A drawn track under the five steps, with a document chip travelling along it. */
export function PipelineTrack({ steps }: { steps: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  return (
    <div ref={ref} className="relative mb-6 h-10" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 40" preserveAspectRatio="none">
        <path pathLength={1} d="M10 22 C 80 8, 140 34, 250 20 S 420 8, 490 22" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeDasharray="1" className={`tr-path ${inView ? "tr-draw-on" : ""}`} />
        {Array.from({ length: steps }, (_, i) => (
          <circle key={i} cx={10 + (480 / (steps - 1)) * i} cy={i % 2 ? 24 : 18} r="4.5" fill="hsl(var(--background))" stroke={INK} strokeWidth="2" />
        ))}
      </svg>
      <span className={`tr-doc ${inView ? "tr-doc-on" : ""}`} />
    </div>
  );
}

/* ---------------------------------------------------------------- Intelligence */

/** One ledger record fanning out to every framework it feeds. */
export function LedgerFanOut({ targets }: { targets: string[] }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.35);
  const w = 640, h = 150, left = 70;
  return (
    <div ref={ref} className="mb-8 overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto h-auto w-full min-w-[520px] max-w-3xl" role="img" aria-label={`One verified ledger feeding ${targets.join(", ")}`}>
        <circle cx={left} cy={h / 2} r="14" fill={INK} />
        <text x={left} y={h / 2 + 34} textAnchor="middle" fontSize="12" fill="hsl(var(--muted-foreground))">ledger</text>
        {targets.map((t, i) => {
          const y = 12 + (i * (h - 24)) / (targets.length - 1);
          return (
            <g key={t}>
              <path pathLength={1} d={`M${left + 14} ${h / 2} C ${left + 160} ${h / 2}, ${w - 300} ${y}, ${w - 150} ${y}`} fill="none" stroke={INK} strokeOpacity=".55" strokeWidth="1.6" strokeDasharray="1"
                className={`tr-path ${inView ? "tr-draw-on" : ""}`} style={{ transitionDelay: `${i * 0.08}s` }} />
              <circle cx={w - 150} cy={y} r="3.5" fill={INK} />
              <text x={w - 140} y={y + 4} fontSize="12" fill="hsl(var(--foreground))">{t}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- Governance */

/** A padlock whose shackle clicks shut when the section is in view. */
export function LockDoodle() {
  const { ref, inView } = useInView<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className="mb-6 w-16" aria-hidden="true">
      <svg viewBox="0 0 64 72" className="h-auto w-full">
        <path className={`tr-shackle ${inView ? "tr-shackle-on" : ""}`} d="M18 34 V22 a14 14 0 0 1 28 0 V34" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <rect x="10" y="32" width="44" height="34" rx="8" fill={INK} />
        <circle cx="32" cy="47" r="4" fill="hsl(var(--background))" />
        <path d="M32 50 v7" stroke="hsl(var(--background))" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
