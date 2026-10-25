// Multi-Framework Reporting Engine
// Maps normalized carbon data to various sustainability disclosure frameworks.
//
// Coverage is never asserted from a static label: every framework declares the
// disclosure inputs it needs, and coverage is computed from the evidence the
// user actually holds. A framework with no supporting evidence is reported as
// not covered rather than presented as satisfied.

export interface FrameworkCoverage {
  id: string;
  name: string;
  shortName: string;
  category: 'mandatory' | 'voluntary' | 'investor' | 'reader_view';
  applicableWhen: string[];
  metricsMapping: Record<string, string>;
  /** Baseline expectation only — actual coverage is computed from evidence. */
  status: 'covered' | 'partial' | 'not_applicable';
  /** Set when a newer standard has taken over this framework's role. */
  supersededBy?: string;
  /** Short, factual note shown in the UI and printed in the report. */
  note?: string;
}


/**
 * Disclosure inputs the documents can evidence today.
 * Anything absent here must be declared as a gap in the report, never inferred.
 */
export interface DataAvailability {
  scope1: boolean;
  scope2: boolean;
  scope3: boolean;
  /** Emissions per unit of output or revenue */
  intensity: boolean;
  /** A recorded reduction target with a baseline and target year */
  targets: boolean;
  /** Documented governance / oversight narrative */
  governance: boolean;
  /** Documented transition or physical risk assessment */
  risks: boolean;
  /** Metered or invoiced energy consumption */
  energy: boolean;
  /** Product- or shipment-level embedded emissions */
  productLevel: boolean;
}

export const EMPTY_AVAILABILITY: DataAvailability = {
  scope1: false, scope2: false, scope3: false, intensity: false,
  targets: false, governance: false, risks: false, energy: false,
  productLevel: false,
};

/**
 * What each framework metric needs. A single flag, or a combination:
 * `any` is met by at least one flag (a total exists once any scope is
 * evidenced), `all` only when every flag is (a combined Scope 1+2+3 figure
 * needs all three scopes).
 */
type Requirement =
  | keyof DataAvailability
  | { any: Array<keyof DataAvailability> }
  | { all: Array<keyof DataAvailability> };

const ANY_SCOPE: Requirement = { any: ['scope1', 'scope2', 'scope3'] };

const METRIC_REQUIREMENTS: Record<string, Requirement> = {
  scope1: 'scope1',
  scope1Emissions: 'scope1',
  scope2: 'scope2',
  scope3: 'scope3',
  scope3Categories: 'scope3',
  scope1_2Combined: { all: ['scope1', 'scope2'] },
  scope1_2_3: { all: ['scope1', 'scope2', 'scope3'] },
  totalEmissions: ANY_SCOPE,
  emissionsBreakdown: ANY_SCOPE,
  climateChange: ANY_SCOPE,
  environmentalResponsibility: ANY_SCOPE,
  climateAction: ANY_SCOPE,
  emissionIntensity: 'intensity',
  reductionTargets: 'targets',
  targetReductions: 'targets',
  targetYear: 'targets',
  responsibleConsumption: 'targets',
  governanceProcess: 'governance',
  governanceLeadership: 'governance',
  climateStrategy: 'governance',
  climateRisks: 'risks',
  riskProcess: 'risks',
  transitionRisks: 'risks',
  physicalRisks: 'risks',
  energyConsumption: 'energy',
  cleanEnergy: 'energy',
  productEmissions: 'productLevel',
  productCarbonFootprint: 'productLevel',
  functionalUnit: 'productLevel',
  ghgIntensity: 'intensity',
  evidenceTraceability: ANY_SCOPE,
  emissionsBaseline: ANY_SCOPE,
  // Company profile details printed with the figures; only meaningful once there are figures.
  entityProfile: ANY_SCOPE,
};

/**
 * How a covered disclosure is backed. Targets are set by the company, so they
 * are "stated", never "evidenced"; profile details and the document trail are
 * "provided". Only document-derived figures are "evidenced".
 */
export type CoveredKind = 'evidenced' | 'stated' | 'provided';
const STATED_METRICS = new Set(['reductionTargets', 'targetReductions', 'targetYear', 'responsibleConsumption']);
const PROVIDED_BASIS: Record<string, string> = {
  entityProfile: 'From the company profile',
  evidenceTraceability: 'Document hash, activity and factor on every record',
};
export function coveredKind(metric: string | undefined): CoveredKind {
  if (metric && STATED_METRICS.has(metric)) return 'stated';
  if (metric && PROVIDED_BASIS[metric]) return 'provided';
  return 'evidenced';
}
export function coveredBasis(metric: string | undefined): string {
  if (metric && PROVIDED_BASIS[metric]) return PROVIDED_BASIS[metric];
  if (metric && STATED_METRICS.has(metric)) return 'Set by the company; not externally validated';
  if (metric === 'energyConsumption' || metric === 'cleanEnergy') return 'Quantities on bills and invoices';
  if (metric === 'emissionsBaseline') return 'Earliest year in the documents';
  return 'From invoices and bills';
}

/**
 * Disclosures that GHG evidence can never satisfy, whatever is uploaded.
 * CPCB emission norms set limits for pollutants (particulate matter, SO2, NOx
 * and others) measured by stack or ambient monitoring under the Air and Water
 * Acts; invoices and GHG totals say nothing about them.
 */
const NATURE_DATA = 'No site location or nature data on record.';
const NOT_EVIDENCEABLE: Record<string, string> = {
  pollutantEmissionNorms: 'Needs stack or ambient monitoring by an accredited laboratory; invoices cannot show it.',
  operationsLocation: NATURE_DATA,
  natureDependencies: NATURE_DATA,
  natureRisks: NATURE_DATA,
  natureActions: NATURE_DATA,
};

/** Narrative disclosures the company writes, each with what it covers. */
const COMPANY_WRITTEN: Record<string, string> = {
  governanceProcess: 'Written by the company: oversight by the board and management.',
  governanceLeadership: 'Written by the company: policies, governance and oversight.',
  climateStrategy: 'Written by the company: climate strategy and its resilience.',
  riskProcess: 'Written by the company: how climate risks are found and managed.',
  climateRisks: 'Written by the company: how climate risks are found and managed.',
  transitionRisks: 'Written by the company: transition risk assessment.',
  physicalRisks: 'Written by the company: physical risk assessment.',
};

/** Gaps no upload type closes yet, with the reason in the reader's words. */
const METRIC_GAP_REASONS: Record<string, string> = {
  achievedReductions: 'No achieved reduction on record. A reduction shows in later bills against the base year.',
  marketBasedScope2: 'No renewable certificates or green power contracts recorded.',
};

function requirementMet(req: Requirement, availability: DataAvailability): boolean {
  if (typeof req === 'string') return availability[req];
  if ('any' in req) return req.any.some((k) => availability[k]);
  return req.all.every((k) => availability[k]);
}

/** The flags a requirement still lacks, for the gap explanation. */
function missingFlags(req: Requirement, availability: DataAvailability): Array<keyof DataAvailability> {
  if (typeof req === 'string') return availability[req] ? [] : [req];
  if ('any' in req) return req.any.some((k) => availability[k]) ? [] : req.any;
  return req.all.filter((k) => !availability[k]);
}

/**
 * Why a listed disclosure is not covered.
 *
 * 'not_applicable' marks disclosures documents can never cover: narratives the
 * company writes (governance, strategy, risk) and data Senseible does not hold
 * (nature, stack monitoring). They still apply to the company, so outputs label
 * them "Not covered", never "Not applicable". Everything else is a data gap,
 * closed once the record is uploaded. Neither case is ever filled with an estimate.
 */
export type MissingClassification = 'not_applicable' | 'data_gap';

export interface MissingDisclosure {
  reference: string;
  classification: MissingClassification;
  reason: string;
}

const OUT_OF_BOUNDARY: Array<keyof DataAvailability> = ['governance', 'risks'];

const GAP_REASONS: Partial<Record<keyof DataAvailability, string>> = {
  scope1: 'No fuel or other direct-emission document uploaded yet.',
  scope2: 'No electricity bill uploaded yet.',
  scope3: 'No value chain document (freight, purchased goods) uploaded yet.',
  intensity: 'Needs turnover or production output, which is not recorded.',
  targets: 'No reduction target recorded.',
  energy: 'No electricity bill or fuel invoice recorded.',
  productLevel: 'Needs production data per product (HSN/CN code), which is not recorded.',
};

export function classifyMissing(
  reference: string,
  metric: string | undefined,
  availability: DataAvailability = EMPTY_AVAILABILITY,
): MissingDisclosure {
  if (metric && NOT_EVIDENCEABLE[metric]) {
    return { reference, classification: 'not_applicable', reason: NOT_EVIDENCEABLE[metric] };
  }
  const requirement = metric ? METRIC_REQUIREMENTS[metric] : undefined;
  const lacking = requirement ? missingFlags(requirement, availability) : [];
  const outOfBoundary = lacking.find((k) => OUT_OF_BOUNDARY.includes(k));
  if (outOfBoundary) {
    return {
      reference,
      classification: 'not_applicable',
      reason: (metric && COMPANY_WRITTEN[metric]) || 'Written by the company.',
    };
  }
  let reason = (metric && METRIC_GAP_REASONS[metric]) || 'No supporting record on file.';
  if (requirement && typeof requirement !== 'string' && 'any' in requirement) {
    reason = 'No emissions recorded from documents yet.';
  } else if (lacking.length > 0) {
    reason = lacking.map((k) => GAP_REASONS[k]).filter(Boolean).join(' ') || reason;
  }
  return { reference, classification: 'data_gap', reason };
}


export interface FrameworkAssessment {
  framework: FrameworkCoverage;
  /** Disclosure references the current evidence supports */
  satisfied: string[];
  /** Disclosure references that cannot be evidenced yet */
  missing: string[];
  /** The same missing references, each classified and explained */
  missingDetail: MissingDisclosure[];
  /** Missing because the entity has no record yet — closeable */
  dataGaps: MissingDisclosure[];
  /** Missing because documents can never cover it (company-written or data Senseible does not hold) */
  notApplicable: MissingDisclosure[];
  coverage: 'covered' | 'partial' | 'not_covered';
  /** 0-100, share of the framework's mapped references that are evidenced */
  completeness: number;
  /**
   * 0-100 measured only against references documents can cover, i.e.
   * excluding company-written narratives and data Senseible does not hold.
   */
  evidenceableCompleteness: number;
}

/** Assess one framework against the evidence actually held. */
export function assessFramework(
  fw: FrameworkCoverage,
  availability: DataAvailability,
): FrameworkAssessment {
  const refs = Object.entries(fw.metricsMapping);
  const satisfied: string[] = [];
  const missingDetail: MissingDisclosure[] = [];

  for (const [ref, metric] of refs) {
    const requirement = METRIC_REQUIREMENTS[metric];
    // Unmapped or never-evidenceable metric: unevidenced, never silently satisfied.
    if (requirement && requirementMet(requirement, availability)) satisfied.push(ref);
    else missingDetail.push(classifyMissing(ref, metric, availability));
  }

  const notApplicable = missingDetail.filter((m) => m.classification === 'not_applicable');
  const dataGaps = missingDetail.filter((m) => m.classification === 'data_gap');

  const completeness = refs.length === 0 ? 0 : Math.round((satisfied.length / refs.length) * 100);
  const evidenceableTotal = refs.length - notApplicable.length;
  const evidenceableCompleteness =
    evidenceableTotal <= 0 ? 0 : Math.round((satisfied.length / evidenceableTotal) * 100);
  const coverage: FrameworkAssessment['coverage'] =
    completeness === 100 ? 'covered' : completeness === 0 ? 'not_covered' : 'partial';

  return {
    framework: fw,
    satisfied,
    missing: missingDetail.map((m) => m.reference),
    missingDetail,
    dataGaps,
    notApplicable,
    coverage,
    completeness,
    evidenceableCompleteness,
  };

}


export interface ProfileContext {
  country?: string;
  exportsToEU?: boolean;
  seekingFinance?: boolean;
  hasNetZeroTarget?: boolean;
  sector?: string;
  size?: 'micro' | 'small' | 'medium' | 'large';
  regulations?: string[];
  investorRequirements?: string[];
}

// Framework definitions with mapping to our data model
export const FRAMEWORKS: Record<string, FrameworkCoverage> = {
  GHG_PROTOCOL: {
    id: 'GHG_PROTOCOL',
    name: 'GHG Protocol Corporate Accounting and Reporting Standard',
    shortName: 'GHG Protocol',
    category: 'voluntary',
    applicableWhen: [],
    metricsMapping: {
      // Chapters of the Corporate Standard (revised edition): 4 operational boundaries,
      // 5 tracking emissions over time, 6 calculating, 11 setting targets.
      'Scope 1 emissions (Ch. 4 and 6)': 'scope1',
      'Scope 2 emissions, location-based (Ch. 4 and 6)': 'scope2',
      'Scope 3 emissions (Ch. 4 and 6)': 'scope3',
      'Base year (Ch. 5)': 'emissionsBaseline',
      'Reduction target (Ch. 11)': 'reductionTargets',
    },
    status: 'partial',
  },
  ISO_14064: {
    id: 'ISO_14064',
    name: 'ISO 14064-1: Organization-level GHG quantification and reporting',
    shortName: 'ISO 14064-1',
    category: 'voluntary',
    applicableWhen: [],
    metricsMapping: {
      // ISO 14064-1:2018: clause 5 inventory boundaries and categories, 6 quantification.
      'Category 1: Direct GHG emissions': 'scope1',
      'Category 2: Indirect emissions from imported energy': 'scope2',
      'Categories 3 to 6: Other indirect emissions': 'scope3',
      'Quantification of CO2 (clause 6)': 'totalEmissions',
      'Reduction target': 'reductionTargets',
    },
    status: 'partial',
  },

  GRI_305: {
    id: 'GRI_305',
    name: 'GRI 305: Emissions',
    shortName: 'GRI',
    category: 'voluntary',
    applicableWhen: ['seekingFinance', 'hasNetZeroTarget'],
    metricsMapping: {
      'GRI 305-1': 'scope1',
      'GRI 305-2': 'scope2',
      'GRI 305-3': 'scope3',
      'GRI 305-4': 'emissionIntensity',
      // 305-5 asks for reductions achieved, not a target.
      'GRI 305-5': 'achievedReductions',
    },
    status: 'covered',
  },
  SASB: {
    id: 'SASB',
    name: 'SASB Standards',
    shortName: 'SASB',
    category: 'investor',
    applicableWhen: ['seekingFinance'],
    metricsMapping: {
      // SASB metric codes depend on the company's industry standard, so none are printed.
      'Gross global Scope 1 emissions': 'scope1',
      'Total energy consumed (recorded units, not converted to GJ)': 'energyConsumption',
    },
    status: 'partial',
  },
  TCFD: {
    id: 'TCFD',
    name: 'Task Force on Climate-related Financial Disclosures',
    shortName: 'TCFD',
    category: 'voluntary',
    applicableWhen: ['seekingFinance', 'exportsToEU'],
    metricsMapping: {
      'Governance': 'governanceProcess',
      'Strategy': 'climateStrategy',
      'Risk management': 'climateRisks',
      'Metrics: Scope 1, 2 and 3 emissions': 'totalEmissions',
      'Targets': 'reductionTargets',
    },
    status: 'partial',
    supersededBy: 'ISSB_S2',
    note: 'TCFD closed in 2023 and IFRS S2 replaced it. Same figures, older layout.',
  },

  ISSB_S1: {
    id: 'ISSB_S1',
    name: 'IFRS S1: General Requirements for Disclosure of Sustainability-related Financial Information',
    shortName: 'ISSB S1',
    category: 'mandatory',
    applicableWhen: ['exportsToEU', 'seekingFinance'],
    metricsMapping: {
      'Governance': 'governanceProcess',
      'Strategy': 'climateStrategy',
      'Risk management': 'riskProcess',
      'Metrics: Scope 1, 2 and 3 emissions': 'totalEmissions',
      'Targets': 'reductionTargets',
    },
    status: 'partial',
  },
  ISSB_S2: {
    id: 'ISSB_S2',
    name: 'IFRS S2: Climate-related Disclosures',
    shortName: 'ISSB S2',
    category: 'mandatory',
    applicableWhen: ['exportsToEU', 'seekingFinance'],
    metricsMapping: {
      'Scope 1 emissions': 'scope1',
      'Scope 2 emissions, location-based': 'scope2',
      'Scope 3 emissions': 'scope3',
      'Transition risks': 'transitionRisks',
      'Physical risks': 'physicalRisks',
    },
    status: 'covered',
  },
  CDP: {
    id: 'CDP',
    name: 'CDP climate questionnaire: emissions data',
    shortName: 'CDP',
    category: 'investor',
    applicableWhen: ['seekingFinance', 'hasNetZeroTarget'],
    metricsMapping: {
      // CDP renumbers its questions each cycle, so references are by content.
      'Scope 1 emissions': 'scope1',
      'Scope 2 emissions, location-based': 'scope2',
      'Scope 3 emissions': 'scope3',
      'Emissions by activity': 'emissionsBreakdown',
    },
    status: 'covered',
  },
  CSRD_ESRS: {
    id: 'CSRD_ESRS',
    name: 'CSRD: ESRS E1 Climate change',
    shortName: 'CSRD/ESRS',
    category: 'mandatory',
    applicableWhen: ['exportsToEU'],
    metricsMapping: {
      'E1-4 Targets': 'targetReductions',
      'E1-5 Energy consumption and mix': 'energyConsumption',
      'E1-6 Gross Scope 1, 2, 3 and total emissions': 'scope1_2_3',
      'E1-6 Market-based Scope 2': 'marketBasedScope2',
      'E1-6 GHG intensity per net revenue': 'emissionIntensity',
    },
    status: 'partial',
  },
  TNFD: {
    id: 'TNFD',
    name: 'Taskforce on Nature-related Financial Disclosures',
    shortName: 'TNFD',
    category: 'voluntary',
    applicableWhen: ['hasNetZeroTarget'],
    metricsMapping: {
      'Locate': 'operationsLocation',
      'Evaluate': 'natureDependencies',
      'Assess': 'natureRisks',
      'Prepare': 'natureActions',
    },
    status: 'not_applicable',
  },
  SBTI: {
    id: 'SBTI',
    name: 'SBTi target-setting inputs',
    shortName: 'SBTi',
    category: 'voluntary',
    applicableWhen: ['hasNetZeroTarget'],
    metricsMapping: {
      'Scope 1 and 2 base year emissions': 'scope1_2Combined',
      'Scope 3 base year emissions': 'scope3Categories',
      'Base year': 'emissionsBaseline',
      'Target year': 'targetYear',
    },
    status: 'partial',
  },
  UN_SDGS: {
    id: 'UN_SDGS',
    name: 'UN Sustainable Development Goals',
    shortName: 'UN SDGs',
    category: 'voluntary',
    applicableWhen: ['hasNetZeroTarget', 'seekingFinance'],
    metricsMapping: {
      'SDG 13 Climate action: emissions measured': 'climateAction',
      'SDG 13 Climate action: reduction target': 'responsibleConsumption',
      'SDG 7 Affordable and clean energy: energy use recorded': 'cleanEnergy',
    },
    status: 'covered',
  },
  INDIA_CPCB: {
    id: 'INDIA_CPCB',
    name: 'CPCB environmental record: energy and fuel',
    shortName: 'CPCB',
    category: 'mandatory',
    applicableWhen: ['country_IN'],
    metricsMapping: {
      'Emission norms (stack and ambient monitoring)': 'pollutantEmissionNorms',
      'Energy and fuel records': 'energyConsumption',
    },
    status: 'covered',
  },
  INDIA_BRSR: {
    id: 'INDIA_BRSR',
    name: 'Business Responsibility and Sustainability Report',
    shortName: 'BRSR',
    category: 'mandatory',
    applicableWhen: ['country_IN', 'size_large'],
    metricsMapping: {
      'Section A: General disclosures': 'entityProfile',
      'Section B: Management and process': 'governanceLeadership',
      'Section C, Principle 6: GHG emissions': 'environmentalResponsibility',
    },
    status: 'partial',
  },
  CBAM: {
    id: 'CBAM',
    name: 'Carbon Border Adjustment Mechanism',
    shortName: 'CBAM',
    category: 'mandatory',
    applicableWhen: ['exportsToEU'],
    metricsMapping: {
      'Direct emissions': 'scope1',
      'Indirect emissions (electricity)': 'scope2',
      'Embedded emissions per good (CN code)': 'productEmissions',
    },
    status: 'covered',
  },
  ISO_14067: {
    id: 'ISO_14067',
    name: 'ISO 14067: Product carbon footprint',
    shortName: 'ISO 14067',
    category: 'voluntary',
    applicableWhen: ['productLevel'],
    metricsMapping: {
      // Site totals are context, not a product footprint, so only product items are listed.
      'Functional unit': 'functionalUnit',
      'Product system boundary': 'productCarbonFootprint',
      'Carbon footprint per functional unit': 'productEmissions',
    },
    status: 'partial',
    note: 'Needs production data per product (HSN/CN code). Without it the product footprint is left as a gap, never estimated.',
  },
  INDIA_BRSR_CORE: {
    id: 'INDIA_BRSR_CORE',
    name: 'SEBI BRSR Core: assurable KPIs',
    shortName: 'BRSR Core',
    category: 'mandatory',
    applicableWhen: ['country_IN'],
    metricsMapping: {
      // SEBI BRSR Core (12 July 2023), Annexure I: attribute 1 GHG footprint, 3 energy footprint.
      'Attribute 1: GHG footprint (Scope 1)': 'scope1',
      'Attribute 1: GHG footprint (Scope 2)': 'scope2',
      'Attribute 1: GHG intensity': 'ghgIntensity',
      'Attribute 3: Energy footprint': 'energyConsumption',
    },
    status: 'partial',
    note: 'BRSR Core KPIs need reasonable assurance when filed. This report is the unassured source data.',
  },
  LENDER_VIEW: {
    id: 'LENDER_VIEW',
    name: 'Bank and lender climate disclosure pack',
    shortName: 'Lender pack',
    category: 'reader_view',
    applicableWhen: ['seekingFinance'],
    metricsMapping: {
      'Baseline: Scope 1': 'scope1',
      'Baseline: Scope 2': 'scope2',
      'Scope 3': 'scope3',
      'Reduction target': 'reductionTargets',
      'Document trail for every figure': 'evidenceTraceability',
    },
    status: 'partial',
    note: 'The same verified records, ordered for credit review. Not a credit rating or an eligibility decision.',
  },
  INVESTOR_VIEW: {
    id: 'INVESTOR_VIEW',
    name: 'Investor climate data pack',
    shortName: 'Investor pack',
    category: 'reader_view',
    applicableWhen: ['seekingFinance'],
    metricsMapping: {
      'Total emissions': 'totalEmissions',
      'Scope 3 emissions': 'scope3',
      'Emissions intensity': 'emissionIntensity',
      'Target and progress': 'reductionTargets',
      'Document trail for every figure': 'evidenceTraceability',
    },
    status: 'partial',
  },
  GOVERNMENT_VIEW: {
    id: 'GOVERNMENT_VIEW',
    name: 'Government and regulator submission pack',
    shortName: 'Regulator pack',
    category: 'reader_view',
    applicableWhen: [],
    metricsMapping: {
      'Entity identification': 'entityProfile',
      'Direct emissions': 'scope1',
      'Energy indirect emissions': 'scope2',
      'Energy consumption': 'energyConsumption',
      'Evidence register': 'evidenceTraceability',
    },
    status: 'partial',
  },
  SENSEIBLE_SUMMARY: {
    id: 'SENSEIBLE_SUMMARY',
    name: 'Senseible carbon accounting summary',
    shortName: 'Senseible summary',
    category: 'reader_view',
    applicableWhen: [],
    metricsMapping: {
      'Scope 1 inventory': 'scope1',
      'Scope 2 inventory': 'scope2',
      'Scope 3 inventory': 'scope3',
      'Energy consumption': 'energyConsumption',
      'Reduction target': 'reductionTargets',
    },
    status: 'partial',
    note: 'Your verified records on one page. Every framework report uses the same figures.',
  },
};

// Determine which frameworks apply based on profile
export function determineApplicableFrameworks(profile: ProfileContext): string[] {
  // Generic GHG accounting standards always apply — they define the
  // quantification basis the platform already computes with.
  const applicable: string[] = ['SENSEIBLE_SUMMARY', 'GHG_PROTOCOL', 'ISO_14064'];

  if (profile.country === 'IN') {
    applicable.push('INDIA_CPCB', 'GOVERNMENT_VIEW');
    if (profile.size === 'large') {
      applicable.push('INDIA_BRSR', 'INDIA_BRSR_CORE');
    }
  }
  
  // EU exports
  if (profile.exportsToEU) {
    applicable.push('CBAM', 'CSRD_ESRS', 'ISSB_S1', 'ISSB_S2', 'ISO_14067');
  }
  
  // Finance seeking
  if (profile.seekingFinance) {
    applicable.push('GRI_305', 'ISSB_S2', 'CDP', 'SASB', 'LENDER_VIEW', 'INVESTOR_VIEW');
  }
  
  // Net-zero targets
  if (profile.hasNetZeroTarget) {
    applicable.push('SBTI', 'UN_SDGS', 'TNFD');
  }
  
  // Remove duplicates
  return [...new Set(applicable)];
}

/**
 * Market compatibility, replacing the undefined "VCM Ready" label.
 *
 * Disclosure readiness and carbon-credit project eligibility are separate
 * questions and are answered separately. Credit eligibility is never asserted
 * from invoice evidence alone — it requires a recognised project methodology.
 */
export interface MarketCompatibilityCriterion {
  label: string;
  met: boolean;
  detail: string;
}

export interface MarketCompatibility {
  disclosureReady: boolean;
  disclosureCriteria: MarketCompatibilityCriterion[];
  creditProjectEligible: false;
  creditStatement: string;
}

export function assessMarketCompatibility(input: {
  availability: DataAvailability;
  evidenceCount: number;
  verificationStatus: string | null;
  verificationScore: number | null;
  greenwashingRisk: string | null;
}): MarketCompatibility {
  const disclosureCriteria: MarketCompatibilityCriterion[] = [
    {
      label: 'Emissions evidenced by source documents',
      met: input.evidenceCount > 0,
      detail: `${input.evidenceCount} evidence record${input.evidenceCount === 1 ? '' : 's'} hashed and stored.`,
    },
    {
      label: 'Scope 1 and Scope 2 both quantified',
      met: input.availability.scope1 && input.availability.scope2,
      detail: 'Both direct and purchased-energy emissions carry at least one evidenced record.',
    },
    {
      label: 'Value chain (Scope 3) started',
      met: input.availability.scope3,
      detail: 'At least one Scope 3 category is evidenced rather than left empty.',
    },
    {
      label: 'Data-integrity check passed',
      met: input.verificationStatus === 'verified',
      detail: 'Platform verification is an internal integrity control, not third-party assurance.',
    },
    {
      label: 'No high greenwashing-risk flag',
      met: input.greenwashingRisk !== null && input.greenwashingRisk !== 'high',
      detail: 'Risk flag is raised from duplicate, inconsistent or unsupported records.',
    },
  ];

  return {
    disclosureReady: disclosureCriteria.every((c) => c.met),
    disclosureCriteria,
    creditProjectEligible: false,
    creditStatement:
      'Carbon-credit project eligibility is a separate question and is not established by this dataset. Credits require a recognised project methodology, additionality testing and accredited third-party validation and verification. This report shows disclosure readiness only.',
  };
}


// Generate framework coverage section for reports
export function generateFrameworkSection(
  frameworks: string[],
  availability: DataAvailability,
): {
  assessments: FrameworkAssessment[];
  covered: FrameworkCoverage[];
  partial: FrameworkCoverage[];
  notCovered: FrameworkCoverage[];
} {
  const assessments = frameworks
    .map(id => FRAMEWORKS[id])
    .filter(Boolean)
    .map(fw => assessFramework(fw!, availability));

  return {
    assessments,
    covered: assessments.filter(a => a.coverage === 'covered').map(a => a.framework),
    partial: assessments.filter(a => a.coverage === 'partial').map(a => a.framework),
    notCovered: assessments.filter(a => a.coverage === 'not_covered').map(a => a.framework),
  };
}

/** Build the availability flags from the platform's own verified records. */
export function availabilityFromRecords(input: {
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  hasIntensityDenominator?: boolean;
  hasTarget?: boolean;
  hasGovernanceNarrative?: boolean;
  hasRiskAssessment?: boolean;
  hasEnergyRecords?: boolean;
  hasProductLevelData?: boolean;
}): DataAvailability {
  return {
    scope1: input.scope1Kg > 0,
    scope2: input.scope2Kg > 0,
    scope3: input.scope3Kg > 0,
    intensity: Boolean(input.hasIntensityDenominator),
    targets: Boolean(input.hasTarget),
    governance: Boolean(input.hasGovernanceNarrative),
    risks: Boolean(input.hasRiskAssessment),
    energy: Boolean(input.hasEnergyRecords),
    productLevel: Boolean(input.hasProductLevelData),
  };
}


// Get default profile for MSMEs in India
export function getDefaultMSMEProfile(): ProfileContext {
  return {
    country: 'IN',
    size: 'small',
    exportsToEU: false,
    seekingFinance: true,
    hasNetZeroTarget: false,
  };
}

// Generate framework disclaimer
export function getFrameworkDisclaimer(frameworks: string[]): string {
  const frameworkNames = frameworks
    .map(fwId => FRAMEWORKS[fwId]?.shortName)
    .filter(Boolean)
    .join(', ');
  
  return `This report provides decision-support disclosures aligned with ${frameworkNames || 'standard GHG accounting'}. It is not a statutory filing unless independently assured. Data is calculated using the BIOCOG MRV India v1.0 methodology with emission factors from IND_EF_2025. Scope boundaries, data quality assumptions, and methodology limitations are detailed in the methodology section.`;
}

// Export framework summary for UI display
export function getFrameworkSummaryForUI(frameworks: string[]): Array<{ name: string; status: 'covered' | 'partial' }> {
  return frameworks
    .map(fwId => FRAMEWORKS[fwId])
    .filter(Boolean)
    .map(fw => ({
      name: fw!.shortName,
      status: fw!.status === 'not_applicable' ? 'partial' : fw!.status as 'covered' | 'partial',
    }));
}
