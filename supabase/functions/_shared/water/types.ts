// Water-bill MRV: shared types. Pure; used by Deno functions and bun tests.
// Invariants I1-I10 are enforced in this module tree and its tests.

export type VolumeKind = 'SUPPLY' | 'WASTEWATER' | 'COMBINED_UNSPLIT';
export type ReadingType = 'ACTUAL' | 'ESTIMATED_BY_UTILITY';
export type WaterActivity = 'WATER_SUPPLY' | 'WATER_WASTEWATER_TREATMENT';

export type ResultStatus = 'CALCULATED' | 'ESTIMATED_PROXY' | 'UNAVAILABLE_FACTOR_PENDING' | 'INVALID_INPUT';
export type MappingStatus = 'MAPPED' | 'MAPPING_PENDING_REVIEW';
export type FactorTier = 'A' | 'B' | 'none';

export type ReasonCode =
  | 'NO_FACTOR' | 'PROXY_FACTOR_USED' | 'AMBIGUOUS_FACTOR' | 'GWP_BASIS_MISMATCH'
  | 'COMBINED_UNSPLIT' | 'MAPPING_PENDING' | 'UTILITY_ESTIMATED_READING' | 'PERIOD_SPANS_YEARS'
  | 'UNKNOWN_UNIT' | 'MISSING_FIELD' | 'NEGATIVE_VOLUME_UNMATCHED';

export type Severity = 'High' | 'Medium' | 'Low';
export type FlagStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK';

export interface WaterBillInput {
  entity_id: string;
  site_id: string | null;
  supplier_id: string | null;
  country_code: string | null;          // ISO 3166-1 alpha-2
  region_code?: string | null;
  billing_period_start: string | null;  // YYYY-MM-DD
  billing_period_end: string | null;    // YYYY-MM-DD, inclusive
  volume_raw: number | null;
  unit_raw: string | null;
  volume_kind: VolumeKind;
  reading_type: ReadingType;
  source_document_ref: string | null;
  /** For credit notes / re-issued bills: the bill this one corrects. */
  corrects_bill_id?: string | null;
}

export interface EmissionFactor {
  id: string;
  version: number;
  activity_type: WaterActivity;
  value: number;
  unit: string;                  // e.g. "kgCO2e/m3", "kgCO2e/kL", "kgCO2e/L"
  geography_type: 'SUPPLIER' | 'COUNTRY' | 'REGION';
  geography: string;             // supplier id, ISO country or region code
  valid_from: string;            // YYYY-MM-DD
  valid_to: string | null;       // YYYY-MM-DD inclusive, null = open
  source_name: string;
  source_publication_year: number;
  gwp_basis: string;             // e.g. "AR5", "AR6"
  status: 'APPROVED' | 'DRAFT' | 'RETIRED';
  approved_for_proxy: boolean;   // Tier B eligibility, set by a human
  proxy_for_country?: string | null; // country the proxy is approved for; null = any
  uncertainty?: number | null;
}

export interface MappingRule {
  id: string;
  /** null = default rule for every entity; an entity rule always wins over a default. */
  entity_id: string | null;
  activity_type: WaterActivity;
  scope: 1 | 2 | 3;
  scope3_category: number | null;
  valid_from: string;
  valid_to: string | null;
  status: 'APPROVED' | 'DRAFT' | 'RETIRED';
  /** Methodological basis, e.g. the GHG Protocol chapter the mapping follows. */
  basis: string;
}

export interface TraceEntry { factor_id: string; version: number; accepted: boolean; reason: string }

export interface Resolution {
  status: ResultStatus;          // CALCULATED | ESTIMATED_PROXY | UNAVAILABLE_FACTOR_PENDING
  tier: FactorTier;
  factor: EmissionFactor | null;
  reasons: ReasonCode[];
  trace: TraceEntry[];
}

export interface EmissionResultDraft {
  water_bill_key: string;        // idempotency key of the bill
  allocation_period: string;     // reporting period label, e.g. "FY2026" or "2026"
  allocated_volume_m3: number | null; // null when the volume could not be read
  allocation_method: 'WHOLE_PERIOD' | 'PRO_RATA_DAYS';
  status: ResultStatus;
  emissions_kgco2e: number | null;
  activity_type: WaterActivity | null;
  factor_id: string | null;
  factor_version: number | null;
  factor_value: number | null;
  factor_unit: string | null;
  factor_source: string | null;
  factor_geography: string | null;
  factor_year: number | null;
  gwp_basis: string | null;
  factor_uncertainty: number | null;
  factor_tier: FactorTier;
  resolution_trace: TraceEntry[];
  scope: number | null;
  scope3_category: number | null;
  mapping_status: MappingStatus;
  mapping_rule_id: string | null;
  reasons: ReasonCode[];
  calc_run_id: string;
}

export const SEVERITY: Record<ReasonCode, Severity> = {
  NO_FACTOR: 'High', PROXY_FACTOR_USED: 'Medium', AMBIGUOUS_FACTOR: 'High', GWP_BASIS_MISMATCH: 'High',
  COMBINED_UNSPLIT: 'Medium', MAPPING_PENDING: 'Medium', UTILITY_ESTIMATED_READING: 'Low', PERIOD_SPANS_YEARS: 'Low',
  UNKNOWN_UNIT: 'High', MISSING_FIELD: 'High', NEGATIVE_VOLUME_UNMATCHED: 'High',
};
