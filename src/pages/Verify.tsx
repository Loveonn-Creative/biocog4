import { Link, useNavigate } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEmissions } from '@/hooks/useEmissions';
import { 
  CheckCircle, AlertTriangle, Shield, ArrowRight, Loader2, 
  AlertCircle, TrendingUp, Leaf, Award, XCircle, Info
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';
import senseibleLogo from '@/assets/senseible-logo.png';
import { Helmet } from 'react-helmet-async';

interface VerificationResult {
  verificationId: string;
  status: 'verified' | 'needs_review' | 'rejected';
  score: number;
  greenwashingRisk: 'low' | 'medium' | 'high';
  analysis: {
    dataQuality: string;
    methodologyCompliance: string;
    recommendations: string[];
    flags: string[];
    scopeBreakdown: { scope1: number; scope2: number; scope3: number };
    greenScore: number;
    creditEligibility: {
      eligibleCredits: number;
      carryForward: number;
      qualityGrade: string;
    };
  };
  cctsEligible: boolean;
  cbamCompliant: boolean;
  totalCO2Kg: number;
  netEmissions: number;
  verifiedReductions: number;
}

const Verify = () => {
  const navigate = useNavigate();
  const { sessionId, user } = useSession();
  const { emissions, getUnverifiedEmissions, refetch } = useEmissions();
  const [isVerifying, setIsVerifying] = useState(false);
  const [includeIoT, setIncludeIoT] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const unverified = getUnverifiedEmissions();

  const handleVerify = async () => {
    if (unverified.length === 0) return;
    setIsVerifying(true);
    setVerificationResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-carbon', {
        body: { 
          emissionIds: unverified.map(e => e.id), 
          sessionId, 
          userId: user?.id,
          includeIoT 
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setVerificationResult(data.data);
        toast.success(`Verification complete! Score: ${(data.data.score * 100).toFixed(0)}%`);
        refetch();
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-success';
      case 'needs_review': return 'text-warning';
      case 'rejected': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-6 w-6" />;
      case 'needs_review': return <AlertCircle className="h-6 w-6" />;
      case 'rejected': return <XCircle className="h-6 w-6" />;
      default: return <Info className="h-6 w-6" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-success/10 text-success border-success/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background">
      <Helmet><title>Verify Emissions — Senseible</title></Helmet>
      <CarbonParticles />
      
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link to="/verify" className="text-foreground font-medium">Verify</Link>
            <Link to="/monetize" className="hover:text-foreground transition-colors">Monetize</Link>
          </nav>
        </div>
      </header>
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Carbon Verification</h1>
          <p className="text-muted-foreground">AI-powered MRV to ensure accuracy and prevent greenwashing</p>
        </div>
        
        {/* Verification Input Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              Emissions to Verify
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-4">
                {unverified.length} records pending verification using BIOCOG_MVR_INDIA_v1.0 methodology
              </p>
              
              {/* IoT Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 mb-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="iot-toggle" className="font-medium">Include IoT & Tech Efficiency</Label>
                    <p className="text-xs text-muted-foreground">Apply efficiency gains from smart monitoring</p>
                  </div>
                </div>
                <Switch 
                  id="iot-toggle" 
                  checked={includeIoT} 
                  onCheckedChange={setIncludeIoT}
                />
              </div>
            </div>
            
            {unverified.length > 0 ? (
              <>
                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                  {unverified.map((e, idx) => (
                    <div 
                      key={e.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 animate-fade-in"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <div>
                          <span className="capitalize font-medium">{e.category}</span>
                          <span className="text-xs text-muted-foreground ml-2">Scope {e.scope}</span>
                        </div>
                      </div>
                      <span className="font-mono font-medium">{e.co2_kg.toFixed(1)} kg</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  className="w-full glow-primary" 
                  onClick={handleVerify} 
                  disabled={isVerifying}
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      Verify All Emissions
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            ) : emissions.length > 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4 animate-verify-pulse">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <p className="font-medium text-lg mb-2">All emissions verified!</p>
                <p className="text-sm text-muted-foreground mb-4">Your carbon data is ready for monetization</p>
                <Button onClick={() => navigate('/monetize')} size="lg">
                  Proceed to Monetize
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No emissions data yet</p>
                <Button variant="outline" onClick={() => navigate('/')}>Upload Invoice</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Result Card */}
        {verificationResult && (
          <div className="space-y-4 animate-reveal">
            {/* Status Banner */}
            <Card className={`border-2 ${
              verificationResult.status === 'verified' ? 'border-success/50' : 
              verificationResult.status === 'needs_review' ? 'border-warning/50' : 
              'border-destructive/50'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      verificationResult.status === 'verified' ? 'bg-success/10' : 
                      verificationResult.status === 'needs_review' ? 'bg-warning/10' : 
                      'bg-destructive/10'
                    }`}>
                      <span className={getStatusColor(verificationResult.status)}>
                        {getStatusIcon(verificationResult.status)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold capitalize">{verificationResult.status.replace('_', ' ')}</h3>
                      <p className="text-sm text-muted-foreground">Verification Score: {(verificationResult.score * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full border font-medium ${getRiskColor(verificationResult.greenwashingRisk)}`}>
                    {verificationResult.greenwashingRisk.toUpperCase()} Greenwashing Risk
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Total Emissions</p>
                    <p className="text-xl font-mono font-bold">{verificationResult.totalCO2Kg.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">kg CO₂e</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Net Emissions</p>
                    <p className="text-xl font-mono font-bold">{verificationResult.netEmissions.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">kg CO₂e</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10">
                    <p className="text-xs text-muted-foreground mb-1">Green Score</p>
                    <p className="text-xl font-mono font-bold text-success">{verificationResult.analysis.greenScore}</p>
                    <p className="text-xs text-muted-foreground">/100</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Credit Quality</p>
                    <p className="text-xl font-mono font-bold text-primary">{verificationResult.analysis.creditEligibility.qualityGrade}</p>
                    <p className="text-xs text-muted-foreground">Grade</p>
                  </div>
                </div>

                {/* Scope Breakdown */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3">Scope Breakdown</h4>
                  <div className="flex gap-2 h-4 rounded-full overflow-hidden bg-secondary">
                    {verificationResult.analysis.scopeBreakdown.scope1 > 0 && (
                      <div 
                        className="bg-destructive/70 h-full" 
                        style={{ width: `${(verificationResult.analysis.scopeBreakdown.scope1 / verificationResult.totalCO2Kg) * 100}%` }}
                        title={`Scope 1: ${verificationResult.analysis.scopeBreakdown.scope1.toFixed(1)} kg`}
                      />
                    )}
                    {verificationResult.analysis.scopeBreakdown.scope2 > 0 && (
                      <div 
                        className="bg-warning h-full" 
                        style={{ width: `${(verificationResult.analysis.scopeBreakdown.scope2 / verificationResult.totalCO2Kg) * 100}%` }}
                        title={`Scope 2: ${verificationResult.analysis.scopeBreakdown.scope2.toFixed(1)} kg`}
                      />
                    )}
                    {verificationResult.analysis.scopeBreakdown.scope3 > 0 && (
                      <div 
                        className="bg-accent h-full" 
                        style={{ width: `${(verificationResult.analysis.scopeBreakdown.scope3 / verificationResult.totalCO2Kg) * 100}%` }}
                        title={`Scope 3: ${verificationResult.analysis.scopeBreakdown.scope3.toFixed(1)} kg`}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-destructive/70" /> Scope 1: {verificationResult.analysis.scopeBreakdown.scope1.toFixed(1)} kg
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-warning" /> Scope 2: {verificationResult.analysis.scopeBreakdown.scope2.toFixed(1)} kg
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-accent" /> Scope 3: {verificationResult.analysis.scopeBreakdown.scope3.toFixed(1)} kg
                    </span>
                  </div>
                </div>

                {/* Compliance Badges */}
                <div className="flex gap-3 mb-6">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    verificationResult.cctsEligible ? 'bg-success/10 border-success/30 text-success' : 'bg-muted border-border text-muted-foreground'
                  }`}>
                    <Award className="h-4 w-4" />
                    <span className="text-sm font-medium">CCTS Eligible</span>
                    {verificationResult.cctsEligible ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    verificationResult.cbamCompliant ? 'bg-success/10 border-success/30 text-success' : 'bg-muted border-border text-muted-foreground'
                  }`}>
                    <Leaf className="h-4 w-4" />
                    <span className="text-sm font-medium">CBAM Compliant</span>
                    {verificationResult.cbamCompliant ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                </div>

                {/* Credit Eligibility */}
                {verificationResult.analysis.creditEligibility.eligibleCredits > 0 && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Carbon Credit Eligibility</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-mono font-bold text-primary">
                          {verificationResult.analysis.creditEligibility.eligibleCredits}
                        </p>
                        <p className="text-sm text-muted-foreground">Credits Issuable (tCO₂e)</p>
                      </div>
                      <div>
                        <p className="text-lg font-mono">
                          {verificationResult.analysis.creditEligibility.carryForward.toFixed(3)}
                        </p>
                        <p className="text-sm text-muted-foreground">Carry Forward (tCO₂e)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flags */}
                {verificationResult.analysis.flags.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Validation Flags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {verificationResult.analysis.flags.map((flag, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {verificationResult.analysis.recommendations.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
                    <ul className="space-y-2">
                      {verificationResult.analysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                {verificationResult.status === 'verified' && (
                  <Button 
                    className="w-full glow-success" 
                    size="lg" 
                    onClick={() => navigate('/monetize')}
                  >
                    Proceed to Monetization
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Verify;
