/**
 * Net-Zero Goal Engine
 * Sector benchmarks, reduction strategies, and feasibility calculations
 * Deterministic logic — AI augments decisions, never replaces core math
 */

export interface SectorBenchmark {
  id: string;
  name: string;
  avgIntensity: number; // kgCO2/unit revenue (₹1L)
  topQuartile: number;
  reductionPotential: number; // % achievable in 12 months
  typicalBaseline: number; // kgCO2 annual for typical MSME
}

export const SECTOR_BENCHMARKS: SectorBenchmark[] = [
  { id: 'textile', name: 'Textiles & Apparel', avgIntensity: 42, topQuartile: 28, reductionPotential: 25, typicalBaseline: 85000 },
  { id: 'steel', name: 'Iron & Steel', avgIntensity: 180, topQuartile: 120, reductionPotential: 15, typicalBaseline: 450000 },
  { id: 'chemical', name: 'Chemicals', avgIntensity: 95, topQuartile: 60, reductionPotential: 20, typicalBaseline: 220000 },
  { id: 'agriculture', name: 'Agriculture & Food', avgIntensity: 35, topQuartile: 22, reductionPotential: 30, typicalBaseline: 65000 },
  { id: 'logistics', name: 'Logistics & Transport', avgIntensity: 68, topQuartile: 45, reductionPotential: 20, typicalBaseline: 150000 },
  { id: 'construction', name: 'Construction', avgIntensity: 110, topQuartile: 75, reductionPotential: 18, typicalBaseline: 280000 },
  { id: 'auto', name: 'Automotive', avgIntensity: 85, topQuartile: 55, reductionPotential: 22, typicalBaseline: 190000 },
  { id: 'pharma', name: 'Pharmaceuticals', avgIntensity: 52, topQuartile: 35, reductionPotential: 28, typicalBaseline: 95000 },
  { id: 'it', name: 'IT & Services', avgIntensity: 18, topQuartile: 10, reductionPotential: 40, typicalBaseline: 32000 },
  { id: 'other', name: 'Other / General', avgIntensity: 55, topQuartile: 35, reductionPotential: 22, typicalBaseline: 120000 },
];

export interface ReductionAction {
  id: string;
  title: string;
  scope: number;
  reductionPct: number; // % of scope emissions
  estimatedCostInr: number; // ₹
  paybackMonths: number;
  effort: 'low' | 'medium' | 'high';
  applicableSectors: string[]; // 'all' or sector ids
}

export const REDUCTION_STRATEGIES: ReductionAction[] = [
  // Scope 2 — Quick wins
  { id: 'solar-rooftop', title: 'Install rooftop solar (25-100 kW)', scope: 2, reductionPct: 40, estimatedCostInr: 2500000, paybackMonths: 36, effort: 'medium', applicableSectors: ['all'] },
  { id: 'green-tariff', title: 'Switch to green power tariff (RE100)', scope: 2, reductionPct: 60, estimatedCostInr: 0, paybackMonths: 0, effort: 'low', applicableSectors: ['all'] },
  { id: 'led-lighting', title: 'Upgrade to LED lighting throughout', scope: 2, reductionPct: 8, estimatedCostInr: 150000, paybackMonths: 12, effort: 'low', applicableSectors: ['all'] },
  { id: 'hvac-upgrade', title: 'Upgrade HVAC to 5-star rated systems', scope: 2, reductionPct: 15, estimatedCostInr: 800000, paybackMonths: 24, effort: 'medium', applicableSectors: ['all'] },
  { id: 'power-factor', title: 'Improve power factor to 0.99', scope: 2, reductionPct: 5, estimatedCostInr: 200000, paybackMonths: 8, effort: 'low', applicableSectors: ['all'] },

  // Scope 1 — Fuel switching
  { id: 'fuel-switch-gas', title: 'Switch from diesel/furnace oil to natural gas', scope: 1, reductionPct: 30, estimatedCostInr: 1500000, paybackMonths: 18, effort: 'high', applicableSectors: ['steel', 'chemical', 'textile', 'construction'] },
  { id: 'boiler-efficiency', title: 'Upgrade boiler efficiency (>85%)', scope: 1, reductionPct: 15, estimatedCostInr: 600000, paybackMonths: 14, effort: 'medium', applicableSectors: ['textile', 'chemical', 'pharma'] },
  { id: 'ev-fleet', title: 'Transition fleet to EV/CNG vehicles', scope: 1, reductionPct: 45, estimatedCostInr: 3000000, paybackMonths: 48, effort: 'high', applicableSectors: ['logistics', 'all'] },
  { id: 'process-heat', title: 'Electrify process heating', scope: 1, reductionPct: 35, estimatedCostInr: 2000000, paybackMonths: 30, effort: 'high', applicableSectors: ['steel', 'chemical', 'auto'] },

  // Scope 3 — Supply chain
  { id: 'local-sourcing', title: 'Shift to local/regional suppliers', scope: 3, reductionPct: 15, estimatedCostInr: 0, paybackMonths: 0, effort: 'medium', applicableSectors: ['all'] },
  { id: 'packaging-reduce', title: 'Reduce packaging weight by 30%', scope: 3, reductionPct: 8, estimatedCostInr: 100000, paybackMonths: 6, effort: 'low', applicableSectors: ['all'] },
  { id: 'recycled-inputs', title: 'Switch to recycled raw materials', scope: 3, reductionPct: 20, estimatedCostInr: 0, paybackMonths: 0, effort: 'medium', applicableSectors: ['textile', 'auto', 'construction'] },
  { id: 'waste-diversion', title: 'Achieve 90% waste diversion from landfill', scope: 3, reductionPct: 10, estimatedCostInr: 300000, paybackMonths: 12, effort: 'medium', applicableSectors: ['all'] },
  { id: 'supplier-engagement', title: 'Supplier carbon disclosure program', scope: 3, reductionPct: 12, estimatedCostInr: 50000, paybackMonths: 0, effort: 'low', applicableSectors: ['all'] },
];

export interface FeasibilityResult {
  baselineCo2Kg: number;
  targetReductionPct: number;
  targetReductionKg: number;
  targetCo2Kg: number;
  timelineMonths: number;
  isFeasible: boolean;
  feasibilityNote: string;
  recommendedActions: ReductionAction[];
  totalEstimatedReduction: number;
  totalEstimatedCost: number;
}

export function calculateFeasibility(
  baselineCo2Kg: number,
  targetReductionPct: number,
  timelineMonths: number,
  sectorId: string
): FeasibilityResult {
  const targetReductionKg = baselineCo2Kg * (targetReductionPct / 100);
  const targetCo2Kg = baselineCo2Kg - targetReductionKg;

  const benchmark = SECTOR_BENCHMARKS.find(b => b.id === sectorId) || SECTOR_BENCHMARKS.find(b => b.id === 'other')!;

  // Filter applicable strategies
  const applicable = REDUCTION_STRATEGIES.filter(s =>
    s.applicableSectors.includes('all') || s.applicableSectors.includes(sectorId)
  ).filter(s => s.paybackMonths <= timelineMonths || s.paybackMonths === 0);

  // Sort by impact/effort ratio
  const sorted = [...applicable].sort((a, b) => {
    const scoreA = a.reductionPct / (a.effort === 'low' ? 1 : a.effort === 'medium' ? 2 : 3);
    const scoreB = b.reductionPct / (b.effort === 'low' ? 1 : b.effort === 'medium' ? 2 : 3);
    return scoreB - scoreA;
  });

  // Estimate total achievable reduction
  let cumulativeReduction = 0;
  const recommended: ReductionAction[] = [];
  let totalCost = 0;

  for (const action of sorted) {
    if (cumulativeReduction >= targetReductionPct) break;
    // Rough: each action's % applies to its scope share of total
    const scopeShare = action.scope === 1 ? 0.3 : action.scope === 2 ? 0.4 : 0.3;
    const effectiveReduction = action.reductionPct * scopeShare;
    cumulativeReduction += effectiveReduction;
    totalCost += action.estimatedCostInr;
    recommended.push(action);
  }

  const isFeasible = cumulativeReduction >= targetReductionPct * 0.7;
  const feasibilityNote = isFeasible
    ? timelineMonths <= 12
      ? `Achievable with focused execution. ${recommended.length} actions identified.`
      : `Strong feasibility over ${Math.round(timelineMonths / 12)} years. Phased execution recommended.`
    : `Ambitious target. Consider extending timeline or adjusting to ${Math.round(cumulativeReduction)}% reduction.`;

  return {
    baselineCo2Kg,
    targetReductionPct,
    targetReductionKg: Math.round(targetReductionKg),
    targetCo2Kg: Math.round(targetCo2Kg),
    timelineMonths,
    isFeasible,
    feasibilityNote,
    recommendedActions: recommended,
    totalEstimatedReduction: Math.round(cumulativeReduction * 10) / 10,
    totalEstimatedCost: totalCost,
  };
}

export function formatInr(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
}

export function formatCo2(kgValue: number): string {
  if (kgValue >= 1000000) return `${(kgValue / 1000).toFixed(0)} tCO₂`;
  if (kgValue >= 1000) return `${(kgValue / 1000).toFixed(1)} tCO₂`;
  return `${Math.round(kgValue)} kgCO₂`;
}
