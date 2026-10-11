/**
 * EPR applicability in India by product category and role. Sources: Plastic
 * Waste Management Rules (EPR for producers, importers and brand owners),
 * E-Waste (Management) Rules 2022, Battery Waste Management Rules 2022, and
 * the Hazardous and Other Wastes Rules (EPR for waste tyres and used oil).
 * No numeric targets or deadlines: these are set category-wise by the rules.
 */

export type Category = "plastic" | "eee" | "battery" | "tyre" | "oil";
export type Role = "producer" | "brand_owner" | "importer" | "retailer" | "recycler";
export type Status = "applies" | "check" | "none";

export const CATEGORIES: Record<Category, { label: string; short: string; rule: string }> = {
  plastic: { label: "Plastic packaging", short: "Plastic", rule: "Plastic Waste Management Rules" },
  eee: { label: "Electrical and electronic equipment", short: "E-waste", rule: "E-Waste (Management) Rules, 2022" },
  battery: { label: "Batteries", short: "Batteries", rule: "Battery Waste Management Rules, 2022" },
  tyre: { label: "Tyres", short: "Tyres", rule: "Hazardous and Other Wastes Rules (waste tyres)" },
  oil: { label: "Lubricating or used oil", short: "Used oil", rule: "Hazardous and Other Wastes Rules (used oil)" },
};

export const ROLES: Record<Role, string> = {
  producer: "Manufacturer or producer",
  brand_owner: "Brand owner",
  importer: "Importer",
  retailer: "I only sell others' branded products",
  recycler: "Recycler or processor",
};

export interface Finding { category: Category; status: Status; rule: string; note: string }

/** Why each regime applies, in short buyer's words. */
const WHO: Record<Category, string> = {
  plastic: "EPR applies to producers, importers and brand owners (PIBOs).",
  eee: "EPR applies to producers of listed equipment, including importers.",
  battery: "EPR applies to producers, including importers.",
  tyre: "EPR for waste tyres applies to producers, including importers.",
  oil: "EPR for used oil applies to producers, including importers.",
};

export function eprFinding(category: Category, roles: Role[]): Finding {
  const rule = CATEGORIES[category].rule;
  const obligated = roles.includes("producer") || roles.includes("importer");
  if (obligated) return { category, status: "applies", rule, note: WHO[category] };
  if (roles.includes("brand_owner")) {
    // Brand owners are named for plastic packaging; for other categories, selling under your own brand usually makes you the producer, but confirm.
    return category === "plastic"
      ? { category, status: "applies", rule, note: WHO.plastic }
      : { category, status: "check", rule, note: "Selling under your own brand can make you the producer. Confirm with the rule's definitions." };
  }
  if (roles.includes("recycler")) {
    return { category, status: "check", rule, note: "Recyclers and processors register on the CPCB portal under the same rules. Check your registration." };
  }
  return {
    category, status: "none", rule,
    note: category === "plastic"
      ? "Generally not the obligated producer. Check any packaging you add yourself."
      : "Generally not the obligated producer. Check the brand you buy from is registered.",
  };
}

export const eprFindings = (cats: Category[], roles: Role[]): Finding[] => cats.map(c => eprFinding(c, roles));

export const NEXT_STEP = "Register on the CPCB EPR portal, then plan collection and recycling or buy EPR certificates. Targets are set category-wise by the rules each year.";

export function eprHeadline(f: Finding[]): string {
  const yes = f.filter(x => x.status === "applies").map(x => CATEGORIES[x.category].short.toLowerCase());
  const check = f.filter(x => x.status === "check").length;
  if (yes.length) {
    const list = yes.length > 1 ? `${yes.slice(0, -1).join(", ")} and ${yes[yes.length - 1]}` : yes[0];
    return `EPR applies to you for ${list}${check ? `, with ${check} more to check` : ""}.`;
  }
  if (check) return `EPR may apply: ${check} ${check > 1 ? "categories" : "category"} to confirm.`;
  return "You are generally not the obligated producer. Check the packaging you add.";
}

/** Mass balance of one year's material loop at a collection share (0 to 1). */
export function massBalance(placedT: number, collectionShare: number) {
  const placed = Math.max(0, placedT);
  const share = Math.min(1, Math.max(0, collectionShare));
  const collected = placed * share;
  return { placed, collected, leaked: placed - collected, recycled: collected, virgin: placed - collected };
}

/** Tonnes per particle: a 1-2-5 step so the busiest flow shows about `target` particles. */
export function tonnesPerParticle(maxFlowT: number, target = 24): number {
  if (!(maxFlowT > 0)) return 1;
  const raw = maxFlowT / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
