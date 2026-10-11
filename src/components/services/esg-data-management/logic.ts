// Audit readiness score: seven controls an assurer checks first.
//
// Scoring: yes = 1, partly = 0.5, no = 0. Every control has the same weight
// (1). We have no sourced basis to rank one control above another, so none
// counts more; the score is the share of the maximum, rounded to a whole %.
// Ties between gaps are broken by the order below, which follows the path of
// a number from source document to report.

export type Answer = "yes" | "partly" | "no";
export type ControlKey = "source" | "owner" | "factor" | "changelog" | "finance" | "supplier" | "review";

export const POINTS: Record<Answer, number> = { yes: 1, partly: 0.5, no: 0 };

export interface Control {
  key: ControlKey;
  /** The yes/partly/no question. */
  question: string;
  /** Short name for legends. */
  short: string;
  /** Equal weights, see header. */
  weight: number;
  /** Gap phrase for the headline when answered "no" / "partly". */
  gapNo: string;
  gapPartly: string;
  /** What Senseible records to close it. No third-party certification claims. */
  senseible: string;
}

export const CONTROLS: Control[] = [
  {
    key: "source", short: "Source link", weight: 1,
    question: "Is every figure linked to a source document?",
    gapNo: "no source link for figures", gapPartly: "source links for only some figures",
    senseible: "Each source document is stored with a SHA-256 hash and linked to its figure.",
  },
  {
    key: "owner", short: "One owner", weight: 1,
    question: "Does each metric have one named owner?",
    gapNo: "no owner per metric", gapPartly: "owners for only some metrics",
    senseible: "Each figure records its reviewer and approval date.",
  },
  {
    key: "factor", short: "Factor and version", weight: 1,
    question: "Are the emission factor and method version recorded?",
    gapNo: "factor and method version not recorded", gapPartly: "factor and version recorded for only some lines",
    senseible: "Emission factor and methodology version are recorded on every line.",
  },
  {
    key: "changelog", short: "Change log", weight: 1,
    question: "Is every edit kept in a change log?",
    gapNo: "no change log of edits", gapPartly: "only some edits logged",
    senseible: "Approval log: each edit keeps who and when, and the history stays.",
  },
  {
    key: "finance", short: "Finance match", weight: 1,
    question: "Is it reconciled with finance records, such as energy spend against bills?",
    gapNo: "not reconciled with finance records", gapPartly: "only partly reconciled with finance records",
    senseible: "Each line is read from the bill or invoice, so it can be matched to what finance paid.",
  },
  {
    key: "supplier", short: "Supplier data", weight: 1,
    question: "Do you have supplier data for your main spend?",
    gapNo: "no supplier data for main spend", gapPartly: "supplier data for only part of main spend",
    senseible: "Supplier data is collected on the same platform, with its source document kept.",
  },
  {
    key: "review", short: "Independent review", weight: 1,
    question: "Has an independent review or assurance been done before?",
    gapNo: "no independent review yet", gapPartly: "only a partial independent review",
    senseible: "An evidence index your assurer can re-perform. The assurance opinion comes from your assurer.",
  },
];

export type Answers = Partial<Record<ControlKey, Answer>>;

export interface Gap { control: Control; answer: Answer; phrase: string }

/** Score over the answered controls (all seven once the tool is finished). */
export function readiness(answers: Answers) {
  let got = 0;
  let max = 0;
  for (const c of CONTROLS) {
    const a = answers[c.key];
    if (!a) continue;
    got += POINTS[a] * c.weight;
    max += c.weight;
  }
  const pct = max > 0 ? Math.round((got / max) * 100) : 0;
  const gaps: Gap[] = CONTROLS
    .map((control, i) => ({ control, i, answer: answers[control.key] }))
    .filter((g): g is { control: Control; i: number; answer: Answer } => g.answer === "no" || g.answer === "partly")
    .sort((a, b) => POINTS[a.answer] - POINTS[b.answer] || a.i - b.i)
    .map(({ control, answer }) => ({ control, answer, phrase: answer === "no" ? control.gapNo : control.gapPartly }));
  return { pct, answered: max, complete: CONTROLS.every(c => answers[c.key]), gaps, top: gaps.slice(0, 3) };
}

export function readinessHeadline(answers: Answers): string {
  const r = readiness(answers);
  if (!r.gaps.length) return `Audit readiness ${r.pct}%. No gaps found in these seven checks.`;
  return `Audit readiness ${r.pct}%. Biggest gap: ${r.top[0].phrase}.`;
}

const LABEL: Record<Answer, string> = { yes: "Yes", partly: "Partly", no: "No" };

/** Plain text for WhatsApp and the contact form. */
export function readinessSummary(answers: Answers): string {
  const r = readiness(answers);
  const gaps = r.top.length
    ? ` Top gaps: ${r.top.map((g, i) => `${i + 1}) ${g.phrase}`).join("; ")}.`
    : "";
  const list = CONTROLS.map(c => `${c.short}: ${answers[c.key] ? LABEL[answers[c.key] as Answer] : "-"}`).join(", ");
  return `Audit readiness ${r.pct}% across ${CONTROLS.length} controls, equal weights.${gaps} Answers: ${list}.`;
}
