import { Link, useNavigate } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmissions } from '@/hooks/useEmissions';
import { 
  Coins, Building2, Gift, ExternalLink, CheckCircle, ArrowRight, 
  Shield, Loader2, Clock, FileCheck, AlertCircle, TrendingUp
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';

interface MonetizationPathway {
  id: string;
  type: string;
  icon: typeof Coins;
  color: string;
  bg: string;
  title: string;
  value: number;
  desc: string;
  partner: string;
  status: 'available' | 'applied' | 'processing' | 'completed';
  requirements: string[];
  timeline: string;
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
  const { summary, getVerifiedEmissions } = useEmissions();
  const verified = getVerifiedEmissions();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingPathway, setApplyingPathway] = useState<string | null>(null);
  const [pathwayStatuses, setPathwayStatuses] = useState<Record<string, string>>({});

  const co2Tons = summary.total / 1000;
  const carbonCreditValue = Math.round(co2Tons * 750); // ₹750 per tCO₂e
  const loanAmount = 500000;
  const greenLoanSavings = Math.round(loanAmount * 0.005); // 0.5% interest reduction
  const govtIncentive = Math.round(carbonCreditValue * 1.5); // ZED certification subsidy

  useEffect(() => {
    fetchVerifications();
    fetchPathwayStatuses();
  }, [sessionId, user?.id]);

  const fetchVerifications = async () => {
    try {
      let query = supabase.from('carbon_verifications').select('*');
      
      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      
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

  const handleApply = async (pathwayType: string, partnerName: string, estimatedValue: number) => {
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
      value: carbonCreditValue, 
      desc: 'Sell verified credits to corporate buyers on voluntary market',
      partner: 'IEX Green Market',
      status: (pathwayStatuses['carbon_credit'] as MonetizationPathway['status']) || 'available',
      requirements: ['Verified emissions data', 'Quality Grade B or above', 'CCTS eligibility'],
      timeline: '2-4 weeks processing'
    },
    { 
      id: 'green_loan',
      type: 'green_loan', 
      icon: Building2, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      title: 'Green Loans', 
      value: greenLoanSavings, 
      desc: '0.5% lower interest rate on business loans',
      partner: 'SBI Green Finance',
      status: (pathwayStatuses['green_loan'] as MonetizationPathway['status']) || 'available',
      requirements: ['Green Score 60+', 'Verified carbon data', 'Business registration'],
      timeline: '1-2 weeks approval'
    },
    { 
      id: 'govt_incentive',
      type: 'govt_incentive', 
      icon: Gift, 
      color: 'text-success', 
      bg: 'bg-success/10', 
      title: 'Govt Incentives', 
      value: govtIncentive, 
      desc: 'ZED certification subsidy + PLI scheme benefits',
      partner: 'MSME Ministry',
      status: (pathwayStatuses['govt_incentive'] as MonetizationPathway['status']) || 'available',
      requirements: ['MSME registration', 'Carbon reporting compliance', 'Verified emissions'],
      timeline: '4-6 weeks processing'
    }
  ];

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(n);

  const totalPotentialValue = pathways.reduce((sum, p) => sum + p.value, 0);

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
      <Helmet><title>Monetize — Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Monetize Your Carbon Data</h1>
          <p className="text-muted-foreground">Turn verified emissions into real climate value</p>
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
                      <span className="text-sm font-medium text-muted-foreground">Total Potential Value</span>
                    </div>
                    <div className="text-4xl font-mono font-bold text-gradient-success">
                      {formatCurrency(totalPotentialValue)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{verified.length} verified emission records</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>{co2Tons.toFixed(2)} tCO₂e total emissions</span>
                    </div>
                    {verifications[0]?.ccts_eligible && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileCheck className="h-4 w-4 text-accent" />
                        <span>CCTS Eligible</span>
                      </div>
                    )}
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
                          <div className="text-2xl font-mono font-bold">{formatCurrency(p.value)}</div>
                          <p className="text-xs text-muted-foreground">Estimated value</p>
                        </div>
                        {p.status === 'available' ? (
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
                          <Button variant="outline" disabled className="min-w-[120px]">
                            {p.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Requirements</p>
                      <div className="flex flex-wrap gap-2">
                        {p.requirements.map((req, ridx) => (
                          <span 
                            key={ridx} 
                            className="px-2 py-1 rounded-md bg-secondary/50 text-xs text-muted-foreground"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Help Section */}
            <Card className="mt-8 bg-secondary/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">How monetization works</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your verified carbon data is matched with buyers, lenders, and government programs. 
                      Each pathway has different requirements and timelines. Applications are processed 
                      through our partner network.
                    </p>
                    <div className="flex gap-3">
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
