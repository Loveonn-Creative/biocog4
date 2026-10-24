// Maths for the two one-job tools (/calculators/electricity-bill-carbon and
// /calculators/fuel-carbon). Both read the factors the product itself uses,
// from supabase/functions/_shared/emissionFactors.ts, so a figure from a tool
// and a figure from an uploaded bill never disagree.
//
// Grid factor: CEA CO2 Baseline Database, India weighted average, as used in
// Senseible's calculations. CEA publishes a new edition every year:
// https://cea.nic.in/cdm-co2-baseline-view?mappingId=234&lang=en
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH, type FuelType } from '../../../supabase/functions/_shared/emissionFactors';

export const GRID_FACTOR = INDIA_GRID_FACTOR_KG_PER_KWH;

const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** kg CO2 for one or more months of grid electricity in kWh. */
export function electricityKg(kwh: number | number[]): number {
  const list = Array.isArray(kwh) ? kwh : [kwh];
  return list.reduce((s, k) => s + clean(k), 0) * GRID_FACTOR;
}

export type QuickFuel = Exclude<FuelType, 'BIOMASS'>;

export interface FuelUnit { id: string; label: string; perFactorUnit: number }

export interface FuelOption { id: QuickFuel; name: string; factor: number; unit: string; units: FuelUnit[] }

const u = (id: string, label: string, perFactorUnit = 1): FuelUnit => ({ id, label, perFactorUnit });

// Units are offered only where the conversion needs no assumed density.
// LPG cylinders: 14.2 kg (domestic) and 19 kg (commercial) are the standard
// Indian refill sizes.
export const FUELS: FuelOption[] = [
  { id: 'DIESEL', name: 'Diesel', factor: FUEL_FACTORS.DIESEL.value, unit: 'litre', units: [u('litre', 'litres'), u('kl', 'kilolitres', 1000)] },
  { id: 'PETROL', name: 'Petrol', factor: FUEL_FACTORS.PETROL.value, unit: 'litre', units: [u('litre', 'litres'), u('kl', 'kilolitres', 1000)] },
  { id: 'LPG', name: 'LPG', factor: FUEL_FACTORS.LPG.value, unit: 'kg', units: [u('kg', 'kg'), u('cyl19', '19 kg cylinders', 19), u('cyl14', '14.2 kg cylinders', 14.2)] },
  { id: 'CNG', name: 'CNG', factor: FUEL_FACTORS.CNG.value, unit: 'kg', units: [u('kg', 'kg')] },
  { id: 'PNG', name: 'PNG', factor: FUEL_FACTORS.PNG.value, unit: 'scm', units: [u('scm', 'scm')] },
  { id: 'FURNACE_OIL', name: 'Furnace oil', factor: FUEL_FACTORS.FURNACE_OIL.value, unit: 'litre', units: [u('litre', 'litres'), u('kl', 'kilolitres', 1000)] },
  { id: 'KEROSENE', name: 'Kerosene', factor: FUEL_FACTORS.KEROSENE.value, unit: 'litre', units: [u('litre', 'litres')] },
  { id: 'COAL', name: 'Coal', factor: FUEL_FACTORS.COAL.value, unit: 'kg', units: [u('kg', 'kg'), u('t', 'tonnes', 1000)] },
  { id: 'NAPHTHA', name: 'Naphtha', factor: FUEL_FACTORS.NAPHTHA.value, unit: 'kg', units: [u('kg', 'kg'), u('t', 'tonnes', 1000)] },
];

export interface FuelLine { fuel: QuickFuel; unit: string; qty: number }

export interface FuelResult { fuel: FuelOption; base: number; kg: number }

/** Quantity in the factor's own unit, then quantity x factor. */
export function fuelLine(line: FuelLine): FuelResult {
  const fuel = FUELS.find((f) => f.id === line.fuel) ?? FUELS[0];
  const unit = fuel.units.find((x) => x.id === line.unit) ?? fuel.units[0];
  const base = clean(line.qty) * unit.perFactorUnit;
  return { fuel, base, kg: base * fuel.factor };
}

export const inKg = (kg: number) => kg.toLocaleString('en-IN', { maximumFractionDigits: kg < 10 ? 2 : 0 });
export const inT = (kg: number) => (kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: kg < 10_000 ? 2 : 1 });
