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
  category: 'mandatory' | 'voluntary' | 'investor';
  applicableWhen: string[];
  metricsMapping: Record<string, string>;
  /** Baseline expectation only — actual coverage is computed from evidence. */
  status: 'covered' | 'partial' | 'not_applicable';
}

/**
 * Disclosure inputs the platform can evidence today.
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

/** Which availability flag each framework metric depends on. */
const METRIC_REQUIREMENTS: Record<string, keyof DataAvailability> = {
  scope1: 'scope1',
  scope1Emissions: 'scope1',
  scope2: 'scope2',
  scope3: 'scope3',
  scope3Categories: 'scope3',
  scope1_2Combined: 'scope1',
  scope1_2_3: 'scope3',
  totalEmissions: 'scope1',
  emissionsBreakdown: 'scope1',
  climateChange: 'scope1',
  environmentalResponsibility: 'scope1',
  climateAction: 'scope1',
  emissionIntensity: 'intensity',
  reductionInitiatives: 'targets',
  reductionTargets: 'targets',
  targetReductions: 'targets',
  targetYear: 'targets',
  baselineYear: 'targets',
  responsibleConsumption: 'targets',
  governanceProcess: 'governance',
  governanceLeadership: 'governance',
  companyOverview: 'governance',
  climateStrategy: 'governance',
  climateRisks: 'risks',
  riskProcess: 'risks',
  transitionRisks: 'risks',
  physicalRisks: 'risks',
  natureRisks: 'risks',
  natureDependencies: 'risks',
  natureActions: 'risks',
  operationsLocation: 'governance',
  energyConsumption: 'energy',
  cleanEnergy: 'energy',
  productEmissions: 'productLevel',
};

export interface FrameworkAssessment {
  framework: FrameworkCoverage;
  /** Disclosure references the current evidence supports */
  satisfied: string[];
  /** Disclosure references that cannot be evidenced yet */
  missing: string[];
  coverage: 'covered' | 'partial' | 'not_covered';
  /** 0-100, share of the framework's mapped references that are evidenced */
  completeness: number;
}

/** Assess one framework against the evidence actually held. */
export function assessFramework(
  fw: FrameworkCoverage,
  availability: DataAvailability,
): FrameworkAssessment {
  const refs = Object.entries(fw.metricsMapping);
  const satisfied: string[] = [];
  const missing: string[] = [];

  for (const [ref, metric] of refs) {
    const requirement = METRIC_REQUIREMENTS[metric];
    // Unmapped metric: treat as unevidenced rather than silently satisfied.
    if (requirement && availability[requirement]) satisfied.push(ref);
    else missing.push(ref);
  }

  const completeness = refs.length === 0 ? 0 : Math.round((satisfied.length / refs.length) * 100);
  const coverage: FrameworkAssessment['coverage'] =
    completeness === 100 ? 'covered' : completeness === 0 ? 'not_covered' : 'partial';

  return { framework: fw, satisfied, missing, coverage, completeness };
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
      'Ch.4 Scope 1': 'scope1',
      'Ch.4 Scope 2': 'scope2',
      'Ch.4 Scope 3': 'scope3',
      'Ch.7 Base year & targets': 'reductionTargets',
      'Ch.9 Energy consumption': 'energyConsumption',
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
      '5.2 Direct GHG emissions': 'scope1',
      '5.2 Indirect from energy': 'scope2',
      '5.2 Other indirect': 'scope3',
      '6.4 Quantification methodology': 'totalEmissions',
      '9.3.1 Reduction initiatives': 'reductionInitiatives',
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
      'GRI 305-5': 'reductionInitiatives',
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
      'RT-EE-130a.1': 'scope1',
      'RT-EE-130a.2': 'scope2',
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
      'Metrics': 'totalEmissions',
      'Targets': 'reductionTargets',
      'RiskManagement': 'climateRisks',
    },
    status: 'partial',
  },
  ISSB_S1: {
    id: 'ISSB_S1',
    name: 'ISSB S1: General Sustainability Disclosures',
    shortName: 'ISSB S1',
    category: 'mandatory',
    applicableWhen: ['exportsToEU', 'seekingFinance'],
    metricsMapping: {
      'Governance': 'governanceProcess',
      'Strategy': 'climateStrategy',
      'RiskManagement': 'riskProcess',
      'MetricsTargets': 'totalEmissions',
    },
    status: 'partial',
  },
  ISSB_S2: {
    id: 'ISSB_S2',
    name: 'ISSB S2: Climate-related Disclosures',
    shortName: 'ISSB S2',
    category: 'mandatory',
    applicableWhen: ['exportsToEU', 'seekingFinance'],
    metricsMapping: {
      'Scope1': 'scope1',
      'Scope2': 'scope2',
      'Scope3': 'scope3',
      'TransitionRisks': 'transitionRisks',
      'PhysicalRisks': 'physicalRisks',
    },
    status: 'covered',
  },
  CDP: {
    id: 'CDP',
    name: 'Carbon Disclosure Project',
    shortName: 'CDP',
    category: 'investor',
    applicableWhen: ['seekingFinance', 'hasNetZeroTarget'],
    metricsMapping: {
      'C6.1': 'scope1',
      'C6.2': 'scope2',
      'C6.3': 'scope3',
      'C6.5': 'emissionsBreakdown',
    },
    status: 'covered',
  },
  CSRD_ESRS: {
    id: 'CSRD_ESRS',
    name: 'EU Corporate Sustainability Reporting Directive (ESRS)',
    shortName: 'CSRD/ESRS',
    category: 'mandatory',
    applicableWhen: ['exportsToEU'],
    metricsMapping: {
      'ESRS_E1': 'climateChange',
      'ESRS_E1-4': 'targetReductions',
      'ESRS_E1-5': 'energyConsumption',
      'ESRS_E1-6': 'scope1_2_3',
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
    name: 'Science Based Targets initiative',
    shortName: 'SBTi',
    category: 'voluntary',
    applicableWhen: ['hasNetZeroTarget'],
    metricsMapping: {
      'Scope1+2': 'scope1_2Combined',
      'Scope3': 'scope3Categories',
      'TargetYear': 'targetYear',
      'BaselineYear': 'baselineYear',
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
      'SDG7': 'cleanEnergy',
      'SDG12': 'responsibleConsumption',
      'SDG13': 'climateAction',
    },
    status: 'covered',
  },
  INDIA_CPCB: {
    id: 'INDIA_CPCB',
    name: 'CPCB Environmental Compliance',
    shortName: 'CPCB',
    category: 'mandatory',
    applicableWhen: ['country_IN'],
    metricsMapping: {
      'EmissionNorms': 'scope1Emissions',
      'EnergyAudit': 'energyConsumption',
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
      'Section_A': 'companyOverview',
      'Section_B': 'governanceLeadership',
      'Section_C_P6': 'environmentalResponsibility',
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
      'DirectEmissions': 'scope1',
      'IndirectEmissions': 'scope2',
      'EmbeddedEmissions': 'productEmissions',
    },
    status: 'covered',
  },
};

// Determine which frameworks apply based on profile
export function determineApplicableFrameworks(profile: ProfileContext): string[] {
  const applicable: string[] = [];
  
  // India-specific
  if (profile.country === 'IN') {
    applicable.push('INDIA_CPCB');
    if (profile.size === 'large') {
      applicable.push('INDIA_BRSR');
    }
  }
  
  // EU exports
  if (profile.exportsToEU) {
    applicable.push('CBAM', 'CSRD_ESRS', 'ISSB_S1', 'ISSB_S2');
  }
  
  // Finance seeking
  if (profile.seekingFinance) {
    applicable.push('GRI_305', 'TCFD', 'CDP', 'SASB');
  }
  
  // Net-zero targets
  if (profile.hasNetZeroTarget) {
    applicable.push('SBTI', 'UN_SDGS', 'TNFD');
  }
  
  // Remove duplicates
  return [...new Set(applicable)];
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
