import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Target, BarChart3, Zap, CheckCircle2, FileText, Lock, ArrowRight, Leaf, TrendingDown, AlertTriangle, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useSession } from "@/hooks/useSession";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import {
  SECTOR_BENCHMARKS,
  REDUCTION_STRATEGIES,
  calculateFeasibility,
  formatInr,
  formatCo2,
  type FeasibilityResult,
} from "@/lib/netZeroEngine";

const STEPS = [
  { id: 'baseline', label: 'Baseline', icon: BarChart3 },
  { id: 'goal', label: 'Set Goal', icon: Target },
  { id: 'roadmap', label: 'Roadmap', icon: Zap },
  { id: 'execute', label: 'Execute', icon: CheckCircle2 },
  { id: 'report', label: 'Report', icon: FileText },
];

const NetZero = () => {
  const { isAuthenticated, user } = useSession();
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [activeStep, setActiveStep] = useState('baseline');

  // Baseline data from platform
  const [baselineData, setBaselineData] = useState<{ scope1: number; scope2: number; scope3: number; total: number } | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(true);

  // Goal settings
  const [sectorId, setSectorId] = useState('other');
  const [targetPct, setTargetPct] = useState('30');
  const [timeline, setTimeline] = useState('12');
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);

  // Execution tracking (local state, persisted to DB for auth users)
  const [taskStatuses, setTaskStatuses] = useState<Record<string, 'pending' | 'in-progress' | 'done'>>({});

  // Load baseline from existing emissions
  useEffect(() => {
    const loadBaseline = async () => {
      setLoadingBaseline(true);
      if (!isAuthenticated || !user?.id) {
        setLoadingBaseline(false);
        return;
      }

      const { data } = await supabase
        .from('emissions')
        .select('scope, co2_kg')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const scope1 = data.filter(e => e.scope === 1).reduce((s, e) => s + Number(e.co2_kg), 0);
        const scope2 = data.filter(e => e.scope === 2).reduce((s, e) => s + Number(e.co2_kg), 0);
        const scope3 = data.filter(e => e.scope === 3).reduce((s, e) => s + Number(e.co2_kg), 0);
        setBaselineData({ scope1, scope2, scope3, total: scope1 + scope2 + scope3 });
      }
      setLoadingBaseline(false);
    };
    loadBaseline();
  }, [isAuthenticated, user?.id]);

  // Calculate feasibility when goal params change
  useEffect(() => {
    const baseline = baselineData?.total || SECTOR_BENCHMARKS.find(b => b.id === sectorId)?.typicalBaseline || 120000;
    const result = calculateFeasibility(baseline, parseFloat(targetPct) || 30, parseFloat(timeline) || 12, sectorId);
    setFeasibility(result);
  }, [sectorId, targetPct, timeline, baselineData]);

  const baselineTotal = baselineData?.total || 0;
  const hasData = baselineTotal > 0;

  const pieData = baselineData ? [
    { name: 'Scope 1', value: baselineData.scope1, color: 'hsl(var(--primary))' },
    { name: 'Scope 2', value: baselineData.scope2, color: 'hsl(var(--accent))' },
    { name: 'Scope 3', value: baselineData.scope3, color: 'hsl(var(--warning))' },
  ].filter(d => d.value > 0) : [];

  const completedTasks = feasibility?.recommendedActions.filter(a => taskStatuses[a.id] === 'done').length || 0;
  const totalTasks = feasibility?.recommendedActions.length || 1;
  const progressPct = Math.round((completedTasks / totalTasks) * 100);

  const toggleTask = (id: string) => {
    setTaskStatuses(prev => {
      const current = prev[id] || 'pending';
      const next = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'done' : 'pending';
      return { ...prev, [id]: next };
    });
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Net-Zero Goal Engine",
    "description": "MSME net-zero roadmap builder. Set science-based targets, get AI-powered reduction strategies, and track progress toward net-zero.",
    "url": "https://senseible.earth/net-zero",
    "applicationCategory": "BusinessApplication",
    "provider": { "@type": "Organization", "name": "Senseible", "url": "https://senseible.earth" },
  };

  return (
    <>
      <Helmet>
        <title>Net-Zero Goal Engine — MSME Decarbonization Roadmap | Senseible</title>
        <meta name="description" content="Build your net-zero roadmap in 5 steps. Set science-based targets, get AI-powered reduction strategies, and track real progress. Built for MSMEs and startups." />
        <meta name="keywords" content="net zero MSME, MSME decarbonization, net zero roadmap India, carbon reduction tool, SBTi MSME" />
        <link rel="canonical" href="https://senseible.earth/net-zero" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <MinimalNav />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          {/* Hero */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 border-success/30 text-success">
              <Leaf className="w-3 h-3 mr-1" /> Net-Zero Engine
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 font-display">
              Your Path to Net-Zero
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From baseline to achievement in 5 steps. Deterministic science, AI-augmented decisions.
            </p>
          </div>

          {/* Auth Gate */}
          {!isAuthenticated && (
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-foreground mb-3">Sign in to load your emissions baseline and save net-zero goals.</p>
                <Button onClick={() => navigate('/auth')} size="sm">
                  Sign In to Start <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step Navigation */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Step Content */}
          {activeStep === 'baseline' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" /> Emissions Baseline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingBaseline ? (
                    <p className="text-sm text-muted-foreground">Loading your emissions data...</p>
                  ) : hasData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-3xl font-bold text-foreground mb-1">{formatCo2(baselineTotal)}</p>
                        <p className="text-sm text-muted-foreground mb-4">Total annual emissions</p>
                        <div className="space-y-2">
                          {[
                            { label: 'Scope 1 (Direct)', value: baselineData!.scope1, color: 'bg-primary' },
                            { label: 'Scope 2 (Electricity)', value: baselineData!.scope2, color: 'bg-accent' },
                            { label: 'Scope 3 (Value Chain)', value: baselineData!.scope3, color: 'bg-warning' },
                          ].map(s => (
                            <div key={s.label} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                                <span className="text-muted-foreground">{s.label}</span>
                              </div>
                              <span className="font-medium">{formatCo2(s.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCo2(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">No emissions data yet. Upload your first invoice to establish a baseline.</p>
                      <Button variant="outline" size="sm" onClick={() => navigate('/')}>Upload Invoice</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button onClick={() => setActiveStep('goal')}>
                  Set Reduction Goal <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {activeStep === 'goal' && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Goal Setting</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Your Sector</label>
                      <Select value={sectorId} onValueChange={setSectorId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SECTOR_BENCHMARKS.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Reduction Target</label>
                      <Select value={targetPct} onValueChange={setTargetPct}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20% reduction</SelectItem>
                          <SelectItem value="30">30% reduction</SelectItem>
                          <SelectItem value="50">50% reduction</SelectItem>
                          <SelectItem value="75">75% reduction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Timeline</label>
                      <Select value={timeline} onValueChange={setTimeline}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 months</SelectItem>
                          <SelectItem value="36">3 years</SelectItem>
                          <SelectItem value="60">By 2030</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {feasibility && (
                    <div className="mt-6 p-4 rounded-lg bg-muted/50">
                      <div className="flex items-start gap-2 mb-3">
                        {feasibility.isFeasible ? (
                          <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{feasibility.isFeasible ? 'Feasible' : 'Ambitious'}</p>
                          <p className="text-xs text-muted-foreground">{feasibility.feasibilityNote}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-foreground">{formatCo2(feasibility.baselineCo2Kg)}</p>
                          <p className="text-xs text-muted-foreground">Baseline</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-destructive">−{formatCo2(feasibility.targetReductionKg)}</p>
                          <p className="text-xs text-muted-foreground">Target Cut</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-success">{formatCo2(feasibility.targetCo2Kg)}</p>
                          <p className="text-xs text-muted-foreground">Goal</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{formatInr(feasibility.totalEstimatedCost)}</p>
                          <p className="text-xs text-muted-foreground">Est. Investment</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep('baseline')}>Back</Button>
                <Button onClick={() => setActiveStep('roadmap')}>View Roadmap <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {activeStep === 'roadmap' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-accent" /> Reduction Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {feasibility && (
                    <div className="space-y-3">
                      {feasibility.recommendedActions.map((action, i) => (
                        <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            action.scope === 1 ? 'bg-primary/10 text-primary' : action.scope === 2 ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
                          }`}>
                            S{action.scope}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">↓ {action.reductionPct}% of scope</Badge>
                              <Badge variant="outline" className="text-xs">{formatInr(action.estimatedCostInr)}</Badge>
                              {action.paybackMonths > 0 && <Badge variant="outline" className="text-xs">{action.paybackMonths}mo payback</Badge>}
                              <Badge variant={action.effort === 'low' ? 'default' : 'secondary'} className="text-xs">{action.effort} effort</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Enhancement CTA */}
              <Card className="border-accent/20 bg-accent/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Get AI-personalized strategies</p>
                      <p className="text-xs text-muted-foreground mb-2">Our ESG Intelligence engine can analyze your specific data and suggest optimized reduction paths.</p>
                      {isPremium ? (
                        <Button size="sm" variant="outline" onClick={() => navigate('/intelligence')}>
                          Ask ESG Intelligence
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => navigate('/pricing')}>
                          <Lock className="w-3 h-3 mr-1" /> Unlock with Premium
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep('goal')}>Back</Button>
                <Button onClick={() => setActiveStep('execute')}>Start Executing <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {activeStep === 'execute' && (
            <div className="space-y-6">
              {!isAuthenticated ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6 text-center">
                    <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-foreground mb-3">Sign in to track your execution progress and save milestones.</p>
                    <Button onClick={() => navigate('/auth')} size="sm">Sign In</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Progress */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-success" /> Progress: {progressPct}%
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={progressPct} className="h-3 mb-2" />
                      <p className="text-xs text-muted-foreground">{completedTasks} of {totalTasks} actions completed</p>
                    </CardContent>
                  </Card>

                  {/* Task Checklist */}
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Execution Checklist</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {feasibility?.recommendedActions.map(action => {
                          const status = taskStatuses[action.id] || 'pending';
                          return (
                            <button
                              key={action.id}
                              onClick={() => toggleTask(action.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                status === 'done' ? 'bg-success/5 border-success/30' : status === 'in-progress' ? 'bg-accent/5 border-accent/30' : 'border-border hover:bg-muted/30'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                status === 'done' ? 'border-success bg-success' : status === 'in-progress' ? 'border-accent' : 'border-muted-foreground/30'
                              }`}>
                                {status === 'done' && <CheckCircle2 className="w-3 h-3 text-success-foreground" />}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{action.title}</p>
                                <p className="text-xs text-muted-foreground">↓ {action.reductionPct}% · {formatInr(action.estimatedCostInr)}</p>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">{status}</Badge>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep('roadmap')}>Back</Button>
                <Button onClick={() => setActiveStep('report')}>View Report <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </div>
          )}

          {activeStep === 'report' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Net-Zero Progress Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="w-24 h-24 rounded-full border-4 border-success mx-auto flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-success">{progressPct}%</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-1">Toward Net-Zero</p>
                    <p className="text-sm text-muted-foreground mb-4">{completedTasks} actions completed · {feasibility ? formatCo2(feasibility.targetReductionKg * progressPct / 100) : '0 kgCO₂'} estimated reduction</p>

                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Baseline</p>
                        <p className="text-sm font-medium">{feasibility ? formatCo2(feasibility.baselineCo2Kg) : '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="text-sm font-medium">−{targetPct}% by {timeline === '12' ? '12 months' : timeline === '36' ? '3 years' : '2030'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Sector</p>
                        <p className="text-sm font-medium">{SECTOR_BENCHMARKS.find(b => b.id === sectorId)?.name}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Investment</p>
                        <p className="text-sm font-medium">{feasibility ? formatInr(feasibility.totalEstimatedCost) : '—'}</p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <p className="text-xs text-muted-foreground mb-4">Aligned with SBTi targets and UN SDG 13 (Climate Action)</p>

                    {isAuthenticated ? (
                      <Button variant="outline" size="sm" onClick={() => toast({ title: 'Coming soon', description: 'PDF export will be available shortly.' })}>
                        <FileText className="w-3 h-3 mr-1" /> Export Report
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                        <Lock className="w-3 h-3 mr-1" /> Sign in to Export
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6 text-xs text-muted-foreground">
                  <p><strong>Trust Layer:</strong> Built on verified scientific emission factors (IPCC AR6, CEA India Grid Factor, MoEFCC guidelines) and deterministic calculations. AI enhances strategy recommendations — it never replaces core measurement logic.</p>
                </CardContent>
              </Card>

              <div className="flex justify-start">
                <Button variant="outline" onClick={() => setActiveStep('execute')}>Back</Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default NetZero;
