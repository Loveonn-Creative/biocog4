/**
 * Product Carbon Footprint (PCF) Engine
 * Standards: ISO 14067, GHG Protocol Product Standard
 * Scope: cradle-to-gate or gate-to-gate
 * Emission factor hierarchy: primary > secondary (DEFRA/Ecoinvent) > IPCC AR6 proxy
 */

export type AllocationMethod = 'mass' | 'energy' | 'economic' | 'none';
export type SystemBoundary = 'cradle-to-gate' | 'gate-to-gate' | 'cradle-to-grave';
export type EFTier = 'primary' | 'secondary' | 'proxy';

export interface MaterialFactor {
  id: string;
  name: string;
  kgCO2ePerKg: number;
  source: string;
  tier: EFTier;
}

export interface EnergyFactor {
  id: string;
  name: string;
  kgCO2ePerKWh: number;
  source: string;
  tier: EFTier;
}

export interface TransportFactor {
  id: string;
  name: string;
  kgCO2ePerTKm: number; // per tonne-km
  source: string;
  tier: EFTier;
}

// DEFRA 2024 + Ecoinvent v3.10 published cradle-to-gate values
export const PCF_MATERIALS: MaterialFactor[] = [
  { id: 'steel-virgin', name: 'Steel (virgin, BF-BOF)', kgCO2ePerKg: 2.10, source: 'World Steel Assoc 2023', tier: 'secondary' },
  { id: 'steel-recycled', name: 'Steel (recycled, EAF)', kgCO2ePerKg: 0.40, source: 'World Steel Assoc 2023', tier: 'secondary' },
  { id: 'aluminium-primary', name: 'Aluminium (primary)', kgCO2ePerKg: 16.5, source: 'IAI 2023', tier: 'secondary' },
  { id: 'aluminium-recycled', name: 'Aluminium (recycled)', kgCO2ePerKg: 0.50, source: 'IAI 2023', tier: 'secondary' },
  { id: 'plastic-pet', name: 'Plastic (PET)', kgCO2ePerKg: 2.15, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'plastic-hdpe', name: 'Plastic (HDPE)', kgCO2ePerKg: 1.96, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'plastic-pp', name: 'Plastic (PP)', kgCO2ePerKg: 1.85, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'paper', name: 'Paper / cardboard', kgCO2ePerKg: 0.94, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'glass', name: 'Glass', kgCO2ePerKg: 0.85, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'cement', name: 'Cement (Portland)', kgCO2ePerKg: 0.84, source: 'GCCA 2023', tier: 'secondary' },
  { id: 'cotton', name: 'Cotton (textile)', kgCO2ePerKg: 5.90, source: 'Ecoinvent v3.10', tier: 'secondary' },
  { id: 'polyester', name: 'Polyester (textile)', kgCO2ePerKg: 6.40, source: 'Ecoinvent v3.10', tier: 'secondary' },
  { id: 'rubber', name: 'Rubber (natural)', kgCO2ePerKg: 1.60, source: 'Ecoinvent v3.10', tier: 'secondary' },
  { id: 'wood', name: 'Wood (sawn timber)', kgCO2ePerKg: 0.45, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'copper', name: 'Copper', kgCO2ePerKg: 4.60, source: 'ICA 2023', tier: 'secondary' },
];

// Common grid factors (kgCO2e/kWh) — IEA 2023 / national grids
export const PCF_ENERGY: EnergyFactor[] = [
  { id: 'grid-in', name: 'Electricity — India grid', kgCO2ePerKWh: 0.708, source: 'CEA 2023', tier: 'secondary' },
  { id: 'grid-cn', name: 'Electricity — China grid', kgCO2ePerKWh: 0.555, source: 'IEA 2023', tier: 'secondary' },
  { id: 'grid-eu', name: 'Electricity — EU avg grid', kgCO2ePerKWh: 0.230, source: 'EEA 2023', tier: 'secondary' },
  { id: 'grid-us', name: 'Electricity — US grid', kgCO2ePerKWh: 0.371, source: 'EPA 2023', tier: 'secondary' },
  { id: 'grid-vn', name: 'Electricity — Vietnam grid', kgCO2ePerKWh: 0.681, source: 'IEA 2023', tier: 'secondary' },
  { id: 'grid-id', name: 'Electricity — Indonesia grid', kgCO2ePerKWh: 0.760, source: 'IEA 2023', tier: 'secondary' },
  { id: 'grid-bd', name: 'Electricity — Bangladesh grid', kgCO2ePerKWh: 0.650, source: 'IEA 2023', tier: 'secondary' },
  { id: 'grid-ph', name: 'Electricity — Philippines grid', kgCO2ePerKWh: 0.640, source: 'IEA 2023', tier: 'secondary' },
  { id: 'grid-th', name: 'Electricity — Thailand grid', kgCO2ePerKWh: 0.510, source: 'IEA 2023', tier: 'secondary' },
  { id: 'grid-renewable', name: 'Electricity — 100% renewable PPA', kgCO2ePerKWh: 0.020, source: 'IPCC AR6', tier: 'proxy' },
  { id: 'natural-gas', name: 'Natural gas (combustion)', kgCO2ePerKWh: 0.184, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'diesel-fuel', name: 'Diesel (combustion)', kgCO2ePerKWh: 0.267, source: 'DEFRA 2024', tier: 'secondary' },
  { id: 'lpg', name: 'LPG (combustion)', kgCO2ePerKWh: 0.214, source: 'DEFRA 2024', tier: 'secondary' },
];

// GLEC v3.0 / DEFRA 2024 transport factors
export const PCF_TRANSPORT: TransportFactor[] = [
  { id: 'truck-rigid', name: 'Truck (rigid, diesel)', kgCO2ePerTKm: 0.105, source: 'GLEC v3.0', tier: 'secondary' },
  { id: 'truck-articulated', name: 'Truck (articulated)', kgCO2ePerTKm: 0.062, source: 'GLEC v3.0', tier: 'secondary' },
  { id: 'rail-diesel', name: 'Rail (diesel freight)', kgCO2ePerTKm: 0.022, source: 'GLEC v3.0', tier: 'secondary' },
  { id: 'rail-electric', name: 'Rail (electric freight)', kgCO2ePerTKm: 0.010, source: 'GLEC v3.0', tier: 'secondary' },
  { id: 'sea-container', name: 'Sea (container ship)', kgCO2ePerTKm: 0.008, source: 'GLEC v3.0', tier: 'secondary' },
  { id: 'sea-bulk', name: 'Sea (bulk carrier)', kgCO2ePerTKm: 0.004, source: 'GLEC v3.0', tier: 'secondary' },
  { id: 'air-short', name: 'Air freight (short-haul)', kgCO2ePerTKm: 1.130, source: 'GLEC v3.0', tier: 'secondary' },
  { id: 'air-long', name: 'Air freight (long-haul)', kgCO2ePerTKm: 0.602, source: 'GLEC v3.0', tier: 'secondary' },
];

export interface MaterialLine {
  id: string;
  factorId: string;
  massKg: number;
  customFactor?: number;
  customSource?: string;
}

export interface EnergyLine {
  id: string;
  factorId: string;
  kwh: number;
}

export interface TransportLine {
  id: string;
  factorId: string;
  weightTonnes: number;
  distanceKm: number;
}

export interface ProcessingLine {
  id: string;
  label: string;
  kgCO2e: number;
}

export interface PCFInput {
  productName: string;
  functionalUnit: string; // e.g. "1 kg", "1 unit"
  unitsPerBatch: number; // outputs from this calculation
  systemBoundary: SystemBoundary;
  allocationMethod: AllocationMethod;
  coProductShare: number; // 0-1, share allocated to this product
  materials: MaterialLine[];
  energy: EnergyLine[];
  transport: TransportLine[];
  processing: ProcessingLine[];
}

export interface PCFLineResult {
  category: 'material' | 'energy' | 'transport' | 'processing';
  label: string;
  kgCO2e: number;
  source: string;
  tier: EFTier | 'user';
}

export interface PCFResult {
  productName: string;
  functionalUnit: string;
  totalKgCO2eBatch: number;
  perFunctionalUnit: number;
  allocatedPerUnit: number;
  breakdown: PCFLineResult[];
  byCategory: { material: number; energy: number; transport: number; processing: number };
  factorSources: string[];
  systemBoundary: SystemBoundary;
  allocationMethod: AllocationMethod;
  methodologyVersion: 'PCF-v1.0 (ISO 14067)';
}

const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

export function calculatePCF(input: PCFInput): PCFResult {
  const breakdown: PCFLineResult[] = [];
  const sources = new Set<string>();

  let materialTotal = 0;
  for (const line of input.materials) {
    const factor = PCF_MATERIALS.find(m => m.id === line.factorId);
    const ef = line.customFactor ?? factor?.kgCO2ePerKg ?? 0;
    const source = line.customSource ?? factor?.name ?? 'unknown';
    const tier: EFTier | 'user' = line.customFactor !== undefined ? 'user' : (factor?.tier ?? 'proxy');
    const kg = ef * (line.massKg || 0);
    materialTotal += kg;
    sources.add(line.customSource ?? factor?.source ?? '');
    breakdown.push({ category: 'material', label: factor?.name ?? source, kgCO2e: round(kg), source: line.customSource ?? factor?.source ?? '', tier });
  }

  let energyTotal = 0;
  for (const line of input.energy) {
    const factor = PCF_ENERGY.find(e => e.id === line.factorId);
    if (!factor) continue;
    const kg = factor.kgCO2ePerKWh * (line.kwh || 0);
    energyTotal += kg;
    sources.add(factor.source);
    breakdown.push({ category: 'energy', label: factor.name, kgCO2e: round(kg), source: factor.source, tier: factor.tier });
  }

  let transportTotal = 0;
  for (const line of input.transport) {
    const factor = PCF_TRANSPORT.find(t => t.id === line.factorId);
    if (!factor) continue;
    const kg = factor.kgCO2ePerTKm * (line.weightTonnes || 0) * (line.distanceKm || 0);
    transportTotal += kg;
    sources.add(factor.source);
    breakdown.push({ category: 'transport', label: factor.name, kgCO2e: round(kg), source: factor.source, tier: factor.tier });
  }

  let processingTotal = 0;
  for (const line of input.processing) {
    processingTotal += line.kgCO2e || 0;
    breakdown.push({ category: 'processing', label: line.label || 'Process emissions', kgCO2e: round(line.kgCO2e || 0), source: 'user input', tier: 'user' });
  }

  const totalBatch = materialTotal + energyTotal + transportTotal + processingTotal;
  const allocated = totalBatch * (input.allocationMethod === 'none' ? 1 : Math.max(0, Math.min(1, input.coProductShare)));
  const units = input.unitsPerBatch > 0 ? input.unitsPerBatch : 1;

  return {
    productName: input.productName,
    functionalUnit: input.functionalUnit,
    totalKgCO2eBatch: round(totalBatch),
    perFunctionalUnit: round(totalBatch / units),
    allocatedPerUnit: round(allocated / units),
    breakdown,
    byCategory: {
      material: round(materialTotal),
      energy: round(energyTotal),
      transport: round(transportTotal),
      processing: round(processingTotal),
    },
    factorSources: Array.from(sources).filter(Boolean),
    systemBoundary: input.systemBoundary,
    allocationMethod: input.allocationMethod,
    methodologyVersion: 'PCF-v1.0 (ISO 14067)',
  };
}
