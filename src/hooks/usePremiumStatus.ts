import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useRealtimeRefresh } from '@/lib/sharedRealtime';
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

interface PlanRead { tier: PremiumTier; expiresAt: string | null }

export const planQueryKey = (userId: string) => ['plan', userId] as const;

/**
 * Reads the plan from the account's records. Throws when neither record could
 * be read as proof, so the cache keeps the last known plan (a first read that
 * fails shows Snapshot: fail closed).
 */
async function readPlan(userId: string): Promise<PlanRead> {
  let nextTier: PremiumTier = 'snapshot';
  let nextExpiry: Date | null = null;

  // Fetch from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', userId)
    .single();

  if (profileError) {
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
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('tier, expires_at, status')
    .eq('user_id', userId)
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

  // A recent order still pending can mean Razorpay took the payment but
  // the browser never confirmed it. Ask the server to check with Razorpay
  // once per session; it activates only a captured payment. Realtime is
  // not published for these tables in production, so re-read here when
  // something was activated instead of waiting for an event.
  if (!reconciledThisSession.has(userId)) {
    reconciledThisSession.add(userId);
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: pending } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('created_at', since)
      .limit(1);
    if (pending && pending.length > 0) {
      void reconcilePayments().then(rec => {
        if (rec?.activated?.length) void queryClient.invalidateQueries({ queryKey: planQueryKey(userId) });
      });
    }
  }

  // Show the result when either record was read. A failed profile read
  // with an active paid subscription still shows the paid plan; when both
  // reads fail, the last known plan stays.
  if (!profileError || (!subscriptionError && subscription)) {
    return { tier: nextTier, expiresAt: nextExpiry ? nextExpiry.toISOString() : null };
  }
  throw profileError ?? subscriptionError ?? new Error('Plan not readable');
}

/**
 * The signed-in account's plan, read once and shared by every component
 * through the query cache, so a page change shows the known plan at once
 * instead of flashing Snapshot while each component re-reads it. Refreshed
 * after payment (refreshTier), on realtime changes and when stale. The plan
 * always comes from the account's records; nothing in the browser can raise
 * it, and the cache is cleared on sign-out or user switch.
 */
export const usePremiumStatus = (): PremiumStatus => {
  const { user } = useSession();
  const uid = user?.id ?? null;
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: planQueryKey(uid ?? ''),
    queryFn: () => readPlan(uid!),
    enabled: !!uid,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useRealtimeRefresh('profiles', uid ? `id=eq.${uid}` : null, planQueryKey(uid ?? ''), !!uid);
  useRealtimeRefresh('subscriptions', uid ? `user_id=eq.${uid}` : null, planQueryKey(uid ?? ''), !!uid);

  // Refresh tier - callable externally after payment success
  const refetchPlan = query.refetch;
  const refreshTier = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    try { await refetchPlan(); } finally { setRefreshing(false); }
  }, [uid, refetchPlan]);

  const tier: PremiumTier = uid ? query.data?.tier ?? 'snapshot' : 'snapshot';
  const expiresIso = uid ? query.data?.expiresAt ?? null : null;
  const expiresAt = useMemo(() => (expiresIso ? new Date(expiresIso) : null), [expiresIso]);
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
    isLoading: (!!uid && query.isPending) || refreshing,
    canAccessFeature,
    refreshTier,
  };
};
