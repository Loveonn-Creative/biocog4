// MSME lead magnet: an instant estimate from two numbers printed on bills the
// owner already has, plus what the person asking needs and a reply to send.
// Uses the same factors as the extraction pipeline (src/lib/factors.ts). The
// result is an estimate from typed numbers, never a verified figure.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';

export type Asker = 'eu_buyer' | 'india_customer' | 'bank' | 'self';

export interface ReplyInput {
  asker: Asker;
  /** Units (kWh) from the "units consumed" line of a typical monthly bill. */
  kwhPerMonth: number;
  /** Diesel for generators or vehicles, litres per month. */
  dieselLitresPerMonth: number;
}

export interface CarbonEstimate {
  electricityKg: number;
  dieselKg: number;
  totalTonnes: number;
  /** Share of the total from electricity, 0-100. */
  electricityPct: number;
  factors: { grid: number; diesel: number };
}

const num = (v: number, hi: number) => (Number.isFinite(v) && v > 0 ? Math.min(v, hi) : 0);

export function estimateAnnual(input: Pick<ReplyInput, 'kwhPerMonth' | 'dieselLitresPerMonth'>): CarbonEstimate | null {
  const kwh = num(input.kwhPerMonth, 10_000_000);
  const litres = num(input.dieselLitresPerMonth, 1_000_000);
  if (kwh === 0 && litres === 0) return null;
  const grid = INDIA_GRID_FACTOR_KG_PER_KWH, diesel = FUEL_FACTORS.DIESEL.value;
  const electricityKg = kwh * 12 * grid;
  const dieselKg = litres * 12 * diesel;
  const total = electricityKg + dieselKg;
  return {
    electricityKg, dieselKg,
    totalTonnes: Math.round(total / 100) / 10,
    electricityPct: Math.round((100 * electricityKg) / total),
    factors: { grid, diesel },
  };
}

export const ASKER: Record<Asker, { label: string; to: string; title: string; why: string; needs: string[] }> = {
  eu_buyer: {
    label: 'EU buyer',
    to: 'our EU buyer',
    title: 'What your EU buyer needs',
    why: 'If you ship iron and steel, aluminium, cement, fertilisers or hydrogen to the EU, your buyer must report the embedded emissions of those goods under CBAM, whose definitive period began on 1 January 2026. For other goods, buyers usually want your Scope 1 and 2 figure for their own supplier reporting.',
    needs: [
      '12 months of electricity bills',
      'Fuel invoices for the same months',
      'Production per product, in tonnes, for those months',
      'The products and quantities you shipped to that buyer',
    ],
  },
  india_customer: {
    label: 'Large Indian customer',
    to: 'our customer',
    title: 'What your customer needs',
    why: 'Large listed companies in India publish sustainability data in their BRSR, and many now ask key suppliers for energy and emissions figures to complete it.',
    needs: [
      '12 months of electricity bills',
      'Fuel invoices for the same months',
      'Your GSTIN and the plant address',
      'Annual production or turnover, to show emissions per unit',
    ],
  },
  bank: {
    label: 'Bank or lender',
    to: 'our bank',
    title: 'What your bank needs',
    why: 'A lender looking at a green or sustainability-linked loan wants a starting baseline and evidence it can check, not a number on a form.',
    needs: [
      '12 months of electricity bills',
      'Fuel invoices for the same months',
      'What the loan is for, such as rooftop solar or efficient machinery',
      'The quote or spec for that project',
    ],
  },
  self: {
    label: 'Just checking',
    to: '',
    title: 'What to keep ready',
    why: 'Knowing your number first puts you ahead of the request. It is also the baseline any carbon credit or green loan conversation starts from.',
    needs: [
      'A recent electricity bill',
      'Any fuel invoices',
    ],
  },
};

const fmt = (t: number) => t.toLocaleString('en-IN', { maximumFractionDigits: 1 });

/** A short reply the owner can send. States the figure as an estimate and promises nothing it cannot back. */
export function replyText(asker: Asker, e: CarbonEstimate): string {
  if (asker === 'self') {
    return `Our estimated Scope 1 and 2 emissions: about ${fmt(e.totalTonnes)} tonnes CO₂ a year, from our electricity and diesel use.`;
  }
  return `Hello,

Thank you for your request. Based on our electricity and diesel bills, our estimated Scope 1 and 2 emissions are about ${fmt(e.totalTonnes)} tonnes of CO₂ a year (${e.electricityPct}% from electricity).

We are preparing a bill-by-bill record that shows the emission factor and its source for every line, and will share it with ${ASKER[asker].to}.

Regards,`;
}

/** Event-safe summary (no personal data). */
export const estimateBand = (t: number) => (t < 10 ? '<10t' : t < 100 ? '10-100t' : t < 1000 ? '100-1000t' : '1000t+');
