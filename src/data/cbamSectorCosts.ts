// CBAM cost per tonne by sector and production route, 2026 to 2034. Computed
// with the same engine as /cbam-calculator (calculateCBAM): EU default values
// with the default-value mark-up, free allocation phasing out, and the
// certificate price held at DEFAULT_EU_ETS_PRICE. Origin India (no carbon price
// paid at origin, so no Article 9 deduction). Estimates, not a declaration.
import { clampDescription, fitTitle, type PageMeta } from '@/lib/seo/seoMeta';
import { CBAM_SECTORS, DEFAULT_EU_ETS_PRICE, FREE_ALLOCATION_PCT, calculateCBAM, defaultValueMarkup, type CBAMSector } from '@/lib/cbamEngine';

export const CBAM_HUB_PATH = '/cbam-cost';
export const cbamSectorPath = (id: string) => `${CBAM_HUB_PATH}/${id}`;
export const CBAM_YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034];
export const CBAM_PRICE = DEFAULT_EU_ETS_PRICE;

export interface RouteCosts {
  routeId: string;
  routeName: string;
  intensity: number;
  /** € per tonne of product, by year. */
  perTonne: Record<number, number>;
}

export interface SectorCosts {
  sector: CBAMSector;
  routes: RouteCosts[];
  /** The sector's default route (the EU default intensity). */
  headline: RouteCosts;
}

const euro = (n: number) => Math.round(n * 100) / 100;

export function sectorCosts(sector: CBAMSector): SectorCosts {
  const routes = sector.productionRoutes.map((r) => {
    const res = calculateCBAM({
      sectorId: sector.id, productionRouteId: r.id, countryCode: 'IN', supplierName: '',
      tonnage: 1, actualEmissionsIntensity: null, carbonPricePaid: null, euEtsPrice: CBAM_PRICE,
    });
    const perTonne: Record<number, number> = {};
    for (const y of res.yearlyResults) perTonne[y.year] = euro(y.costPerTonne);
    return { routeId: r.id, routeName: r.name, intensity: r.defaultIntensity, perTonne };
  });
  const headline = routes.find((r) => r.intensity === sector.defaultIntensity) ?? routes[0];
  return { sector, routes, headline };
}

// Electricity is left out: CBAM charges it per MWh and EU power generation gets
// no free allocation, which the per-tonne engine does not model yet.
export const CBAM_SECTOR_COSTS: SectorCosts[] = CBAM_SECTORS.filter((s) => s.id !== 'electricity').map(sectorCosts);
// Steel already has its cost guide; it stays the one page for that query
// (no second page competing for "CBAM cost steel 2026 to 2034").
export const SECTOR_OWNER_PAGE: Record<string, string> = {
  steel: '/climate-intelligence/cbam-compliance-cost-indian-steel-exporters-2026-2034',
};
/** Where a sector's cost lives: its own page here, or the existing guide that owns the query. */
export const sectorHref = (id: string) => SECTOR_OWNER_PAGE[id] ?? cbamSectorPath(id);
/** Sectors that get a page under /cbam-cost. */
export const CBAM_SECTOR_PAGES = CBAM_SECTOR_COSTS.filter((s) => !SECTOR_OWNER_PAGE[s.sector.id]);
export const findSectorCosts = (id: string | undefined) => CBAM_SECTOR_PAGES.find((s) => s.sector.id === id);

const eur = (n: number) => `€${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const lower = (s: string) => s.toLowerCase().replace('&', 'and');

/** The answer that leads each sector page. */
export function cbamAnswer(s: SectorCosts): string {
  const h = s.headline;
  return `Using EU default values and a certificate price of ${eur(CBAM_PRICE)}, CBAM adds about ${eur(h.perTonne[2026])} per tonne of ${lower(s.sector.name)} imported from India in 2026 on the ${h.routeName} route, rising to ${eur(h.perTonne[2030])} in 2030 and ${eur(h.perTonne[2034])} in 2034 as free allocation ends.`;
}

export function cbamFaqs(s: SectorCosts): { question: string; answer: string }[] {
  const h = s.headline;
  const low = [...s.routes].sort((a, b) => a.perTonne[2034] - b.perTonne[2034])[0];
  return [
    { question: `What is the CBAM cost per tonne of ${lower(s.sector.name)} in 2026?`, answer: `About ${eur(h.perTonne[2026])} per tonne at default values on the ${h.routeName} route (${h.intensity} tCO2 per tonne plus the default-value mark-up), with ${Math.round(FREE_ALLOCATION_PCT[2026] * 100)}% of the EU benchmark still allocated free.` },
    { question: `How much does the production route change the CBAM cost?`, answer: `By 2034 the default-value cost ranges from ${eur(low.perTonne[2034])} per tonne on the ${low.routeName} route to ${eur(Math.max(...s.routes.map((r) => r.perTonne[2034])))} per tonne for the most carbon-intensive route listed.` },
    { question: 'How can an exporter lower this cost?', answer: `Replace default values with verified actual emissions from the installation: CBAM charges on the embedded emissions declared, and for this sector default values carry a ${Math.round(defaultValueMarkup(s.sector.id, 2028) * 100)}% mark-up from 2028.` },
  ];
}

export const CBAM_HUB_ANSWER = `CBAM cost per tonne for each covered sector, 2026 to 2034, worked out with EU default values and the current certificate price. Use the calculator for your own tonnage and actual emissions.`;

export function cbamSectorMeta(s: SectorCosts): PageMeta {
  return {
    title: fitTitle(`CBAM Cost per Tonne of ${s.sector.name}, 2026 to 2034`),
    description: clampDescription(cbamAnswer(s)),
  };
}

export const CBAM_HUB_META: PageMeta = {
  title: fitTitle('CBAM Cost per Tonne by Sector, 2026 to 2034'),
  description: clampDescription(CBAM_HUB_ANSWER),
};
