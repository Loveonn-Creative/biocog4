export const CUSTOM_WORK = [
  { id: 'integration', label: 'New system integration', min: 100000, max: 250000, countLabel: 'New systems' },
  { id: 'factors', label: 'Client-specific emission-factor library', min: 250000, max: 500000, countLabel: 'Libraries' },
  { id: 'methodology', label: 'New methodology', min: 300000, max: 600000, countLabel: 'Methodologies' },
  { id: 'reporting', label: 'New reporting structure', min: 150000, max: 300000, countLabel: 'New outputs' },
  { id: 'workflow', label: 'Major new workflow', min: 400000, max: 800000, countLabel: 'Workflows' },
  { id: 'development', label: 'New product functionality', min: 500000, max: 1200000, countLabel: 'Features' },
] as const;

export type WorkId = typeof CUSTOM_WORK[number]['id'];
export type Complexity = 'standard' | 'complex' | 'enterprise';
export type Volume = 'normal' | 'high' | 'very-high';
export type ScopeInput = {
  counts: Partial<Record<WorkId, number>>;
  complexity: Complexity;
  entities: number;
  users: number;
  volume: Volume;
};

const BASE_MULTIPLIER: Record<Complexity, number> = { standard: 1, complex: 1.25, enterprise: 1.5 };
const validCount = (n: number, max: number) => Number.isInteger(n) && n >= 1 && n <= max;

export function estimateCustomScope(input: ScopeInput) {
  if (!validCount(input.entities, 100) || !validCount(input.users, 10000)) return null;
  let min = 0;
  let max = 0;
  const drivers: string[] = [];
  let extraUnits = 0;
  for (const work of CUSTOM_WORK) {
    const count = input.counts[work.id] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > 10) return null;
    if (!count) continue;
    min += work.min * count;
    max += work.max * count;
    extraUnits += count - 1;
    drivers.push(`${work.label} × ${count}`);
  }
  if (!drivers.length) return null;

  // One increment for each additional workload band, with an explicit cap.
  const entityBands = input.entities > 10 ? 2 : input.entities > 1 ? 1 : 0;
  const userBands = input.users > 100 ? 2 : input.users > 20 ? 1 : 0;
  const volumeBands: Record<Volume, number> = { normal: 0, high: 1, 'very-high': 2 };
  const volumeBand = volumeBands[input.volume];
  const base = BASE_MULTIPLIER[input.complexity];
  if (base === undefined || volumeBand === undefined) return null;
  const multiplier = Math.min(1.8, base + 0.05 * (extraUnits + entityBands + userBands + volumeBand));
  drivers.push(`${input.complexity[0].toUpperCase()}${input.complexity.slice(1)} complexity (×${base.toFixed(2)})`);
  drivers.push(`${input.entities} ${input.entities === 1 ? 'entity' : 'entities'}, ${input.users} ${input.users === 1 ? 'user' : 'users'}`);
  drivers.push(`${input.volume === 'normal' ? 'Usual' : input.volume === 'high' ? 'High' : 'Very high'} data volume`);
  drivers.push(`Final scope multiplier ×${multiplier.toFixed(2)} (maximum ×1.80)`);

  return { min: Math.round(min * multiplier), max: Math.round(max * multiplier), multiplier, drivers };
}

export const formatScopeRupees = (amount: number) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;

export function scopeReviewMessage(input: ScopeInput) {
  const estimate = estimateCustomScope(input);
  if (!estimate) return '';
  return [
    'Custom scope review request (India)',
    `Estimated project range: ${formatScopeRupees(estimate.min)} to ${formatScopeRupees(estimate.max)}`,
    'Selected work and estimate drivers:',
    ...estimate.drivers.map((driver) => `• ${driver}`),
    'Estimate only. Final pricing depends on confirmed scope, integrations, data volume and technical requirements.',
  ].join('\n');
}