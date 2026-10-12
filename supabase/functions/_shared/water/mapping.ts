import type { MappingRule, MappingStatus, WaterActivity } from './types.ts';

export interface Mapping {
  scope: number | null;
  scope3_category: number | null;
  mapping_status: MappingStatus;
  mapping_rule_id: string | null;
  note: string;
}

/**
 * Scope and category come from approved configuration rows only (I9). An
 * entity-specific rule wins over a default (entity_id null). No rule, or two
 * equally specific rules that disagree, gives MAPPING_PENDING_REVIEW; the
 * emissions are still calculated and reported in an "unmapped" bucket.
 */
export function mapCategory(rules: MappingRule[], entity_id: string, activity: WaterActivity, on: string): Mapping {
  const live = rules.filter(r => r.status === 'APPROVED' && r.activity_type === activity
    && r.valid_from <= on && (r.valid_to === null || r.valid_to >= on)
    && (r.entity_id === entity_id || r.entity_id === null)
    && validRule(r));
  const own = live.filter(r => r.entity_id === entity_id);
  const set = own.length ? own : live.filter(r => r.entity_id === null);
  const distinct = new Set(set.map(r => `${r.scope}:${r.scope3_category}`));
  if (set.length === 0) return pending('no approved mapping rule');
  if (distinct.size > 1) return pending(`conflicting rules: ${set.map(r => r.id).sort().join(', ')}`);
  const r = [...set].sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  return { scope: r.scope, scope3_category: r.scope3_category, mapping_status: 'MAPPED', mapping_rule_id: r.id, note: r.basis };
}

/** Scope 3 rows need a category 1-15; Scope 1 and 2 rows must not carry one. */
export function validRule(r: Pick<MappingRule, 'scope' | 'scope3_category'>): boolean {
  if (r.scope === 3) return Number.isInteger(r.scope3_category) && (r.scope3_category as number) >= 1 && (r.scope3_category as number) <= 15;
  return (r.scope === 1 || r.scope === 2) && r.scope3_category === null;
}

const pending = (note: string): Mapping =>
  ({ scope: null, scope3_category: null, mapping_status: 'MAPPING_PENDING_REVIEW', mapping_rule_id: null, note });
