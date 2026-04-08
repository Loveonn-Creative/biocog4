import { useMemo } from 'react';
import { getCountryConfig, type CountryConfig } from '@/lib/countryConfig';

export interface ProfileAlert {
  id: string;
  type: 'cbam' | 'finance' | 'compliance' | 'opportunity';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  linkTo?: string;
  linkLabel?: string;
}

interface ProfileInput {
  location: string;
  sector: string;
  size: string;
  exportsToEU: boolean;
  seekingFinance: boolean;
  hasNetZeroTarget: boolean;
  totalCO2Kg?: number;
  verifiedCount?: number;
  complianceScore?: number;
}

export function useProfileIntelligence(profile: ProfileInput | null): {
  alerts: ProfileAlert[];
  countryConfig: CountryConfig;
  priorityFrameworks: string[];
} {
  const countryConfig = useMemo(() => {
    return getCountryConfig(profile?.location || 'India');
  }, [profile?.location]);

  const alerts = useMemo(() => {
    if (!profile) return [];
    const result: ProfileAlert[] = [];

    // EU Exporter — CBAM risk
    if (profile.exportsToEU && countryConfig.cbamExposed) {
      const complianceGap = profile.complianceScore != null ? Math.max(0, 100 - profile.complianceScore) : null;
      result.push({
        id: 'cbam_risk',
        type: 'cbam',
        title: 'CBAM Compliance Alert',
        message: complianceGap != null
          ? `You're ${complianceGap}% non-compliant for EU shipments. Verify more invoices to close the gap.`
          : `As a ${countryConfig.name} exporter to EU, you need CBAM-ready emission data by 2026. Start verifying now.`,
        severity: 'warning',
        linkTo: '/cbam-calculator',
        linkLabel: 'Check CBAM exposure',
      });
    }

    // Seeking finance
    if (profile.seekingFinance) {
      result.push({
        id: 'green_finance',
        type: 'finance',
        title: 'Green Finance Eligibility',
        message: profile.verifiedCount && profile.verifiedCount > 0
          ? `With ${profile.verifiedCount} verified records, you may qualify for better loan rates. Connect with a lender.`
          : 'Verify your emissions data to unlock green loan eligibility and better interest rates.',
        severity: profile.verifiedCount && profile.verifiedCount > 0 ? 'success' : 'info',
        linkTo: '/partner-marketplace',
        linkLabel: 'Explore lenders',
      });
    }

    // Net-zero commitment
    if (profile.hasNetZeroTarget) {
      result.push({
        id: 'net_zero_track',
        type: 'compliance',
        title: 'Net-Zero Progress',
        message: `Track your decarbonization progress against SBTi targets. Set up your roadmap.`,
        severity: 'info',
        linkTo: '/net-zero',
        linkLabel: 'View roadmap',
      });
    }

    // Country-specific compliance gaps
    if (countryConfig.frameworks.length > 0) {
      const fw = countryConfig.frameworks[0];
      result.push({
        id: 'local_compliance',
        type: 'compliance',
        title: `${fw} Compliance`,
        message: `${countryConfig.govBody} requires ${fw} reporting. Ensure your data meets ${countryConfig.name} standards.`,
        severity: 'info',
        linkTo: '/reports',
        linkLabel: 'Generate report',
      });
    }

    // Textile + Bangladesh = RMG-specific
    if (profile.sector === 'textile' && countryConfig.code === 'BD') {
      result.push({
        id: 'rmg_compliance',
        type: 'opportunity',
        title: 'RMG Sector Advantage',
        message: 'Bangladesh RMG exporters with verified carbon data gain preferred buyer status. Export audit trails to show compliance.',
        severity: 'success',
        linkTo: '/history',
        linkLabel: 'Export audit trail',
      });
    }

    return result;
  }, [profile, countryConfig]);

  const priorityFrameworks = useMemo(() => {
    const frameworks = [...countryConfig.frameworks];
    if (profile?.exportsToEU) frameworks.push('CBAM', 'CSRD/ESRS');
    if (profile?.seekingFinance) frameworks.push('TCFD', 'CDP');
    if (profile?.hasNetZeroTarget) frameworks.push('SBTi');
    return [...new Set(frameworks)];
  }, [profile, countryConfig]);

  return { alerts, countryConfig, priorityFrameworks };
}
