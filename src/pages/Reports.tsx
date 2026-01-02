import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmissions } from '@/hooks/useEmissions';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileBarChart, Download, Award, Loader2, FileSpreadsheet, 
  Building2, Shield, CheckCircle, AlertCircle, Calendar
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import senseibleLogo from '@/assets/senseible-logo.png';

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

const LEGAL_DISCLAIMER = "This report is generated based on data submitted by the user and verified through the BIOCOG MRV India v1.0 methodology. It complies with Indian carbon regulation standards including CPCB guidelines and is intended for informational and compliance purposes only. Senseible does not guarantee the accuracy of user-submitted data.";

const Reports = () => {
  const { summary, emissions } = useEmissions();
  const { user, sessionId } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  const formatNumber = (n: number) => n >= 1000 ? `${(n/1000).toFixed(2)}t` : `${n.toFixed(1)}kg`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const generateESGReport = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = 20;
      
      // Header with branding
      doc.setFillColor(34, 82, 54);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Carbon Accounting Report', margin, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('ESG Compliance & Bank Disclosure Ready', margin, 33);
      
      yPos = 55;
      
      // Report metadata
      doc.setTextColor(100);
      doc.setFontSize(9);
      const reportId = `RPT-${Date.now().toString(36).toUpperCase()}`;
      doc.text(`Report ID: ${reportId}`, pageWidth - margin, 50, { align: 'right' });
      doc.text(`Generated: ${formatDate(new Date().toISOString())}`, pageWidth - margin, 56, { align: 'right' });
      
      // Verification Status Banner
      const status = latestVerification?.verification_status || 'pending';
      const statusColor = status === 'verified' ? [34, 139, 34] : status === 'needs_review' ? [255, 165, 0] : [220, 20, 60];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Verification Status: ${status.toUpperCase().replace('_', ' ')}`, margin + 10, yPos + 10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Quality Grade: ${analysis?.creditEligibility?.qualityGrade || 'D'} | Green Score: ${analysis?.greenScore || 0}/100`, margin + 10, yPos + 18);
      
      yPos += 35;
      
      // Executive Summary Section
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      
      const summaryText = `This report presents the carbon footprint analysis for the reporting period, calculated using the BIOCOG MRV India v1.0 methodology in compliance with GHG Protocol and ISO 14064 standards. Total verified emissions: ${formatNumber(summary.total)} CO₂e.`;
      const splitSummary = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
      doc.text(splitSummary, margin, yPos);
      yPos += splitSummary.length * 5 + 10;
      
      // Emissions Overview
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Emissions Overview', margin, yPos);
      yPos += 12;
      
      // Scope boxes
      const boxWidth = (pageWidth - margin * 2 - 20) / 3;
      const scopes = [
        { label: 'Scope 1 (Direct)', value: summary.scope1, color: [255, 140, 0], desc: 'Fuel combustion' },
        { label: 'Scope 2 (Energy)', value: summary.scope2, color: [65, 105, 225], desc: 'Purchased electricity' },
        { label: 'Scope 3 (Indirect)', value: summary.scope3, color: [75, 192, 192], desc: 'Value chain' }
      ];
      
      scopes.forEach((scope, i) => {
        const x = margin + i * (boxWidth + 10);
        doc.setFillColor(scope.color[0], scope.color[1], scope.color[2]);
        doc.roundedRect(x, yPos, boxWidth, 40, 3, 3, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(scope.label, x + 5, yPos + 10);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(formatNumber(scope.value), x + 5, yPos + 25);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(scope.desc, x + 5, yPos + 34);
      });
      
      yPos += 55;
      
      // Total emissions bar
      doc.setFillColor(34, 82, 54);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Carbon Footprint', margin + 10, yPos + 10);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatNumber(summary.total)} CO₂e`, pageWidth - margin - 10, yPos + 17, { align: 'right' });
      
      yPos += 35;
      
      // Methodology & Compliance Section
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Methodology & Compliance', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      
      const complianceItems = [
        `Methodology: BIOCOG MRV India v1.0`,
        `Emission Factor Version: IND_EF_2025`,
        `Standards: GHG Protocol, ISO 14064`,
        `Data Quality: ${analysis?.dataQuality || 'Under review'}`,
        `CCTS Eligible: ${latestVerification?.ccts_eligible ? 'Yes' : 'No'}`,
        `CBAM Compliant: ${latestVerification?.cbam_compliant ? 'Yes' : 'No'}`,
      ];
      
      complianceItems.forEach(item => {
        doc.text(`• ${item}`, margin + 5, yPos);
        yPos += 6;
      });
      
      yPos += 5;
      
      // Emissions Breakdown Table
      if (emissions.length > 0) {
        doc.setTextColor(0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Emissions Breakdown by Category', margin, yPos);
        yPos += 10;
        
        // Table header
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60);
        doc.text('Category', margin + 5, yPos + 7);
        doc.text('Scope', margin + 70, yPos + 7);
        doc.text('CO₂ Emissions', pageWidth - margin - 5, yPos + 7, { align: 'right' });
        yPos += 12;
        
        // Table rows
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        
        // Group by category
        const categories: Record<string, { scope: number; total: number }> = {};
        emissions.forEach(e => {
          if (!categories[e.category]) {
            categories[e.category] = { scope: e.scope, total: 0 };
          }
          categories[e.category].total += e.co2_kg;
        });
        
        Object.entries(categories)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 10)
          .forEach(([category, data], i) => {
            if (yPos > pageHeight - 40) {
              doc.addPage();
              yPos = 20;
            }
            
            if (i % 2 === 0) {
              doc.setFillColor(250, 250, 250);
              doc.rect(margin, yPos - 4, pageWidth - margin * 2, 10, 'F');
            }
            
            doc.text(category.charAt(0).toUpperCase() + category.slice(1), margin + 5, yPos + 3);
            doc.text(`Scope ${data.scope}`, margin + 70, yPos + 3);
            doc.text(formatNumber(data.total), pageWidth - margin - 5, yPos + 3, { align: 'right' });
            yPos += 10;
          });
      }
      
      // Add new page for recommendations if needed
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos += 15;
      }
      
      // Recommendations Section
      if (analysis?.recommendations && analysis.recommendations.length > 0) {
        doc.setTextColor(0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Improvement Recommendations', margin, yPos);
        yPos += 10;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        
        analysis.recommendations.slice(0, 5).forEach((rec, i) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }
          const splitRec = doc.splitTextToSize(`${i + 1}. ${rec}`, pageWidth - margin * 2 - 10);
          doc.text(splitRec, margin + 5, yPos);
          yPos += splitRec.length * 5 + 3;
        });
      }
      
      // Footer with legal disclaimer
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos = pageHeight - 35;
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      doc.setFontSize(7);
      doc.setTextColor(120);
      const splitDisclaimer = doc.splitTextToSize(LEGAL_DISCLAIMER, pageWidth - margin * 2);
      doc.text(splitDisclaimer, margin, yPos);
      
      // Page number on each page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Senseible Carbon Platform', pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
      
      doc.save(`carbon-esg-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('ESG Report downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const generateExcelReport = async () => {
    setIsGenerating(true);
    
    try {
      // Summary sheet data
      const summaryData = [
        ['Carbon Accounting Report - ESG Compliance'],
        ['Generated:', formatDate(new Date().toISOString())],
        ['Methodology:', 'BIOCOG MRV India v1.0'],
        [''],
        ['EMISSIONS SUMMARY'],
        ['Scope', 'Description', 'CO₂ Emissions (kg)', 'Percentage'],
        ['Scope 1', 'Direct Emissions', summary.scope1, `${((summary.scope1 / summary.total) * 100 || 0).toFixed(1)}%`],
        ['Scope 2', 'Purchased Energy', summary.scope2, `${((summary.scope2 / summary.total) * 100 || 0).toFixed(1)}%`],
        ['Scope 3', 'Value Chain', summary.scope3, `${((summary.scope3 / summary.total) * 100 || 0).toFixed(1)}%`],
        ['TOTAL', '', summary.total, '100%'],
        [''],
        ['VERIFICATION STATUS'],
        ['Status:', latestVerification?.verification_status || 'Pending'],
        ['Quality Grade:', analysis?.creditEligibility?.qualityGrade || 'D'],
        ['Green Score:', `${analysis?.greenScore || 0}/100`],
        ['CCTS Eligible:', latestVerification?.ccts_eligible ? 'Yes' : 'No'],
        ['CBAM Compliant:', latestVerification?.cbam_compliant ? 'Yes' : 'No'],
        [''],
        ['LEGAL DISCLAIMER'],
        [LEGAL_DISCLAIMER],
      ];
      
      // Detailed emissions data
      const emissionsData = [
        ['Category', 'Scope', 'Activity Data', 'Unit', 'Emission Factor', 'CO₂ (kg)', 'Verified', 'Created Date'],
        ...emissions.map(e => [
          e.category,
          `Scope ${e.scope}`,
          e.activity_data || '',
          e.activity_unit || '',
          e.emission_factor || '',
          e.co2_kg,
          e.verified ? 'Yes' : 'No',
          formatDate(e.created_at),
        ]),
      ];
      
      // Verification history data
      const verificationData = [
        ['Verification ID', 'Date', 'Total CO₂ (kg)', 'Status', 'Score', 'Quality Grade', 'Greenwashing Risk'],
        ...verifications.map(v => [
          v.id.substring(0, 8),
          formatDate(v.created_at),
          v.total_co2_kg,
          v.verification_status || 'Pending',
          `${Math.round((v.verification_score || 0) * 100)}%`,
          v.ai_analysis?.creditEligibility?.qualityGrade || 'D',
          v.greenwashing_risk || 'Unknown',
        ]),
      ];
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      
      const wsEmissions = XLSX.utils.aoa_to_sheet(emissionsData);
      XLSX.utils.book_append_sheet(wb, wsEmissions, 'Emissions Detail');
      
      const wsVerifications = XLSX.utils.aoa_to_sheet(verificationData);
      XLSX.utils.book_append_sheet(wb, wsVerifications, 'Verification History');
      
      // Download
      XLSX.writeFile(wb, `carbon-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel report downloaded successfully');
    } catch (error) {
      console.error('Excel generation error:', error);
      toast.error('Failed to generate Excel report');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const generateComplianceCertificate = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
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
      
      // Certificate title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 82, 54);
      doc.text('CARBON COMPLIANCE CERTIFICATE', pageWidth / 2, 45, { align: 'center' });
      
      // Decorative line
      doc.setDrawColor(34, 82, 54);
      doc.setLineWidth(1);
      doc.line(70, 55, pageWidth - 70, 55);
      
      // Certificate text
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text('This is to certify that', pageWidth / 2, 72, { align: 'center' });
      
      // Organization name
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      const orgName = user?.email?.split('@')[0] || 'Organization';
      doc.text(orgName.charAt(0).toUpperCase() + orgName.slice(1), pageWidth / 2, 88, { align: 'center' });
      
      // Certificate body
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text('has successfully documented and verified their carbon emissions', pageWidth / 2, 103, { align: 'center' });
      doc.text('in accordance with Indian environmental compliance standards and regulations.', pageWidth / 2, 112, { align: 'center' });
      
      // Verification details box
      doc.setFillColor(245, 250, 245);
      doc.roundedRect(pageWidth / 2 - 80, 122, 160, 45, 5, 5, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Verified Emissions', pageWidth / 2 - 50, 135, { align: 'center' });
      doc.text('Quality Grade', pageWidth / 2 + 50, 135, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 82, 54);
      doc.text(`${formatNumber(summary.total)} CO₂e`, pageWidth / 2 - 50, 150, { align: 'center' });
      doc.text(analysis?.creditEligibility?.qualityGrade || 'D', pageWidth / 2 + 50, 150, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Green Score: ' + (analysis?.greenScore || 0) + '/100', pageWidth / 2, 162, { align: 'center' });
      
      // Compliance badges
      let badgeX = pageWidth / 2 - 60;
      const badges = [];
      if (latestVerification?.ccts_eligible) badges.push('CCTS Eligible');
      if (latestVerification?.cbam_compliant) badges.push('CBAM Compliant');
      badges.push('GHG Protocol');
      
      doc.setFontSize(8);
      badges.forEach(badge => {
        const textWidth = doc.getTextWidth(badge) + 10;
        doc.setFillColor(34, 82, 54);
        doc.roundedRect(badgeX, 172, textWidth, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(badge, badgeX + 5, 180);
        badgeX += textWidth + 5;
      });
      
      // Signature line
      doc.setDrawColor(150);
      doc.line(pageWidth / 2 - 50, pageHeight - 50, pageWidth / 2 + 50, pageHeight - 50);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Authorized Signature', pageWidth / 2, pageHeight - 43, { align: 'center' });
      
      // Certificate ID and date
      const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Certificate ID: ${certId}`, pageWidth / 2, pageHeight - 28, { align: 'center' });
      doc.text(`Issued: ${formatDate(new Date().toISOString())} | Methodology: BIOCOG MRV India v1.0`, pageWidth / 2, pageHeight - 22, { align: 'center' });
      
      // Footer disclaimer
      doc.setFontSize(6);
      doc.text('Powered by Senseible Carbon Platform | Compliant with Indian carbon regulation standards', pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      doc.save(`compliance-certificate-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Certificate generation error:', error);
      toast.error('Failed to generate certificate');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background">
      <Helmet><title>Reports — Senseible</title></Helmet>
      <CarbonParticles />
      
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link to="/mrv-dashboard" className="hover:text-foreground transition-colors">MRV</Link>
            <Link to="/reports" className="text-foreground font-medium">Reports</Link>
            <Link to="/monetize" className="hover:text-foreground transition-colors">Monetize</Link>
          </nav>
        </div>
      </header>
      
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
                  
                  <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-secondary/50">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      Compliant with CPCB guidelines, GHG Protocol & ISO 14064
                    </span>
                  </div>
                  
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
