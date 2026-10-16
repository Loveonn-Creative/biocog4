import { useState, useEffect, useMemo } from 'react';
import { RecordsLoadError } from '@/components/RecordsLoadError';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEmissions, calculateSummary } from '@/hooks/useEmissions';
import { useSession } from '@/hooks/useSession';
import { useWorkspace } from '@/hooks/useWorkspace';
import { applyScope, scopeKey } from '@/lib/workspaceScope';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { PremiumBadge } from '@/components/PremiumBadge';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileBarChart, Download, Award, Loader2, FileSpreadsheet, 
  Building2, Shield, CheckCircle, AlertCircle, Calendar, 
  ChevronDown, Settings, RefreshCw, Crown, Landmark, Clock
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { 
  assessFramework,
  assessMarketCompatibility,
  FRAMEWORKS,
} from '@/lib/reportFrameworks';
import { useReportEvidence } from '@/hooks/useReportEvidence';
import { grossKg, periodDateOf } from '@/lib/emissionLedger';
// PDF and Excel engines load on first download, not with the page.
import type { ReportDataset } from '@/lib/frameworkReports';
import { analyticsEvents } from '@/lib/analytics';
import { useI18nContext } from '@/lib/i18n/LanguageProvider';
import type { GovFormat } from '@/lib/govComplianceAdapter';

import { useRecordsChanged } from '@/lib/recordsEvents';
interface Verification {
  id: string;
  total_co2_kg: number;
  verification_score: number | null;
  verification_status: string | null;
  greenwashing_risk: string | null;
  ccts_eligible: boolean | null;
  cbam_compliant: boolean | null;
  created_at: string;
  ai_analysis: {
    greenScore?: number;
    scopeBreakdown?: { scope1: number; scope2: number; scope3: number };
    creditEligibility?: { eligibleCredits: number; qualityGrade: string };
    recommendations?: string[];
    dataQuality?: string;
    methodologyCompliance?: string;
  } | null;
}

// The methodology and factor sources are the ones recorded on the user's own
// evidence, not a fixed label.
const legalDisclaimer = (methodology: string, factorSources: string[]) =>
  `This report serves as decision-support disclosure and is not a statutory filing unless independently assured. Data is calculated using methodology ${methodology}${factorSources.length ? ` with emission factors from ${factorSources.join(', ')}` : ''}. Scope boundaries, data quality assumptions, and methodology limitations are detailed herein.`;

/** SHA-256 over the sorted document hashes, hex. Null when there are none or hashing is unavailable. */
async function evidenceFingerprint(documentHashes: string[]): Promise<string | null> {
  const list = [...new Set(documentHashes.filter(Boolean))].sort();
  if (list.length === 0 || !globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(list.join('\n')));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Every implemented framework is selectable. The list is derived from the
// registry so a framework can never exist in the engine but be missing here.
const ALL_FRAMEWORKS = Object.values(FRAMEWORKS).map(fw => ({
  id: fw.id,
  label: fw.shortName,
  category: fw.category,
}));



const Reports = () => {
  const navigate = useNavigate();
  const { summary, emissions, error: emissionsError, refetch: refetchEmissions } = useEmissions();
  const { user, sessionId } = useSession();
  const { scope, ready: workspaceReady } = useWorkspace();
  const workspaceKey = scopeKey(scope);
  const { isPremium, canAccessFeature } = usePremiumStatus();
  const { activeContext } = useOrganization();
  const { entries: ledgerEntries, exportGovFormat } = useComplianceLedger();
  const [isGenerating, setIsGenerating] = useState(false);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFrameworkOptions, setShowFrameworkOptions] = useState(false);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [useCustomFrameworks, setUseCustomFrameworks] = useState(false);
  const { isEnterprise } = useEnterpriseMode();
  const { locale } = useI18nContext();


  // Route protection: redirect partners to their reports page
  useEffect(() => {
    if (activeContext?.context_type === 'partner') {
      toast.info('Redirecting to Partner Reports.');
      navigate('/partner-reports');
    }
  }, [activeContext, navigate]);
  
  // Framework applicability and coverage come from stored records, not from
  // any browser-local copy of the company profile.
  const {
    profile: dbProfile,
    availability,
    applicableFrameworks: autoFrameworks,
    evidence,
    target,
    factorSources,
    methodologyVersion,
    isLoading: evidenceLoading,
  } = useReportEvidence();

  // Initialize selected frameworks from auto-detected
  useEffect(() => {
    if (!useCustomFrameworks) {
      setSelectedFrameworks(autoFrameworks);
    }
  }, [autoFrameworks.join(','), useCustomFrameworks]);

  
  // Refetch when records change anywhere (verify, delete, upload).
  useRecordsChanged(() => { fetchVerifications(); });
  useEffect(() => {
    fetchVerifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- workspaceKey captures scope
  }, [workspaceKey, workspaceReady]);

  const fetchVerifications = async () => {
    if (!workspaceReady) return;
    try {
      let query = supabase
        .from('carbon_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      const scoped = applyScope(query, scope);
      if (!scoped) return;
      query = scoped;

      const { data, error } = await query;
      if (!error && data) {
        setVerifications(data as unknown as Verification[]);
      }
    } catch (err) {
      console.error('Error fetching verifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const latestVerification = verifications[0];
  const analysis = latestVerification?.ai_analysis;
  
  const activeFrameworks = useCustomFrameworks ? selectedFrameworks : autoFrameworks;

  const dateLocale = locale === 'en' ? 'en-IN' : locale;
  const formatNumber = (n: number) => n >= 1000 ? `${(n/1000).toFixed(2)}t` : `${n.toFixed(1)}kg`;
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const organizationName =
    dbProfile?.businessName || user?.email?.split('@')[0] || 'Unnamed entity';

  // One verified dataset, shared by every framework output.
  // Categories use exactly the rows behind the totals: verified rows for
  // signed-in users (as useEmissions' summary does), each emission id once.
  // Records read from documents but not verified yet. With no verified record,
  // the page shows these as a draft, marked unverified everywhere, rather than
  // an empty page; once anything is verified, outputs use verified rows only.
  const pendingRows = useMemo(() => {
    if (!user) return [];
    const seen = new Set<string>();
    return emissions.filter(e => e.verified !== true && (seen.has(e.id) ? false : (seen.add(e.id), true)));
  }, [emissions, user]);
  const pendingSummary = useMemo(() => calculateSummary(pendingRows), [pendingRows]);
  const isDraft = !!user && summary.total <= 0 && pendingSummary.total > 0;
  const shown = isDraft ? pendingSummary : summary;

  const reportRows = useMemo(() => {
    if (isDraft) return pendingRows;
    const rows = user ? emissions.filter(e => e.verified === true) : emissions;
    const seen = new Set<string>();
    return rows.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  }, [emissions, user, isDraft, pendingRows]);

  const dataset: ReportDataset = useMemo(() => {
    // Reporting period from invoice dates (upload date when an invoice has none).
    const dates = reportRows.map(e => periodDateOf(e)).sort();
    // All co2Kg values are kgCO2e, like scope1Kg..totalKg. Activity data is
    // only summed when every row in the group shares one unit; mixed units
    // (e.g. litres and kg of fuel) are reported as unavailable, not added.
    const categories = Object.values(
      reportRows.reduce((acc, e) => {
        const key = `${e.scope}:${e.category}`;
        const unit = e.activity_unit ?? null;
        if (!acc[key]) {
          acc[key] = {
            category: e.category,
            scope: e.scope,
            co2Kg: 0,
            activityData: 0,
            activityUnit: unit,
            emissionFactor: e.emission_factor,
            dataQuality: e.data_quality,
            verified: Boolean(e.verified),
          };
        } else {
          if (acc[key].activityUnit !== unit) {
            acc[key].activityUnit = null;
            acc[key].activityData = null;
          }
          if (acc[key].emissionFactor !== e.emission_factor) acc[key].emissionFactor = null;
        }
        // Same summation as the scope totals so categories add up to them.
        acc[key].co2Kg += grossKg(e.co2_kg);
        if (acc[key].activityData !== null && acc[key].activityUnit !== null) {
          acc[key].activityData = (acc[key].activityData ?? 0) + (e.activity_data ?? 0);
        }
        acc[key].verified = acc[key].verified && Boolean(e.verified);
        return acc;
      }, {} as Record<string, ReportDataset['categories'][number]>),
    ).sort((a, b) => b.co2Kg - a.co2Kg);

    return {
      draft: isDraft,
      organizationName,
      gstin: dbProfile?.gstin ?? null,
      sector: dbProfile?.sector ?? null,
      size: dbProfile?.size ?? null,
      country: dbProfile?.country ?? 'IN',
      locale: dateLocale,
      generatedAt: new Date().toISOString(),
      periodStart: dates[0] ?? null,
      periodEnd: dates[dates.length - 1] ?? null,
      scope1Kg: shown.scope1,
      scope2Kg: shown.scope2,
      scope3Kg: shown.scope3,
      totalKg: shown.total,
      categories,
      evidence: evidence.map(e => ({
        documentHash: e.documentHash,
        invoiceNumber: e.invoiceNumber,
        vendor: e.vendor,
        invoiceDate: e.invoiceDate,
        co2Kg: e.co2Kg,
        scope: e.scope,
        category: e.category,
        factorSource: e.factorSource,
        verificationStatus: e.verificationStatus,
      })),
      availability,
      methodologyVersion,
      factorSources,
      verification: latestVerification
        ? {
            status: latestVerification.verification_status || 'pending',
            score: latestVerification.verification_score,
            greenwashingRisk: latestVerification.greenwashing_risk,
            // Legacy flags never reach an export: CCTS / CBAM readiness needs a
            // documented expert review, which no record carries yet.
            cctsEligible: null,
            cbamCompliant: null,
            verifiedAt: latestVerification.created_at,
          }
        : null,
      target: target
        ? {
            baselineCo2Kg: target.baselineCo2Kg,
            targetReductionPct: target.targetReductionPct,
            targetDate: target.targetDate,
            progressPct: target.progressPct,
          }
        : null,
    };
  }, [reportRows, shown, isDraft, evidence, availability, methodologyVersion, factorSources, latestVerification, target, dbProfile, organizationName, dateLocale]);

  const assessments = useMemo(
    () =>
      activeFrameworks
        .map(id => FRAMEWORKS[id])
        .filter(Boolean)
        .map(fw => assessFramework(fw!, availability)),
    [activeFrameworks, availability],
  );

  // The certificate names a standard only when the records evidence part of
  // it, with the share evidenced, never as a blanket conformance mark.
  const standardBadges = useMemo(
    () => (['GHG_PROTOCOL', 'ISO_14064'] as const)
      .map(id => assessFramework(FRAMEWORKS[id], availability))
      .filter(a => a.coverage !== 'not_covered')
      .map(a => `${a.framework.shortName}: ${a.completeness}% evidenced`),
    [availability],
  );

  // Only frameworks the records actually evidence are named in the summary line.
  const evidencedFrameworks = useMemo(
    () => assessments.filter(a => a.coverage !== 'not_covered').map(a => a.framework.shortName),
    [assessments],
  );

  // Disclosure readiness and carbon-credit project eligibility are separate
  // questions, answered separately from the criteria that produced them.
  const marketCompatibility = useMemo(
    () =>
      assessMarketCompatibility({
        availability,
        evidenceCount: evidence.length,
        verificationStatus: latestVerification?.verification_status ?? null,
        verificationScore: latestVerification?.verification_score ?? null,
        greenwashingRisk: latestVerification?.greenwashing_risk ?? null,
      }),
    [availability, evidence.length, latestVerification],
  );



  const downloadFramework = async (fwId: string, kind: 'pdf' | 'xlsx') => {
    if (shown.total <= 0) {
      toast.error('No emissions data to report yet');
      return;
    }
    setIsGenerating(true);
    try {
      const { generateFrameworkPDF, generateFrameworkExcel } = await import('@/lib/frameworkReports');
      const ok = kind === 'pdf'
        ? generateFrameworkPDF(fwId, dataset)
        : generateFrameworkExcel(fwId, dataset);
      if (ok) {
        analyticsEvents.reportExport(fwId, kind);
        toast.success(`${FRAMEWORKS[fwId]?.shortName} report downloaded`);
      }
      else toast.error('Unknown framework');
    } catch (err) {
      console.error('Framework report error:', err);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFramework = (fwId: string) => {
    setUseCustomFrameworks(true);
    setSelectedFrameworks(prev => 
      prev.includes(fwId) 
        ? prev.filter(id => id !== fwId)
        : [...prev, fwId]
    );
  };
  
  const resetToAuto = () => {
    setUseCustomFrameworks(false);
    setSelectedFrameworks(autoFrameworks);
  };

  
  // The Senseible summary and the reader-specific packs are views over the
  // same verified dataset, produced by the same engine as every framework
  // export. There is no second report generator.
  const generateESGReport = () => downloadFramework('SENSEIBLE_SUMMARY', 'pdf');
  const generateExcelReport = () => downloadFramework('SENSEIBLE_SUMMARY', 'xlsx');
  const generateLenderReport = () => downloadFramework('LENDER_VIEW', 'pdf');

  
  // Distinct source files behind verified records: what the certificate may cite.
  const verifiedDocCount = new Set(evidence.filter((e) => e.verificationStatus === 'verified').map((e) => e.documentHash)).size;

  const generateComplianceCertificate = async () => {
    setIsGenerating(true);
    
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;
      
      // Decorative border
      doc.setDrawColor(34, 82, 54);
      doc.setLineWidth(3);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
      
      // Corner decorations
      const cornerSize = 20;
      [[15, 15], [pageWidth - 35, 15], [15, pageHeight - 35], [pageWidth - 35, pageHeight - 35]].forEach(([x, y]) => {
        doc.setDrawColor(34, 82, 54);
        doc.line(x, y, x + cornerSize, y);
        doc.line(x, y, x, y + cornerSize);
      });
      
      // Certificate title - centered
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 82, 54);
      doc.text('INDEPENDENTLY REVIEWED', centerX, 45, { align: 'center' });
      
      // Decorative line
      doc.setDrawColor(34, 82, 54);
      doc.setLineWidth(1);
      doc.line(70, 55, pageWidth - 70, 55);
      
      // Certificate text - centered
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text('This record confirms that', centerX, 72, { align: 'center' });
      
      // Organization name - centered with text wrapping
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      // Identity comes from the stored profile record, not browser storage.
      const businessName = organizationName;
      const gstin = dbProfile?.gstin || null;
      const sector = dbProfile?.sector || null;

      
      const displayName = businessName.charAt(0).toUpperCase() + businessName.slice(1);
      const maxNameWidth = pageWidth - 80;
      const nameLines = doc.splitTextToSize(displayName, maxNameWidth);
      doc.text(nameLines, centerX, 88, { align: 'center' });
      
      // Add GSTIN if available
      let gstinOffset = 0;
      if (gstin) {
        gstinOffset = 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(`GSTIN: ${gstin}`, centerX, 88 + (nameLines.length * 8) + 3, { align: 'center' });
      }
      
      // Certificate body - centered (adjust for GSTIN if present)
      const bodyY = 88 + (nameLines.length * 8) + 5 + gstinOffset;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      // States only what the records show: emissions recorded from source
      // documents and checked by the platform's own integrity control.
      doc.text(`has recorded its greenhouse gas emissions from ${verifiedDocCount} source document${verifiedDocCount === 1 ? '' : 's'}`, centerX, bodyY, { align: 'center' });
      doc.text('reviewed by a Senseible analyst or subject expert against the source evidence.', centerX, bodyY + 9, { align: 'center' });
      
      // Verification details box - centered with equal columns
      const boxY = bodyY + 25;
      const boxWidth = 200;
      const boxHeight = 55;
      const boxX = centerX - boxWidth / 2;
      
      doc.setFillColor(248, 252, 248);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 5, 5, 'F');
      doc.setDrawColor(34, 82, 54);
      doc.setLineWidth(0.5);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 5, 5, 'S');
      
      // Three equal columns for metrics
      const colWidth = boxWidth / 3;
      const col1Center = boxX + colWidth * 0.5;
      const col2Center = boxX + colWidth * 1.5;
      const col3Center = boxX + colWidth * 2.5;
      
      // Column dividers
      doc.setDrawColor(220, 230, 220);
      doc.setLineWidth(0.3);
      doc.line(boxX + colWidth, boxY + 8, boxX + colWidth, boxY + boxHeight - 8);
      doc.line(boxX + colWidth * 2, boxY + 8, boxX + colWidth * 2, boxY + boxHeight - 8);
      
      // Column 1: Verified Emissions
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text('Verified Emissions', col1Center, boxY + 14, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 82, 54);
      const emissionText = summary.total >= 1000 
        ? `${(summary.total / 1000).toFixed(2)} t` 
        : `${summary.total.toFixed(1)} kg`;
      doc.text(emissionText, col1Center, boxY + 32, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('CO₂ equivalent', col1Center, boxY + 42, { align: 'center' });
      
      // Column 2: Quality Grade
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Quality Grade', col2Center, boxY + 14, { align: 'center' });
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 82, 54);
      const grade = analysis?.creditEligibility?.qualityGrade;
      if (!grade) doc.setFontSize(12);
      doc.text(grade || 'Not assessed', col2Center, boxY + 35, { align: 'center' });
      
      // Column 3: Green Score
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Green Score', col3Center, boxY + 14, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 82, 54);
      const greenScore = typeof analysis?.greenScore === 'number' ? analysis.greenScore : null;
      if (greenScore === null) doc.setFontSize(12);
      doc.text(greenScore === null ? 'Not assessed' : `${greenScore}`, col3Center, boxY + 32, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      if (greenScore !== null) doc.text('out of 100', col3Center, boxY + 42, { align: 'center' });
      
      // Compliance badges - centered with consistent sizing
      const badgeY = boxY + boxHeight + 12;
      const badges: string[] = [];
      badges.push(...standardBadges);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const badgePadding = 10;
      const badgeHeight = 16;
      const badgeGap = 8;
      const badgeWidths = badges.map(b => doc.getTextWidth(b) + badgePadding * 2);
      const totalBadgeWidth = badgeWidths.reduce((a, b) => a + b, 0) + (badges.length - 1) * badgeGap;
      let badgeX = centerX - totalBadgeWidth / 2;
      
      badges.forEach((badge, i) => {
        const bw = badgeWidths[i];
        doc.setFillColor(34, 82, 54);
        doc.roundedRect(badgeX, badgeY, bw, badgeHeight, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(badge, badgeX + bw / 2, badgeY + 11, { align: 'center' });
        badgeX += bw + badgeGap;
      });
      
      // Evidence fingerprint: SHA-256 over the sorted hashes of the source
      // documents behind this certificate, so anyone holding the same
      // documents can recompute it. Omitted when there is no evidence.
      const fingerprint = await evidenceFingerprint(evidence.map(e => e.documentHash));
      if (fingerprint) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140);
        doc.text(`Evidence fingerprint (SHA-256 of ${evidence.length} document hashes): ${fingerprint.slice(0, 16).toUpperCase()}`, centerX, badgeY + 26, { align: 'center' });
      }
      
      // Signature area - properly aligned
      const sigY = pageHeight - 55;
      doc.setDrawColor(34, 82, 54);
      doc.setLineWidth(0.5);
      doc.line(centerX - 60, sigY, centerX + 60, sigY);
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text('Authorized Signature', centerX, sigY + 8, { align: 'center' });
      
      // Certificate metadata - right aligned ID, centered date
      const certId = `REV-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Record ID: ${certId}`, pageWidth - 25, pageHeight - 30, { align: 'right' });
      doc.text(`Issued: ${formatDate(new Date().toISOString())}`, 25, pageHeight - 30, { align: 'left' });
      doc.text(`Methodology: ${methodologyVersion}`, centerX, pageHeight - 22, { align: 'center' });
      
      // Footer disclaimer - centered
      doc.setFontSize(6);
      doc.setTextColor(130);
      doc.text('Powered by Senseible Carbon Platform | Decision-support record, not a regulatory certification or statutory filing', centerX, pageHeight - 15, { align: 'center' });
      
      doc.save(`independently-reviewed-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Independently Reviewed record downloaded');
    } catch (error) {
      console.error('Certificate generation error:', error);
      toast.error('Could not generate the reviewed record');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || evidenceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>Reports | Senseible</title></Helmet>
      <Navigation />
      {emissionsError && <RecordsLoadError onRetry={() => void refetchEmissions()} />}
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Carbon Reports</h1>
          <p className="text-muted-foreground">
            Generate ESG compliance reports and certificates for banks, regulators, and carbon buyers
          </p>
        </div>
        
        {shown.total > 0 ? (
          <Tabs defaultValue="reports" className="space-y-6">
            {isDraft ? (
              <div role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-4">
                <p className="font-medium text-foreground">Measured from your bills · verification pending</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  These figures come from {pendingRows.length} {pendingRows.length === 1 ? 'record' : 'records'} measured from your documents. Downloads are marked "Pre-verification" until you verify them. Verify to get a report a bank or buyer can rely on.
                </p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/verify')}>Verify now</Button>
              </div>
            ) : pendingRows.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {pendingRows.length} {pendingRows.length === 1 ? 'record is' : 'records are'} awaiting verification and not included below.{' '}
                <Link to="/verify" className="font-medium text-foreground underline underline-offset-2">Verify now</Link>
              </p>
            ) : null}
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="certificates">Reviewed record</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reports" className="space-y-6">
              {/* ESG Report Card */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileBarChart className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <span>Carbon Accounting Report</span>
                      <p className="text-sm font-normal text-muted-foreground mt-1">
                        Comprehensive ESG report for banks & compliance
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                      <div className="text-xl font-mono font-bold text-orange-600">{formatNumber(shown.scope1)}</div>
                      <div className="text-xs text-muted-foreground">Scope 1</div>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/10 text-center">
                      <div className="text-xl font-mono font-bold text-blue-600">{formatNumber(shown.scope2)}</div>
                      <div className="text-xs text-muted-foreground">Scope 2</div>
                    </div>
                    <div className="p-4 rounded-lg bg-teal-500/10 text-center">
                      <div className="text-xl font-mono font-bold text-teal-600">{formatNumber(shown.scope3)}</div>
                      <div className="text-xs text-muted-foreground">Scope 3</div>
                    </div>
                  </div>
                  
                  {/* Framework Coverage with Customization */}
                  <Collapsible open={showFrameworkOptions} onOpenChange={setShowFrameworkOptions}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/70 transition-colors mb-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="text-sm">
                            {evidencedFrameworks.length === 0
                              ? 'No framework evidenced by your records yet'
                              : <>Records evidence {evidencedFrameworks.slice(0, 3).join(', ')}
                                {evidencedFrameworks.length > 3 && ` +${evidencedFrameworks.length - 3} more`}
                                {evidencedFrameworks.length < assessments.length && ` (of ${assessments.length} selected)`}</>}
                          </span>
                          {useCustomFrameworks && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Custom</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showFrameworkOptions ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 rounded-lg border border-border/50 mb-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Customize Framework Coverage</span>
                          {useCustomFrameworks && (
                            <Button variant="ghost" size="sm" onClick={resetToAuto} className="text-xs h-7 gap-1">
                              <RefreshCw className="h-3 w-3" />
                              Reset to Auto
                            </Button>
                          )}
                        </div>
                        {(['reader_view', 'mandatory', 'investor', 'voluntary'] as const).map(cat => {
                          const items = ALL_FRAMEWORKS.filter(fw => fw.category === cat);
                          if (items.length === 0) return null;
                          const heading = {
                            reader_view: 'Reader views (same dataset, reader-specific structure)',
                            mandatory: 'Regulatory frameworks',
                            investor: 'Investor frameworks',
                            voluntary: 'Voluntary standards',
                          }[cat];
                          return (
                            <div key={cat} className="space-y-2">
                              <div className="text-xs uppercase tracking-wider text-muted-foreground">{heading}</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {items.map(fw => (
                                  <label
                                    key={fw.id}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm"
                                  >
                                    <Checkbox
                                      checked={selectedFrameworks.includes(fw.id)}
                                      onCheckedChange={() => toggleFramework(fw.id)}
                                    />
                                    <span className={selectedFrameworks.includes(fw.id) ? 'text-foreground' : 'text-muted-foreground'}>
                                      {fw.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground">
                          {useCustomFrameworks 
                            ? 'Using custom selection. Reset to use frameworks detected from your stored profile and records.'
                            : 'Detected from your stored profile, recorded targets and invoice evidence.'}
                        </p>


                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={generateESGReport}
                      disabled={isGenerating}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download PDF
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={generateExcelReport}
                      disabled={isGenerating}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Download Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Framework-specific reports, all built from the same verified dataset */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Shield className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <span>Framework Reports</span>
                      <p className="text-sm font-normal text-muted-foreground mt-1">
                        Each framework renders the same {isDraft ? 'measured (pre-verification)' : 'verified'} records in its own disclosure structure
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessments.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No frameworks selected. Choose frameworks above to generate reports.
                    </p>
                  )}
                  {assessments.map(a => (
                    <div
                      key={a.framework.id}
                      className="p-4 rounded-lg border border-border/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{a.framework.shortName}</div>
                          <div className="text-xs text-muted-foreground">{a.framework.name}</div>
                        </div>
                        <Badge
                          variant={a.coverage === 'covered' ? 'default' : a.coverage === 'partial' ? 'secondary' : 'outline'}
                        >
                          {a.coverage === 'covered'
                            ? 'Fully evidenced'
                            : a.coverage === 'partial'
                              ? `${a.completeness}% evidenced`
                              : 'No evidence yet'}
                        </Badge>
                      </div>

                      {a.framework.note && (
                        <p className="text-xs text-muted-foreground">{a.framework.note}</p>
                      )}

                      {a.dataGaps.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Data gaps (closeable by adding records): {a.dataGaps.map(g => g.reference).join(', ')}
                        </p>
                      )}
                      {a.notApplicable.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Not applicable to this platform (entity-authored): {a.notApplicable.map(g => g.reference).join(', ')}
                        </p>
                      )}
                      {a.coverage === 'not_covered' && (
                        <p className="text-xs text-muted-foreground">
                          Export is disabled until at least one disclosure under this framework is evidenced.
                        </p>
                      )}


                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={isGenerating || a.coverage === 'not_covered'}
                          onClick={() => downloadFramework(a.framework.id, 'pdf')}
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={isGenerating || a.coverage === 'not_covered'}
                          onClick={() => downloadFramework(a.framework.id, 'xlsx')}
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          Excel
                        </Button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Coverage is computed from your recorded emissions, targets and evidence. Disclosures without
                    supporting records are printed as declared gaps, never estimated.
                  </p>
                </CardContent>
              </Card>


              {/* Market compatibility — disclosure readiness, stated separately
                  from carbon-credit project eligibility */}
              <Card className={`border-2 ${marketCompatibility.disclosureReady ? 'border-success/30' : 'border-muted'}`}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${marketCompatibility.disclosureReady ? 'bg-success/10' : 'bg-muted'}`}>
                      {marketCompatibility.disclosureReady
                        ? <CheckCircle className="h-5 w-5 text-success" />
                        : <Clock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">Market compatibility</div>
                      <div className="text-xs text-muted-foreground">
                        Disclosure readiness, measured against the criteria below
                      </div>
                    </div>
                    <Badge variant={marketCompatibility.disclosureReady ? 'default' : 'secondary'}>
                      {marketCompatibility.disclosureReady ? 'Disclosure-ready' : 'Criteria outstanding'}
                    </Badge>
                  </div>

                  <ul className="space-y-2">
                    {marketCompatibility.disclosureCriteria.map(c => (
                      <li key={c.label} className="flex items-start gap-2 text-xs">
                        {c.met
                          ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                          : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                        <span>
                          <span className={c.met ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                          <span className="text-muted-foreground">: {c.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                    <strong>Carbon-credit project eligibility: not established.</strong>{' '}
                    {marketCompatibility.creditStatement}
                  </p>
                </CardContent>
              </Card>


              {/* Gov-Ready Export */}
              {ledgerEntries.length > 0 && (
                <Card className="border-warning/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Shield className="h-4 w-4 shrink-0 text-warning" />
                      <div>
                        <span>Gov-Ready Export</span>
                        <p className="text-sm font-normal text-muted-foreground mt-1">
                          Auto-formatted MRV outputs for government registries
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Export compliance ledger data mapped to government-required fields with evidence hashes, geo-tags (from GSTIN), and verification timestamps.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGovFormat('GCP')}
                        className="gap-1"
                      >
                        <Download className="h-3 w-3" />
                        GCP
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGovFormat('BRSR')}
                        className="gap-1"
                      >
                        <Download className="h-3 w-3" />
                        BRSR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGovFormat('CCTS')}
                        className="gap-1"
                      >
                        <Download className="h-3 w-3" />
                        CCTS
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      GCP = Green Credit Programme • BRSR = Business Responsibility & Sustainability Reporting • CCTS = Carbon Credit Trading Scheme
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Bank Disclosure Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <span>Bank Disclosure Report</span>
                      <p className="text-sm font-normal text-muted-foreground mt-1">
                        For green loan applications & ESG financing
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Total Emissions</span>
                      <span className="font-mono font-bold">{formatNumber(summary.total)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Verification Status</span>
                      <span className={`font-medium ${
                        latestVerification?.verification_status === 'verified' ? 'text-success' :
                        latestVerification?.verification_status === 'needs_review' ? 'text-warning' : 'text-muted-foreground'
                      }`}>
                        {latestVerification?.verification_status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">Evidence records</span>
                      <span className="font-mono font-bold">{evidence.length}</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={generateLenderReport}
                    disabled={isGenerating}
                  >

                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download Bank Report
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="certificates" className="space-y-6">
              {/* Independently Reviewed record */}
              <Card className="border-success/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Award className="h-4 w-4 shrink-0 text-success" />
                    <div>
                      <span>Independently Reviewed</span>
                      <p className="text-sm font-normal text-muted-foreground mt-1">
                        Emissions record reviewed by a Senseible analyst or subject expert
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {/* Legacy CCTS / CBAM flags are not shown. A "CCTS Readiness Review" or
                        "CBAM Readiness Review" badge needs a documented review record,
                        which the platform does not store yet. */}
                    {standardBadges.map(b => (
                      <span key={b} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {b}
                      </span>
                    ))}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6">
                    Share with banks, investors, carbon buyers or regulators. It shows the emissions your documents
                    evidence, how much of each standard they cover, and a fingerprint of the source files.
                  </p>
                  
                  <Button 
                    className="w-full gap-2"
                    onClick={generateComplianceCertificate}
                    disabled={isGenerating || latestVerification?.verification_status !== 'verified'}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Award className="h-4 w-4" />
                    )}
                    Download reviewed record
                  </Button>
                  
                  {!latestVerification?.verification_status && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Complete verification to download the reviewed record
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Verification History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>Verification History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {verifications.length > 0 ? (
                    <div className="space-y-3">
                      {verifications.slice(0, 5).map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              v.verification_status === 'verified' ? 'bg-success' :
                              v.verification_status === 'needs_review' ? 'bg-warning' : 'bg-destructive'
                            }`} />
                            <div>
                              <div className="text-sm font-medium">{formatNumber(v.total_co2_kg)}</div>
                              <div className="text-xs text-muted-foreground">{formatDate(v.created_at)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono">Grade {v.ai_analysis?.creditEligibility?.qualityGrade || 'D'}</div>
                            <div className="text-xs text-muted-foreground capitalize">{v.verification_status?.replace('_', ' ')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No verifications yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileBarChart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No emissions data to report</p>
              <Button variant="outline" asChild>
                <Link to="/">Upload Invoice</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Legal Footer */}
        {/* Enterprise Finance-Grade Export */}
        {isEnterprise && emissions.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Finance-Grade Exports
                <Badge variant="outline" className="text-xs ml-auto border-primary/30 text-primary">Enterprise</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const XLSX = await import('xlsx');
                  const wb = XLSX.utils.book_new();
                  const auditData = emissions.map(e => ({
                    'Period date': periodDateOf(e).slice(0, 10),
                    'Recorded at': new Date(e.created_at).toISOString(),
                    Category: e.category,
                    Scope: e.scope,
                    'CO2 (kg)': e.co2_kg,
                    'Activity Data': e.activity_data || '',
                    'Activity Unit': e.activity_unit || '',
                    'Emission Factor': e.emission_factor || '',
                    'Data Quality': e.data_quality || '',
                    'Verified': e.verified ? 'Yes' : 'No',
                    'Document ID': e.document_id || '',
                  }));
                  const ws = XLSX.utils.json_to_sheet(auditData);
                  XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
                  XLSX.writeFile(wb, `finance-grade-audit-${new Date().toISOString().split('T')[0]}.xlsx`);
                  toast.success('Finance-grade audit trail exported');
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Full Audit Trail (XLSX)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const XLSX = await import('xlsx');
                  const wb = XLSX.utils.book_new();
                  const anonData = emissions.map(e => ({
                    Category: e.category,
                    Scope: e.scope,
                    'CO2 (kg)': e.co2_kg,
                    'Data Quality': e.data_quality || '',
                    'Verified': e.verified ? 'Yes' : 'No',
                  }));
                  const ws = XLSX.utils.json_to_sheet(anonData);
                  XLSX.utils.book_append_sheet(wb, ws, 'Partner Report');
                  XLSX.writeFile(wb, `partner-ready-${new Date().toISOString().split('T')[0]}.xlsx`);
                  toast.success('Partner-ready format exported');
                }}
              >
                <Shield className="h-4 w-4 mr-2" />
                Partner-Ready (Anonymized)
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Legal Disclaimer:</strong> {legalDisclaimer(methodologyVersion, factorSources)}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Reports;
