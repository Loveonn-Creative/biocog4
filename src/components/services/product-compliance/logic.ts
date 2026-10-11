// Product checklist for selling into the EU. Only these rules are used:
//  - EU Battery Regulation 2023/1542: battery passport mandatory for EV,
//    industrial (over 2 kWh) and LMT batteries from 18 February 2027; not for
//    portable batteries.
//  - ESPR: Digital Product Passports follow product by product; the EU working
//    plan names textiles, steel and aluminium among the first product groups.
//  - REACH: the EU importer must be told of SVHC above 0.1% by weight in
//    articles; SCIP notification applies to articles with SVHC above 0.1%
//    supplied in the EU.
//  - PFAS: an EU-wide restriction under REACH is proposed and being assessed
//    by ECHA. No dates are given because none are final.

export type Battery = "battery_ev" | "battery_industrial" | "battery_lmt" | "battery_portable";
export type Product = Battery | "textiles" | "steel_aluminium" | "electronics" | "furniture" | "chemical" | "other";
export type Tri = "yes" | "no" | "unsure";
export type Status = "required" | "prepare" | "check";
export type LayerKey = "materials" | "carbon" | "recycled" | "substances" | "diligence" | "qr";
export type LayerState = Status | "none";

export interface ProductInput { product?: Product; eu?: "yes" | "no"; pfas?: Tri; svhc?: Tri }

export interface Item { id: string; status: Status; title: string; detail: string; source: string; date?: string }

export const BATTERY_PASSPORT_DATE = "2027-02-18";
export const BATTERY_PASSPORT_LABEL = "18 February 2027";

export const PRODUCT_LABEL: Record<Product, string> = {
  battery_ev: "EV battery", battery_industrial: "Industrial battery over 2 kWh", battery_lmt: "LMT battery",
  battery_portable: "Portable battery", textiles: "Textiles and apparel", steel_aluminium: "Steel or aluminium product",
  electronics: "Electronics or electrical product", furniture: "Furniture", chemical: "Chemical or mixture", other: "Product",
};

/** Bottom to top of the passport stack. */
export const LAYERS: { key: LayerKey; label: string }[] = [
  { key: "materials", label: "Materials and BOM" },
  { key: "carbon", label: "Carbon footprint" },
  { key: "recycled", label: "Recycled content" },
  { key: "substances", label: "Substances" },
  { key: "diligence", label: "Due diligence" },
  { key: "qr", label: "QR access" },
];

export const isBattery = (p?: Product): p is Battery => !!p && p.startsWith("battery_");
export const needsBatteryPassport = (p?: Product) => p === "battery_ev" || p === "battery_industrial" || p === "battery_lmt";

/** Whole days from `now` to an ISO date (UTC midnight). Negative once passed. */
export function daysUntil(iso: string, now: Date): number {
  const target = Date.parse(`${iso}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

const BR = "EU Battery Regulation 2023/1542";

export function checklist(i: ProductInput) {
  const items: Item[] = [];
  const eu = i.eu !== "no";
  const p = i.product;
  // Outside the EU every EU duty becomes something to check before selling there.
  const st = (s: Status): Status => (eu ? s : "check");

  if (needsBatteryPassport(p)) {
    items.push({ id: "passport", status: st("required"), title: "Battery passport", detail: `Mandatory from ${BATTERY_PASSPORT_LABEL} for EV, industrial over 2 kWh and LMT batteries.`, source: BR, date: BATTERY_PASSPORT_DATE });
  } else if (p === "battery_portable") {
    items.push({ id: "passport", status: "check", title: "No battery passport for portable batteries", detail: "The passport duty covers EV, industrial over 2 kWh and LMT batteries.", source: BR });
  } else if (p === "textiles" || p === "steel_aluminium") {
    items.push({ id: "espr", status: st("prepare"), title: "Digital Product Passport under ESPR", detail: "The EU working plan names textiles, steel and aluminium among the first product groups. Rules come product by product.", source: "ESPR" });
  } else if (p) {
    items.push({ id: "espr", status: "check", title: "ESPR rules for your product group", detail: "Passports follow product by product. Watch for the rules for your group.", source: "ESPR" });
  }

  if (p === "chemical") {
    items.push({ id: "reach", status: "check", title: "REACH duties for chemicals and mixtures", detail: "These have their own REACH duties. Confirm them with your EU importer.", source: "REACH" });
  } else if (p) {
    if (i.svhc === "yes") {
      items.push({ id: "svhc", status: st("required"), title: "Tell your EU importer about SVHC above 0.1%", detail: "Declare REACH Candidate List substances above 0.1% by weight in the article.", source: "REACH" });
      items.push({ id: "scip", status: st("required"), title: "SCIP database notification", detail: "Applies to articles with SVHC above 0.1% supplied in the EU. Agree with your importer who files it.", source: "REACH, SCIP" });
    } else if (i.svhc === "unsure") {
      items.push({ id: "svhc", status: st("prepare"), title: "Find out your SVHC content", detail: "Ask suppliers to declare REACH Candidate List substances above 0.1% by weight.", source: "REACH" });
    } else if (i.svhc === "no") {
      items.push({ id: "svhc", status: "check", title: "Keep SVHC declarations on file", detail: "Supplier declarations back your answer to the EU importer.", source: "REACH" });
    }
  }

  if (p && i.pfas === "yes") {
    items.push({ id: "pfas", status: st("prepare"), title: "Map where PFAS is used", detail: "An EU-wide PFAS restriction under REACH is proposed and being assessed by ECHA.", source: "REACH, ECHA" });
  } else if (p && i.pfas === "unsure") {
    items.push({ id: "pfas", status: st("prepare"), title: "Find out whether PFAS is used", detail: "An EU-wide PFAS restriction under REACH is proposed and being assessed by ECHA.", source: "REACH, ECHA" });
  } else if (p && i.pfas === "no") {
    items.push({ id: "pfas", status: "check", title: "PFAS restriction is proposed", detail: "Confirm parts and coatings are PFAS-free.", source: "REACH, ECHA" });
  }

  const order: Record<Status, number> = { required: 0, prepare: 1, check: 2 };
  items.sort((a, b) => order[a.status] - order[b.status]);
  const nearest = items.filter(x => x.date).sort((a, b) => (a.date! < b.date! ? -1 : 1))[0] ?? null;

  // Passport stack: which layers this checklist asks for.
  const layers: Record<LayerKey, LayerState> = { materials: "none", carbon: "none", recycled: "none", substances: "none", diligence: "none", qr: "none" };
  if (needsBatteryPassport(p)) {
    for (const k of ["materials", "carbon", "recycled", "diligence", "qr"] as LayerKey[]) layers[k] = st("required");
  } else if (p === "textiles" || p === "steel_aluminium") {
    for (const k of ["materials", "carbon", "recycled", "qr"] as LayerKey[]) layers[k] = st("prepare");
  }
  // Items are sorted most urgent first, so this is the strictest substance item.
  const sub = items.find(x => x.id === "svhc" || x.id === "scip" || x.id === "pfas" || x.id === "reach");
  if (sub) layers.substances = sub.status;

  const count = (s: Status) => items.filter(x => x.status === s).length;
  return { items, nearest, layers, eu, passport: needsBatteryPassport(p), required: count("required"), prepare: count("prepare"), check: count("check") };
}

export type Checklist = ReturnType<typeof checklist>;

export function productHeadline(i: ProductInput, now: Date): string {
  const c = checklist(i);
  const name = PRODUCT_LABEL[i.product ?? "other"];
  if (!c.eu) return `${name} not sold into the EU: no EU duties today. ${c.items.length} to check before you do.`;
  const date = c.nearest ? ` Nearest date: ${c.nearest.title.toLowerCase()} from ${BATTERY_PASSPORT_LABEL}, ${Math.max(0, daysUntil(c.nearest.date!, now))} days away.` : " No dated deadline in these rules for your product.";
  return `${name} for the EU: ${c.required} required, ${c.prepare} to prepare now.${date}`;
}

const STATUS_LABEL: Record<Status, string> = { required: "Required", prepare: "Prepare now", check: "Check" };
export const statusLabel = (s: Status) => STATUS_LABEL[s];

/** Plain text for WhatsApp and the contact form. */
export function productSummary(i: ProductInput): string {
  const c = checklist(i);
  const name = PRODUCT_LABEL[i.product ?? "other"];
  const lines = c.items.map(x => `${STATUS_LABEL[x.status]}: ${x.title} (${x.source})`).join("; ");
  return `${name}, ${c.eu ? "sold into the EU" : "not sold into the EU"}. ${lines}.`;
}
