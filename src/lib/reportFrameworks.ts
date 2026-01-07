// Multi-Framework Reporting Engine
// Maps normalized carbon data to various sustainability disclosure frameworks

export interface FrameworkCoverage {
  id: string;
  name: string;
  shortName: string;
  category: 'mandatory' | 'voluntary' | 'investor';
  applicableWhen: string[];
  metricsMapping: Record<string, string>;
  status: 'covered' | 'partial' | 'not_applicable';
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
  summary: { scope1: number; scope2: number; scope3: number; total: number }
): { covered: FrameworkCoverage[]; partial: FrameworkCoverage[]; notCovered: FrameworkCoverage[] } {
  const covered: FrameworkCoverage[] = [];
  const partial: FrameworkCoverage[] = [];
  const notCovered: FrameworkCoverage[] = [];
  
  frameworks.forEach(fwId => {
    const fw = FRAMEWORKS[fwId];
    if (fw) {
      // Determine coverage based on data availability
      const hasScope1 = summary.scope1 > 0;
      const hasScope2 = summary.scope2 > 0;
      const hasScope3 = summary.scope3 > 0;
      
      if (fw.status === 'covered' && (hasScope1 || hasScope2 || hasScope3)) {
        covered.push(fw);
      } else if (fw.status === 'partial' || (fw.status === 'covered' && summary.total === 0)) {
        partial.push(fw);
      } else {
        notCovered.push(fw);
      }
    }
  });
  
  return { covered, partial, notCovered };
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
