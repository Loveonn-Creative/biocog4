/**
 * Shared freight emission intensities for every calculator (logistics, PCF).
 *
 * Basis (ISO 14083:2023, GLEC Framework): kg CO2e per tonne-km, well-to-wheel,
 * at average load INCLUDING typical empty running. Because empty running and
 * load are already inside these values, callers must not add an empty-return
 * uplift or rescale by load factor on top of them (that double counts).
 *
 * Provenance is kept here for audit and is not shown to users:
 * - status 'confirmed': read from the primary document.
 *   India road and rail: Smart Freight Centre and TCI-IIMB, "India Default GHG
 *   Emission Values V1.0, complementing GLEC Framework v3.01" (May 2025),
 *   road table (WTW column) and rail table (total, Indian Railways FY2015-16 to
 *   FY2019-20, all traction).
 * - status 'to_confirm': seen only in secondary summaries of GLEC Framework
 *   v3.x default values (October 2026 audit); confirm against the GLEC tables
 *   before treating as final.
 *
 * Unit traps this module guards against (see helpers below):
 * - a factor per short ton-mile is not per tonne-km (1 short ton-mile = 1.459972 tkm);
 * - a factor per vehicle-km or vehicle-mile has no payload in it and cannot be
 *   multiplied by tonnes.
 */

export type FreightCategory = 'road' | 'rail' | 'sea' | 'air';
export type FreightFactorStatus = 'confirmed' | 'to_confirm';

export type FreightFactorId =
  | 'road-scv-diesel' | 'road-scv-petrol' | 'road-scv-cng'
  | 'road-lcv-diesel'
  | 'road-mcv-diesel' | 'road-mcv-cng'
  | 'road-hcv12-diesel' | 'road-hcv20-diesel' | 'road-hcv30-diesel'
  | 'road-trailer-diesel'
  | 'rail-india'
  | 'sea-container' | 'sea-bulk'
  | 'air-freighter-short' | 'air-freighter-long';

export interface FreightFactor {
  id: FreightFactorId;
  name: string;
  category: FreightCategory;
  /** kg CO2e per tonne-km, WTW, average load incl. empty running */
  kgCO2ePerTKm: number;
  status: FreightFactorStatus;
  /** Payload capacity band in tonnes (road only), used to pick a class from shipment weight. */
  payloadTonnes?: [number, number];
  /** Internal provenance note; not for display. */
  reference: string;
}

const SFC_INDIA = 'SFC India Default GHG Emission Values V1.0 (May 2025)';
const GLEC_SECONDARY = 'GLEC Framework v3.x default (secondary summary; to confirm)';

export const FREIGHT_FACTORS: FreightFactor[] = [
  { id: 'road-scv-diesel', name: 'Small truck or pickup (under 3.5 t GVW), diesel', category: 'road', kgCO2ePerTKm: 0.3795, status: 'confirmed', payloadTonnes: [0, 2], reference: `${SFC_INDIA}, road row 1 diesel` },
  { id: 'road-scv-petrol', name: 'Small truck or pickup (under 3.5 t GVW), petrol', category: 'road', kgCO2ePerTKm: 0.4124, status: 'confirmed', payloadTonnes: [0, 2], reference: `${SFC_INDIA}, road row 1 petrol` },
  { id: 'road-scv-cng', name: 'Small truck or pickup (under 3.5 t GVW), CNG', category: 'road', kgCO2ePerTKm: 0.4920, status: 'confirmed', payloadTonnes: [0, 2], reference: `${SFC_INDIA}, road row 1 CNG` },
  { id: 'road-lcv-diesel', name: 'Light truck (3 to 5 t GVW), diesel', category: 'road', kgCO2ePerTKm: 0.2222, status: 'confirmed', payloadTonnes: [2, 3.5], reference: `${SFC_INDIA}, road row 2` },
  { id: 'road-mcv-diesel', name: 'Medium truck (5 to 12 t GVW), diesel', category: 'road', kgCO2ePerTKm: 0.1400, status: 'confirmed', payloadTonnes: [3.5, 8], reference: `${SFC_INDIA}, road row 3 diesel` },
  { id: 'road-mcv-cng', name: 'Medium truck (5 to 12 t GVW), CNG', category: 'road', kgCO2ePerTKm: 0.1689, status: 'confirmed', payloadTonnes: [3.5, 8], reference: `${SFC_INDIA}, road row 3 CNG` },
  { id: 'road-hcv12-diesel', name: 'Heavy truck (12 to 20 t GVW), diesel', category: 'road', kgCO2ePerTKm: 0.0902, status: 'confirmed', payloadTonnes: [8, 12], reference: `${SFC_INDIA}, road row 4` },
  { id: 'road-hcv20-diesel', name: 'Heavy truck (20 to 30 t GVW), diesel', category: 'road', kgCO2ePerTKm: 0.0823, status: 'confirmed', payloadTonnes: [12, 20], reference: `${SFC_INDIA}, road row 5` },
  { id: 'road-hcv30-diesel', name: 'Heavy truck (30 to 50 t GVW), diesel', category: 'road', kgCO2ePerTKm: 0.0663, status: 'confirmed', payloadTonnes: [20, 40], reference: `${SFC_INDIA}, road row 6` },
  { id: 'road-trailer-diesel', name: 'Tractor-trailer (30 to 60 t GVW), diesel', category: 'road', kgCO2ePerTKm: 0.0551, status: 'confirmed', payloadTonnes: [20, 50], reference: `${SFC_INDIA}, road row 7` },
  { id: 'rail-india', name: 'Rail freight (India, diesel and electric)', category: 'rail', kgCO2ePerTKm: 0.0106, status: 'confirmed', reference: `${SFC_INDIA}, rail table total (WTT 0.0064 + TTW 0.0041)` },
  { id: 'sea-container', name: 'Sea: container ship', category: 'sea', kgCO2ePerTKm: 0.0084, status: 'to_confirm', reference: `${GLEC_SECONDARY}, average container vessel` },
  { id: 'sea-bulk', name: 'Sea: bulk carrier', category: 'sea', kgCO2ePerTKm: 0.005, status: 'to_confirm', reference: `${GLEC_SECONDARY}, bulk carrier` },
  { id: 'air-freighter-short', name: 'Air freight: freighter, short-haul (under 1,500 km)', category: 'air', kgCO2ePerTKm: 1.516, status: 'to_confirm', reference: `${GLEC_SECONDARY} v3.2, freighter short-haul` },
  { id: 'air-freighter-long', name: 'Air freight: freighter, long-haul', category: 'air', kgCO2ePerTKm: 0.608, status: 'to_confirm', reference: `${GLEC_SECONDARY} v3.2, freighter long-haul` },
];

/**
 * Old calculator mode ids, mapped to the closest reviewed factor so saved runs
 * still re-run. Where an old id spans two classes, the higher (conservative)
 * intensity is used. Old ids with no reviewed factor map to null.
 */
export const LEGACY_FREIGHT_IDS: Record<string, FreightFactorId | null> = {
  'road-rigid': 'road-mcv-diesel',          // was "rigid 7.5 to 17 t": spans MCV and HCV-1; MCV is higher
  'road-articulated': 'road-trailer-diesel', // was "articulated over 17 t"
  'road-van': 'road-scv-diesel',
  'truck-rigid': 'road-mcv-diesel',
  'truck-articulated': 'road-trailer-diesel',
  'rail-diesel': 'rail-india',
  'rail-electric': 'rail-india',
  'air-short': 'air-freighter-short',
  'air-long': 'air-freighter-long',
  'sea-tanker': null,
  'inland-waterway': null,
  'pipeline': null,
};

/** Air short-haul threshold used by the defaults (km). */
export const AIR_SHORT_HAUL_KM = 1500;
/** Upper bound for a user-entered carrier factor; anything above is treated as a unit error. */
export const MAX_CUSTOM_KG_PER_TKM = 5;

export function getFreightFactor(id: string): FreightFactor | undefined {
  const direct = FREIGHT_FACTORS.find(f => f.id === id);
  if (direct) return direct;
  const legacy = LEGACY_FREIGHT_IDS[id];
  return legacy ? FREIGHT_FACTORS.find(f => f.id === legacy) : undefined;
}

/**
 * Pick the road class whose payload band holds this shipment, using diesel
 * classes only. Used when the vehicle is unknown: it never invents a value,
 * it selects a published class. Loads above the largest band use the
 * tractor-trailer class (several vehicles at the same intensity).
 */
export function roadFactorForWeight(weightTonnes: number): FreightFactor {
  const diesel = FREIGHT_FACTORS.filter(f => f.category === 'road' && f.id.endsWith('-diesel') && f.payloadTonnes);
  const fit = diesel.find(f => weightTonnes <= (f.payloadTonnes as [number, number])[1]);
  return fit ?? (FREIGHT_FACTORS.find(f => f.id === 'road-trailer-diesel') as FreightFactor);
}

export type FactorBasis = 'carrier' | 'default' | 'fallback';

export interface ResolvedFreightFactor {
  kgCO2ePerTKm: number;
  basis: FactorBasis;
  factor?: FreightFactor;
  /** Plain-language note for the result panel when a default or fallback stood in. */
  note?: string;
}

/**
 * Resolve the intensity for one leg, in this order:
 * 1. the carrier's own factor, if valid (used as given; it reflects its own loading);
 * 2. the published default for the chosen mode or vehicle class;
 * 3. a safe fallback within the same category (road: class from shipment weight;
 *    air: short or long haul from distance; rail and sea: the category default).
 * Returns null when no reviewed factor exists, so the caller can say so instead
 * of guessing.
 */
export function resolveFreightFactor(input: {
  mode?: string;
  category?: FreightCategory;
  weightTonnes?: number;
  distanceKm?: number;
  customEf?: number;
}): ResolvedFreightFactor | null {
  const { customEf } = input;
  if (customEf !== undefined && Number.isFinite(customEf) && customEf > 0 && customEf <= MAX_CUSTOM_KG_PER_TKM) {
    return { kgCO2ePerTKm: customEf, basis: 'carrier' };
  }
  if (input.mode) {
    const f = getFreightFactor(input.mode);
    if (f) return { kgCO2ePerTKm: f.kgCO2ePerTKm, basis: 'default', factor: f };
    if (input.mode in LEGACY_FREIGHT_IDS) return null;
  }
  const category = input.category ?? (input.mode?.split('-')[0] as FreightCategory | undefined);
  let f: FreightFactor | undefined;
  if (category === 'road') f = roadFactorForWeight(input.weightTonnes ?? 0);
  else if (category === 'rail') f = getFreightFactor('rail-india');
  else if (category === 'sea') f = getFreightFactor('sea-container');
  else if (category === 'air') f = getFreightFactor((input.distanceKm ?? 0) < AIR_SHORT_HAUL_KM ? 'air-freighter-short' : 'air-freighter-long');
  if (!f) return null;
  return { kgCO2ePerTKm: f.kgCO2ePerTKm, basis: 'fallback', factor: f, note: `Vehicle type not given; used ${f.name.toLowerCase()}.` };
}

// ---- Unit helpers (use these instead of multiplying mismatched units) ----

export const TKM_PER_SHORT_TON_MILE = 1.459972;
export const KM_PER_MILE = 1.609344;

/** kg CO2e per short ton-mile (US EPA style) to kg CO2e per tonne-km. */
export function perShortTonMileToPerTKm(kgPerShortTonMile: number): number {
  return kgPerShortTonMile / TKM_PER_SHORT_TON_MILE;
}

/**
 * A per-vehicle factor (kg CO2e per vehicle-km, or per vehicle-mile with
 * perMile = true) becomes a per tonne-km factor only by dividing by the
 * average payload actually carried, including empty trips. Returns null
 * without a positive payload, rather than a misleading number.
 */
export function perVehicleDistanceToPerTKm(kgPerVehicleDistance: number, averagePayloadTonnes: number, perMile = false): number | null {
  if (!(averagePayloadTonnes > 0) || !Number.isFinite(kgPerVehicleDistance)) return null;
  const perVkm = perMile ? kgPerVehicleDistance / KM_PER_MILE : kgPerVehicleDistance;
  return perVkm / averagePayloadTonnes;
}
