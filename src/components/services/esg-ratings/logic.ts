// EcoVadis readiness self-check. Our own scoring, not an EcoVadis score:
// EcoVadis assesses four themes on policies, actions and results, and only
// counts what is backed by documents. Here each yes = 1, partly = 0.5, no = 0.

export type Answer = "yes" | "partly" | "no";
export type ThemeKey = "environment" | "labour" | "ethics" | "procurement";

export interface Question { id: string; label: string; doc: string }
export interface Theme { key: ThemeKey; name: string; short: string; questions: Question[] }

export const THEMES: Theme[] = [
  {
    key: "environment", name: "Environment", short: "Environment",
    questions: [
      { id: "env_policy", label: "Written environmental policy with targets", doc: "Environmental policy with targets" },
      { id: "env_s12", label: "Scope 1 and 2 measured, with bills as evidence", doc: "Scope 1 and 2 inventory with evidence" },
      { id: "env_actions", label: "Energy or emissions actions in place", doc: "Records of energy or emissions actions" },
    ],
  },
  {
    key: "labour", name: "Labour and human rights", short: "Labour",
    questions: [
      { id: "lab_policy", label: "Labour and human rights policy", doc: "Labour and human rights policy" },
      { id: "lab_hs", label: "Health and safety policy and injury records", doc: "Health and safety policy and injury records" },
      { id: "lab_hours", label: "Working hours, wages and grievance mechanism documented", doc: "Working hours, wages and grievance records" },
    ],
  },
  {
    key: "ethics", name: "Ethics", short: "Ethics",
    questions: [
      { id: "eth_abc", label: "Anti-bribery and corruption policy", doc: "Anti-bribery and corruption policy" },
      { id: "eth_data", label: "Information security or data protection policy", doc: "Information security or data protection policy" },
    ],
  },
  {
    key: "procurement", name: "Sustainable procurement", short: "Procurement",
    questions: [
      { id: "proc_code", label: "Supplier code of conduct", doc: "Supplier code of conduct" },
      { id: "proc_assess", label: "Supplier ESG assessments done", doc: "Supplier ESG assessment records" },
    ],
  },
];

export const ALL_QUESTIONS = THEMES.flatMap(t => t.questions);
export const POINTS: Record<Answer, number> = { yes: 1, partly: 0.5, no: 0 };
export type Answers = Partial<Record<string, Answer>>;

/** Theme readiness 0..1. Unanswered questions count as 0. */
export function themeScore(theme: Theme, a: Answers): number {
  const pts = theme.questions.reduce((s, q) => s + (a[q.id] ? POINTS[a[q.id] as Answer] : 0), 0);
  return pts / theme.questions.length;
}

export function isThemeAnswered(theme: Theme, a: Answers): boolean {
  return theme.questions.every(q => !!a[q.id]);
}

export interface Readiness {
  themes: { key: ThemeKey; name: string; score: number }[];
  /** Equal-weight average of the four theme scores, 0..1. */
  overall: number;
  weakest: { key: ThemeKey; name: string; score: number };
  /** Missing documents first (no), then partial ones. */
  missing: string[];
}

export function readiness(a: Answers): Readiness {
  const themes = THEMES.map(t => ({ key: t.key, name: t.name, score: themeScore(t, a) }));
  const overall = themes.reduce((s, t) => s + t.score, 0) / themes.length;
  const weakest = themes.reduce((w, t) => (t.score < w.score ? t : w), themes[0]);
  const no = ALL_QUESTIONS.filter(q => a[q.id] === "no" || !a[q.id]).map(q => q.doc);
  const partly = ALL_QUESTIONS.filter(q => a[q.id] === "partly").map(q => q.doc);
  return { themes, overall, weakest, missing: [...no, ...partly] };
}

export const pct = (x: number) => Math.round(x * 100);

export function headline(r: Readiness): string {
  return `Readiness ${pct(r.overall)}%. Weakest theme: ${r.weakest.name.toLowerCase()}. Our self-check, not an EcoVadis score.`;
}

export function summary(r: Readiness): string {
  const parts = r.themes.map(t => `${t.name} ${pct(t.score)}%`).join(", ");
  const top = r.missing.slice(0, 3);
  return `Readiness ${pct(r.overall)}% (${parts}).` +
    (top.length ? ` Top documents to prepare: ${top.join("; ")}.` : " Every document is in place: keep the evidence current.");
}
