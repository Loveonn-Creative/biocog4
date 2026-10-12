// Worked example for an industry page: monthly quantities x the pipeline's
// own emission factors, annualised. Pure, so the page and the tests agree.
import { FUEL_FACTORS, INDIA_GRID_FACTOR_KG_PER_KWH } from '@/lib/factors';
import type { ExampleFactor, ExampleInput } from '@/data/industriesData';

export function factorFor(f: ExampleFactor): number {
  return f === 'GRID' ? INDIA_GRID_FACTOR_KG_PER_KWH : FUEL_FACTORS[f].value;
}

export interface ExampleLine { label: string; unit: string; qty: number; factor: number; scope: 1 | 2; annualKg: number }
export interface ExampleResult { lines: ExampleLine[]; annualTonnes: number; scope1Tonnes: number; scope2Tonnes: number }

export function computeExample(inputs: ExampleInput[], qtys: number[]): ExampleResult {
  const lines = inputs.map((x, i) => {
    const raw = qtys[i];
    const qty = Number.isFinite(raw) && raw > 0 ? Math.min(raw, x.max) : 0;
    const factor = factorFor(x.factor);
    return { label: x.label, unit: x.unit, qty, factor, scope: (x.factor === 'GRID' ? 2 : 1) as 1 | 2, annualKg: qty * 12 * factor };
  });
  const t = (s?: 1 | 2) => Math.round(lines.filter(l => !s || l.scope === s).reduce((a, l) => a + l.annualKg, 0) / 100) / 10;
  return { lines, annualTonnes: t(), scope1Tonnes: t(1), scope2Tonnes: t(2) };
}
