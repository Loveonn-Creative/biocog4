import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { StatusBadge } from "../StatusBadge";
import { prefersReducedMotion } from "@/components/services/motion/kit";

// Each question names the records it reads and the engine that answers it.
// All engines named here run in the product today (supplier tiering, the
// CBAM engine, the framework coverage engine, the net-zero engine and the
// ESG Intelligence chat, which answers in Indian languages on Pro and Scale).
const QUESTIONS = [
  {
    key: "suppliers",
    q: "Which suppliers carry most of our Scope 3?",
    reads: "Supplier records, each with its tier and source hash",
    engine: "Supplier tiering",
    answer: "A ranked list of suppliers by share of Scope 3, marked primary, document-based or spend-only, so you know whose data to upgrade first.",
  },
  {
    key: "cbam",
    q: "What will CBAM cost us in 2030?",
    reads: "Product records with HSN/CN codes and tonnage",
    engine: "CBAM engine",
    answer: "Cost per tonne and in total for each year to 2034, at EU default values and at your verified intensity, side by side.",
  },
  {
    key: "gaps",
    q: "Which disclosures are still gaps?",
    reads: "Every verified record, target and evidence file",
    engine: "Framework coverage engine",
    answer: "For each framework, what your records already evidence, what more data would close, and what only you can author.",
  },
  {
    key: "cut",
    q: "Where is the cheapest tonne to cut?",
    reads: "Your baseline by scope and your sector",
    engine: "Net-zero engine",
    answer: "Reduction actions ranked by impact for the effort, with estimated cost and payback, ready to track.",
  },
  {
    key: "lang",
    q: "बिजली का कार्बन कैसे घटाएँ?",
    reads: "Your Scope 2 records",
    engine: "ESG Intelligence",
    answer: "The same answer, from the same records, in the language you asked in.",
  },
] as const;

/**
 * Biocog reads one ledger and answers from it. Pick a question to see what it
 * reads, which engine answers, and the shape of the answer.
 */
export const BiocogMind = () => {
  const t = useT();
  const [active, setActive] = useState<string>(QUESTIONS[0].key);
  const [typed, setTyped] = useState(0);
  const q = QUESTIONS.find(x => x.key === active)!;
  const answer = t(`ent.mind.${q.key}.a`, q.answer);

  useEffect(() => {
    if (prefersReducedMotion()) { setTyped(answer.length); return; }
    setTyped(0);
    let n = 0;
    const id = window.setInterval(() => { n += 3; setTyped(Math.min(n, answer.length)); if (n >= answer.length) window.clearInterval(id); }, 16);
    return () => window.clearInterval(id);
  }, [answer]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div role="radiogroup" aria-label={t("ent.mind.aria", "Questions")} className="flex flex-col gap-2">
        {QUESTIONS.map(x => (
          <button key={x.key} role="radio" aria-checked={x.key === active} onClick={() => setActive(x.key)}
            className={`text-left rounded-2xl px-4 py-3 text-sm sm:text-base transition-colors ${x.key === active ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>
            {t(`ent.mind.${x.key}.q`, x.q)}
          </button>
        ))}
      </div>

      <div key={q.key} className="relative rounded-3xl border border-border p-5 sm:p-7">
        <ol className="relative space-y-6">
          <span className="absolute left-[0.6rem] top-3 bottom-3 w-px bg-border" aria-hidden="true" />
          {[
            { k: t("ent.mind.reads", "Reads"), v: t(`ent.mind.${q.key}.r`, q.reads) },
            { k: t("ent.mind.engine", "Answers with"), v: t(`ent.mind.${q.key}.e`, q.engine), live: true },
          ].map((row, i) => (
            <li key={row.k} className="relative pl-8 animate-[ent-fade-up_0.4s_ease-out_both]" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="absolute left-0 top-0.5 h-5 w-5 rounded-full border-2 border-primary bg-background" aria-hidden="true" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{row.k}</p>
              <p className="mt-1 text-sm sm:text-base flex flex-wrap items-center gap-2">{row.v}{row.live && <StatusBadge status="live" />}</p>
            </li>
          ))}
          <li className="relative pl-8 animate-[ent-fade-up_0.4s_ease-out_both]" style={{ animationDelay: "240ms" }}>
            <span className="absolute left-0 top-0.5 h-5 w-5 rounded-full bg-primary" aria-hidden="true" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("ent.mind.answer", "Answer")}</p>
            {/* The full answer reserves its space invisibly; the typed copy sits on top, so nothing below moves. */}
            <div className="relative mt-1 text-base sm:text-lg font-medium">
              <p className="invisible" aria-hidden="true">{answer}</p>
              <p className="absolute inset-0" aria-live="polite">
                {answer.slice(0, typed)}<span className={typed < answer.length ? "inline-block w-2 h-5 align-middle bg-foreground/60 ml-0.5" : "hidden"} aria-hidden="true" />
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("ent.mind.cites", "Every answer starts from your verified records.")}</p>
          </li>
        </ol>
      </div>
    </div>
  );
};
