export type RoleFunction =
  | "Engineering"
  | "AI & Research"
  | "Design"
  | "Climate & Carbon"
  | "Growth & Operations"
  | "Founder's Office";

export type RoleLevel = "Intern" | "Fresher" | "Mid" | "Senior" | "Staff / Lead";

export type RoleLocation = "Gurugram" | "Remote (India)" | "Hybrid";

export interface CareerRole {
  id: string;
  title: string;
  function: RoleFunction;
  level: RoleLevel;
  location: RoleLocation;
  scope: string;
}

/**
 * Honest, small role set. Every row backed by real intent to hire.
 * Freshers/Interns route to the Google Form; all others route to Platform + mailto.
 */
export const careersRoles: CareerRole[] = [
  {
    id: "founding-engineer",
    title: "Founding Engineer",
    function: "Engineering",
    level: "Senior",
    location: "Gurugram",
    scope:
      "Own core MRV pipeline, deterministic carbon math, and the trust layer end-to-end.",
  },
  {
    id: "applied-ai-engineer",
    title: "Applied AI Engineer",
    function: "AI & Research",
    level: "Mid",
    location: "Hybrid",
    scope:
      "Ship document extraction, voice interfaces, and Scope 3 inference against real MSME data.",
  },
  {
    id: "climate-research",
    title: "Climate Research Associate",
    function: "Climate & Carbon",
    level: "Mid",
    location: "Remote (India)",
    scope:
      "Own emission factor governance, methodology versioning, CBAM/BRSR alignment, and audit defensibility.",
  },
  {
    id: "product-designer",
    title: "Product Designer",
    function: "Design",
    level: "Mid",
    location: "Hybrid",
    scope:
      "Design calm, regulator-safe surfaces used by MSME owners, auditors, and lenders in one flow.",
  },
  {
    id: "growth-operator",
    title: "Growth & Operations",
    function: "Growth & Operations",
    level: "Mid",
    location: "Gurugram",
    scope:
      "Move partners, lenders, and MSMEs from first touch to signed pilot without a sales machine.",
  },
  {
    id: "founders-office",
    title: "Founder's Office",
    function: "Founder's Office",
    level: "Mid",
    location: "Gurugram",
    scope:
      "Sit next to the founders. Run the hardest un-owned problem each week — research, strategy, execution.",
  },
  {
    id: "fresher-general",
    title: "Freshers — Engineering, Research, Design, Ops",
    function: "Engineering",
    level: "Fresher",
    location: "Hybrid",
    scope:
      "Open track for recent graduates. Ship real work in week one. High ownership, direct mentorship.",
  },
  {
    id: "intern-general",
    title: "Interns — Applied AI, Climate, Product",
    function: "AI & Research",
    level: "Intern",
    location: "Remote (India)",
    scope:
      "3–6 month projects with real production scope. Strong performers convert to full-time.",
  },
];

export const FRESHER_FORM_URL = "https://forms.gle/N9AfdfTdFGhmkAUJ9";
export const APPLY_EMAIL = "build@senseible.earth";
