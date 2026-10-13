import { useState, useEffect, useCallback, useRef } from 'react';
import { reconcilePayments } from './useRazorpay';
import { useSession } from './useSession';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_INVOICE_SCANS_PER_MONTH } from '../../supabase/functions/_shared/planLimits';

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
  /** New invoice reads per month; the server enforces the same figure (planLimits.ts). */
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
    invoiceScansPerMonth: PLAN_INVOICE_SCANS_PER_MONTH.snapshot,
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
    invoiceScansPerMonth: PLAN_INVOICE_SCANS_PER_MONTH.essential,
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
    invoiceScansPerMonth: PLAN_INVOICE_SCANS_PER_MONTH.pro,
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
    invoiceScansPerMonth: PLAN_INVOICE_SCANS_PER_MONTH.scale,
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

// Accounts whose recent pending orders were already checked this session.
const reconciledThisSession = new Set<string>();

const TIER_RANK: Record<PremiumTier, number> = { snapshot: 0, essential: 1, pro: 2, scale: 3 };

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
  const [isLoading, setIsLoading] = useState(true);

  // Whose plan the state currently describes. A refresh for the same account
  // keeps the last known plan on screen until the new read lands, so a
  // realtime event or refresh never flashes a paying customer back to
  // Snapshot; a different account (or sign-out) resets to Snapshot first.
  const shownFor = useRef<string | null>(null);

  const fetchTierFromDatabase = useCallback(async () => {
    // The plan always comes from the signed-in account. Signed-out visitors are
    // on Snapshot; nothing stored in the browser can raise a tier.
    if (shownFor.current !== (user?.id ?? null)) {
      setTier('snapshot');
      setExpiresAt(null);
      shownFor.current = user?.id ?? null;
    }
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    let nextTier: PremiumTier = 'snapshot';
    let nextExpiry: Date | null = null;

    try {
      // Fetch from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // Fail closed for a first read; a refresh keeps the last known plan.
        console.error('Error fetching profile tier:', profileError);
      } else if (profile) {
        // An expired paid plan reads as Snapshot. The profile row is not
        // rewritten here: the active subscription row below is the record of
        // payment, and the server applies the same expiry rule.
        const dbTier = normalizeTier(profile.subscription_tier);
        const expiry = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
        if (!(expiry && expiry < new Date())) {
          nextTier = dbTier;
          nextExpiry = expiry;
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
        const subTier = normalizeTier(subscription.tier);
        // Use the paid subscription when it is in force and at least as high as the profile copy.
        if (subExpiry > new Date() && TIER_RANK[subTier] >= TIER_RANK[nextTier]) {
          nextTier = subTier;
          nextExpiry = subExpiry;
        }
      }
      if (!profileError) {
        setTier(nextTier);
        setExpiresAt(nextExpiry);
      }

      // A recent order still pending can mean Razorpay took the payment but
      // the browser never confirmed it. Ask the server to check with Razorpay
      // once per session; it activates only a captured payment, and the
      // realtime listener below picks up the change.
      if (!reconciledThisSession.has(user.id)) {
        reconciledThisSession.add(user.id);
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const { data: pending } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', since)
          .limit(1);
        if (pending && pending.length > 0) void reconcilePayments();
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

  }, [fetchTierFromDatabase]);

  // Real-time subscription to profiles and subscriptions tables
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`subscription-updates-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
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
    invoiceLimit: features.invoiceScansPerMonth,
    expiresAt,
    isLoading,
    canAccessFeature,
    refreshTier,
  };
};

