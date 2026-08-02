import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useEmissions } from '@/hooks/useEmissions';
import {
  availabilityFromRecords,
  determineApplicableFrameworks,
  getDefaultMSMEProfile,
  EMPTY_AVAILABILITY,
  type DataAvailability,
  type ProfileContext,
} from '@/lib/reportFrameworks';

/**
 * Loads the evidence a report may legitimately rely on, straight from the
 * database. Nothing here is read from localStorage: coverage, organisation
 * identity and framework applicability all come from stored records so a
 * report generated on one device matches one generated on another.
 */

export interface ReportProfile {
  businessName: string | null;
  gstin: string | null;
  sector: string | null;
  size: string | null;
  location: string | null;
  preferredLanguage: string | null;
  country: string;
}

export interface EvidenceRecord {
  documentHash: string;
  invoiceNumber: string | null;
  vendor: string | null;
  invoiceDate: string | null;
  co2Kg: number;
  scope: number;
  category: string;
  factorSource: string | null;
  methodologyVersion: string;
  verificationStatus: string;
  hsnCode: string | null;
}

export interface TargetRecord {
  baselineCo2Kg: number;
  targetReductionPct: number;
  targetDate: string;
  progressPct: number | null;
}

const ENERGY_CATEGORY = /electric|energy|grid|fuel|diesel|petrol|lpg|coal|gas|power/i;

const countryFromLocation = (location: string | null): string => {
  if (!location) return 'IN';
  const l = location.trim().toLowerCase();
  const map: Record<string, string> = {
    india: 'IN', indonesia: 'ID', vietnam: 'VN', thailand: 'TH',
    philippines: 'PH', bangladesh: 'BD', pakistan: 'PK',
    malaysia: 'MY', singapore: 'SG', 'sri lanka': 'LK',
  };
  if (map[l]) return map[l];
  if (/^[a-z]{2}$/.test(l)) return l.toUpperCase();
  return 'IN';
};

export function useReportEvidence() {
  const { user } = useSession();
  const { emissions, summary, isLoading: emissionsLoading } = useEmissions();

  const [profile, setProfile] = useState<ReportProfile | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [target, setTarget] = useState<TargetRecord | null>(null);
  const [exportsToEU, setExportsToEU] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setProfile(null);
          setEvidence([]);
          setTarget(null);
          setExportsToEU(false);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      const [profileRes, ledgerRes, goalRes, docRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('business_name, gstin, sector, size, location, preferred_language')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('compliance_ledger')
          .select('document_hash, invoice_number, vendor, invoice_date, co2_kg, scope, emission_category, factor_source, methodology_version, verification_status, hsn_code')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('net_zero_goals')
          .select('baseline_co2_kg, target_reduction_pct, target_date, progress_pct')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('documents')
          .select('currency')
          .eq('user_id', user.id)
          .limit(200),
      ]);

      if (cancelled) return;

      const p = profileRes.data;
      setProfile({
        businessName: p?.business_name ?? null,
        gstin: p?.gstin ?? null,
        sector: p?.sector ?? null,
        size: p?.size ?? null,
        location: p?.location ?? null,
        preferredLanguage: p?.preferred_language ?? null,
        country: countryFromLocation(p?.location ?? null),
      });

      setEvidence(
        (ledgerRes.data ?? []).map((e) => ({
          documentHash: e.document_hash,
          invoiceNumber: e.invoice_number,
          vendor: e.vendor,
          invoiceDate: e.invoice_date,
          co2Kg: Number(e.co2_kg) || 0,
          scope: e.scope,
          category: e.emission_category,
          factorSource: e.factor_source,
          methodologyVersion: e.methodology_version,
          verificationStatus: e.verification_status,
          hsnCode: e.hsn_code,
        })),
      );

      const goal = goalRes.data?.[0];
      setTarget(
        goal
          ? {
              baselineCo2Kg: Number(goal.baseline_co2_kg) || 0,
              targetReductionPct: Number(goal.target_reduction_pct) || 0,
              targetDate: goal.target_date,
              progressPct: goal.progress_pct === null ? null : Number(goal.progress_pct),
            }
          : null,
      );

      // EU exposure is inferred only from an observable record: an invoice
      // denominated in EUR. No self-declared flag is invented.
      setExportsToEU((docRes.data ?? []).some((d) => (d.currency || '').toUpperCase() === 'EUR'));

      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const availability: DataAvailability = useMemo(() => {
    if (!user?.id && summary.total === 0) return EMPTY_AVAILABILITY;
    const hasEnergyRecords = emissions.some(
      (e) => ENERGY_CATEGORY.test(e.category) && (e.activity_data ?? 0) > 0,
    );
    return availabilityFromRecords({
      scope1Kg: summary.scope1,
      scope2Kg: summary.scope2,
      scope3Kg: summary.scope3,
      // No revenue or output denominator is captured today, so intensity
      // disclosures are reported as a gap rather than estimated.
      hasIntensityDenominator: false,
      hasTarget: Boolean(target),
      // Governance and risk narratives are not collected by the platform.
      hasGovernanceNarrative: false,
      hasRiskAssessment: false,
      hasEnergyRecords,
      hasProductLevelData: evidence.some((e) => Boolean(e.hsnCode)),
    });
  }, [emissions, summary, target, evidence, user?.id]);

  const profileContext: ProfileContext = useMemo(() => {
    if (!profile) return getDefaultMSMEProfile();
    const size = (['micro', 'small', 'medium', 'large'] as const).find(
      (s) => s === (profile.size || '').toLowerCase(),
    );
    return {
      country: profile.country,
      size,
      sector: profile.sector ?? undefined,
      exportsToEU,
      // Bank / investor disclosure is the platform's baseline use case.
      seekingFinance: true,
      hasNetZeroTarget: Boolean(target),
    };
  }, [profile, exportsToEU, target]);

  const applicableFrameworks = useMemo(
    () => determineApplicableFrameworks(profileContext),
    [profileContext],
  );

  const factorSources = useMemo(
    () => [...new Set(evidence.map((e) => e.factorSource).filter(Boolean) as string[])],
    [evidence],
  );

  const methodologyVersion = evidence[0]?.methodologyVersion || 'BIOCOG MRV v1.0';

  return {
    profile,
    profileContext,
    availability,
    applicableFrameworks,
    evidence,
    target,
    exportsToEU,
    factorSources,
    methodologyVersion,
    isLoading: isLoading || emissionsLoading,
  };
}
