// Which supply-chain rules a seller's answers trigger, and a commodity risk
// heatmap. Pure rules, each tied to a fact in src/data/services/index.ts or
// the page spec:
// - LkSG: companies with at least 1,000 employees in Germany; their suppliers
//   are asked for evidence.
// - UFLPA: US imports linked to Xinjiang presumed made with forced labour since
//   21 June 2022. High-priority sectors: cotton/apparel, polysilicon/solar,
//   aluminium, PVC, tomatoes, seafood.
// - EUDR: cattle, cocoa, coffee, oil palm, rubber, soya and wood, and products
//   made from them, into the EU need deforestation-free and legality evidence.
// - Conflict minerals: tin, tantalum, tungsten and gold (3TG); many buyers also
//   screen cobalt and mica.
// - EU CSDDD: the largest EU companies, not before July 2028.

export type Market = "de" | "eu" | "us" | "india";
export type Origin = "yes" | "no" | "unsure";
export type Commodity =
  | "cotton" | "polysilicon" | "aluminium" | "pvc" | "tomatoes" | "seafood"
  | "3tg" | "cobalt" | "mica"
  | "cattle" | "cocoa" | "coffee" | "palm" | "rubber" | "soya" | "wood";
export type Level = "high" | "medium" | "low";
export type Risk = "forced" | "conflict" | "deforestation" | "trace";
export type LawId = "lksg" | "uflpa" | "eudr" | "conflict" | "csddd";
export type LawStatus = "applies" | "asked" | "prepare" | "none";

export interface SupplyInput {
  markets: Market[];
  de1000: boolean | null;
  commodities: Commodity[];
  xinjiang: Origin | null;
  drc: Origin | null;
}

export const COMMODITY_LABEL: Record<Commodity, string> = {
  cotton: "Cotton, apparel", polysilicon: "Polysilicon, solar", aluminium: "Aluminium", pvc: "PVC",
  tomatoes: "Tomatoes", seafood: "Seafood", "3tg": "Tin, tantalum, tungsten, gold", cobalt: "Cobalt", mica: "Mica",
  cattle: "Cattle, leather", cocoa: "Cocoa", coffee: "Coffee", palm: "Oil palm", rubber: "Rubber", soya: "Soya", wood: "Wood, paper",
};
/** Short names for the canvas. */
export const COMMODITY_SHORT: Record<Commodity, string> = {
  cotton: "Cotton", polysilicon: "Polysilicon", aluminium: "Aluminium", pvc: "PVC", tomatoes: "Tomatoes", seafood: "Seafood",
  "3tg": "3TG", cobalt: "Cobalt", mica: "Mica", cattle: "Cattle", cocoa: "Cocoa", coffee: "Coffee", palm: "Oil palm",
  rubber: "Rubber", soya: "Soya", wood: "Wood",
};

/** UFLPA high-priority sectors. */
export const UFLPA_SECTORS: Commodity[] = ["cotton", "polysilicon", "aluminium", "pvc", "tomatoes", "seafood"];
/** 3TG plus the minerals buyers commonly screen alongside it. */
export const MINERALS: Commodity[] = ["3tg", "cobalt", "mica"];
/** EUDR commodities. */
export const EUDR: Commodity[] = ["cattle", "cocoa", "coffee", "palm", "rubber", "soya", "wood"];
export const COMMODITIES: Commodity[] = [...UFLPA_SECTORS, ...MINERALS, ...EUDR];

export const RISK_LABEL: Record<Risk, string> = {
  forced: "Forced labour", conflict: "Conflict minerals", deforestation: "Deforestation", trace: "Traceability",
};
export const RISKS: Risk[] = ["forced", "conflict", "deforestation", "trace"];

export const LAW_LABEL: Record<LawId, string> = {
  lksg: "LkSG (Germany)", uflpa: "UFLPA (USA)", eudr: "EUDR (EU)", conflict: "Conflict minerals", csddd: "EU CSDDD",
};
/** Names for the one-line headline. */
export const LAW_SHORT: Record<LawId, string> = { lksg: "LkSG", uflpa: "UFLPA", eudr: "EUDR", conflict: "conflict minerals", csddd: "CSDDD" };
export const LAW_STATUS_LABEL: Record<LawStatus, string> = {
  applies: "Applies", asked: "Asked by your buyers", prepare: "Prepare", none: "Not triggered",
};

const sellsEU = (m: Market[]) => m.includes("de") || m.includes("eu");

/**
 * Risk rule table. A cell is how likely a buyer's due diligence flags this
 * commodity on this topic:
 *
 * | Topic          | High                                   | Medium                                   | Low       |
 * |----------------|----------------------------------------|------------------------------------------|-----------|
 * | Forced labour  | UFLPA sector and Xinjiang link = yes   | UFLPA sector; or any goods, Xinjiang yes | otherwise |
 * | Conflict       | 3TG or cobalt, DRC region link = yes   | 3TG, cobalt or mica                      | otherwise |
 * | Deforestation  | EUDR commodity sold into the EU        | EUDR commodity, not sold into the EU     | otherwise |
 * | Traceability   | "Not sure" on the origin that matters  | origin link = yes; any other "not sure"; | otherwise |
 * |                | for this commodity                     | EUDR commodity sold into the EU          |           |
 *
 * The origin that matters: Xinjiang for UFLPA sectors, the DRC region for
 * minerals. "Not sure" is a traceability gap, not a finding.
 */
export function cell(c: Commodity, r: Risk, i: Pick<SupplyInput, "markets" | "xinjiang" | "drc">): Level {
  const uflpa = UFLPA_SECTORS.includes(c), mineral = MINERALS.includes(c), eudr = EUDR.includes(c);
  if (r === "forced") {
    if (uflpa) return i.xinjiang === "yes" ? "high" : "medium";
    return i.xinjiang === "yes" ? "medium" : "low";
  }
  if (r === "conflict") {
    if (!mineral) return "low";
    return i.drc === "yes" && c !== "mica" ? "high" : "medium";
  }
  if (r === "deforestation") {
    if (!eudr) return "low";
    return sellsEU(i.markets) ? "high" : "medium";
  }
  const origin = uflpa ? i.xinjiang : mineral ? i.drc : null;
  if (origin === "unsure") return "high";
  if (origin === "yes") return "medium";
  if (i.xinjiang === "unsure" || i.drc === "unsure") return "medium";
  if (eudr && sellsEU(i.markets)) return "medium";
  return "low";
}

export type HeatRow = { commodity: Commodity; cells: Record<Risk, Level> };
export function heatmap(i: SupplyInput): HeatRow[] {
  return i.commodities.map(commodity => ({
    commodity,
    cells: { forced: cell(commodity, "forced", i), conflict: cell(commodity, "conflict", i), deforestation: cell(commodity, "deforestation", i), trace: cell(commodity, "trace", i) },
  }));
}

export const LEVEL_SCORE: Record<Level, number> = { high: 1, medium: 0.55, low: 0.15 };
/** Worst cell in a row, as a number for the visual. */
export function rowScore(row: HeatRow): number {
  return Math.max(...RISKS.map(r => LEVEL_SCORE[row.cells[r]]));
}

export interface LawResult { id: LawId; status: LawStatus; why: string }

export function laws(i: SupplyInput): LawResult[] {
  const has = (m: Market) => i.markets.includes(m);
  const any = (list: Commodity[]) => i.commodities.filter(c => list.includes(c));
  const out: LawResult[] = [];

  if (i.de1000) out.push({ id: "lksg", status: "applies", why: "You have 1,000+ employees in Germany, so the duty is yours." });
  else if (has("de")) out.push({ id: "lksg", status: "asked", why: "German buyers with 1,000+ staff in Germany ask suppliers for evidence." });
  else out.push({ id: "lksg", status: "none", why: "Only for sales to German buyers in scope." });

  const ufl = any(UFLPA_SECTORS);
  if (!has("us")) out.push({ id: "uflpa", status: "none", why: "Only for goods entering the US." });
  else if (i.xinjiang === "yes") out.push({ id: "uflpa", status: "applies", why: "Xinjiang-linked goods are presumed made with forced labour at US import since 21 June 2022." });
  else if (i.xinjiang === "unsure") out.push({ id: "uflpa", status: "prepare", why: "Map your origin. Xinjiang-linked goods face the US presumption since 21 June 2022." });
  else if (ufl.length) out.push({ id: "uflpa", status: "prepare", why: `${ufl.map(c => COMMODITY_SHORT[c]).join(", ")}: UFLPA high-priority sector. Keep origin evidence for your US importer.` });
  else out.push({ id: "uflpa", status: "none", why: "No Xinjiang link or high-priority sector in your answers." });

  const eu = any(EUDR);
  if (eu.length && sellsEU(i.markets)) out.push({ id: "eudr", status: "applies", why: `${eu.map(c => COMMODITY_SHORT[c]).join(", ")} into the EU need deforestation-free and legality evidence.` });
  else out.push({ id: "eudr", status: "none", why: eu.length ? "Only for these commodities sold into the EU." : "None of your inputs is an EUDR commodity." });

  const minerals = any(MINERALS);
  if (minerals.includes("3tg")) out.push({ id: "conflict", status: "asked", why: `Buyers run conflict-minerals due diligence on 3TG${i.drc === "yes" ? " from the DRC and adjoining countries" : ""}.` });
  else if (minerals.length) out.push({ id: "conflict", status: "asked", why: `${minerals.map(c => COMMODITY_SHORT[c]).join(" and ")}: not 3TG, but commonly screened by buyers.` });
  else out.push({ id: "conflict", status: "none", why: "No 3TG, cobalt or mica in your inputs." });

  if (sellsEU(i.markets)) out.push({ id: "csddd", status: "prepare", why: "Largest EU companies, not before July 2028. Your EU buyers will ask." });
  else out.push({ id: "csddd", status: "none", why: "Only through EU buyers." });

  return out;
}

export function summarise(i: SupplyInput) {
  const list = laws(i).filter(l => l.status !== "none");
  const rows = heatmap(i);
  const highs: string[] = [];
  for (const row of rows) for (const r of RISKS) if (row.cells[r] === "high") highs.push(`${COMMODITY_SHORT[row.commodity]} ${RISK_LABEL[r].toLowerCase()}`);
  const named = list.map(l => (l.status === "asked" ? `${LAW_SHORT[l.id]} via buyers` : LAW_SHORT[l.id]));
  const rule = (n: number) => (n === 1 ? "rule" : "rules");
  let headline: string;
  if (!list.length && !highs.length) headline = "No supply-chain rule is triggered by these answers. Keep supplier origin on file.";
  else {
    headline = `${list.length} ${rule(list.length)} reach your supply chain: ${named.join(", ")}.`;
    if (highs.length) headline += ` ${highs.length} high-risk ${highs.length === 1 ? "area" : "areas"}, starting with ${highs[0]}.`;
  }
  const summary = [
    list.length ? `Rules: ${named.join(", ")}.` : "No supply-chain rule triggered.",
    rows.length ? `Inputs screened: ${rows.map(r => COMMODITY_SHORT[r.commodity]).join(", ")}.` : "",
    highs.length ? `High risk: ${highs.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
  return { headline, summary, laws: list, rows, highs };
}

// Supplier network for the visual: origin -> tier 2 -> tier 1 -> you.
export const DECAY = 0.85; // share of risk carried one tier closer to you per tick
export const MAX_T2 = 6;
export const levelOf = (v: number): Level => (v >= 0.67 ? "high" : v >= 0.34 ? "medium" : "low");

/** x is the tier position (origin at the back, you at the front); y spreads nodes within a tier. */
export interface Net {
  x: Float32Array; y: Float32Array; base: Float32Array; label: string[];
  up: number[][]; edges: [number, number, boolean][]; you: number;
}

/** Origin -> tier 2 (one node per input) -> tier 1 -> you, with each node's own risk. */
export function buildNet(i: SupplyInput): Net {
  const rows = heatmap(i);
  const shown = rows.length > MAX_T2 ? rows.slice(0, MAX_T2 - 1) : rows;
  const rest = rows.slice(shown.length);
  const label: string[] = ["Xinjiang", "DRC region", "Other origin"];
  const ob = (o: Origin | null) => (o === "yes" ? 1 : o === "unsure" ? 0.55 : 0);
  const base: number[] = [ob(i.xinjiang), ob(i.drc), 0.15];
  const xs: number[] = [-105, -105, -105], ys: number[] = [-60, 0, 60];
  const up: number[][] = [[], [], []];
  const edges: [number, number, boolean][] = [];
  const groups: Commodity[][] = shown.map(r => [r.commodity]);
  if (rest.length) groups.push(rest.map(r => r.commodity));
  const n2 = groups.length, n1 = Math.min(3, Math.max(1, n2));
  const gap2 = Math.min(40, 160 / Math.max(1, n2 - 1));
  groups.forEach((g, k) => {
    const id = label.length;
    label.push(g.length > 1 ? `+${g.length} more` : COMMODITY_SHORT[g[0]]);
    base.push(Math.max(...rows.filter(r => g.includes(r.commodity)).map(rowScore)));
    xs.push(-35); ys.push((k - (n2 - 1) / 2) * gap2);
    const links = new Set<number>();
    for (const c of g) {
      if (UFLPA_SECTORS.includes(c) && (i.xinjiang === "yes" || i.xinjiang === "unsure")) links.add(0);
      else if ((c === "3tg" || c === "cobalt") && (i.drc === "yes" || i.drc === "unsure")) links.add(1);
      else links.add(2);
    }
    up.push([...links]);
    links.forEach(o => edges.push([o, id, (o === 0 ? i.xinjiang : o === 1 ? i.drc : "yes") === "unsure"]));
  });
  const t1 = label.length;
  for (let k = 0; k < n1; k++) {
    label.push(`Tier 1 ${"ABC"[k]}`); base.push(0); xs.push(35); ys.push((k - (n1 - 1) / 2) * 60); up.push([]);
  }
  for (let k = 0; k < n2; k++) { const id = 3 + k, to = t1 + (k % n1); up[to].push(id); edges.push([id, to, false]); }
  const you = label.length;
  label.push("You"); base.push(0); xs.push(105); ys.push(0); up.push([]);
  for (let k = 0; k < n1; k++) { up[you].push(t1 + k); edges.push([t1 + k, you, false]); }
  return { x: Float32Array.from(xs), y: Float32Array.from(ys), base: Float32Array.from(base), label, up, edges, you };
}

/** One diffusion tick: each node takes max(own risk, DECAY x worst upstream). Jacobi, so one tier per tick. */
export function tick(net: Net, r: Float32Array, next: Float32Array) {
  for (let k = 0; k < r.length; k++) {
    let m = net.base[k];
    for (const u of net.up[k]) m = Math.max(m, DECAY * r[u]);
    next[k] = m;
  }
  r.set(next);
}
/** Steady state: three hops from origin to you, so four ticks settle it. */
export function settle(net: Net): Float32Array {
  const r = Float32Array.from(net.base), next = new Float32Array(r.length);
  for (let k = 0; k < 4; k++) tick(net, r, next);
  return r;
}

