import { useNavigate, useLocation } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmissions } from '@/hooks/useEmissions';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  CheckCircle, AlertTriangle, Shield, ArrowRight, Loader2, 
  AlertCircle, TrendingUp, Leaf, Award, XCircle, Info,
  Coins, FileBarChart, BarChart3, Upload
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { verifyListState } from '@/lib/emissionLedger';
import { indicativeValueFromKg } from '@/lib/carbonValue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';
import { Helmet } from 'react-helmet-async';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { EnterpriseVerificationBadge } from '@/components/enterprise/EnterpriseVerificationBadge';
import { ProofGraph } from '@/components/trust/ProofGraph';
import { PeerBenchmark } from '@/components/trust/PeerBenchmark';
import { DisputeSimulation } from '@/components/trust/DisputeSimulation';
import { DataConnectors } from '@/components/trust/DataConnectors';
import { GreenwashingExplainer } from '@/components/trust/GreenwashingExplainer';
import { useTrustLayerSettings } from '@/hooks/useTrustLayerSettings';
import { chunk, groupByInvoice, planBulk } from '@/lib/bulkVerify';
import { emitRecordsChanged } from '@/lib/recordsEvents';
import { getFunctionErrorMessage } from '@/hooks/useOrganization';

interface NavigationState {
  emissionId?: string;
  documentId?: string;
  extractedData?: unknown;
  fromUpload?: boolean;
}

interface VerificationResult {
  verificationId: string;
  status: 'verified' | 'needs_review' | 'rejected';
  score: number;
  greenwashingRisk: 'low' | 'medium' | 'high';
  greenwashingFactors?: string[];
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

interface MissingInput {
  emissionId: string;
  fields: string[];
}

interface BatchRow {
  id: string;
  category: string;
  scope: number;
}

/** Outcome per invoice in a bulk run. */
interface InvoiceOutcome {
  key: string;
  emissionIds: string[];
  status: 'verified' | 'needs_review' | 'rejected' | 'needs_inputs' | 'error';
  score?: number;
  totalCO2Kg?: number;
  message?: string;
}

const Verify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as NavigationState | null;
  const { sessionId, user } = useSession();
  const { activeContext } = useOrganization();
  const { emissions, refetch, isLoading: emissionsLoading } = useEmissions();
  const { isEnterprise } = useEnterpriseMode();
  const [isVerifying, setIsVerifying] = useState(false);
  const [includeIoT, setIncludeIoT] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [missingInputs, setMissingInputs] = useState<MissingInput[] | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // Rows sent in the last verify call, so result panels still have context
  // after the list refetches and those rows are no longer pending.
  const [lastBatch, setLastBatch] = useState<BatchRow[]>([]);
  const [outcomes, setOutcomes] = useState<InvoiceOutcome[] | null>(null);
  const [refetchAttempts, setRefetchAttempts] = useState(0);
  const { isEnabled } = useTrustLayerSettings();

  const documentId = navState?.documentId || null;
  const expectsNewRows = Boolean(navState?.fromUpload || navState?.emissionId || documentId);

  // Only stored rows are shown. When navigation names a document, scope to it.
  const { scoped, pending, allVerified } = useMemo(
    () => verifyListState(emissions, documentId),
    [emissions, documentId],
  );

  // Just after upload, the stored rows may not be readable yet. Refetch a few
  // times instead of showing a placeholder row that does not exist.
  const awaitingRows = expectsNewRows && !emissionsLoading && scoped.length === 0;
  useEffect(() => {
    if (!awaitingRows || refetchAttempts >= 3) return;
    const t = setTimeout(() => {
      setRefetchAttempts((n) => n + 1);
      void refetch();
    }, 2000);
    return () => clearTimeout(t);
  }, [awaitingRows, refetchAttempts, refetch]);

  const indicativeValue = verificationResult?.status === 'verified'
    ? indicativeValueFromKg(verificationResult.totalCO2Kg)
    : 0;

  useEffect(() => {
    if (activeContext?.context_type === 'partner') {
      toast.info('This feature is for MSMEs. Redirecting to Partner Dashboard.');
      navigate('/partner-dashboard');
    }
  }, [activeContext, navigate]);

  // Bulk verification, per invoice: one preflight lists every missing input,
  // then each invoice whose lines all have evidence is verified on its own.
  // Invoices with gaps are listed and left untouched. Re-running sends the
  // same id set per invoice, so the verifier replays the same result.
  const handleVerify = async () => {
    if (pending.length === 0) return;
    setIsVerifying(true);
    setVerificationResult(null);
    setMissingInputs(null);
    setVerifyError(null);
    setOutcomes(null);
    setLastBatch(pending.map(e => ({ id: e.id, category: e.category, scope: e.scope })));

    try {
      const missing: MissingInput[] = [];
      for (const ids of chunk(pending.map(e => e.id))) {
        const { data, error } = await supabase.functions.invoke('verify-carbon', {
          body: { emissionIds: ids, sessionId, userId: user?.id, inspectOnly: true },
        });
        if (error) throw new Error(await getFunctionErrorMessage(error, 'The evidence check could not run.'));
        if (Array.isArray(data?.missingInputs)) missing.push(...data.missingInputs);
      }

      const plan = planBulk(groupByInvoice(pending), missing);
      const results: InvoiceOutcome[] = plan.blocked.map(g => ({ key: g.key, emissionIds: g.emissionIds, status: 'needs_inputs' as const }));
      let single: VerificationResult | null = null;

      for (const g of plan.ready) {
        for (const ids of chunk(g.emissionIds)) {
          const { data, error } = await supabase.functions.invoke('verify-carbon', {
            body: { emissionIds: ids, sessionId, userId: user?.id },
          });
          if (error) {
            results.push({ key: g.key, emissionIds: ids, status: 'error', message: await getFunctionErrorMessage(error, 'Verification could not complete.') });
          } else if (data?.ready === false) {
            if (Array.isArray(data.missingInputs)) missing.push(...data.missingInputs);
            results.push({ key: g.key, emissionIds: ids, status: 'needs_inputs' });
          } else if (data?.success && data?.data) {
            single = data.data as VerificationResult;
            results.push({ key: g.key, emissionIds: ids, status: single.status, score: single.score, totalCO2Kg: single.totalCO2Kg });
          } else {
            results.push({ key: g.key, emissionIds: ids, status: 'error', message: data?.error || 'Verification returned no outcome.' });
          }
        }
      }

      setOutcomes(results);
      const gaps = missing.filter(m => m.fields.length);
      if (gaps.length) setMissingInputs(gaps);
      // One invoice: keep the detailed result card as before.
      if (results.length === 1 && single) setVerificationResult(single);

      const verified = results.filter(r => r.status === 'verified').length;
      const blocked = results.filter(r => r.status === 'needs_inputs').length;
      const failed = results.filter(r => r.status === 'error').length;
      if (results.some(r => r.status !== 'needs_inputs' && r.status !== 'error')) emitRecordsChanged('verify');
      await refetch();
      if (failed) toast.error(`${failed} invoice${failed === 1 ? '' : 's'} could not be verified. See below.`);
      else if (blocked && !verified) toast.info('Nothing verified yet: every invoice needs more inputs.');
      else toast.success(`${verified} invoice${verified === 1 ? '' : 's'} verified${blocked ? `, ${blocked} need${blocked === 1 ? 's' : ''} inputs` : ''}.`);
    } catch (err) {
      console.error('Verification error:', err);
      setVerifyError(err instanceof Error ? err.message : 'Verification could not complete');
      toast.error('Verification could not complete. See details below.');
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

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>Verify Emissions | Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />
      
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Carbon Verification</h1>
          <p className="text-muted-foreground">AI-powered MRV to ensure accuracy and prevent greenwashing</p>
        </div>
        
        {isEnterprise && <EnterpriseVerificationBadge />}

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
                {pending.length} {pending.length === 1 ? 'record' : 'records'} pending verification using BIOCOG_MVR_INDIA_v1.0 methodology
              </p>
              {documentId && (
                <div className="flex items-center justify-between gap-2 mb-4 p-2 rounded-lg bg-secondary/30 text-sm">
                  <span className="text-muted-foreground">Showing records for one invoice</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/verify', { replace: true, state: null })}>
                    Show all records
                  </Button>
                </div>
              )}
              
              {/* Innovation 9: Data Connectors (opt-in) */}
              {isEnabled('data_connectors') && (
                <DataConnectors includeIoT={includeIoT} onIoTChange={setIncludeIoT} />
              )}
            </div>
            
            {emissionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading stored records...
              </div>
            ) : pending.length > 0 ? (
              <>
                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                  {pending.map((e, idx) => (
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
                      {documentId ? 'Verify This Invoice' : 'Verify All Emissions'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            ) : allVerified ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4 animate-verify-pulse">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <p className="font-medium text-lg mb-2">
                  {documentId ? 'All records for this invoice are verified' : 'All emissions verified'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">Verified records are listed in History and the audit ledger</p>
                <Button onClick={() => navigate('/monetize')} size="lg">
                  Proceed to Monetize
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : expectsNewRows && scoped.length === 0 ? (
              <div className="text-center py-8">
                {refetchAttempts < 3 ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">Waiting for the stored emission records for this invoice...</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium mb-2">No stored emission records for this invoice yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      It may still be processing, or no line item had the quantity and unit needed to calculate emissions. Check History for its status.
                    </p>
                  </>
                )}
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => { setRefetchAttempts(0); void refetch(); }}>Refresh</Button>
                  <Button variant="ghost" onClick={() => navigate('/history')}>Open History</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No emissions data yet</p>
                <Button variant="outline" onClick={() => navigate('/')}>Upload Invoice</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk run: one line per invoice */}
        {outcomes && outcomes.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Verification by invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {outcomes.map((o, i) => {
                  const rows = lastBatch.filter(r => o.emissionIds.includes(r.id));
                  const label = [...new Set(rows.map(r => r.category))].join(', ') || 'Invoice';
                  const tone = o.status === 'verified' ? 'text-success' : o.status === 'needs_inputs' || o.status === 'needs_review' ? 'text-warning' : 'text-destructive';
                  const text = o.status === 'verified' ? 'Verified'
                    : o.status === 'needs_review' ? 'Needs review'
                    : o.status === 'rejected' ? 'Rejected'
                    : o.status === 'needs_inputs' ? 'Needs inputs, not verified'
                    : 'Could not verify';
                  return (
                    <li key={`${o.key}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="capitalize font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{o.emissionIds.length} line{o.emissionIds.length === 1 ? '' : 's'}</span>
                        {o.message && <span className="block text-xs text-muted-foreground">{o.message}</span>}
                      </span>
                      <span className={`shrink-0 font-medium ${tone}`}>
                        {text}{typeof o.totalCO2Kg === 'number' && o.status === 'verified' ? ` · ${o.totalCO2Kg.toFixed(1)} kg` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Needs inputs: preflight said stored records are incomplete */}
        {missingInputs && (
          <Card className="mb-6 border-2 border-warning/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <AlertCircle className="h-5 w-5 text-warning" />
                Needs inputs before verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                These invoices were not verified. Their records are missing inputs that verification needs. Upload a clearer invoice or correct the source data, then try again.
              </p>
              {missingInputs.length === 0 ? (
                <p className="text-sm">The verifier did not list the missing inputs.</p>
              ) : (
                <ul className="space-y-2">
                  {missingInputs.map((m) => {
                    const row = lastBatch.find(r => r.id === m.emissionId);
                    return (
                      <li key={m.emissionId} className="p-3 rounded-lg bg-secondary/30 text-sm">
                        <span className="capitalize font-medium">{row ? row.category : 'Record'}</span>
                        {row && <span className="text-xs text-muted-foreground ml-2">Scope {row.scope}</span>}
                        <span className="block text-xs font-mono text-muted-foreground">{m.emissionId}</span>
                        <span className="block mt-1">Missing: {m.fields.join(', ')}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification could not complete */}
        {verifyError && (
          <Card className="mb-6 border-2 border-destructive/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold">Verification could not complete</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No verification outcome was recorded. Your records are unchanged. Details: {verifyError}
              </p>
              <Button variant="outline" onClick={handleVerify} disabled={isVerifying || pending.length === 0}>Retry verification</Button>
            </CardContent>
          </Card>
        )}

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
                </div>

                {/* Innovation 10: Explainable Greenwashing Risk (opt-in) */}
                {isEnabled('greenwashing_explainer') && (
                  <div className="mb-6">
                    <GreenwashingExplainer 
                      risk={verificationResult.greenwashingRisk} 
                      factors={verificationResult.greenwashingFactors}
                    />
                  </div>
                )}

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

                {/* CCTS / CBAM eligibility is not assessed by this verification. */}
                <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg border border-border bg-muted text-muted-foreground w-fit">
                  <Award className="h-4 w-4" />
                  <span className="text-sm">CCTS and CBAM eligibility: not assessed</span>
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
                        <p className="text-sm text-muted-foreground">Eligible tCO₂e (not issued)</p>
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

                {/* Innovation 2: Proof Graph (opt-in) */}
                {isEnabled('proof_graph') && (
                  <div className="mb-6">
                    <ProofGraph
                      totalCO2Kg={verificationResult.totalCO2Kg}
                      scopeBreakdown={verificationResult.analysis.scopeBreakdown}
                      eligibleCredits={verificationResult.analysis.creditEligibility.eligibleCredits}
                      verificationScore={verificationResult.score}
                      qualityGrade={verificationResult.analysis.creditEligibility.qualityGrade}
                    />
                  </div>
                )}

                {/* Innovation 4: Peer Benchmark (opt-in) */}
                {isEnabled('peer_benchmark') && (
                  <div className="mb-6">
                    <PeerBenchmark
                      totalCO2Kg={verificationResult.totalCO2Kg}
                      scopeBreakdown={verificationResult.analysis.scopeBreakdown}
                      dominantCategory={lastBatch[0]?.category}
                    />
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

                {/* Innovation 8: Dispute Simulation (opt-in) */}
                {isEnabled('dispute_simulation') && (
                  <div className="mb-6">
                    <DisputeSimulation
                      flags={verificationResult.analysis.flags}
                      greenwashingRisk={verificationResult.greenwashingRisk}
                      greenwashingFactors={verificationResult.greenwashingFactors}
                      score={verificationResult.score}
                      scopeBreakdown={verificationResult.analysis.scopeBreakdown}
                      qualityGrade={verificationResult.analysis.creditEligibility.qualityGrade}
                      cctsEligible={verificationResult.cctsEligible}
                      cbamCompliant={verificationResult.cbamCompliant}
                    />
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

                {/* Indicative value from verified tonnes, using the shared formula */}
                {verificationResult.status === 'verified' && indicativeValue > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-success/5 border border-primary/20 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Indicative value</h4>
                    </div>
                    <p className="text-2xl font-mono font-bold text-foreground">{formatINR(indicativeValue)}</p>
                    <div className="mb-4" />
                    <Button 
                      onClick={() => navigate('/monetize')}
                      className="w-full"
                      size="lg"
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Go to Monetize
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}

                {/* Post-Verification Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button 
                    variant={verificationResult.status === 'verified' ? 'default' : 'outline'}
                    size="lg" 
                    onClick={() => navigate('/monetize')}
                    className={verificationResult.status === 'verified' ? 'glow-success' : ''}
                  >
                    <Coins className="h-4 w-4 mr-2" />
                    Monetize
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg" 
                    onClick={() => navigate('/mrv-dashboard')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    MRV Dashboard
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg" 
                    onClick={() => navigate('/reports')}
                  >
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Verify;
