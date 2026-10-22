import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Camera, Gauge, Receipt, Check, Flag } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { useMotionGate } from "@/components/services/motion/kit";
import { EXAMPLES } from "./RecordTransform";

// The page's promise in one loop: what suppliers already have goes in at the
// top, passes the same checks the product runs (source hash, published
// factor, confidence), and lands as a row in the verified ledger. A spend-only
// supplier is flagged for a person instead of being counted as verified.
// Records are the page's illustrative EXAMPLES; tapping a source runs it and
// selects that example further down the page.

type Tier = "primary" | "document" | "estimate";

const SOURCES: { icon: typeof FileText; label: string; key: string; tier: Tier; custom?: boolean }[] = [
  { icon: FileText, label: "Invoice PDF", key: "ent.hero.src.invoice", tier: "document" },
  { icon: Camera, label: "Fuel slip", key: "ent.hero.src.slip", tier: "document" },
  { icon: Gauge, label: "Meter CSV", key: "ent.hero.src.meter", tier: "primary", custom: true },
  { icon: Receipt, label: "Spend only", key: "ent.hero.src.spend", tier: "estimate" },
];

const TIER_DOT: Record<Tier, string> = { primary: "bg-primary", document: "bg-success", estimate: "bg-warning" };

const ROW_H = 46;
const ROWS = 4;
// One cycle: travel to the checks, check, write the row, rest.
const T_CHECK = 520;
const T_COMMIT = 1400;
const T_NEXT = 3000;

interface Row { id: number; ex: number }

const isFlagged = (ex: number) => Number(EXAMPLES[ex].record.confidence) < 0.6;

export const LedgerHero = ({ onSelect }: { onSelect: (index: number) => void }) => {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const moving = useMotionGate(box, 0.2);
  // Still state: one row per source, the last one flagged.
  const [rows, setRows] = useState<Row[]>(() => [3, 2, 1, 0].map((ex, i) => ({ id: -1 - i, ex })));
  const [active, setActive] = useState<number | null>(null);
  const [phase, setPhase] = useState<"travel" | "check" | "done">("done");
  const [cycle, setCycle] = useState(0);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);
  const next = useRef(0);

  const clear = () => { timers.current.forEach(id => window.clearTimeout(id)); timers.current = []; };

  const run = useCallback((ex: number, animate: boolean) => {
    clear();
    const commit = () => {
      const id = ++seq.current;
      setRows(r => [{ id, ex }, ...r].slice(0, ROWS + 1));
      setPhase("done");
    };
    setActive(ex);
    setCycle(c => c + 1);
    if (!animate) { commit(); return; }
    setPhase("travel");
    timers.current.push(window.setTimeout(() => setPhase("check"), T_CHECK));
    timers.current.push(window.setTimeout(commit, T_COMMIT));
  }, []);

  // Auto-run through the sources while on screen; stops off screen, when the
  // tab is hidden, and never runs for reduced motion.
  useEffect(() => {
    if (!moving) { clear(); return; }
    let stop = false;
    const loop = () => {
      if (stop) return;
      run(next.current, true);
      next.current = (next.current + 1) % SOURCES.length;
      timers.current.push(window.setTimeout(loop, T_NEXT));
    };
    const start = window.setTimeout(loop, 600);
    return () => { stop = true; window.clearTimeout(start); clear(); };
  }, [moving, run]);

  const pick = (ex: number) => {
    onSelect(ex);
    next.current = (ex + 1) % SOURCES.length;
    run(ex, moving);
  };

  const ex = active ?? 0;
  const flagged = isFlagged(ex);
  const rec = EXAMPLES[ex].record;
  const checks = [
    { ok: !flagged, label: flagged ? t("ent.hero.chk.nodoc", "No document") : t("ent.hero.chk.hash", "Source hash") },
    { ok: !flagged, label: flagged ? t("ent.hero.chk.spend", "Spend factor") : t("ent.hero.chk.factor", "Published factor") },
    { ok: !flagged, label: `${t("ent.hero.chk.conf", "Confidence")} ${rec.confidence}` },
  ];

  return (
    <figure className="w-full">
      <div ref={box} className="mx-auto w-full max-w-[30rem]">
        {/* Sources: what suppliers already have */}
        <div role="group" aria-label={t("ent.hero.src.aria", "Supplier sources")} className="grid grid-cols-4 gap-2">
          {SOURCES.map((s, i) => {
            const on = active === i && phase !== "done";
            return (
              <button key={s.key} type="button" onClick={() => pick(i)} aria-pressed={active === i}
                className={`relative h-[4.25rem] rounded-2xl border px-1.5 pt-2 text-center transition-colors duration-[var(--motion-base)] ${on ? "border-foreground bg-secondary" : "border-border bg-background hover:bg-secondary/60"}`}>
                <s.icon className="mx-auto h-4 w-4" aria-hidden="true" />
                <span className="mt-1 block text-[10px] sm:text-[11px] leading-tight">{t(s.key, s.label)}</span>
                {s.custom && <span className="block font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{t("ent.status.custom", "Custom")}</span>}
                <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${TIER_DOT[s.tier]}`} aria-hidden="true" />
                {/* The document drops toward the checks */}
                {on && phase === "travel" && (
                  <span key={cycle} className="ent-packet pointer-events-none absolute left-1/2 top-full h-2.5 w-2 -translate-x-1/2 rounded-[2px] bg-foreground" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Checks: the same three the product runs on every record */}
        <div className="relative mt-5 h-12 overflow-hidden rounded-2xl border border-dashed border-foreground/30 px-3">
          {phase === "check" && <span key={cycle} className="ent-scan absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden="true" />}
          <div className="relative flex h-full items-center gap-1.5 sm:gap-2 overflow-hidden" aria-live="polite">
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">{t("ent.hero.checks", "Checks")}</span>
            {active === null ? (
              <span className="text-[11px] text-muted-foreground truncate">{t("ent.hero.tap", "Tap a source to run it")}</span>
            ) : checks.map((c, i) => (
              <span key={`${cycle}-${i}`}
                className={`ent-check inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] ${c.ok ? "bg-primary/10 text-primary" : "bg-warning/15 text-foreground"}`}
                style={{ animationDelay: phase === "done" ? "0ms" : `${T_CHECK - 80 + i * 150}ms` }}>
                {c.ok ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : <Flag className="h-3 w-3 shrink-0" aria-hidden="true" />}
                <span className="truncate">{c.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* The ledger: every row keeps its source */}
        <div className="mt-5 rounded-2xl bg-foreground text-background p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-background/60">{t("ent.hero.ledger", "Scope ledger")}</p>
            <p className="text-[10px] text-background/50">{t("ent.hero.ledger.note", "verified rows keep their source hash")}</p>
          </div>
          <ol className="relative mt-2" style={{ height: ROWS * ROW_H }}>
            <span className="absolute left-[5px] top-2 bottom-2 w-px bg-background/20" aria-hidden="true" />
            {rows.map((r, i) => {
              const e = EXAMPLES[r.ex].record;
              const flag = isFlagged(r.ex);
              const fresh = i === 0 && r.id > 0;
              return (
                <li key={r.id}
                  className={`absolute inset-x-0 flex items-start gap-3 pl-0 transition-[transform,opacity] duration-[var(--motion-base)] ease-[var(--ease-out)] ${fresh ? "ent-row-in" : ""}`}
                  style={{ height: ROW_H, transform: `translateY(${i * ROW_H}px)`, opacity: i >= ROWS ? 0 : 1 }}
                  aria-hidden={i >= ROWS}>
                  <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${flag ? "border-warning bg-foreground" : "border-primary bg-primary"} ${fresh ? "ent-seal" : ""}`} aria-hidden="true" />
                  <button type="button" onClick={() => pick(r.ex)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-baseline justify-between gap-2 text-[11px] sm:text-xs">
                      <span className="truncate">{e.scope} · {e.activity}</span>
                      <span className={`shrink-0 font-mono tabular-nums ${flag ? "text-warning dark:text-amber-800" : ""}`}>{flag ? t("ent.hero.flagged", "Review") : e.result}</span>
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-background/50">{flag ? t("ent.hero.queue", "To a person: request primary data") : `${e.source} · conf ${e.confidence}`}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" />{t("ent.graph.primary", "Primary data")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-success" />{t("ent.graph.document", "From documents")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-warning" />{t("ent.graph.estimate", "Spend estimate")}</span>
      </figcaption>
    </figure>
  );
};
