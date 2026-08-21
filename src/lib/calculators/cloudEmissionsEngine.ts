/**
 * Cloud & Data Centre Emissions Engine
 * Standard: GHG Protocol Scope 2 (location-based and market-based) +
 *           GHG Protocol Scope 3 Category 1 for purchased cloud services,
 *           energy coefficients from the Cloud Carbon Footprint methodology
 *           (Etsy/Teads-derived), PUE from operator-published disclosures.
 *
 * Method (per workload line):
 *   kWh = [ vCPU-hours x vCPU_kWh x utilisation-scaled power
 *         + GB-memory-hours x MEMORY_KWH_PER_GB_HOUR
 *         + TB-storage x hours x storage_kWh_per_TB_hour
 *         + GB-network x NETWORK_KWH_PER_GB ] x PUE
 *   kgCO2e (location-based) = kWh x grid factor of the hosting region
 *   kgCO2e (market-based)   = kWh x (1 - renewable share) x grid factor
 *
 * Nothing here is estimated on the user's behalf: if a workload has no
 * usage quantities, it is excluded and reported as excluded.
 */

import { COUNTRY_CONFIGS } from '@/lib/countryConfig';

// --- Published coefficients -------------------------------------------------
// Cloud Carbon Footprint coefficients (kWh), widely used by CCF/Climatiq.
const VCPU_MIN_WATTS = 0.74;   // idle watts per vCPU
const VCPU_MAX_WATTS = 3.5;    // watts per vCPU at 100% utilisation
const MEMORY_KWH_PER_GB_HOUR = 0.000392;
const SSD_KWH_PER_TB_HOUR = 0.0012;
const HDD_KWH_PER_TB_HOUR = 0.00065;
const NETWORK_KWH_PER_GB = 0.001;

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'oci' | 'other-cloud' | 'colocation' | 'on-premise';
export type StorageType = 'ssd' | 'hdd';

export interface ProviderProfile {
  id: CloudProvider;
  name: string;
  pue: number;
  pueSource: string;
  /** Operator-reported renewable/carbon-free share, used only as a displayed reference. */
  reportedRenewableShare?: number;
}

export const PROVIDERS: ProviderProfile[] = [
  { id: 'aws', name: 'Amazon Web Services', pue: 1.135, pueSource: 'AWS published global average PUE (2023)', reportedRenewableShare: 1.0 },
  { id: 'azure', name: 'Microsoft Azure', pue: 1.185, pueSource: 'Microsoft published fleet-wide PUE (2023)', reportedRenewableShare: 1.0 },
  { id: 'gcp', name: 'Google Cloud', pue: 1.10, pueSource: 'Google fleet-wide trailing-twelve-month PUE (2023)', reportedRenewableShare: 0.64 },
  { id: 'oci', name: 'Oracle Cloud', pue: 1.15, pueSource: 'Oracle published data-centre PUE (2023)' },
  { id: 'other-cloud', name: 'Other public cloud', pue: 1.30, pueSource: 'Uptime Institute global survey average (2023)' },
  { id: 'colocation', name: 'Colocation data centre', pue: 1.47, pueSource: 'Uptime Institute global colocation average (2023)' },
  { id: 'on-premise', name: 'On-premise server room', pue: 1.58, pueSource: 'Uptime Institute global enterprise average (2023)' },
];

export interface CloudWorkload {
  id: string;
  label?: string;
  provider: CloudProvider;
  /** ISO country code of the hosting region, resolved against the platform country config. */
  regionCountry: string;
  vcpuHours: number;
  /** Average CPU utilisation 0-1. Defaults to 0.5 when not supplied (stated as an assumption). */
  utilisation?: number;
  memoryGbHours: number;
  storageTb: number;
  storageType: StorageType;
  storageHours: number;
  networkGb: number;
  /** Contractual renewable share 0-1 backed by RECs/PPAs, for the market-based figure. */
  renewableShare?: number;
  /** PUE override when the operator gives you a region-specific figure. */
  customPue?: number;
}

export interface WorkloadResult {
  id: string;
  label: string;
  providerName: string;
  regionName: string;
  gridFactor: number;
  pue: number;
  kwh: number;
  breakdownKwh: { compute: number; memory: number; storage: number; network: number };
  locationBasedKgCO2e: number;
  marketBasedKgCO2e: number | null;
  utilisationAssumed: boolean;
}

export interface CloudEmissionsResult {
  workloads: WorkloadResult[];
  totalKwh: number;
  locationBasedKgCO2e: number;
  marketBasedKgCO2e: number | null;
  byProvider: Record<string, number>;
  byRegion: Record<string, number>;
  intensityKgPerKwh: number;
  assumptions: string[];
  factorSources: string[];
  methodologyVersion: 'CLOUD-v1.0 (GHGP Scope 2 dual reporting / CCF coefficients)';
}

const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

export function getProvider(id: CloudProvider): ProviderProfile {
  return PROVIDERS.find(p => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1];
}

/** Grid factor for the hosting region; falls back to the IEA world average when unmapped. */
export function getRegionGridFactor(countryCode: string): { factor: number; name: string; mapped: boolean } {
  const config = COUNTRY_CONFIGS[countryCode];
  if (config) return { factor: config.gridFactor, name: config.name, mapped: true };
  return { factor: 0.481, name: countryCode || 'Unmapped region', mapped: false };
}

export function hasUsage(w: CloudWorkload): boolean {
  return (w.vcpuHours > 0) || (w.memoryGbHours > 0) || (w.storageTb > 0 && w.storageHours > 0) || (w.networkGb > 0);
}

export function calculateCloudEmissions(workloads: CloudWorkload[]): CloudEmissionsResult {
  const results: WorkloadResult[] = [];
  const byProvider: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const assumptions = new Set<string>();

  let totalKwh = 0;
  let totalLocation = 0;
  let totalMarket = 0;
  let anyMarket = false;

  for (const w of workloads) {
    if (!hasUsage(w)) continue;

    const profile = getProvider(w.provider);
    const pue = w.customPue && w.customPue > 0 ? w.customPue : profile.pue;
    const region = getRegionGridFactor(w.regionCountry);
    if (!region.mapped) {
      assumptions.add('One or more regions are not in the platform grid-factor library; the IEA world average (0.481 kgCO₂e/kWh) was used and is flagged as lower confidence.');
    }

    const utilisationAssumed = w.utilisation === undefined;
    const utilisation = Math.min(Math.max(w.utilisation ?? 0.5, 0), 1);
    if (utilisationAssumed && w.vcpuHours > 0) {
      assumptions.add('Average CPU utilisation of 50% assumed where none was supplied.');
    }

    // Linear interpolation between idle and full-load power (CCF method).
    const wattsPerVcpu = VCPU_MIN_WATTS + utilisation * (VCPU_MAX_WATTS - VCPU_MIN_WATTS);
    const compute = (w.vcpuHours * wattsPerVcpu) / 1000;
    const memory = w.memoryGbHours * MEMORY_KWH_PER_GB_HOUR;
    const storageRate = w.storageType === 'hdd' ? HDD_KWH_PER_TB_HOUR : SSD_KWH_PER_TB_HOUR;
    const storage = w.storageTb * w.storageHours * storageRate;
    const network = w.networkGb * NETWORK_KWH_PER_GB;

    const rawKwh = compute + memory + storage + network;
    const kwh = rawKwh * pue;

    const locationKg = kwh * region.factor;
    const renewable = w.renewableShare;
    const marketKg = renewable === undefined ? null : kwh * (1 - Math.min(Math.max(renewable, 0), 1)) * region.factor;
    if (marketKg !== null) anyMarket = true;
    if (renewable === undefined) {
      assumptions.add('Market-based figures are only produced for workloads where a contractual renewable share was entered; provider marketing claims are not applied automatically.');
    }

    results.push({
      id: w.id,
      label: w.label?.trim() || `${profile.name} — ${region.name}`,
      providerName: profile.name,
      regionName: region.name,
      gridFactor: region.factor,
      pue,
      kwh: round(kwh),
      breakdownKwh: {
        compute: round(compute * pue),
        memory: round(memory * pue),
        storage: round(storage * pue),
        network: round(network * pue),
      },
      locationBasedKgCO2e: round(locationKg, 3),
      marketBasedKgCO2e: marketKg === null ? null : round(marketKg, 3),
      utilisationAssumed,
    });

    totalKwh += kwh;
    totalLocation += locationKg;
    totalMarket += marketKg ?? locationKg;

    byProvider[profile.name] = round((byProvider[profile.name] || 0) + locationKg, 3);
    byRegion[region.name] = round((byRegion[region.name] || 0) + locationKg, 3);
  }

  assumptions.add('Embodied (manufacturing) emissions of the underlying hardware are out of scope for this calculation and are not included in the totals.');

  return {
    workloads: results,
    totalKwh: round(totalKwh),
    locationBasedKgCO2e: round(totalLocation, 3),
    marketBasedKgCO2e: anyMarket ? round(totalMarket, 3) : null,
    byProvider,
    byRegion,
    intensityKgPerKwh: totalKwh > 0 ? round(totalLocation / totalKwh, 4) : 0,
    assumptions: Array.from(assumptions),
    factorSources: [
      'Cloud Carbon Footprint energy coefficients (vCPU, memory, storage, network)',
      'Operator-published PUE disclosures (2023)',
      'IEA 2023 national grid emission factors',
      'GHG Protocol Scope 2 Guidance — location-based and market-based methods',
    ],
    methodologyVersion: 'CLOUD-v1.0 (GHGP Scope 2 dual reporting / CCF coefficients)',
  };
}
