// Data model of a CBAM installation workbook. It follows the structure of the
// Commission's "CBAM communication template for installations" (sheets
// A_InstData, B_EmInst, C_Emissions&Energy, D_Processes, E_PurchPrec) and the
// calculation rules of Guidance No. 3 (attributed emissions, activity level,
// specific embedded emissions) and Guidance No. 4 (embedded free allocation).
import type { CbamSector } from '../official';

export const WORKBOOK_SCHEMA = 'senseible.cbam-suite/1';

/**
 * 'factor': a fuel at the platform's own factor per unit (supabase/functions/_shared/emissionFactors.ts),
 * applied automatically. The other methods follow the template code list CONST_MonitoringApproach,
 * plus 'measured' for a reported total (CEMS or another measured figure).
 */
export type StreamMethod = 'factor' | 'combustion' | 'process' | 'mass_balance' | 'measured';

/** Template code list CONST_ElecSource (Annex III, section D.4 of the Implementing Act). */
export type ElecEfSource = 'D.4(a)' | 'D.4(b)' | 'D.4.1' | 'D.4.2' | 'D.4.3.1' | 'D.4.3.2' | 'Mix';
export const ELEC_EF_SOURCES: { code: ElecEfSource; label: string }[] = [
  { code: 'D.4(a)', label: 'Commission default (IEA data)' },
  { code: 'D.4(b)', label: 'Other public data (average grid factor)' },
  { code: 'D.4.1', label: 'Own generation, not cogeneration' },
  { code: 'D.4.2', label: 'Own generation, cogeneration' },
  { code: 'D.4.3.1', label: 'Direct technical link to the generator' },
  { code: 'D.4.3.2', label: 'Power purchase agreement' },
  { code: 'Mix', label: 'Mix of the above' },
];

export interface Installation {
  nameEn: string;
  name?: string;
  street: string;
  city: string;
  postcode: string;
  country: string; // ISO 3166-1 alpha-2
  unlocode?: string;
  latitude?: string;
  longitude?: string;
  economicActivity: string;
  representative?: string;
  email?: string;
  phone?: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
}

export interface Allocation { processId: string; share: number } // share of the stream, 0..1

export interface SourceStream {
  id: string;
  name: string;
  method: StreamMethod;
  /** Activity data (negative for carbon leaving in a mass balance). Units: t or 1000 Nm3; for 'factor', the platform factor's unit. */
  ad: number;
  adUnit: string;
  /** method 'factor': key of FUEL_FACTORS. */
  fuel?: string;
  ncv?: number; // GJ per AD unit (combustion)
  ef?: number; // t CO2/TJ for combustion; t CO2 per AD unit for process emissions
  carbonContent?: number; // t C per AD unit (mass balance)
  oxidation?: number; // fraction, default 1
  conversion?: number; // fraction, default 1
  biomass?: number; // fraction of biomass carbon, default 0
  measuredTco2e?: number; // method 'measured'
  /** Where the factors come from (platform factor, lab analysis, supplier certificate, Senseible record id). */
  factorSource: string;
  /** Evidence for plant-measured values (lab report, calibration certificate). */
  evidence?: string;
  allocations: Allocation[];
}

export interface Good { id: string; cn: string; name: string; tonnes: number }

export interface Electricity { mwh: number; ef: number | null; efSource: ElecEfSource | null; evidence?: string }

export type PrecursorBasis = 'supplier' | 'default';

export interface PrecursorUse {
  id: string;
  kind: 'own' | 'purchased';
  /** Tonnes of precursor consumed in this process during the reporting period. */
  quantity: number;
  /** kind 'own': the producing process inside this installation. */
  fromProcessId?: string;
  /** Benchmark route code, e.g. (C), when the precursor's benchmark depends on its route. */
  benchmarkRoute?: string;
  /** kind 'purchased'. */
  name?: string;
  cn?: string;
  country?: string;
  basis?: PrecursorBasis;
  seeDirect?: number; // t CO2e/t, supplier data
  seeIndirect?: number; // t CO2e/t, supplier data
  sefa?: number; // t CO2e/t specific embedded free allocation, supplier data
  supplierInstallation?: string;
  evidence?: string;
  /** Production year of the precursor (sets the default mark-up). */
  year?: number;
}

export interface Process {
  id: string;
  name: string;
  category: string; // aggregated goods category name from the template
  route?: string; // production route label from the template
  /** Benchmark route code, e.g. (C) or (E), where the CBAM benchmark depends on the route. */
  benchmarkRoute?: string;
  sector: CbamSector;
  goods: Good[];
  precursors: PrecursorUse[];
  electricity: Electricity;
  /** Directly attributable emissions entered as a total instead of via source streams (template D_Processes (g)). */
  directOverride?: { tco2e: number; source: string } | null;
  /** Carbon price paid in the country of production, evidenced (EUR per tonne of good). */
  carbonPrice?: { type: string; eurPerTonne: number; evidence: string } | null;
}

export interface DataQuality { general: string; defaultJustification: string; qualityAssurance: string }

export interface Misstatement { id: string; where: string; description: string; impactTco2e: number; resolved: boolean; resolution: string }

/** The Commission checklist, misstatements and sign-off. Used in both verification modes. */
export interface InternalReview {
  checklist: Record<string, boolean>;
  siteVisit: 'physical' | 'virtual' | 'none' | '';
  siteVisitJustification: string;
  misstatements: Misstatement[];
  reviewerName: string;
  reviewerRole: string;
  date: string;
  signedHash?: string;
}

export interface ExternalVerification {
  company: string;
  accreditationState: string;
  accreditationBody: string;
  registrationNumber: string;
  opinion: '' | 'verified' | 'verified_with_comments' | 'not_verified';
  date: string;
  reportReference: string;
}

/**
 * 'senseible': Senseible's in-house verifier (default). 'external': a verifier the client appoints.
 * Both run the same checklist; the sign-off freezes the report and records its SHA-256.
 */
export interface Verification { mode: 'senseible' | 'external'; internal: InternalReview; external: ExternalVerification }

export interface LogEntry { at: string; action: string; hash?: string }

export interface Workbook {
  schema: typeof WORKBOOK_SCHEMA;
  id: string;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
  installation: Installation;
  streams: SourceStream[];
  processes: Process[];
  dataQuality: DataQuality;
  verification: Verification;
  log: LogEntry[];
}
