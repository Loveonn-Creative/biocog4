// Intelligent actions: the actions a business can take, worked out from its
// own records. Pure, so every rule is tested. Each action names the records
// behind it; anything worked out beyond a printed figure is marked as an
// estimate. When the records are too thin for any rule, a friendly next step
// is returned instead, so a new account is never shown generic tips.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '../../supabase/functions/_shared/emissionFactors';
import { missingElectricityMonths } from './missingMonths';

export interface ActionEmission {
  id: string; document_id: string | null; scope: number; category: string;
  activity_data: number | null; activity_unit: string | null; co2_kg: number;
  verified: boolean; activity_date?: string | null; created_at: string;
}
export interface ActionDocument {
  id: string; vendor: string | null; invoice_date: string | null; created_at: string;
  cached_result?: unknown;
}

export type ActionKind = 'power_factor' | 'generator' | 'solar' | 'supplier' | 'missing_month' | 'verify' | 'start';
export interface IntelligentAction {
  id: ActionKind;
  /** A lever cuts cost or emissions; the rest complete the record. */
  lever: boolean;
  title: string;
  why: string;
  /** Short effect, e.g. "−1.2 t a year (estimate)"; null when nothing is claimed. */
  effect: string | null;
  /** kg CO2e a year, for ranking; 0 when the action does not change emissions. */
  kg: number;
  cta: { label: string; to: string };
  /** Records behind the action, newest first. */
  evidence: string[];
}

// Typical diesel generator output, used only to compare with grid power and
// always shown as an estimate (small and mid-size DG sets give 2.5 to 3.5 kWh a litre).
const DG_KWH_PER_LITRE = 3;
// Typical yearly output of 1 kWp of rooftop solar in India (MNRE planning
// figures sit between 1,400 and 1,600 kWh). Shown as an estimate.
const SOLAR_KWH_PER_KWP_YEAR = 1500;
const DIESEL_KG_PER_LITRE = FUEL_FACTORS.DIESEL.value;
const PF_TARGET = 0.95;

const isElectricity = (e: ActionEmission) => e.scope === 2 && /electric/i.test(e.category);
const isKwh = (u: string | null) => !!u && /^(kwh|units?)$/i.test(u.trim());
const isLitre = (u: string | null) => !!u && /^(l|litres?|liters?|ltrs?)$/i.test(u.trim());
const monthOf = (d: string | null | undefined) => (d && /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : null);
const monthName = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const tonnes = (kg: number) => `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: kg < 10_000 ? 1 : 0 })} t`;
const label = (d: ActionDocument) => `${d.vendor ?? 'Bill'} · ${monthName(monthOf(d.invoice_date) ?? monthOf(d.created_at) ?? '2026-01')}`;

/** Power factors printed on kVAh bills, read from the stored bill (never computed). */
function printedPowerFactors(docs: ActionDocument[]) {
  const out: Array<{ doc: ActionDocument; pf: number }> = [];
  for (const d of docs) {
    const lines = (d.cached_result as { lineItems?: Array<{ evidence?: { powerFactor?: unknown } }> } | null)?.lineItems;
    if (!Array.isArray(lines)) continue;
    const pf = lines.map((l) => Number(l?.evidence?.powerFactor)).find((v) => Number.isFinite(v) && v >= 0.5 && v <= 1);
    if (pf !== undefined) out.push({ doc: d, pf });
  }
  return out;
}

function sanctionedLoadKw(docs: ActionDocument[]) {
  for (const d of docs) {
    const kw = Number((d.cached_result as { electricityBill?: { sanctionedLoadKw?: unknown } } | null)?.electricityBill?.sanctionedLoadKw);
    if (Number.isFinite(kw) && kw > 0) return kw;
  }
  return null;
}

export function intelligentActions(emissions: ActionEmission[], documents: ActionDocument[]): IntelligentAction[] {
  const docs = [...documents].sort((a, b) => (b.invoice_date ?? b.created_at).localeCompare(a.invoice_date ?? a.created_at));
  const byId = new Map(docs.map((d) => [d.id, d]));
  const actions: IntelligentAction[] = [];

  // Power factor below target on kVAh bills: billed for more than was used.
  const pfs = printedPowerFactors(docs);
  const low = pfs.filter((p) => p.pf < PF_TARGET);
  if (low.length) {
    const avg = low.reduce((t, p) => t + p.pf, 0) / low.length;
    const extra = Math.round((1 / avg - 1) * 100);
    actions.push({
      id: 'power_factor', lever: true, kg: 0,
      title: `Your power factor is ${avg.toFixed(2)}. You're billed for about ${extra}% more than you use.`,
      why: `Read from ${low.length} kVAh ${low.length === 1 ? 'bill' : 'bills'}. A capacitor bank usually brings it to ${PF_TARGET} or better, so the bill drops while your units stay the same.`,
      effect: 'Lower bill',
      cta: { label: 'See the bills', to: '/history' },
      evidence: low.slice(0, 3).map((p) => `${label(p.doc)} · PF ${p.pf.toFixed(2)}`),
    });
  }

  // Diesel generator alongside grid power.
  const elec = emissions.filter((e) => isElectricity(e) && isKwh(e.activity_unit) && (e.activity_data ?? 0) > 0);
  const diesel = emissions.filter((e) => e.scope === 1 && /diesel|hsd/i.test(e.category) && isLitre(e.activity_unit) && (e.activity_data ?? 0) > 0);
  const litres = diesel.reduce((t, e) => t + (e.activity_data ?? 0), 0);
  if (litres > 0 && elec.length) {
    const kg = litres * (DIESEL_KG_PER_LITRE - DG_KWH_PER_LITRE * INDIA_GRID_FACTOR_KG_PER_KWH);
    if (kg > 0) actions.push({
      id: 'generator', lever: true, kg,
      title: `${Math.round(litres).toLocaleString('en-IN')} litres of diesel on record. Grid power for those hours emits less.`,
      why: `At about ${DG_KWH_PER_LITRE} kWh a litre, generator power emits ${(DIESEL_KG_PER_LITRE / DG_KWH_PER_LITRE).toFixed(2)} kg CO₂ a kWh against ${INDIA_GRID_FACTOR_KG_PER_KWH} from the grid.`,
      effect: `−${tonnes(kg)} (estimate)`,
      cta: { label: 'See fuel records', to: '/history' },
      evidence: diesel.slice(0, 3).map((e) => { const d = e.document_id ? byId.get(e.document_id) : undefined; return d ? `${label(d)} · ${Math.round(e.activity_data ?? 0)} L` : `${Math.round(e.activity_data ?? 0)} L`; }),
    });
  }

  // Rooftop solar, sized from six or more months of grid bills.
  const elecMonths = new Set(elec.map((e) => monthOf(e.activity_date) ?? monthOf(e.created_at)).filter(Boolean) as string[]);
  if (elecMonths.size >= 6) {
    const kwh = elec.reduce((t, e) => t + (e.activity_data ?? 0), 0);
    const yearly = (kwh / elecMonths.size) * 12;
    const load = sanctionedLoadKw(docs);
    const kwp = Math.max(1, Math.round(Math.min(yearly / SOLAR_KWH_PER_KWP_YEAR, load ?? Infinity)));
    const kg = Math.min(kwp * SOLAR_KWH_PER_KWP_YEAR, yearly) * INDIA_GRID_FACTOR_KG_PER_KWH;
    actions.push({
      id: 'solar', lever: true, kg,
      title: `About ${kwp} kWp of rooftop solar fits your use${load ? ' and sanctioned load' : ''}.`,
      why: `From ${elecMonths.size} months of bills, about ${Math.round(yearly).toLocaleString('en-IN')} kWh a year. Each kWp makes roughly ${SOLAR_KWH_PER_KWP_YEAR.toLocaleString('en-IN')} kWh a year in India.`,
      effect: `−${tonnes(kg)} a year (estimate)`,
      cta: { label: 'Check solar', to: '/solar-signal' },
      evidence: [`${elecMonths.size} months of electricity bills`],
    });
  }

  // One supplier carrying most purchase emissions.
  const s3 = emissions.filter((e) => e.scope === 3 && e.co2_kg > 0 && e.document_id);
  const bySupplier = new Map<string, number>();
  for (const e of s3) { const v = byId.get(e.document_id!)?.vendor?.trim(); if (v) bySupplier.set(v, (bySupplier.get(v) ?? 0) + e.co2_kg); }
  const s3Total = [...bySupplier.values()].reduce((t, v) => t + v, 0);
  const top = [...bySupplier.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && bySupplier.size >= 2 && s3Total > 0 && top[1] / s3Total >= 0.5) {
    actions.push({
      id: 'supplier', lever: true, kg: 0,
      title: `${top[0]} is ${Math.round((top[1] / s3Total) * 100)}% of your purchase emissions.`,
      why: 'Their own figures would replace the estimate behind most of your Scope 3. Ask them first.',
      effect: null,
      cta: { label: 'See suppliers', to: '/mrv-dashboard' },
      evidence: [`${bySupplier.size} suppliers on record`],
    });
  }

  // Record completeness.
  const gaps = missingElectricityMonths(emissions);
  if (gaps.length) actions.push({
    id: 'missing_month', lever: false, kg: 0,
    title: gaps.length === 1 ? `${monthName(gaps[0])}'s electricity bill is missing.` : `${gaps.length} months of electricity bills are missing.`,
    why: 'Lenders check for complete months first.',
    effect: null, cta: { label: 'Upload bill', to: '/' }, evidence: gaps.slice(0, 3).map(monthName),
  });
  const pending = emissions.filter((e) => !e.verified).length;
  if (pending) actions.push({
    id: 'verify', lever: false, kg: 0,
    title: `${pending} ${pending === 1 ? 'record is' : 'records are'} waiting for verification.`,
    why: 'Only verified records count in reports and finance.',
    effect: null, cta: { label: 'Verify now', to: '/verify' }, evidence: [],
  });

  // Levers first, largest effect first; cost-only levers rank after emission cuts.
  const ranked = actions.sort((a, b) => Number(b.lever) - Number(a.lever) || b.kg - a.kg);
  if (ranked.some((a) => a.lever)) return ranked;
  return [...ranked, fallback(emissions, documents, elecMonths.size)];
}

/** A friendly next step when the records are too thin for any lever. */
function fallback(emissions: ActionEmission[], documents: ActionDocument[], months: number): IntelligentAction {
  const base = { id: 'start' as const, lever: false, kg: 0, effect: null, evidence: [] };
  if (!documents.length) return { ...base, title: 'Upload one electricity bill to find your first saving.', why: 'Your bill already shows where money and emissions go.', cta: { label: 'Upload bill', to: '/' } };
  if (!emissions.length) return { ...base, title: 'One readable bill is all it takes to start.', why: 'A clear photo of the full bill works.', cta: { label: 'Upload clearer copy', to: '/' } };
  if (months < 6) return { ...base, title: `${months ? `${months} of 6` : 'No'} months of electricity bills so far.`, why: 'Six months unlock a solar size and your first trend.', cta: { label: 'Add bills', to: '/' } };
  return { ...base, title: 'Nothing urgent in your bills right now.', why: 'Add each month’s bill to keep it that way.', cta: { label: 'Upload bill', to: '/' } };
}
