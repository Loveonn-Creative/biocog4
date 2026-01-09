import { useState, useEffect } from 'react';
import { useSession } from './useSession';

export type PremiumTier = 'snapshot' | 'basic' | 'pro' | 'scale';

export interface PremiumFeatures {
  // Snapshot (Free)
  basicEmissionSnapshot: boolean;
  basicEsgScore: boolean;
  invoiceScansPerMonth: number;
  dataBackupDays: number;
  voiceAiLite: boolean;
  helpCenterSupport: boolean;
  
  // Basic
  fullGstCarbonAutomation: boolean;
  verifiedClimateScore: boolean;
  greenLoanEligibility: boolean;
  govtIncentivesFinder: boolean;
  aiSavingsInsights: boolean;
  teamMembers: number;
  emailSupport: boolean;
  
  // Pro
  carbonMonetization: boolean;
  automatedEsgReports: boolean;
  bankGradeVerification: boolean;
  predictiveAiModels: boolean;
  priorityGreenFinance: boolean;
  phoneSupport: boolean;
  aiEsgHead: boolean;
  biocogSuperintelligence: boolean;
  reportingFrameworks: boolean;
  
  // Scale
  realtimeMrvPipeline: boolean;
  multiEntitySupport: boolean;
  apiIntegrations: boolean;
  sbtiReadyProjections: boolean;
  dedicatedOnboarding: boolean;
  prioritySla: boolean;
  unlimitedTeam: boolean;
}

export interface PremiumStatus {
  tier: PremiumTier;
  isPremium: boolean;
  isAuthenticated: boolean;
  features: PremiumFeatures;
  invoicesUsed: number;
  invoiceLimit: number;
  canAccessFeature: (feature: keyof PremiumFeatures) => boolean;
}

const TIER_FEATURES: Record<PremiumTier, PremiumFeatures> = {
  snapshot: {
    basicEmissionSnapshot: true,
    basicEsgScore: true,
    invoiceScansPerMonth: 10,
    dataBackupDays: 90,
    voiceAiLite: true,
    helpCenterSupport: true,
    fullGstCarbonAutomation: false,
    verifiedClimateScore: false,
    greenLoanEligibility: false,
    govtIncentivesFinder: false,
    aiSavingsInsights: false,
    teamMembers: 1,
    emailSupport: false,
    carbonMonetization: false,
    automatedEsgReports: false,
    bankGradeVerification: false,
    predictiveAiModels: false,
    priorityGreenFinance: false,
    phoneSupport: false,
    aiEsgHead: false,
    biocogSuperintelligence: false,
    reportingFrameworks: false,
    realtimeMrvPipeline: false,
    multiEntitySupport: false,
    apiIntegrations: false,
    sbtiReadyProjections: false,
    dedicatedOnboarding: false,
    prioritySla: false,
    unlimitedTeam: false,
  },
  basic: {
    basicEmissionSnapshot: true,
    basicEsgScore: true,
    invoiceScansPerMonth: 100,
    dataBackupDays: 365,
    voiceAiLite: true,
    helpCenterSupport: true,
    fullGstCarbonAutomation: true,
    verifiedClimateScore: true,
    greenLoanEligibility: true,
    govtIncentivesFinder: true,
    aiSavingsInsights: true,
    teamMembers: 3,
    emailSupport: true,
    carbonMonetization: false,
    automatedEsgReports: false,
    bankGradeVerification: false,
    predictiveAiModels: false,
    priorityGreenFinance: false,
    phoneSupport: false,
    aiEsgHead: false,
    biocogSuperintelligence: false,
    reportingFrameworks: false,
    realtimeMrvPipeline: false,
    multiEntitySupport: false,
    apiIntegrations: false,
    sbtiReadyProjections: false,
    dedicatedOnboarding: false,
    prioritySla: false,
    unlimitedTeam: false,
  },
  pro: {
    basicEmissionSnapshot: true,
    basicEsgScore: true,
    invoiceScansPerMonth: 500,
    dataBackupDays: 730,
    voiceAiLite: true,
    helpCenterSupport: true,
    fullGstCarbonAutomation: true,
    verifiedClimateScore: true,
    greenLoanEligibility: true,
    govtIncentivesFinder: true,
    aiSavingsInsights: true,
    teamMembers: 10,
    emailSupport: true,
    carbonMonetization: true,
    automatedEsgReports: true,
    bankGradeVerification: true,
    predictiveAiModels: true,
    priorityGreenFinance: true,
    phoneSupport: true,
    aiEsgHead: true,
    biocogSuperintelligence: true,
    reportingFrameworks: true,
    realtimeMrvPipeline: false,
    multiEntitySupport: false,
    apiIntegrations: false,
    sbtiReadyProjections: false,
    dedicatedOnboarding: false,
    prioritySla: false,
    unlimitedTeam: false,
  },
  scale: {
    basicEmissionSnapshot: true,
    basicEsgScore: true,
    invoiceScansPerMonth: 10000,
    dataBackupDays: 1825,
    voiceAiLite: true,
    helpCenterSupport: true,
    fullGstCarbonAutomation: true,
    verifiedClimateScore: true,
    greenLoanEligibility: true,
    govtIncentivesFinder: true,
    aiSavingsInsights: true,
    teamMembers: 999,
    emailSupport: true,
    carbonMonetization: true,
    automatedEsgReports: true,
    bankGradeVerification: true,
    predictiveAiModels: true,
    priorityGreenFinance: true,
    phoneSupport: true,
    aiEsgHead: true,
    biocogSuperintelligence: true,
    reportingFrameworks: true,
    realtimeMrvPipeline: true,
    multiEntitySupport: true,
    apiIntegrations: true,
    sbtiReadyProjections: true,
    dedicatedOnboarding: true,
    prioritySla: true,
    unlimitedTeam: true,
  },
};

export const usePremiumStatus = (): PremiumStatus => {
  const { user } = useSession();
  const [tier, setTier] = useState<PremiumTier>('snapshot');
  const [invoicesUsed, setInvoicesUsed] = useState(0);

  useEffect(() => {
    // Check localStorage for demo tier (for testing)
    const savedTier = localStorage.getItem('senseible_premium_tier') as PremiumTier | null;
    if (savedTier && TIER_FEATURES[savedTier]) {
      setTier(savedTier);
    }
    
    // Track invoices used
    const usedCount = parseInt(localStorage.getItem('senseible_invoices_used') || '0', 10);
    setInvoicesUsed(usedCount);
  }, [user]);

  const features = TIER_FEATURES[tier];
  const isPremium = tier !== 'snapshot';

  const canAccessFeature = (feature: keyof PremiumFeatures): boolean => {
    return !!features[feature];
  };

  return {
    tier,
    isPremium,
    isAuthenticated: !!user,
    features,
    invoicesUsed,
    invoiceLimit: features.invoiceScansPerMonth,
    canAccessFeature,
  };
};

// Helper to set tier (for demo/testing)
export const setDemoTier = (tier: PremiumTier) => {
  localStorage.setItem('senseible_premium_tier', tier);
  window.location.reload();
};
