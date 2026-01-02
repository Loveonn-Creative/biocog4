import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEmissions } from '@/hooks/useEmissions';
import { useDocuments } from '@/hooks/useDocuments';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import senseibleLogo from '@/assets/senseible-logo.png';
import {
  Shield, TrendingUp, Target, Award, FileCheck, AlertCircle,
  CheckCircle, Clock, ArrowRight, Leaf, Zap, Recycle, Sun,
  ChevronRight, BarChart3, Lock, ExternalLink
} from 'lucide-react';

interface VerificationRecord {
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
    creditEligibility?: {
      eligibleCredits: number;
      qualityGrade: string;
      carryForward: number;
    };
    recommendations?: string[];
    scopeBreakdown?: { scope1: number; scope2: number; scope3: number };
  } | null;
}

interface GreenAction {
  id: string;
  type: 'recycling' | 'solar' | 'efficiency' | 'renewable';
  title: string;
  description: string;
  icon: typeof Recycle;
  potentialReduction: number;
  incentiveValue: number;
  eligibleEvenIfNotCompliant: boolean;
}

const MRVDashboard = () => {
  const { sessionId, user } = useSession();
  const { summary, emissions, getVerifiedEmissions } = useEmissions();
  const { documents } = useDocuments();
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const verifiedEmissions = getVerifiedEmissions();

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
        setVerifications(data as unknown as VerificationRecord[]);
      }
    } catch (err) {
      console.error('Error fetching verifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate aggregated scores from historical data
  const aggregatedMetrics = useMemo(() => {
    if (verifications.length === 0) {
      return {
        carbonScore: 0,
        confidenceScore: 0,
        greenScore: 0,
        totalCredits: 0,
        qualityGrade: 'D',
        trend: 'stable' as const,
        improvementRate: 0,
      };
    }

    // Use weighted average based on CO2 volume for more accurate scoring
    let weightedCarbonScore = 0;
    let weightedConfidence = 0;
    let weightedGreenScore = 0;
    let totalWeight = 0;
    let totalCredits = 0;
    let carryForward = 0;

    verifications.forEach(v => {
      const weight = v.total_co2_kg || 1;
      totalWeight += weight;
      
      weightedCarbonScore += ((v.verification_score || 0) * 100) * weight;
      weightedConfidence += (v.verification_status === 'verified' ? 100 : v.verification_status === 'needs_review' ? 60 : 30) * weight;
      weightedGreenScore += (v.ai_analysis?.greenScore || 50) * weight;
      totalCredits += v.ai_analysis?.creditEligibility?.eligibleCredits || 0;
      carryForward += v.ai_analysis?.creditEligibility?.carryForward || 0;
    });

    const carbonScore = totalWeight > 0 ? Math.round(weightedCarbonScore / totalWeight) : 0;
    const confidenceScore = totalWeight > 0 ? Math.round(weightedConfidence / totalWeight) : 0;
    const greenScore = totalWeight > 0 ? Math.round(weightedGreenScore / totalWeight) : 50;

    // Determine quality grade from most recent verification
    const latestGrade = verifications[0]?.ai_analysis?.creditEligibility?.qualityGrade || 'D';

    // Calculate trend (comparing recent vs older verifications)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (verifications.length >= 2) {
      const recentAvg = verifications.slice(0, Math.ceil(verifications.length / 2))
        .reduce((sum, v) => sum + (v.ai_analysis?.greenScore || 50), 0) / Math.ceil(verifications.length / 2);
      const olderAvg = verifications.slice(Math.ceil(verifications.length / 2))
        .reduce((sum, v) => sum + (v.ai_analysis?.greenScore || 50), 0) / (verifications.length - Math.ceil(verifications.length / 2));
      
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }

    return {
      carbonScore,
      confidenceScore,
      greenScore,
      totalCredits: totalCredits + Math.floor(carryForward),
      qualityGrade: latestGrade,
      trend,
      improvementRate: verifications.length >= 2 
        ? Math.round(((verifications[0].ai_analysis?.greenScore || 50) - (verifications[verifications.length - 1].ai_analysis?.greenScore || 50)) / verifications.length)
        : 0,
    };
  }, [verifications]);

  // Get latest verification analysis for recommendations
  const latestAnalysis = verifications[0]?.ai_analysis;
  const latestStatus = verifications[0]?.verification_status;
  const greenwashingRisk = verifications[0]?.greenwashing_risk;

  // Green actions available even for non-compliant users
  const greenActions: GreenAction[] = [
    {
      id: 'recycling',
      type: 'recycling',
      title: 'Certified Recycling',
      description: 'Get recycler certificates for waste materials to earn carbon credits',
      icon: Recycle,
      potentialReduction: summary.total * 0.1,
      incentiveValue: Math.round(summary.total * 0.1 * 0.75), // ₹750/tCO₂e discounted
      eligibleEvenIfNotCompliant: true,
    },
    {
      id: 'solar',
      type: 'solar',
      title: 'Solar Adoption',
      description: 'Install rooftop solar with subsidized rates and REC certificates',
      icon: Sun,
      potentialReduction: summary.scope2 * 0.6,
      incentiveValue: Math.round(summary.scope2 * 0.6 * 0.50), // Discounted incentive
      eligibleEvenIfNotCompliant: true,
    },
    {
      id: 'efficiency',
      type: 'efficiency',
      title: 'Efficiency Upgrades',
      description: 'IoT monitoring and energy-efficient equipment with green loans',
      icon: Zap,
      potentialReduction: summary.total * 0.15,
      incentiveValue: Math.round(summary.total * 0.15 * 0.60),
      eligibleEvenIfNotCompliant: true,
    },
    {
      id: 'renewable',
      type: 'renewable',
      title: 'Renewable Energy PPA',
      description: 'Power Purchase Agreements for wind/solar at lower rates',
      icon: Leaf,
      potentialReduction: summary.scope2 * 0.8,
      incentiveValue: Math.round(summary.scope2 * 0.8 * 0.40),
      eligibleEvenIfNotCompliant: false,
    },
  ];

  const formatNumber = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(2)}t` : `${n.toFixed(1)}kg`;
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(n);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-success';
      case 'B': return 'text-accent';
      case 'C': return 'text-warning';
      default: return 'text-destructive';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === 'declining') return <TrendingUp className="h-4 w-4 text-destructive rotate-180" />;
    return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading MRV data...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background">
      <Helmet>
        <title>MRV Dashboard — Senseible</title>
        <meta name="description" content="Transparent carbon MRV dashboard with progress-based scoring and monetization pathways." />
      </Helmet>
      
      <CarbonParticles />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Overview</Link>
            <Link to="/mrv-dashboard" className="text-foreground font-medium">MRV</Link>
            <Link to="/reports" className="hover:text-foreground transition-colors">Reports</Link>
            <Link to="/monetize" className="hover:text-foreground transition-colors">Monetize</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">MRV Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Transparent measurement, reporting & verification with progress-based rewards
          </p>
        </div>

        {emissions.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No emission data yet. Upload invoices to begin.</p>
              <Button asChild>
                <Link to="/">Upload Invoice</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Carbon Score */}
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Carbon Score</span>
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-3xl font-mono font-bold mb-2">
                    {aggregatedMetrics.carbonScore}<span className="text-lg text-muted-foreground">/100</span>
                  </div>
                  <Progress value={aggregatedMetrics.carbonScore} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on {verifications.length} verification{verifications.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              {/* Confidence Score */}
              <Card className="border-accent/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Confidence Score</span>
                    <CheckCircle className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-3xl font-mono font-bold mb-2">
                    {aggregatedMetrics.confidenceScore}<span className="text-lg text-muted-foreground">%</span>
                  </div>
                  <Progress value={aggregatedMetrics.confidenceScore} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Data quality & validation status
                  </p>
                </CardContent>
              </Card>

              {/* Green Score */}
              <Card className="border-success/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Green Score</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(aggregatedMetrics.trend)}
                      <Leaf className="h-4 w-4 text-success" />
                    </div>
                  </div>
                  <div className="text-3xl font-mono font-bold mb-2 text-gradient-success">
                    {aggregatedMetrics.greenScore}<span className="text-lg text-muted-foreground">/100</span>
                  </div>
                  <Progress value={aggregatedMetrics.greenScore} className="h-2 bg-success/20" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {aggregatedMetrics.trend === 'improving' ? '↑ Improving' : aggregatedMetrics.trend === 'declining' ? '↓ Needs attention' : '→ Stable'}
                  </p>
                </CardContent>
              </Card>

              {/* Quality Grade */}
              <Card className="border-warning/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Quality Grade</span>
                    <Award className="h-4 w-4 text-warning" />
                  </div>
                  <div className={`text-5xl font-mono font-bold ${getGradeColor(aggregatedMetrics.qualityGrade)}`}>
                    {aggregatedMetrics.qualityGrade}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {aggregatedMetrics.totalCredits} credits eligible
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Recommendations */}
              <div className="lg:col-span-2 space-y-6">
                {/* Verification Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Verification Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 mb-4">
                      <div className={`p-3 rounded-full ${
                        latestStatus === 'verified' ? 'bg-success/10' : 
                        latestStatus === 'needs_review' ? 'bg-warning/10' : 'bg-destructive/10'
                      }`}>
                        {latestStatus === 'verified' ? (
                          <CheckCircle className="h-6 w-6 text-success" />
                        ) : latestStatus === 'needs_review' ? (
                          <Clock className="h-6 w-6 text-warning" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold capitalize">
                          {latestStatus?.replace('_', ' ') || 'Not Verified'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Greenwashing Risk: <span className={`font-medium ${
                            greenwashingRisk === 'low' ? 'text-success' : 
                            greenwashingRisk === 'medium' ? 'text-warning' : 'text-destructive'
                          }`}>{greenwashingRisk || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold">{formatNumber(summary.total)}</div>
                        <div className="text-xs text-muted-foreground">Total CO₂e</div>
                      </div>
                    </div>

                    {/* Scope Breakdown */}
                    {latestAnalysis?.scopeBreakdown && (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Scope 1', value: latestAnalysis.scopeBreakdown.scope1, color: 'bg-orange-500' },
                          { label: 'Scope 2', value: latestAnalysis.scopeBreakdown.scope2, color: 'bg-yellow-500' },
                          { label: 'Scope 3', value: latestAnalysis.scopeBreakdown.scope3, color: 'bg-blue-500' },
                        ].map(scope => (
                          <div key={scope.label} className="p-3 rounded-lg bg-muted/50 text-center">
                            <div className="text-xs text-muted-foreground mb-1">{scope.label}</div>
                            <div className="font-mono font-semibold">{formatNumber(scope.value)}</div>
                            <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                              <div 
                                className={`h-full ${scope.color}`} 
                                style={{ width: `${(scope.value / summary.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Compliance Badges */}
                    <div className="flex flex-wrap gap-2">
                      {verifications[0]?.ccts_eligible && (
                        <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> CCTS Eligible
                        </span>
                      )}
                      {verifications[0]?.cbam_compliant && (
                        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> CBAM Compliant
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        BIOCOG_MVR_INDIA v1.0
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Precise Recommendations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-accent" />
                      Data-Driven Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {latestAnalysis?.recommendations && latestAnalysis.recommendations.length > 0 ? (
                      <ul className="space-y-3">
                        {latestAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                            <div className="mt-0.5 p-1 rounded-full bg-accent/10">
                              <ChevronRight className="h-3 w-3 text-accent" />
                            </div>
                            <p className="text-sm flex-1">{rec}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Complete verification to receive personalized recommendations.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Audit Trail */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      Audit Trail & Transparency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {verifications.slice(0, 5).map((v, idx) => (
                        <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              v.verification_status === 'verified' ? 'bg-success' :
                              v.verification_status === 'needs_review' ? 'bg-warning' : 'bg-destructive'
                            }`} />
                            <div>
                              <div className="text-sm font-medium">
                                {formatNumber(v.total_co2_kg)} verified
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(v.created_at).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono">
                              Score: {Math.round((v.verification_score || 0) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Grade {v.ai_analysis?.creditEligibility?.qualityGrade || 'D'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50 text-center">
                      <p className="text-xs text-muted-foreground">
                        All data cryptographically hashed for tamper-proof verification
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Green Actions */}
              <div className="space-y-6">
                {/* Progress Rewards */}
                <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5 text-success" />
                      Progress Rewards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Earn value while improving — no need to be "perfect" to start monetizing.
                    </p>
                    <div className="space-y-3">
                      {greenActions.filter(a => a.eligibleEvenIfNotCompliant || latestStatus === 'verified').map(action => (
                        <div key={action.id} className="p-3 rounded-lg bg-background border border-border/50 hover:border-success/30 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-success/10">
                              <action.icon className="h-4 w-4 text-success" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{action.title}</div>
                              <div className="text-xs text-muted-foreground">{action.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Potential: {formatNumber(action.potentialReduction)} reduction
                            </span>
                            <span className="font-mono text-success font-medium">
                              {formatCurrency(action.incentiveValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4" asChild>
                      <Link to="/monetize">
                        Explore All Options
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-4">Historical Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Documents</span>
                        <span className="font-mono">{documents.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Emission Records</span>
                        <span className="font-mono">{emissions.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Verified Records</span>
                        <span className="font-mono text-success">{verifiedEmissions.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Verifications</span>
                        <span className="font-mono">{verifications.length}</span>
                      </div>
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Credits Eligible</span>
                          <span className="font-mono font-bold text-primary">{aggregatedMetrics.totalCredits}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reports CTA */}
                <Card className="bg-secondary/30">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Generate Reports</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      ESG compliance reports for banks, carbon buyers, and regulators.
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/reports">
                        View Reports
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MRVDashboard;
