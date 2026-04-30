/**
 * Energy Transition Savings Engine (Solar / PPA / Hybrid)
 * Sources: MNRE benchmarks (India), IEA grid factors 2023, standard IRR/NPV/payback math
 */

export type EnergyScenario = 'on-grid-solar' | 'off-grid-solar' | 'hybrid' | 'ppa';

export interface EnergyInput {
  countryCode: string;       // for grid factor + currency
  monthlyKwh: number;        // current consumption
  currentTariff: number;     // local currency / kWh
  systemKwp: number;         // proposed system size
  capexPerKwp: number;       // local currency / kWp
  opexPerYear: number;       // O&M
  ppaTariff?: number;        // for PPA scenario
  scenario: EnergyScenario;
  selfConsumptionPct: number;// 0-1, % of solar used onsite
  exportTariff: number;      // for excess sold to grid
  discountRate: number;      // for NPV (e.g. 0.10)
  degradationPctPerYear: number; // default 0.005
  systemLifeYears: number;   // default 25
  capacityUtilization: number; // CUF (0.18 typical India)
  subsidyPct: number;        // 0-1
}

// Grid emission factor table (kgCO2e / kWh) — IEA 2023
const GRID_FACTORS: Record<string, number> = {
  IN: 0.708, CN: 0.555, VN: 0.681, ID: 0.760, BD: 0.650,
  PH: 0.640, TH: 0.510, MY: 0.540, US: 0.371, EU: 0.230,
  GB: 0.207, JP: 0.480, KR: 0.450, BR: 0.110,
};

const CURRENCY: Record<string, { code: string; symbol: string; locale: string }> = {
  IN: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  CN: { code: 'CNY', symbol: '¥', locale: 'zh-CN' },
  VN: { code: 'VND', symbol: '₫', locale: 'vi-VN' },
  ID: { code: 'IDR', symbol: 'Rp', locale: 'id-ID' },
  BD: { code: 'BDT', symbol: '৳', locale: 'bn-BD' },
  PH: { code: 'PHP', symbol: '₱', locale: 'en-PH' },
  TH: { code: 'THB', symbol: '฿', locale: 'th-TH' },
  MY: { code: 'MYR', symbol: 'RM', locale: 'ms-MY' },
  US: { code: 'USD', symbol: '$', locale: 'en-US' },
  EU: { code: 'EUR', symbol: '€', locale: 'en-EU' },
  GB: { code: 'GBP', symbol: '£', locale: 'en-GB' },
};

export interface YearCashflow {
  year: number;
  generationKwh: number;
  energySavings: number;
  opex: number;
  netCashflow: number;
  cumulative: number;
  co2AvoidedKg: number;
}

export interface EnergyResult {
  scenario: EnergyScenario;
  netCapex: number;
  yearOneGenerationKwh: number;
  yearOneSavings: number;
  paybackYears: number | null;
  npv: number;
  irrPct: number | null;
  lifetimeSavings: number;
  lifetimeCo2AvoidedKg: number;
  yearOneCo2AvoidedKg: number;
  cashflows: YearCashflow[];
  currencyCode: string;
  currencySymbol: string;
  factorSources: string[];
  methodologyVersion: 'ENERGY-v1.0 (MNRE/IEA)';
}

// IRR via bisection
function irr(cashflows: number[]): number | null {
  const npvAt = (rate: number) => cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
  let lo = -0.99, hi = 1.0;
  let nLo = npvAt(lo), nHi = npvAt(hi);
  if (nLo * nHi > 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const nMid = npvAt(mid);
    if (Math.abs(nMid) < 1e-3) return mid;
    if (nLo * nMid < 0) { hi = mid; nHi = nMid; } else { lo = mid; nLo = nMid; }
  }
  return (lo + hi) / 2;
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function calculateEnergyTransition(input: EnergyInput): EnergyResult {
  const grid = GRID_FACTORS[input.countryCode] ?? 0.5;
  const cur = CURRENCY[input.countryCode] ?? CURRENCY.IN;
  const life = Math.max(1, input.systemLifeYears || 25);
  const cuf = Math.max(0.05, Math.min(0.35, input.capacityUtilization || 0.18));
  const degradation = Math.max(0, Math.min(0.05, input.degradationPctPerYear ?? 0.005));
  const subsidy = Math.max(0, Math.min(1, input.subsidyPct || 0));

  const grossCapex = input.systemKwp * input.capexPerKwp;
  const netCapex = input.scenario === 'ppa' ? 0 : grossCapex * (1 - subsidy);

  const annualGenYr1 = input.systemKwp * cuf * 8760; // kWh
  const tariff = input.scenario === 'ppa' ? (input.ppaTariff ?? input.currentTariff) : input.currentTariff;

  const cashflows: YearCashflow[] = [];
  let cumulative = -netCapex;
  let lifetimeSavings = 0;
  let lifetimeCo2 = 0;
  const ppaPaymentRate = input.scenario === 'ppa' ? (input.ppaTariff ?? 0) : 0;

  const cfArray: number[] = [-netCapex];

  for (let y = 1; y <= life; y++) {
    const gen = annualGenYr1 * Math.pow(1 - degradation, y - 1);
    const selfUsed = gen * Math.max(0, Math.min(1, input.selfConsumptionPct));
    const exported = gen - selfUsed;
    const grossSavings = selfUsed * input.currentTariff + exported * input.exportTariff;
    const ppaPayment = input.scenario === 'ppa' ? gen * ppaPaymentRate : 0;
    const opex = input.scenario === 'ppa' ? 0 : input.opexPerYear;
    const net = grossSavings - opex - ppaPayment;
    cumulative += net;
    const co2 = gen * grid;
    lifetimeSavings += net;
    lifetimeCo2 += co2;
    cfArray.push(net);
    cashflows.push({
      year: y,
      generationKwh: round(gen),
      energySavings: round(grossSavings),
      opex: round(opex + ppaPayment),
      netCashflow: round(net),
      cumulative: round(cumulative),
      co2AvoidedKg: round(co2),
    });
  }

  // Payback
  let paybackYears: number | null = null;
  for (let i = 0; i < cashflows.length; i++) {
    if (cashflows[i].cumulative >= 0) {
      const prev = i > 0 ? cashflows[i - 1].cumulative : -netCapex;
      const fraction = prev < 0 ? (-prev) / cashflows[i].netCashflow : 0;
      paybackYears = round(cashflows[i].year - 1 + fraction, 2);
      break;
    }
  }

  // NPV
  const r = Math.max(0.001, input.discountRate || 0.10);
  const npv = cfArray.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);

  const irrVal = irr(cfArray);

  return {
    scenario: input.scenario,
    netCapex: round(netCapex),
    yearOneGenerationKwh: round(annualGenYr1),
    yearOneSavings: cashflows[0]?.energySavings ?? 0,
    paybackYears,
    npv: round(npv),
    irrPct: irrVal !== null ? round(irrVal * 100, 1) : null,
    lifetimeSavings: round(lifetimeSavings),
    lifetimeCo2AvoidedKg: round(lifetimeCo2),
    yearOneCo2AvoidedKg: cashflows[0]?.co2AvoidedKg ?? 0,
    cashflows,
    currencyCode: cur.code,
    currencySymbol: cur.symbol,
    factorSources: ['IEA 2023 (grid factor)', 'MNRE benchmarks', 'Standard IRR/NPV math'],
    methodologyVersion: 'ENERGY-v1.0 (MNRE/IEA)',
  };
}

export function formatLocalCurrency(value: number, countryCode: string): string {
  const cur = CURRENCY[countryCode] ?? CURRENCY.IN;
  return new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code, maximumFractionDigits: 0 }).format(value);
}

export const ENERGY_COUNTRIES = Object.keys(GRID_FACTORS).map(code => ({
  code,
  name: ({
    IN: 'India', CN: 'China', VN: 'Vietnam', ID: 'Indonesia', BD: 'Bangladesh',
    PH: 'Philippines', TH: 'Thailand', MY: 'Malaysia', US: 'United States',
    EU: 'European Union', GB: 'United Kingdom', JP: 'Japan', KR: 'South Korea', BR: 'Brazil',
  } as Record<string, string>)[code] ?? code,
  gridFactor: GRID_FACTORS[code],
}));
