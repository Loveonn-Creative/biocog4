import { Link, useNavigate } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmissions } from '@/hooks/useEmissions';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { PremiumBadge, FeatureLock } from '@/components/PremiumBadge';
import { computeCredibilityScore } from '@/lib/credibilityScore';
import { 
  Coins, Building2, Gift, ExternalLink, CheckCircle, ArrowRight, 
  Shield, Loader2, Clock, FileCheck, AlertCircle, TrendingUp, Crown,
  Star, XCircle, Receipt
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useWorkspace } from '@/hooks/useWorkspace';
import { applyScope, scopeKey } from '@/lib/workspaceScope';
import { toast } from 'sonner';
import { indicativeValueFromKg, sumVerifiedKgOncePerEmission } from '@/lib/carbonValue';

import { useRecordsChanged } from '@/lib/recordsEvents';
interface EligibilityCheck {
  label: string;
  pass: boolean;
}

interface MonetizationPathway {
  id: string;
  type: string;
  icon: typeof Coins;
  color: string;
  bg: string;
  title: string;
  /** Only the carbon pathway has a figure (verified tCO2e x ₹750). Others are not estimated. */
  value: number | null;
  valueLabel?: string;
  desc: string;
  partner: string;
  status: 'available' | 'applied' | 'processing' | 'completed';
  requirements: string[];
  timeline: string;
  checks?: EligibilityCheck[];
}

interface Verification {
  id: string;
  total_co2_kg: number;
  verification_score: number | null;
  verification_status: string | null;
  ccts_eligible: boolean | null;
  cbam_compliant: boolean | null;
  ai_analysis: {
    greenScore?: number;
    creditEligibility?: {
      eligibleCredits: number;
      qualityGrade: string;
    };
  };
}

const Monetize = () => {
  const navigate = useNavigate();
  const { sessionId, user } = useSession();
  const { scope, ready: workspaceReady } = useWorkspace();
  const workspaceKey = scopeKey(scope);
  const { summary, getVerifiedEmissions } = useEmissions();
  const { isPremium, canAccessFeature, tier } = usePremiumStatus();
  const { activeContext } = useOrganization();
  const { entries: ledgerEntries, exportComplianceXLSX } = useComplianceLedger();
  const verified = getVerifiedEmissions();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingPathway, setApplyingPathway] = useState<string | null>(null);
  const [pathwayStatuses, setPathwayStatuses] = useState<Record<string, string>>({});

  // Route protection: redirect partners to their dashboard
  useEffect(() => {
    if (activeContext?.context_type === 'partner') {
      toast.info('This feature is for MSMEs. Redirecting to Partner Dashboard.');
      navigate('/partner-dashboard');
    }
  }, [activeContext, navigate]);

  const verifiedEmissions = getVerifiedEmissions();
  // Each verified emission counted once; this is the only input to the value.
  const verifiedTotalKg = sumVerifiedKgOncePerEmission(verifiedEmissions, (e) => e.id, (e) => e.co2_kg);
  const co2Tons = verifiedTotalKg / 1000;
  const indicativeValue = indicativeValueFromKg(verifiedTotalKg);
  // Loan savings, scheme benefits and factoring advances are not estimated:
  // the earlier fixed ₹2,500 loan figure, 1.5x "incentive" and 70% advance
  // were not based on any lender, scheme or the user's data.

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(n);

  // Compute credibility score
  const credibility = computeCredibilityScore(
    verifications.map(v => ({ verification_score: v.verification_score })),
    ledgerEntries.map((e: any) => ({
      is_green_benefit: e.is_green_benefit ?? null,
      vendor: e.vendor ?? null,
      invoice_date: e.invoice_date ?? null,
      amount: e.amount ?? null,
      hsn_code: e.hsn_code ?? null,
    }))
  );

  // Green invoices on the ledger (count only; amounts are not turned into an advance figure).
  const greenInvoiceCount = new Set(
    ledgerEntries
      .filter((e: any) => e.is_green_benefit)
      .map((e: any) => e.document_id || e.document_hash || e.id),
  ).size;

  // Dynamic eligibility
  const qualityGrade = verifications[0]?.ai_analysis?.creditEligibility?.qualityGrade || 'D';

  // Refetch when records change anywhere (verify, delete, upload).
  useRecordsChanged(() => { fetchVerifications(); fetchPathwayStatuses(); });
  useEffect(() => {
    fetchVerifications();
    fetchPathwayStatuses();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- workspaceKey captures scope
  }, [workspaceKey, workspaceReady]);

  const fetchVerifications = async () => {
    if (!workspaceReady) return;
    try {
      let query = supabase.from('carbon_verifications').select('*');
      
      const scoped = applyScope(query, scope);
      if (!scoped) return;
      query = scoped;
      
      const { data, error } = await query.eq('verification_status', 'verified');
      
      if (error) throw error;
      setVerifications((data || []) as unknown as Verification[]);
    } catch (err) {
      console.error('Error fetching verifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPathwayStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('monetization_pathways')
        .select('pathway_type, status');
      
      if (error) throw error;
      
      const statuses: Record<string, string> = {};
      (data || []).forEach(p => {
        statuses[p.pathway_type] = p.status;
      });
      setPathwayStatuses(statuses);
    } catch (err) {
      console.error('Error fetching pathway statuses:', err);
    }
  };

  const handleApply = async (pathwayType: string, partnerName: string, estimatedValue: number | null) => {
    if (!verifications.length) {
      toast.error('Please verify your emissions first');
      navigate('/verify');
      return;
    }

    setApplyingPathway(pathwayType);
    
    try {
      const { data, error } = await supabase
        .from('monetization_pathways')
        .insert({
          verification_id: verifications[0].id,
          pathway_type: pathwayType,
          partner_name: partnerName,
          estimated_value: estimatedValue,
          status: 'applied',
          applied_at: new Date().toISOString(),
          partner_details: {
            applicationDate: new Date().toISOString(),
            applicationType: pathwayType,
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Application submitted to ${partnerName}!`);
      setPathwayStatuses(prev => ({ ...prev, [pathwayType]: 'applied' }));
    } catch (err) {
      console.error('Error applying for pathway:', err);
      toast.error('Application failed. Please try again.');
    } finally {
      setApplyingPathway(null);
    }
  };

  const pathways: MonetizationPathway[] = [
    { 
      id: 'carbon_credit',
      type: 'carbon_credit', 
      icon: Coins, 
      color: 'text-warning', 
      bg: 'bg-warning/10', 
      title: 'Carbon Credits', 
      value: indicativeValue,
      desc: 'Credits must first be issued under a recognised programme.',
      partner: 'IEX Green Market',
      status: (pathwayStatuses['carbon_credit'] as MonetizationPathway['status']) || 'available',
      requirements: ['Verified emissions data', 'Quality Grade B or above', 'Programme registration'],
      timeline: '2-4 weeks processing',
      checks: [
        { label: 'Verified emissions', pass: verifications.length > 0 },
        { label: `Quality Grade B+ (yours: ${qualityGrade})`, pass: ['A', 'B', 'A+'].includes(qualityGrade) },
        { label: 'CCTS eligibility: not assessed', pass: false },
      ],
    },
    { 
      id: 'green_loan',
      type: 'green_loan', 
      icon: Building2, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      title: 'Green Loans', 
      value: null,
      desc: 'Lenders set their own terms for green loans. No saving is estimated here.',
      partner: 'SBI Green Finance',
      status: (pathwayStatuses['green_loan'] as MonetizationPathway['status']) || 'available',
      requirements: ['Verified carbon data', 'Business registration'],
      timeline: '1-2 weeks approval',
      checks: [
        { label: 'Verified carbon data', pass: verifications.length > 0 },
        { label: `Credibility Grade C+ (yours: ${credibility.grade})`, pass: credibility.score >= 35 },
      ],
    },
    { 
      id: 'govt_incentive',
      type: 'govt_incentive', 
      icon: Gift, 
      color: 'text-success', 
      bg: 'bg-success/10', 
      title: 'Govt Incentives', 
      value: null,
      desc: 'Scheme benefits depend on each scheme\'s rules. No benefit is estimated here.',
      partner: 'MSME Ministry',
      status: (pathwayStatuses['govt_incentive'] as MonetizationPathway['status']) || 'available',
      requirements: ['MSME registration', 'Carbon reporting compliance', 'Verified emissions'],
      timeline: '4-6 weeks processing',
      checks: [
        { label: 'Verified emissions', pass: verifications.length > 0 },
        { label: 'Carbon reporting compliance', pass: ledgerEntries.length > 0 },
        { label: `Credibility Score 35+ (yours: ${credibility.score})`, pass: credibility.score >= 35 },
      ],
    },
    {
      id: 'green_factoring',
      type: 'green_factoring',
      icon: Receipt,
      color: 'text-primary',
      bg: 'bg-primary/10',
      title: 'Green Invoice Factoring',
      value: null,
      desc: 'Advance terms are set by the financier. No advance is estimated here.',
      partner: 'Climate Finance Hub',
      status: (pathwayStatuses['green_factoring'] as MonetizationPathway['status']) || 'available',
      requirements: ['Verified green invoices', 'Credibility Score 50+'],
      timeline: '3-5 business days',
      checks: [
        { label: `Verified green invoices (yours: ${greenInvoiceCount})`, pass: greenInvoiceCount > 0 },
        { label: `Credibility Score 50+ (yours: ${credibility.score})`, pass: credibility.score >= 50 },
      ],
    }
  ];


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            <Clock className="h-3 w-3" /> Applied
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
            <Loader2 className="h-3 w-3 animate-spin" /> Processing
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
            <CheckCircle className="h-3 w-3" /> Completed
          </span>
        );
      default:
        return null;
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
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>Monetize | Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2 tracking-tight">Monetize Your Carbon Data</h1>
              <p className="text-muted-foreground">Turn verified emissions into real climate value</p>
            </div>
            {!isPremium && (
              <Button variant="outline" asChild className="gap-2">
                <Link to="/pricing">
                  <Crown className="h-4 w-4 text-warning" />
                  Upgrade to Pro
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        {verified.length === 0 || verifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/10 mb-4">
                <AlertCircle className="h-8 w-8 text-warning" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Verification Required</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Verify your emissions first to unlock monetization pathways and start earning from your carbon data.
              </p>
              <Button onClick={() => navigate('/verify')} size="lg">
                Go to Verification
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Banner */}
            <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-success/5">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">Indicative value</span>
                    </div>
                    <div className="text-4xl font-mono font-bold text-gradient-success">
                      {formatCurrency(indicativeValue)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{verified.length} verified emission records</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>{co2Tons.toFixed(2)} verified tCO₂e</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-warning" />
                      <span>Credibility: <span className="font-mono font-bold">{credibility.grade}</span> ({credibility.score}/100)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pathways */}
            <div className="space-y-4">
              {pathways.map((p, idx) => (
                <Card 
                  key={p.id} 
                  className="hover:border-primary/30 transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Icon & Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-4 rounded-xl ${p.bg} shrink-0`}>
                          <p.icon className={`h-8 w-8 ${p.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold">{p.title}</h3>
                            {!canAccessFeature('carbonMonetization') && <PremiumBadge tier="pro" />}
                            {getStatusBadge(p.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{p.desc}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              via {p.partner}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {p.timeline}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Value & Action */}
                      <div className="flex items-center gap-4 md:flex-col md:items-end">
                        <div className="text-right">
                          {p.value !== null ? (
                            <>
                              <div className="text-2xl font-mono font-bold">{formatCurrency(p.value)}</div>
                              <p className="text-xs text-muted-foreground max-w-[12rem]">{p.valueLabel}</p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not estimated</p>
                          )}
                        </div>
                        {p.status === 'available' ? (
                          canAccessFeature('carbonMonetization') ? (
                            <Button 
                              onClick={() => handleApply(p.type, p.partner, p.value)}
                              disabled={applyingPathway === p.type}
                              className="min-w-[120px]"
                            >
                              {applyingPathway === p.type ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  Apply Now
                                  <ExternalLink className="h-3 w-3 ml-2" />
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button variant="outline" asChild className="min-w-[120px]">
                              <Link to="/pricing">
                                Upgrade to Apply
                              </Link>
                            </Button>
                          )
                        ) : (
                          <Button variant="outline" disabled className="min-w-[120px]">
                            {p.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Requirements with dynamic checks */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Eligibility</p>
                      <div className="flex flex-wrap gap-2">
                        {(p.checks || []).map((check, ridx) => (
                          <span 
                            key={ridx} 
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                              check.pass 
                                ? 'bg-success/10 text-success' 
                                : 'bg-destructive/10 text-destructive'
                            }`}
                          >
                            {check.pass ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            {check.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Audit Trail Export + Help Section */}
            <Card className="mt-8 bg-secondary/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">How monetization works</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your verified carbon data is matched with buyers, lenders, and government programs. 
                      Each pathway has different requirements and timelines. Applications are processed 
                      through our partner network.
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      {ledgerEntries.length > 0 && (
                        <Button variant="default" size="sm" onClick={exportComplianceXLSX} className="gap-2">
                          <FileCheck className="h-4 w-4" />
                          Export Investor-Ready Audit Trail
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/reports">View Reports</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/carbon-credits">Learn More</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Monetize;
