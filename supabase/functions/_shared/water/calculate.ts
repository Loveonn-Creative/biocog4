import type { Resolution } from './types.ts';
import { factorPerM3 } from './units.ts';

export interface Calculation {
  /** kgCO2e, or null when no usable factor exists (I2: never 0 for a missing factor). */
  emissions_kgco2e: number | null;
  /** Factor converted to kgCO2e per m³, as used in the multiplication. */
  factor_per_m3: number | null;
  /** ± kgCO2e from the factor's relative uncertainty, or null when the factor states none. */
  uncertainty_kgco2e: number | null;
}

/**
 * Activity-based method (GHG Protocol Corporate Standard, ch. 6; Scope 3
 * Technical Guidance, ch. 1 and 5): emissions = activity data x emission factor.
 *   kgCO2e = volume (m³) x factor (kgCO2e per m³)
 * The factor is converted to per m³ with the exact constants in units.ts.
 * A measured zero volume with a factor gives 0; no factor gives null.
 * Uncertainty covers the factor only (the stated relative uncertainty, e.g.
 * 0.1 = ±10%); meter uncertainty is not quantified and is reported as such.
 */
export function calculate(volume_m3: number | null, r: Resolution): Calculation {
  const none = { emissions_kgco2e: null, factor_per_m3: null, uncertainty_kgco2e: null };
  if (!r.factor || volume_m3 === null || !Number.isFinite(volume_m3)) return none;
  const perM3 = factorPerM3(r.factor.value, r.factor.unit);
  if (perM3 === null) return none;
  const e = volume_m3 * perM3;
  const u = typeof r.factor.uncertainty === 'number' && Number.isFinite(r.factor.uncertainty) && r.factor.uncertainty >= 0
    ? Math.abs(e) * r.factor.uncertainty : null;
  return { emissions_kgco2e: e, factor_per_m3: perM3, uncertainty_kgco2e: u };
}
