/**
 * Logistics & Transportation Emissions Engine
 * Method: ISO 14083:2023 / GLEC Framework. kgCO2e = tonnes × km × intensity.
 * Intensities come from the shared table in ./freightFactors (WTW, average
 * load including empty running), so no load-factor or empty-return uplift is
 * applied on top of a default. A carrier's own factor is used as given.
 */

import {
  FREIGHT_FACTORS, getFreightFactor, resolveFreightFactor,
  type FreightCategory, type FreightFactorId,
} from './freightFactors';

/** Current factor ids, plus older ids kept so saved runs still re-run. */
export type TransportMode = FreightFactorId | string;

export interface ModeFactor {
  id: FreightFactorId;
  name: string;
  kgCO2ePerTKm: number; // WTW, average load incl. empty running
  category: FreightCategory;
}

export const TRANSPORT_MODES: ModeFactor[] = FREIGHT_FACTORS.map(f => ({
  id: f.id, name: f.name, kgCO2ePerTKm: f.kgCO2ePerTKm, category: f.category,
}));

export interface FreightLeg {
  id: string;
  label?: string;
  origin?: string;
  destination?: string;
  mode: TransportMode;
  weightTonnes: number;
  distanceKm: number;
  /** Carrier's own intensity, kg CO2e per tonne-km; used as given. */
  customEf?: number;
  /** Kept for older saved runs; ignored, because defaults already include load and empty running. */
  loadFactor?: number;
  /** Kept for older saved runs; ignored, because defaults already include empty running. */
  emptyReturnFactor?: number;
}

export interface LegResult {
  id: string;
  label: string;
  modeName: string;
  weightTonnes: number;
  distanceKm: number;
  effectiveEf: number;
  kgCO2e: number;
  basis: 'carrier' | 'default' | 'fallback';
}

export interface LogisticsResult {
  legs: LegResult[];
  totalKgCO2e: number;
  totalTonneKm: number;
  byMode: Record<string, number>;
  averageIntensity: number; // kgCO2e per t-km
  factorSources: string[];
  /** Plain-language caveats from the resolution step (fallbacks, skipped legs). */
  notes: string[];
  methodologyVersion: 'LOGISTICS-v2.0 (ISO 14083)';
}

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const valid = (n: number) => Number.isFinite(n) && n > 0;

export function calculateLogistics(legs: FreightLeg[]): LogisticsResult {
  const legResults: LegResult[] = [];
  const byMode: Record<string, number> = {};
  const notes: string[] = [];
  let total = 0;
  let totalTKm = 0;

  for (const leg of legs) {
    if (!valid(leg.weightTonnes) || !valid(leg.distanceKm)) continue;
    if (leg.customEf !== undefined && !(leg.customEf > 0 && leg.customEf <= 5)) {
      notes.push(`Carrier factor on ${leg.label || 'a leg'} looked wrong (expected kg CO2e per tonne-km), so the default was used.`);
    }
    const resolved = resolveFreightFactor({
      mode: leg.mode, weightTonnes: leg.weightTonnes, distanceKm: leg.distanceKm, customEf: leg.customEf,
    });
    if (!resolved) {
      notes.push(`${leg.label || 'One leg'} was left out: no reviewed factor for this mode yet. Enter the carrier's factor to include it.`);
      continue;
    }
    if (resolved.note) notes.push(resolved.note);

    const tkm = leg.weightTonnes * leg.distanceKm;
    const kg = resolved.kgCO2ePerTKm * tkm;
    const modeName = resolved.basis === 'carrier'
      ? `${getFreightFactor(String(leg.mode))?.name ?? 'Freight'} (carrier factor)`
      : resolved.factor?.name ?? 'Freight';

    total += kg;
    totalTKm += tkm;
    byMode[modeName] = round((byMode[modeName] || 0) + kg);

    legResults.push({
      id: leg.id,
      label: leg.label || `${leg.origin || ''} → ${leg.destination || ''}`.trim() || modeName,
      modeName,
      weightTonnes: leg.weightTonnes,
      distanceKm: leg.distanceKm,
      effectiveEf: round(resolved.kgCO2ePerTKm, 4),
      kgCO2e: round(kg),
      basis: resolved.basis,
    });
  }

  return {
    legs: legResults,
    totalKgCO2e: round(total),
    totalTonneKm: round(totalTKm),
    byMode,
    averageIntensity: totalTKm > 0 ? round(total / totalTKm, 4) : 0,
    factorSources: ['Default freight intensities (well-to-wheel, average load)'],
    notes: Array.from(new Set(notes)),
    methodologyVersion: 'LOGISTICS-v2.0 (ISO 14083)',
  };
}
