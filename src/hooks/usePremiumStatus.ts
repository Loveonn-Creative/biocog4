import { useState, useEffect, useCallback } from 'react';
import { useSession } from './useSession';
import { supabase } from '@/integrations/supabase/client';

export type PremiumTier = 'snapshot' | 'essential' | 'pro' | 'scale';

export interface PremiumFeatures {
  // Snapshot (Free)
  basicEmissionSnapshot: boolean;
  basicEsgScore: boolean;
  invoiceScansPerMonth: number;
  dataBackupDays: number;
  voiceAiLite: boolean;
  helpCenterSupport: boolean;
  
  // Essential
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
  expiresAt: Date | null;
  isLoading: boolean;
  canAccessFeature: (feature: keyof PremiumFeatures) => boolean;
  refreshTier: () => Promise<void>;
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
  essential: {
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

// Map legacy 'basic' tier to 'essential'
const normalizeTier = (tier: string | null): PremiumTier => {
  if (!tier) return 'snapshot';
  if (tier === 'basic') return 'essential';
  if (TIER_FEATURES[tier as PremiumTier]) return tier as PremiumTier;
  return 'snapshot';
};

export const usePremiumStatus = (): PremiumStatus => {
  const { user } = useSession();
  const [tier, setTier] = useState<PremiumTier>('snapshot');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [invoicesUsed, setInvoicesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTierFromDatabase = useCallback(async () => {
    if (!user?.id) {
      // Check localStorage for demo/testing when not authenticated
      const savedTier = localStorage.getItem('senseible_premium_tier');
      if (savedTier) {
        setTier(normalizeTier(savedTier));
      }
      setIsLoading(false);
      return;
    }

    try {
      // Fetch from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile tier:', profileError);
        // Fall back to localStorage
        const savedTier = localStorage.getItem('senseible_premium_tier');
        if (savedTier) {
          setTier(normalizeTier(savedTier));
        }
      } else if (profile) {
        // Check if subscription is still valid
        const dbTier = normalizeTier(profile.subscription_tier);
        const expiry = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
        
        if (expiry && expiry < new Date()) {
          // Subscription expired, revert to snapshot
          setTier('snapshot');
          setExpiresAt(null);
          // Update database to reflect expiration
          await supabase
            .from('profiles')
            .update({ subscription_tier: 'snapshot', subscription_expires_at: null })
            .eq('id', user.id);
        } else {
          setTier(dbTier);
          setExpiresAt(expiry);
          // Sync to localStorage for quick access
          localStorage.setItem('senseible_premium_tier', dbTier);
        }
      }

      // Also check active subscriptions table for latest info
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, expires_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription && subscription.expires_at) {
        const subExpiry = new Date(subscription.expires_at);
        if (subExpiry > new Date()) {
          const subTier = normalizeTier(subscription.tier);
          setTier(subTier);
          setExpiresAt(subExpiry);
          localStorage.setItem('senseible_premium_tier', subTier);
        }
      }
    } catch (error) {
      console.error('Error fetching tier:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refresh tier - callable externally after payment success
  const refreshTier = useCallback(async () => {
    setIsLoading(true);
    await fetchTierFromDatabase();
  }, [fetchTierFromDatabase]);

  useEffect(() => {
    fetchTierFromDatabase();
    
    // Track invoices used from localStorage
    const usedCount = parseInt(localStorage.getItem('senseible_invoices_used') || '0', 10);
    setInvoicesUsed(usedCount);
  }, [fetchTierFromDatabase]);

  // Real-time subscription to profiles and subscriptions tables
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('subscription-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          // Refresh tier when profile changes
          fetchTierFromDatabase();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh tier when subscription changes
          fetchTierFromDatabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchTierFromDatabase]);

  const features = TIER_FEATURES[tier];
  const isPremium = tier !== 'snapshot';

  const canAccessFeature = useCallback((feature: keyof PremiumFeatures): boolean => {
    return !!features[feature];
  }, [features]);

  return {
    tier,
    isPremium,
    isAuthenticated: !!user,
    features,
    invoicesUsed,
    invoiceLimit: features.invoiceScansPerMonth,
    expiresAt,
    isLoading,
    canAccessFeature,
    refreshTier,
  };
};

// Helper to set tier (for demo/testing)
export const setDemoTier = (tier: PremiumTier) => {
  localStorage.setItem('senseible_premium_tier', tier);
  window.location.reload();
};
