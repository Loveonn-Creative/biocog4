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
import { askReportAllowance, limitMessage } from '@/lib/reportAllowance';
import { CERTIFICATE_REPORT, reportIdFor, type ReportFileKind } from '../../supabase/functions/_shared/reportDownloadKey';
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
  // Nothing measured yet: the suite still renders, with zeros and guidance, but
  // nothing is downloadable, so no file can be passed off as a zero report.
  const isEmpty = shown.total <= 0;

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
        // Id, activity and factor make each register line checkable against its document.
        emissionId: e.emissionId,
        activityData: e.activityData,
        activityUnit: e.activityUnit,
        emissionFactor: e.emissionFactor,
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

  // The certificate names a standard only when the records cover part of it,
  // with the count covered, never as a blanket conformance mark.
  const standardBadges = useMemo(
    () => (['GHG_PROTOCOL', 'ISO_14064'] as const)
      .map(id => assessFramework(FRAMEWORKS[id], availability))
      .filter(a => a.coverage !== 'not_covered')
      .map(a => `${a.framework.shortName}: ${a.satisfied.length} of ${a.satisfied.length + a.missing.length} disclosures`),
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



  // Signed-in users on the free plan have a monthly download allowance, which
  // the server checks before any file is built. Viewing stays free, paid plans
  // skip the check, and guests download as before.
  const mayDownload = async (report: string, kind: ReportFileKind): Promise<boolean> => {
    if (!user || isPremium) return true;
    const answer = await askReportAllowance(
      (name, options) => supabase.functions.invoke(name, options),
      reportIdFor(report, dataset.periodStart, dataset.periodEnd),
      kind,
    );
    if (answer.allowed) return true;
    toast(limitMessage(answer, dateLocale), {
      duration: 10000,
      action: { label: 'See plans', onClick: () => navigate('/pricing') },
    });
    return false;
  };

  // Gov-Ready exports count toward the same monthly allowance as reports.
  const exportGov = async (format: GovFormat) => {
    if (!(await mayDownload(`GOV_${format}`, 'xlsx'))) return;
    exportGovFormat(format);
  };

  const downloadFramework = async (fwId: string, kind: ReportFileKind) => {
    if (isEmpty) {
      toast.error('Add a bill or invoice first; reports are built from your records');
      return;
    }
    setIsGenerating(true);
    try {
      if (!(await mayDownload(fwId, kind))) return;
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
      if (!(await mayDownload(CERTIFICATE_REPORT, 'pdf'))) return;
      const [{ default: jsPDF }, { drawCertificate }] = await Promise.all([import('jspdf'), import('@/lib/certificatePdf')]);
      const doc = new jsPDF({ orientation: 'landscape' });
      const verifiedHashes = evidence.filter((e) => e.verificationStatus === 'verified').map((e) => e.documentHash);
      const grade = analysis?.creditEligibility?.qualityGrade;
      drawCertificate(doc, {
        // Identity comes from the stored profile record, not browser storage.
        organizationName,
        gstin: dbProfile?.gstin || null,
        sector: dbProfile?.sector || null,
        verifiedDocCount,
        totalDocCount: new Set(evidence.map((e) => e.documentHash)).size,
        recordedKg: summary.total + pendingSummary.total,
        // Same files, same fingerprint: the record ID is derived from it.
        fingerprint: await evidenceFingerprint(verifiedHashes),
        totalKg: summary.total,
        scope1Kg: summary.scope1,
        scope2Kg: summary.scope2,
        scope3Kg: summary.scope3,
        periodStart: dataset.periodStart,
        periodEnd: dataset.periodEnd,
        qualityGrade: typeof grade === 'string' && grade ? grade : null,
        greenScore: typeof analysis?.greenScore === 'number' ? analysis.greenScore : null,
        badges: standardBadges,
        reviewedAt: latestVerification?.created_at ?? null,
        issuedAt: new Date().toISOString(),
        methodologyVersion,
        formatDate,
      });
      doc.save(`verified-emissions-certificate-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Certificate downloaded');
    } catch (error) {
      console.error('Certificate generation error:', error);
      toast.error('Could not create the certificate. Try again.');
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
        
        <Tabs defaultValue="reports" className="space-y-6">
            {isEmpty ? (
              <div role="status" className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="font-medium text-foreground">No records yet · reports start at zero</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every framework below fills in from your bills and invoices. Upload one, verify it, and the figures and downloads appear here.
                </p>
                <Button size="sm" className="mt-3" asChild><Link to="/">Upload a bill</Link></Button>
              </div>
            ) : isDraft ? (
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
              <TabsTrigger value="certificates">Certificate</TabsTrigger>
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
                      disabled={isGenerating || isEmpty}
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
                      disabled={isGenerating || isEmpty}
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
                          {a.coverage === 'not_covered'
                            ? 'No evidence yet'
                            : `${a.satisfied.length} of ${a.satisfied.length + a.missing.length} covered`}
                        </Badge>
                      </div>

                      {a.framework.note && (
                        <p className="text-xs text-muted-foreground">{a.framework.note}</p>
                      )}

                      {a.dataGaps.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Data gaps, closed by adding records: {a.dataGaps.map(g => g.reference).join(', ')}
                        </p>
                      )}
                      {a.notApplicable.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Not covered by documents: {a.notApplicable.map(g => g.reference).join(', ')}
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
                          Verified records, laid out for GCP, BRSR and CCTS
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Each compliance ledger carries its invoice fingerprint, supplier state (from GSTIN) and verification date. Use it to prepare your filing.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGov('GCP')}
                        className="gap-1"
                      >
                        <Download className="h-3 w-3" />
                        GCP
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGov('BRSR')}
                        className="gap-1"
                      >
                        <Download className="h-3 w-3" />
                        BRSR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportGov('CCTS')}
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
                    disabled={isGenerating || isEmpty}
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
              {/* Verified Emissions Certificate (certificatePdf.ts) */}
              <Card className="border-success/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Award className="h-4 w-4 shrink-0 text-success" />
                    <div>
                      <span>Verified Emissions Certificate</span>
                      <p className="text-sm font-normal text-muted-foreground mt-1">
                        Verified by Senseible, expert-supervised
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
                    Download certificate
                  </Button>
                  
                  {!latestVerification?.verification_status && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Complete verification to download the certificate
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
        
        {/* Legal Footer */}
        {/* Enterprise Finance-Grade Export */}
        {isEnterprise && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Finance-Grade Exports
                <Badge variant="outline" className="text-xs ml-auto border-primary/30 text-primary">Enterprise</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3 flex-wrap">
              {emissions.length === 0 && (
                <p className="w-full text-sm text-muted-foreground">Exports list every record with its source document. They open once your first record is saved.</p>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={emissions.length === 0}
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
                disabled={emissions.length === 0}
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
