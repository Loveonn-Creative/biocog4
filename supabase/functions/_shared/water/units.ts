// Exact unit constants (I3: nothing approximated or guessed).
//   m³ = 1; kL = 1 m³; L = 0.001 m³
//   US gallon = 3.785411784 L; imperial gallon = 4.54609 L
//   CCF/HCF = 100 ft³ = 2.8316846592 m³ (1 ft = 0.3048 m exactly)
// Unknown units return null; the caller records UNKNOWN_UNIT.

const L = 0.001;
const M3_PER: Record<string, number> = {
  'm3': 1, 'm³': 1, 'cubic meter': 1, 'cubic metre': 1, 'cubic meters': 1, 'cubic metres': 1, 'cum': 1, 'cu m': 1, 'cu.m': 1,
  'kl': 1, 'kilolitre': 1, 'kiloliter': 1, 'kilolitres': 1, 'kiloliters': 1,
  'l': L, 'ltr': L, 'litre': L, 'liter': L, 'litres': L, 'liters': L,
  'us gal': 3.785411784 * L, 'us gallon': 3.785411784 * L, 'us gallons': 3.785411784 * L, 'gal (us)': 3.785411784 * L,
  'imp gal': 4.54609 * L, 'imperial gallon': 4.54609 * L, 'imperial gallons': 4.54609 * L, 'gal (imp)': 4.54609 * L,
  'ccf': 2.8316846592, 'hcf': 2.8316846592,
};

const key = (u: string) => u.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '');

/** m³ per one unit, or null for an unknown unit. A bare "gallon" is ambiguous (US vs imperial) and is unknown. */
export function m3PerUnit(unit: string | null | undefined): number | null {
  if (typeof unit !== 'string' || !unit.trim()) return null;
  return M3_PER[key(unit)] ?? null;
}

export function toM3(volume: number, unit: string | null | undefined): number | null {
  const f = m3PerUnit(unit);
  return f === null || !Number.isFinite(volume) ? null : volume * f;
}

/**
 * Converts a factor to kgCO2e per m³. Accepts "kgCO2e/<unit>" (or per <unit>)
 * where <unit> is a known volume unit. Anything else returns null.
 */
export function factorPerM3(value: number, unit: string): number | null {
  const m = key(unit).match(/^kg ?co2e? ?(?:\/|per )\s*(.+)$/);
  if (!m || !Number.isFinite(value)) return null;
  const per = m3PerUnit(m[1]);
  return per === null ? null : value / per;
}
