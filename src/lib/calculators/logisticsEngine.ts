/**
 * Logistics & Transportation Emissions Engine
 * Standard: GLEC Framework v3.0 / ISO 14083
 * Method: kgCO2e = weight (tonnes) × distance (km) × mode EF, with load factor + empty-return uplift
 */

export type TransportMode =
  | 'road-rigid' | 'road-articulated' | 'road-van'
  | 'rail-diesel' | 'rail-electric'
  | 'sea-container' | 'sea-bulk' | 'sea-tanker'
  | 'inland-waterway'
  | 'air-short' | 'air-long'
  | 'pipeline';

export interface ModeFactor {
  id: TransportMode;
  name: string;
  kgCO2ePerTKm: number; // WTW (well-to-wheel) GLEC v3.0
  category: 'road' | 'rail' | 'sea' | 'air' | 'inland' | 'pipeline';
  defaultLoadFactor: number; // typical
}

export const TRANSPORT_MODES: ModeFactor[] = [
  { id: 'road-rigid',       name: 'Truck — rigid (7.5–17 t)',  kgCO2ePerTKm: 0.182, category: 'road', defaultLoadFactor: 0.55 },
  { id: 'road-articulated', name: 'Truck — articulated (>17 t)', kgCO2ePerTKm: 0.062, category: 'road', defaultLoadFactor: 0.70 },
  { id: 'road-van',         name: 'Light van / pickup',         kgCO2ePerTKm: 0.487, category: 'road', defaultLoadFactor: 0.40 },
  { id: 'rail-diesel',      name: 'Rail — diesel freight',      kgCO2ePerTKm: 0.022, category: 'rail', defaultLoadFactor: 0.65 },
  { id: 'rail-electric',    name: 'Rail — electric freight',    kgCO2ePerTKm: 0.010, category: 'rail', defaultLoadFactor: 0.65 },
  { id: 'sea-container',    name: 'Sea — container ship',       kgCO2ePerTKm: 0.008, category: 'sea',  defaultLoadFactor: 0.70 },
  { id: 'sea-bulk',         name: 'Sea — bulk carrier',         kgCO2ePerTKm: 0.004, category: 'sea',  defaultLoadFactor: 0.85 },
  { id: 'sea-tanker',       name: 'Sea — oil tanker',           kgCO2ePerTKm: 0.005, category: 'sea',  defaultLoadFactor: 0.85 },
  { id: 'inland-waterway',  name: 'Inland waterway / barge',    kgCO2ePerTKm: 0.031, category: 'inland', defaultLoadFactor: 0.70 },
  { id: 'air-short',        name: 'Air freight — short-haul (<1500 km)', kgCO2ePerTKm: 1.130, category: 'air', defaultLoadFactor: 0.70 },
  { id: 'air-long',         name: 'Air freight — long-haul (>1500 km)',  kgCO2ePerTKm: 0.602, category: 'air', defaultLoadFactor: 0.75 },
  { id: 'pipeline',         name: 'Pipeline (gas/liquid)',      kgCO2ePerTKm: 0.005, category: 'pipeline', defaultLoadFactor: 1.0 },
];

export interface FreightLeg {
  id: string;
  label?: string;
  origin?: string;
  destination?: string;
  mode: TransportMode;
  weightTonnes: number;
  distanceKm: number;
  loadFactor?: number;     // override
  emptyReturnFactor?: number; // 0-1 share of empty return distance, default 0
  customEf?: number;       // override mode EF
}

export interface LegResult {
  id: string;
  label: string;
  modeName: string;
  weightTonnes: number;
  distanceKm: number;
  effectiveEf: number;
  kgCO2e: number;
  loadFactorUsed: number;
  emptyReturnUplift: number;
}

export interface LogisticsResult {
  legs: LegResult[];
  totalKgCO2e: number;
  totalTonneKm: number;
  byMode: Record<string, number>;
  averageIntensity: number; // kgCO2e per t-km
  factorSources: string[];
  methodologyVersion: 'LOGISTICS-v1.0 (GLEC v3.0 / ISO 14083)';
}

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

export function calculateLogistics(legs: FreightLeg[]): LogisticsResult {
  const legResults: LegResult[] = [];
  const byMode: Record<string, number> = {};
  let total = 0;
  let totalTKm = 0;

  for (const leg of legs) {
    const mode = TRANSPORT_MODES.find(m => m.id === leg.mode);
    if (!mode) continue;
    const baseEf = leg.customEf ?? mode.kgCO2ePerTKm;
    const loadFactor = leg.loadFactor ?? mode.defaultLoadFactor;
    // Lower load factor → higher per-tonne intensity (inverse scaling vs default)
    const loadAdjustment = mode.defaultLoadFactor / Math.max(0.1, loadFactor);
    const emptyReturn = Math.max(0, Math.min(1, leg.emptyReturnFactor ?? 0));
    const effectiveEf = baseEf * loadAdjustment * (1 + emptyReturn);

    const tkm = (leg.weightTonnes || 0) * (leg.distanceKm || 0);
    const kg = effectiveEf * tkm;

    total += kg;
    totalTKm += tkm;
    byMode[mode.name] = round((byMode[mode.name] || 0) + kg);

    legResults.push({
      id: leg.id,
      label: leg.label || `${leg.origin || ''} → ${leg.destination || ''}`.trim() || mode.name,
      modeName: mode.name,
      weightTonnes: leg.weightTonnes,
      distanceKm: leg.distanceKm,
      effectiveEf: round(effectiveEf, 4),
      kgCO2e: round(kg),
      loadFactorUsed: loadFactor,
      emptyReturnUplift: emptyReturn,
    });
  }

  return {
    legs: legResults,
    totalKgCO2e: round(total),
    totalTonneKm: round(totalTKm),
    byMode,
    averageIntensity: totalTKm > 0 ? round(total / totalTKm, 4) : 0,
    factorSources: ['GLEC Framework v3.0', 'ISO 14083:2023'],
    methodologyVersion: 'LOGISTICS-v1.0 (GLEC v3.0 / ISO 14083)',
  };
}
