import { useEffect, useMemo, useState } from "react";
import { CREDIBILITY_WEIGHTS } from "@/lib/credibilityScore";

// Interactive sections for /trust. All page wording is passed in from the
// page; the few new labels here name controls, not claims.

/* ------------------------------------------------------------ Doodle icons */

const GLYPHS: Record<string, string> = {
  layers: "M4 9 L12 5 L20 9 L12 13 Z M4 13 L12 17 L20 13 M4 17 L12 21 L20 17",
  ledger: "M5 5 h14 v14 h-14 Z M5 9 h14 M5 13 h14 M9 5 v14",
  network: "M12 4 v5 M12 9 L6 15 M12 9 L18 15 M4 15 h4 v4 h-4 Z M16 15 h4 v4 h-4 Z M10 3 h4 v4 h-4 Z",
  spark: "M12 3 C 13 9, 15 11, 21 12 C 15 13, 13 15, 12 21 C 11 15, 9 13, 3 12 C 9 11, 11 9, 12 3 Z",
  scroll: "M7 4 h10 a2 2 0 0 1 2 2 v12 a2 2 0 0 1 -2 2 h-10 M7 4 a2 2 0 0 0 -2 2 v2 h4 M9 9 h7 M9 12 h7 M9 15 h5",
  gauge: "M4 16 a8 8 0 0 1 16 0 M12 16 L16 10 M7 16 h-1 M18 16 h-1",
  alert: "M12 4 L21 19 H3 Z M12 10 v4 M12 16.5 v.5",
  arrow: "M4 12 C 9 10, 14 13, 19 12 M15 8 L19 12 L15 16",
  target: "M12 4 a8 8 0 1 0 .1 0 M12 8 a4 4 0 1 0 .1 0 M12 12 L19 5",
  lock: "M8 11 V8 a4 4 0 0 1 8 0 V11 M6 11 h12 v9 h-12 Z M12 14 v3",
  invoice: "M7 3 h7 l4 4 v14 h-11 Z M14 3 v4 h4 M9.5 11 h6 M9.5 14 h6 M9.5 17 h4",
  meter: "M5 7 h14 v12 h-14 Z M8 11 h3 M13 11 h3 M8 15 L11 13 L13 15 L16 12",
  signal: "M5 10 a10 10 0 0 1 14 0 M8 13 a5.5 5.5 0 0 1 8 0 M12 16.5 v.5",
  satellite: "M8 8 L12 12 M5 5 L8 8 M12 12 L15 15 M4 9 L9 4 M15 20 L20 15 M14 7 a4 4 0 0 1 3 3 M15 4 a7 7 0 0 1 5 5",
  pin: "M12 21 C 7 15, 6 12, 6 10 a6 6 0 0 1 12 0 C 18 12, 17 15, 12 21 Z M12 8 a2 2 0 1 0 .1 0",
  factory: "M3 20 V11 L8 14 V11 L13 14 V7 h4 v13 Z M7 17 h2 M12 17 h2",
  banknote: "M3 7 h18 v10 h-18 Z M12 10 a2 2 0 1 0 .1 0 M6 10 v4 M18 10 v4",
  coin: "M12 4 a8 8 0 1 0 .1 0 M12 8 v8 M9.5 10 c 0 -1.5, 5 -1.5, 5 0 s -5 1.5, -5 3 s 5 1.5, 5 0",
};

/** Hand-drawn line icon, slightly uneven like the doodles on the page. */
export function Glyph({ name, className = "h-5 w-5" }: { name: keyof typeof GLYPHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: "rotate(-2deg)" }}>
      <path d={GLYPHS[name] ?? GLYPHS.spark} />
    </svg>
  );
}

/* ------------------------------------------------------------ Scope 3 */

export interface Scope3Example { headline: string; example: string; frameworks: string }
export interface CountryId { country: string; id: string }

const TZ_TO_CODE: Record<string, string> = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Jakarta": "ID", "Asia/Makassar": "ID", "Asia/Jayapura": "ID",
  "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN", "Asia/Bangkok": "TH", "Asia/Manila": "PH", "Asia/Kuala_Lumpur": "MY",
  "Asia/Dhaka": "BD", "Asia/Karachi": "PK", "Asia/Singapore": "SG", "Asia/Colombo": "LK",
};

/** The visitor's market from their time zone, when it is one of ours. */
export function detectMarket(available: string[]): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const code = TZ_TO_CODE[tz];
    if (code && available.includes(code)) return code;
  } catch { /* fall through */ }
  return available.includes("IN") ? "IN" : available[0];
}

const gridFactorOf = (text: string) => /\(([\d.]+) kgCO₂e\/kWh\)/.exec(text)?.[1] ?? null;

/**
 * Pick a market by its tax identifier; the supply-chain flow redraws for it:
 * supplier invoice, the local tax ID it carries, the grid factor applied,
 * and the frameworks the figure feeds. Only markets with an example are offered.
 */
export function Scope3Explorer({ examples, countryIds, nameOf, value, onChange }: {
  examples: Record<string, Scope3Example>;
  countryIds: CountryId[];
  nameOf: (code: string) => string | undefined;
  value: string;
  onChange: (code: string) => void;
}) {
  const markets = useMemo(() => Object.keys(examples).map((code) => ({
    code, name: nameOf(code) ?? code, taxId: countryIds.find((c) => c.country === nameOf(code))?.id ?? "Tax ID",
  })), [examples, countryIds, nameOf]);
  const current = examples[value] ? value : markets[0].code;
  const ex = examples[current];
  const m = markets.find((x) => x.code === current)!;
  const factor = gridFactorOf(ex.example);
  const steps = [
    { label: "Supplier invoice", value: m.name },
    { label: "Tax identifier", value: m.taxId },
    { label: "Grid factor", value: factor ? `${factor} kgCO₂e/kWh` : "Country factor" },
    { label: "Frameworks", value: ex.frameworks },
  ];

  return (
    <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="text-sm font-medium mb-3">How it looks in your market</div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Market">
        {markets.map((x) => (
          <button key={x.code} type="button" role="radio" aria-checked={x.code === current} onClick={() => onChange(x.code)}
            className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${x.code === current ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
            {x.name} · {x.taxId}
          </button>
        ))}
      </div>

      {/* The flow redraws for the chosen market (keyed so the drawing replays). */}
      <ol key={current} className="tr3-flow mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={`Supplier evidence flow for ${m.name}`}>
        {steps.map((s, i) => (
          <li key={s.label} className="tr3-step relative rounded-xl border border-border bg-card p-3" style={{ animationDelay: `${i * 0.18}s` }}>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-sm font-medium break-words">{s.value}</p>
            {i < steps.length - 1 && (
              <svg className="tr3-link absolute hidden sm:block -right-3 top-1/2 h-4 w-6 -translate-y-1/2" viewBox="0 0 24 16" aria-hidden="true">
                <path pathLength={1} d="M1 8 C 8 4, 14 12, 21 8 M17 4 L21 8 L17 12" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${0.2 + i * 0.18}s` }} />
              </svg>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-5 text-base font-medium mb-2">{ex.headline}</div>
      <p className="text-sm text-muted-foreground leading-relaxed">{ex.example}</p>
    </div>
  );
}

/* ------------------------------------------------------------ Score */

export interface ScoreInput { name: string; desc: string }

const GRADES: Array<{ min: number; grade: string }> = [{ min: 90, grade: "A+" }, { min: 75, grade: "A" }, { min: 55, grade: "B" }, { min: 35, grade: "C" }, { min: 0, grade: "D" }];
const KEY_ORDER: Array<keyof typeof CREDIBILITY_WEIGHTS> = ["evidence", "greenBenefit", "completeness", "history"];
const TONES = ["hsl(var(--primary))", "#3fae6b", "#f4a21a", "#7c8b82"];

/**
 * The score as you build it: four controls (the four published inputs) feed
 * the real weighting, a stacked bar shows what each contributes, and the
 * grade stamps when it changes band. Values are a sample, not anyone's data.
 */
export function ScoreComposer({ inputs, bands }: { inputs: ScoreInput[]; bands: string[] }) {
  const [vals, setVals] = useState([82, 30, 74, 40]);
  const parts = inputs.map((_, i) => CREDIBILITY_WEIGHTS[KEY_ORDER[i]] * vals[i]);
  const score = Math.round(parts.reduce((a, b) => a + b, 0));
  const grade = GRADES.find((g) => score >= g.min)!.grade;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
      <div className="grid gap-3 sm:grid-cols-2">
        {inputs.map((b, i) => (
          <div key={b.name} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`score-${i}`} className="text-sm font-medium">{b.name}</label>
              <span className="text-xs tabular-nums text-muted-foreground">{Math.round(CREDIBILITY_WEIGHTS[KEY_ORDER[i]] * 100)}% weight</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
            <input id={`score-${i}`} type="range" min={0} max={100} value={vals[i]} onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              className="mt-3 w-full" style={{ accentColor: TONES[i] }} aria-valuetext={`${vals[i]} out of 100`} />
          </div>
        ))}
      </div>

      <div className="order-first rounded-2xl border border-border bg-card p-5 lg:order-none">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Sample score</p>
            <p className="text-6xl font-semibold leading-none tabular-nums" aria-live="polite">{score}</p>
          </div>
          <span key={grade} className="tr3-stamp grid h-20 w-20 place-items-center rounded-full border-[3px] text-2xl font-bold" style={{ borderColor: TONES[0], color: TONES[0] }} aria-label={`Grade ${grade}`}>{grade}</span>
        </div>
        <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {parts.map((p, i) => <span key={i} className="h-full transition-[width] duration-300" style={{ width: `${p}%`, background: TONES[i] }} />)}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {inputs.map((b, i) => <li key={b.name} className="flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TONES[i] }} />{b.name}: {parts[i].toFixed(1)}</li>)}
        </ul>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {bands.map((g) => (
            <span key={g} className={`rounded-full border px-2 py-0.5 text-xs ${g.startsWith(grade + " ") ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Greenwashing */

export interface Mechanism { name: string; desc: string }

const TRIES = [
  "Upload the same invoice twice",
  "Quietly redo a failed run",
  "Swap in a newer factor later",
  "Leave the quantity blank",
  "Count a reduction that would have happened anyway",
  "Report an outlier figure",
];

/**
 * Try to sneak a claim through: each attempt lights the mechanism that stops
 * it and stamps it. The mechanism text is the page's own.
 */
export function ClaimGauntlet({ mechanisms }: { mechanisms: Mechanism[] }) {
  const [tried, setTried] = useState<number | null>(null);
  return (
    <div>
      <p className="mb-3 text-sm font-medium">Try to get a claim through:</p>
      <div className="mb-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Attempts">
        {TRIES.slice(0, mechanisms.length).map((t, i) => (
          <button key={t} type="button" role="radio" aria-checked={tried === i} onClick={() => setTried(tried === i ? null : i)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${tried === i ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-background hover:border-destructive/50"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {mechanisms.map((m, i) => {
          const hit = tried === i, dim = tried !== null && !hit;
          return (
            <div key={m.name} className={`relative rounded-2xl border p-5 transition-all duration-300 ${hit ? "border-destructive bg-destructive/5 shadow-md" : "border-border bg-card"} ${dim ? "opacity-45" : ""}`}>
              {hit && <span className="tr3-stamp absolute right-4 top-4 rotate-[-8deg] rounded-md border-2 border-destructive px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-destructive">Stopped here</span>}
              <div className="text-sm font-medium mb-2 pr-24">{m.name}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Safeguards */

export interface Safeguard { id: string; title: string; summary: string; points: string[] }

/**
 * A reader for many safeguards: an index to scan, one safeguard open at a
 * time, next and previous to move on. Every panel stays in the page (for
 * search and for /trust#id links), only the open one is shown.
 */
export function SafeguardReader({ items }: { items: Safeguard[] }) {
  const fromHash = () => {
    if (typeof window === "undefined") return 0;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const i = items.findIndex((x) => x.id === id);
    return i < 0 ? 0 : i;
  };
  const [open, setOpen] = useState(fromHash);
  useEffect(() => {
    const onHash = () => setOpen(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- items are static
  }, []);
  const go = (i: number) => setOpen((i + items.length) % items.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)]">
      <nav aria-label="Safeguards" className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:overflow-visible lg:px-0">
        <ol className="flex gap-2 lg:flex-col lg:gap-1">
          {items.map((it, i) => (
            <li key={it.id} className="shrink-0">
              <button type="button" onClick={() => setOpen(i)} aria-current={open === i ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors lg:border-transparent ${open === i ? "border-primary bg-primary/10 font-medium text-foreground lg:border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] tabular-nums ${open === i ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>
                <span className="whitespace-nowrap lg:whitespace-normal">{it.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0">
        {items.map((it, i) => (
          <article key={it.id} id={it.id} hidden={open !== i} className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 sm:p-8" aria-labelledby={`${it.id}-title`}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground tabular-nums">{i + 1} of {items.length}</p>
            <h3 id={`${it.id}-title`} className="mt-2 text-2xl font-semibold tracking-tight">{it.title}</h3>
            <p className="tr3-lede mt-4 text-base leading-relaxed text-foreground/90">{it.summary}</p>
            <ol className="mt-6 grid gap-3">
              {it.points.map((p, j) => (
                <li key={p} className="tr3-point flex gap-3" style={{ animationDelay: `${0.1 + j * 0.08}s` }}>
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true"><path d="M3 10.5 C 5 12, 6.5 14, 8 15.5 C 11 10, 13.5 7, 17 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="text-sm leading-relaxed">{p}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <button type="button" onClick={() => go(i - 1)} className="shrink-0 whitespace-nowrap rounded-full border border-border px-3 py-1.5 hover:border-primary/50">Previous</button>
              <button type="button" onClick={() => go(i + 1)} className="min-w-0 truncate rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground"
                aria-label={`Next: ${items[(i + 1) % items.length].title}`}>
                <span className="sm:hidden">Next</span>
                <span className="hidden sm:inline">Next: {items[(i + 1) % items.length].title.length > 34 ? items[(i + 1) % items.length].title.slice(0, 32) + "…" : items[(i + 1) % items.length].title}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
