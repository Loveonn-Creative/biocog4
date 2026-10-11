// Which ESG frameworks apply. Pure rules, each tied to a reviewed fact in
// src/data/cmsContent.ts or src/data/services/index.ts:
// - BRSR: mandatory for the top 1,000 listed entities by market cap.
// - BRSR Core assurance or assessment phases in: top 150 / 250 / 500 / 1,000
//   for FY 2023-24 / 2024-25 / 2025-26 / 2026-27 (SEBI circular, 28 March 2025).
// - Value-chain disclosures: voluntary for the top 250 from FY 2025-26, so
//   listed customers ask suppliers for data.
// - CBAM: the EU importer declares; certificates on sale 1 February 2027,
//   first declaration by 30 September 2027; importers at 50 t or less a year exempt.
// - CSRD after Directive (EU) 2026/470: over 1,000 employees and EUR 450 million
//   turnover; needs double materiality. EU buyers in scope ask suppliers.
// - ISSB IFRS S1/S2: apply where a jurisdiction adopts them or investors ask
//   (S2 effective for periods from 1 January 2024 where adopted). Not asserted
//   as adopted in India. TCFD is carried into IFRS S2. GRI, SASB voluntary.

export type CapBand = "top150" | "top250" | "top500" | "top1000" | "beyond" | "unlisted";
export type Buyer = "eu" | "cbam" | "listedIn" | "investors";
export type Status = "required" | "asked" | "optional" | "none";
export type FrameworkId = "brsr" | "brsrCore" | "cbam" | "csrd" | "issb" | "gri" | "sasb" | "tcfd";

export interface EsgInput { cap: CapBand | null; buyers: Buyer[]; euGroup: boolean | null }
export interface FrameworkResult { id: FrameworkId; status: Status; why: string }

export const FRAMEWORK_LABEL: Record<FrameworkId, string> = {
  brsr: "BRSR", brsrCore: "BRSR Core", cbam: "CBAM", csrd: "CSRD / ESRS",
  issb: "ISSB S1/S2", gri: "GRI", sasb: "SASB", tcfd: "TCFD",
};

export const STATUS_LABEL: Record<Status, string> = {
  required: "Required", asked: "Asked by your buyers", optional: "Optional", none: "Not for you now",
};

export const CAP_OPTIONS: { value: CapBand; label: string }[] = [
  { value: "top150", label: "Top 150" }, { value: "top250", label: "Top 151 to 250" },
  { value: "top500", label: "Top 251 to 500" }, { value: "top1000", label: "Top 501 to 1,000" },
  { value: "beyond", label: "Listed, beyond top 1,000" }, { value: "unlisted", label: "Unlisted" },
];

const CORE_FY: Partial<Record<CapBand, string>> = {
  top150: "FY 2023-24", top250: "FY 2024-25", top500: "FY 2025-26", top1000: "FY 2026-27",
};

/** Data topics each framework draws on. A concept of reuse, not a count of data points. */
export type Topic = "s12" | "s3" | "energy" | "water" | "waste" | "social" | "governance" | "product" | "materiality" | "risk";
export const TOPICS: Record<FrameworkId, Topic[]> = {
  brsr: ["s12", "s3", "energy", "water", "waste", "social", "governance"],
  brsrCore: ["s12", "energy", "water", "waste", "social"],
  cbam: ["s12", "product"],
  csrd: ["s12", "s3", "energy", "water", "waste", "social", "governance", "materiality", "risk"],
  issb: ["s12", "s3", "governance", "risk"],
  gri: ["s12", "s3", "energy", "water", "waste", "social", "governance"],
  sasb: ["s12", "energy", "water"],
  tcfd: ["s12", "s3", "governance", "risk"],
};

/** Topics two frameworks share: the edge weight in the visual. */
export function sharedTopics(a: FrameworkId, b: FrameworkId): number {
  return TOPICS[a].filter(t => TOPICS[b].includes(t)).length;
}

export const FRAMEWORKS: FrameworkId[] = ["brsr", "brsrCore", "cbam", "csrd", "issb", "gri", "sasb", "tcfd"];

export function frameworks(i: EsgInput): FrameworkResult[] {
  const listed = i.cap !== null && i.cap !== "unlisted";
  const top1000 = i.cap !== null && i.cap in CORE_FY;
  const has = (b: Buyer) => i.buyers.includes(b);
  const out: Record<FrameworkId, FrameworkResult> = {} as Record<FrameworkId, FrameworkResult>;
  const set = (id: FrameworkId, status: Status, why: string) => { out[id] = { id, status, why }; };

  if (top1000) set("brsr", "required", "Mandatory for the top 1,000 listed companies by market cap.");
  else if (has("listedIn")) set("brsr", "asked", "Listed customers ask suppliers for value-chain data.");
  else set("brsr", "none", "Only the top 1,000 listed companies file it.");

  if (top1000) set("brsrCore", "required", `Assurance or assessment applies to your band from ${CORE_FY[i.cap as CapBand]}.`);
  else set("brsrCore", "none", "Phases in for the top 1,000 listed only.");

  if (has("cbam")) set("cbam", "asked", "Your EU importer needs your embedded emissions. Importers at 50 t a year or less are exempt.");
  else set("cbam", "none", "Only for CBAM goods sold into the EU.");

  if (i.euGroup) set("csrd", "required", "Over 1,000 employees and €450 million turnover. Needs double materiality.");
  else if (has("eu")) set("csrd", "asked", "EU buyers in CSRD scope ask suppliers for data.");
  else set("csrd", "none", "For EU groups over 1,000 employees and €450 million turnover.");

  if (has("investors")) set("issb", "asked", "Your investors ask for climate data. IFRS S2 is the format to check with them.");
  else if (listed) set("issb", "optional", "Applies where a jurisdiction adopts it or investors ask.");
  else set("issb", "none", "Applies where adopted or where investors ask.");

  set("gri", "optional", has("eu") || has("listedIn") || top1000 ? "Voluntary. Widely used to answer buyer questionnaires." : "Voluntary. A common starting point.");

  if (has("investors")) set("sasb", "optional", "Voluntary industry metrics some investors use.");
  else set("sasb", "none", "Voluntary. Mainly investor-led.");

  if (has("investors")) set("tcfd", "optional", "Carried into IFRS S2. Report under S2 instead.");
  else set("tcfd", "none", "Carried into IFRS S2.");

  return FRAMEWORKS.map(id => out[id]);
}

export function summarise(list: FrameworkResult[]) {
  const by = (s: Status) => list.filter(f => f.status === s).map(f => FRAMEWORK_LABEL[f.id]);
  const required = by("required"), asked = by("asked"), optional = by("optional");
  const plural = (n: number) => (n === 1 ? "framework" : "frameworks");
  let headline: string;
  if (required.length && asked.length) headline = `${required.length} ${plural(required.length)} required and ${asked.length} asked by your buyers: ${[...required, ...asked].join(", ")}.`;
  else if (required.length) headline = `${required.length} ${plural(required.length)} required: ${required.join(", ")}.`;
  else if (asked.length) headline = `None required, but your buyers will ask for ${asked.join(", ")}.`;
  else headline = `No framework is required for you today. ${optional[0] ?? "GRI"} is an optional start.`;
  const summary = [
    required.length ? `Required: ${required.join(", ")}.` : "",
    asked.length ? `Asked by buyers: ${asked.join(", ")}.` : "",
    optional.length ? `Optional: ${optional.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
  return { headline, summary, required, asked, optional };
}
