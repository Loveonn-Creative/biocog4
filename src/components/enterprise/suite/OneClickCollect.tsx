import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, FileCheck2 } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { StatusBadge } from "../StatusBadge";
import { pipelineStages } from "@/data/enterpriseCapabilities";
import { prefersReducedMotion } from "@/components/services/motion/kit";

// Illustrative wave of 120 suppliers. Counts show how a wave narrows: some
// suppliers send nothing yet, and checks hold some records for a person.
const WAVE = 120;
const REACHED = [120, 96, 96, 88, 88];

/**
 * Press once and watch a supplier wave run from invitation to an
 * evidence-linked report. Each stage carries its real status.
 */
export const OneClickCollect = ({ onAsk }: { onAsk: (interest: string) => void }) => {
  const t = useT();
  const [step, setStep] = useState(-1); // -1 idle, 0..4 running, 5 done
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = () => {
    window.clearTimeout(timer.current);
    if (prefersReducedMotion()) { setStep(5); return; }
    let s = 0;
    setStep(0);
    const next = () => { s += 1; setStep(s); if (s < 5) timer.current = window.setTimeout(next, 650); };
    timer.current = window.setTimeout(next, 650);
  };

  const done = step >= 5;

  return (
    <div className="rounded-3xl border border-border p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("ent.wave.sub", "Illustration: one wave of 120 suppliers")}</p>
          <p className="text-lg font-medium mt-0.5" aria-live="polite">
            {step < 0 ? t("ent.wave.idle", "Ready when you are")
              : done ? t("ent.wave.done2", "Evidence linked. 8 records wait for a person.")
              : t(`ent.stage.${pipelineStages[Math.min(step, 4)].key}`, pipelineStages[Math.min(step, 4)].label) + "…"}
          </p>
        </div>
        <button onClick={run} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors ${done ? "border border-border hover:bg-secondary" : "bg-foreground text-background"}`}>
          {done ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {done ? t("ent.wave.again", "Run again") : t("ent.wave.run", "Collect from 120 suppliers")}
        </button>
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-5">
        {pipelineStages.map((s, i) => {
          const reached = step > i || done;
          const active = step === i;
          const pct = reached ? (REACHED[i] / WAVE) * 100 : active ? 40 : 0;
          return (
            <li key={s.key} className={`rounded-2xl p-3 transition-colors ${active ? "bg-secondary" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{i + 1}. {t(`ent.stage.${s.key}`, s.label)}</p>
                <StatusBadge status={s.status} />
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${s.status === "live" ? "bg-primary" : s.status === "pilot" ? "bg-warning" : "bg-foreground/50"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">{reached ? `${REACHED[i]} / ${WAVE}` : "–"}</p>
              {s.note && <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{t(`ent.stage.${s.key}.note`, s.note)}</p>}
            </li>
          );
        })}
      </ol>

      <div className={`mt-6 grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center rounded-2xl border border-dashed p-4 transition-opacity duration-500 ${done ? "opacity-100 border-primary/40" : "opacity-40 border-border"}`}>
        <FileCheck2 className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">{t("ent.wave.report", "Scope 3 report with an evidence trail")}</p>
          <p className="text-xs text-muted-foreground">{t("ent.wave.report.line", "88 verified records, each linked to its source hash. 8 flagged records sit in one queue for review.")}</p>
        </div>
        <button onClick={() => onAsk("Scope 3 and supplier emissions")} disabled={!done} className="text-sm font-medium underline underline-offset-4 disabled:no-underline text-left">
          {t("ent.wave.ask", "Run your first wave with us")}
        </button>
      </div>
    </div>
  );
};
