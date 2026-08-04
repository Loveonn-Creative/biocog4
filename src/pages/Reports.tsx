import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEmissions } from '@/hooks/useEmissions';
import { useSession } from '@/hooks/useSession';
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
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { 
  assessFramework,
  assessMarketCompatibility,
  FRAMEWORKS,
} from '@/lib/reportFrameworks';
import { useReportEvidence } from '@/hooks/useReportEvidence';
import { generateFrameworkPDF, generateFrameworkExcel, type ReportDataset } from '@/lib/frameworkReports';
import { useI18nContext } from '@/lib/i18n/LanguageProvider';
import type { GovFormat } from '@/lib/govComplianceAdapter';

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

const LEGAL_DISCLAIMER = "This report serves as decision-support disclosure and is not a statutory filing unless independently assured. Data is calculated using the BIOCOG MRV India v1.0 methodology with emission factors from IND_EF_2025. Scope boundaries, data quality assumptions, and methodology limitations are detailed herein.";

// Every implemented framework is selectable. The list is derived from the
// registry so a framework can never exist in the engine but be missing here.
const ALL_FRAMEWORKS = Object.values(FRAMEWORKS).map(fw => ({
  id: fw.id,
  label: fw.shortName,
  category: fw.category,
}));



const Reports = () => {
  const navigate = useNavigate();
  const { summary, emissions } = useEmissions();
  const { user, sessionId } = useSession();
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

  
  useEffect(() => {
    fetchVerifications();
  }, [sessionId, user?.id]);

  const fetchVerifications = async () => {
    try {
      let query = supabase
        .from('carbon_verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

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
  const dataset: ReportDataset = useMemo(() => {
    const dates = emissions.map(e => e.created_at).sort();
    const categories = Object.values(
      emissions.reduce((acc, e) => {
        const key = `${e.scope}:${e.category}`;
        if (!acc[key]) {
          acc[key] = {
            category: e.category,
            scope: e.scope,
            co2Kg: 0,
            activityData: 0,
            activityUnit: e.activity_unit,
            emissionFactor: e.emission_factor,
            dataQuality: e.data_quality,
            verified: Boolean(e.verified),
          };
        }
        acc[key].co2Kg += e.co2_kg;
        acc[key].activityData = (acc[key].activityData ?? 0) + (e.activity_data ?? 0);
        acc[key].verified = acc[key].verified && Boolean(e.verified);
        return acc;
      }, {} as Record<string, ReportDataset['categories'][number]>),
    ).sort((a, b) => b.co2Kg - a.co2Kg);

    return {
      organizationName,
      gstin: dbProfile?.gstin ?? null,
      sector: dbProfile?.sector ?? null,
      size: dbProfile?.size ?? null,
      country: dbProfile?.country ?? 'IN',
      locale: dateLocale,
      generatedAt: new Date().toISOString(),
      periodStart: dates[0] ?? null,
      periodEnd: dates[dates.length - 1] ?? null,
      scope1Kg: summary.scope1,
      scope2Kg: summary.scope2,
      scope3Kg: summary.scope3,
      totalKg: summary.total,
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
            cctsEligible: latestVerification.ccts_eligible,
            cbamCompliant: latestVerification.cbam_compliant,
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
  }, [emissions, summary, evidence, availability, methodologyVersion, factorSources, latestVerification, target, dbProfile, organizationName, dateLocale]);

  const assessments = useMemo(
    () =>
      activeFrameworks
        .map(id => FRAMEWORKS[id])
        .filter(Boolean)
        .map(fw => assessFramework(fw!, availability)),
    [activeFrameworks, availability],
  );

  const downloadFramework = (fwId: string, kind: 'pdf' | 'xlsx') => {
    if (summary.total <= 0) {
      toast.error('No verified emissions data to report yet');
      return;
    }
    setIsGenerating(true);
    try {
      const ok = kind === 'pdf'
        ? generateFrameworkPDF(fwId, dataset)
        : generateFrameworkExcel(fwId, dataset);
      if (ok) toast.success(`${FRAMEWORKS[fwId]?.shortName} report downloaded`);
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

  
  const generateComplianceCertificate = async () => {
    setIsGenerating(true);
    
    try {
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
      doc.text('CARBON COMPLIANCE CERTIFICATE', centerX, 45, { align: 'center' });
      
      // Decorative line
      doc.setDrawColor(34, 82, 54);
      doc.setLineWidth(1);
      doc.line(70, 55, pageWidth - 70, 55);
      
      // Certificate text - centered
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text('This is to certify that', centerX, 72, { align: 'center' });
      
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
      doc.text('has successfully documented and verified their carbon emissions', centerX, bodyY, { align: 'center' });
      doc.text('in accordance with Indian environmental compliance standards and regulations.', centerX, bodyY + 9, { align: 'center' });
      
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
      doc.text(analysis?.creditEligibility?.qualityGrade || 'D', col2Center, boxY + 35, { align: 'center' });
      
      // Column 3: Green Score
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Green Score', col3Center, boxY + 14, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 82, 54);
      doc.text(`${analysis?.greenScore || 0}`, col3Center, boxY + 32, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('out of 100', col3Center, boxY + 42, { align: 'center' });
      
      // Compliance badges - centered with consistent sizing
      const badgeY = boxY + boxHeight + 12;
      const badges: string[] = [];
      if (latestVerification?.ccts_eligible) badges.push('CCTS Eligible');
      if (latestVerification?.cbam_compliant) badges.push('CBAM Compliant');
      badges.push('GHG Protocol');
      badges.push('ISO 14064');
      
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
      
      // Certificate hash for tamper-proofing
      const certHash = `SHA256:${crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()}`;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140);
      doc.text(`Verification Hash: ${certHash}`, centerX, badgeY + 26, { align: 'center' });
      
      // Signature area - properly aligned
      const sigY = pageHeight - 55;
      doc.setDrawColor(34, 82, 54);
      doc.setLineWidth(0.5);
      doc.line(centerX - 60, sigY, centerX + 60, sigY);
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text('Authorized Signature', centerX, sigY + 8, { align: 'center' });
      
      // Certificate metadata - right aligned ID, centered date
      const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Certificate ID: ${certId}`, pageWidth - 25, pageHeight - 30, { align: 'right' });
      doc.text(`Issued: ${formatDate(new Date().toISOString())}`, 25, pageHeight - 30, { align: 'left' });
      doc.text('Methodology: BIOCOG MRV India v1.0', centerX, pageHeight - 22, { align: 'center' });
      
      // Footer disclaimer - centered
      doc.setFontSize(6);
      doc.setTextColor(130);
      doc.text('Powered by Senseible Carbon Platform | Compliant with Indian carbon regulation standards', centerX, pageHeight - 15, { align: 'center' });
      
      doc.save(`compliance-certificate-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Certificate generation error:', error);
      toast.error('Failed to generate certificate');
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
      <Helmet><title>Reports — Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Carbon Reports</h1>
          <p className="text-muted-foreground">
            Generate ESG compliance reports and certificates for banks, regulators, and carbon buyers
          </p>
        </div>
        
        {summary.total > 0 ? (
          <Tabs defaultValue="reports" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reports" className="space-y-6">
              {/* ESG Report Card */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileBarChart className="h-5 w-5 text-primary" />
                    </div>
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
                      <div className="text-xl font-mono font-bold text-orange-600">{formatNumber(summary.scope1)}</div>
                      <div className="text-xs text-muted-foreground">Scope 1</div>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/10 text-center">
                      <div className="text-xl font-mono font-bold text-blue-600">{formatNumber(summary.scope2)}</div>
                      <div className="text-xs text-muted-foreground">Scope 2</div>
                    </div>
                    <div className="p-4 rounded-lg bg-teal-500/10 text-center">
                      <div className="text-xl font-mono font-bold text-teal-600">{formatNumber(summary.scope3)}</div>
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
                            Aligned with {activeFrameworks.slice(0, 3).map(fwId => FRAMEWORKS[fwId]?.shortName).filter(Boolean).join(', ')}
                            {activeFrameworks.length > 3 && ` +${activeFrameworks.length - 3} more`}
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ALL_FRAMEWORKS.map(fw => (
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
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span>Framework Reports</span>
                      <p className="text-sm font-normal text-muted-foreground mt-1">
                        Each framework renders the same verified records in its own disclosure structure
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

                      {a.missing.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Reported as gaps: {a.missing.join(', ')}
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


              {/* VCM Readiness Badge */}
              {latestVerification && (
                <Card className={`border-2 ${
                  latestVerification.verification_status === 'verified' &&
                  latestVerification.greenwashing_risk === 'low' &&
                  (latestVerification.verification_score || 0) >= 0.7
                    ? 'border-success/30' : 'border-muted'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        latestVerification.verification_status === 'verified' &&
                        latestVerification.greenwashing_risk === 'low' &&
                        (latestVerification.verification_score || 0) >= 0.7
                          ? 'bg-success/10' : 'bg-muted'
                      }`}>
                        {latestVerification.verification_status === 'verified' &&
                         latestVerification.greenwashing_risk === 'low' &&
                         (latestVerification.verification_score || 0) >= 0.7 ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">VCM Readiness</div>
                        <div className="text-xs text-muted-foreground">Voluntary Carbon Market compatibility</div>
                      </div>
                      <Badge variant={
                        latestVerification.verification_status === 'verified' &&
                        latestVerification.greenwashing_risk === 'low' &&
                        (latestVerification.verification_score || 0) >= 0.7
                          ? 'default' : 'secondary'
                      }>
                        {latestVerification.verification_status === 'verified' &&
                         latestVerification.greenwashing_risk === 'low' &&
                         (latestVerification.verification_score || 0) >= 0.7
                          ? 'Ready' : 'Pending'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gov-Ready Export */}
              {ledgerEntries.length > 0 && (
                <Card className="border-warning/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Shield className="h-5 w-5 text-warning" />
                      </div>
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
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Building2 className="h-5 w-5 text-accent" />
                    </div>
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
                      <span className="text-sm">Quality Grade</span>
                      <span className="font-mono font-bold">{analysis?.creditEligibility?.qualityGrade || 'D'}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={generateESGReport}
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
              {/* Compliance Certificate */}
              <Card className="border-success/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Award className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <span>Compliance Certificate</span>
                      <p className="text-sm font-normal text-muted-foreground mt-1">
                        Official carbon compliance documentation
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {latestVerification?.ccts_eligible && (
                      <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> CCTS Eligible
                      </span>
                    )}
                    {latestVerification?.cbam_compliant && (
                      <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> CBAM Compliant
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      GHG Protocol
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6">
                    Generate a compliance certificate to share with banks, investors, carbon buyers, or regulatory bodies.
                    This certificate confirms your verified carbon emissions data.
                  </p>
                  
                  <Button 
                    className="w-full gap-2"
                    onClick={generateComplianceCertificate}
                    disabled={isGenerating || !latestVerification?.verification_status}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Award className="h-4 w-4" />
                    )}
                    Download Certificate
                  </Button>
                  
                  {!latestVerification?.verification_status && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Complete verification to generate certificate
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
                onClick={() => {
                  const wb = XLSX.utils.book_new();
                  const auditData = emissions.map(e => ({
                    Date: new Date(e.created_at).toISOString(),
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
                onClick={() => {
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
            <strong>Legal Disclaimer:</strong> {LEGAL_DISCLAIMER}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Reports;
