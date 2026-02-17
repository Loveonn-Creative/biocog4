import { useDocuments } from '@/hooks/useDocuments';
import { useEmissions } from '@/hooks/useEmissions';
import { Link } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Search, ShieldCheck, CheckCircle, TrendingUp, Filter, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { GreenCategoryBadge, getGreenCategoryFromEmissionCategory } from '@/components/GreenCategoryBadge';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';

const History = () => {
  const { documents, isLoading: docsLoading } = useDocuments();
  const { emissions, isLoading: emissionsLoading } = useEmissions();
  const { isEnterprise } = useEnterpriseMode();
  const { entries: ledgerEntries, exportComplianceXLSX } = useComplianceLedger();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  const isLoading = docsLoading || emissionsLoading;

  // Filter documents by search and date range
  const filtered = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = 
        (d.vendor?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (d.document_type?.toLowerCase() || '').includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (dateRange.from || dateRange.to) {
        const docDate = new Date(d.created_at);
        if (dateRange.from && dateRange.to) {
          return isWithinInterval(docDate, { start: dateRange.from, end: dateRange.to });
        }
        if (dateRange.from) return docDate >= dateRange.from;
        if (dateRange.to) return docDate <= dateRange.to;
      }
      
      return true;
    });
  }, [documents, search, dateRange]);

  // Calculate monthly emissions trend for chart
  const trendData = useMemo(() => {
    const monthlyData: Record<string, { month: string; co2: number; count: number }> = {};
    
    emissions.forEach(e => {
      const date = new Date(e.created_at);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM yy');
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, co2: 0, count: 0 };
      }
      monthlyData[monthKey].co2 += e.co2_kg;
      monthlyData[monthKey].count += 1;
    });
    
    return Object.values(monthlyData).sort((a, b) => 
      a.month.localeCompare(b.month)
    );
  }, [emissions]);

  // Calculate scope breakdown
  const scopeBreakdown = useMemo(() => {
    const breakdown = { scope1: 0, scope2: 0, scope3: 0 };
    emissions.forEach(e => {
      if (e.scope === 1) breakdown.scope1 += e.co2_kg;
      else if (e.scope === 2) breakdown.scope2 += e.co2_kg;
      else breakdown.scope3 += e.co2_kg;
    });
    return breakdown;
  }, [emissions]);

  const totalCO2 = scopeBreakdown.scope1 + scopeBreakdown.scope2 + scopeBreakdown.scope3;

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatAmount = (amount: number | null) => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : '-';

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>Invoice History — Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Invoice History</h1>
          {ledgerEntries.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportComplianceXLSX} className="gap-2 shrink-0">
              <Download className="h-4 w-4" />
              Export Ledger
            </Button>
          )}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className={dateRange.from || dateRange.to ? 'border-primary' : ''}>
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
                {(dateRange.from || dateRange.to) && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" onClick={clearDateFilter} className="w-full">
                      Clear Filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Emissions Trend Chart */}
        {emissions.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Emissions Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Total CO₂</p>
                  <p className="text-lg font-mono font-bold">{totalCO2.toFixed(1)} kg</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10">
                  <p className="text-xs text-muted-foreground">Scope 1</p>
                  <p className="text-lg font-mono font-bold text-destructive">{scopeBreakdown.scope1.toFixed(1)} kg</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <p className="text-xs text-muted-foreground">Scope 2</p>
                  <p className="text-lg font-mono font-bold text-warning">{scopeBreakdown.scope2.toFixed(1)} kg</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10">
                  <p className="text-xs text-muted-foreground">Scope 3</p>
                  <p className="text-lg font-mono font-bold text-accent">{scopeBreakdown.scope3.toFixed(1)} kg</p>
                </div>
              </div>
              
              {trendData.length > 1 && (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)} kg CO₂`, 'Emissions']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="co2" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorCo2)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Date Range Indicator */}
        {(dateRange.from || dateRange.to) && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Showing:
            {dateRange.from && <span>{format(dateRange.from, 'MMM d, yyyy')}</span>}
            {dateRange.from && dateRange.to && <span>→</span>}
            {dateRange.to && <span>{format(dateRange.to, 'MMM d, yyyy')}</span>}
            <Button variant="ghost" size="sm" onClick={clearDateFilter} className="h-6 px-2">
              Clear
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">
                {documents.length === 0 ? 'No documents found' : 'No documents match your filters'}
              </p>
              {documents.length === 0 ? (
                <Link to="/" className="text-primary text-sm hover:underline">Upload your first invoice</Link>
              ) : (
                <Button variant="ghost" size="sm" onClick={clearDateFilter}>Clear filters</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <TooltipProvider>
            <div className="space-y-3">
              {filtered.map(doc => {
                const hasHash = !!doc.document_hash;
                const isCached = !!doc.cached_result;
                const isHighConfidence = (doc.confidence ?? 0) >= 80;
                
                return (
                  <Card key={doc.id} className="hover:bg-secondary/30 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{doc.vendor || doc.document_type}</span>
                          {/* Verification status badge */}
                          {hasHash && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {isCached ? (
                                  <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary py-0 h-5 shrink-0">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                ) : isHighConfidence ? (
                                  <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600 py-0 h-5 shrink-0">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Processed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-warning/10 border-warning/20 text-warning py-0 h-5 shrink-0">
                                    Review
                                  </Badge>
                                )}
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">
                                  {isCached 
                                    ? "Previously verified - results are locked for audit integrity"
                                    : isHighConfidence
                                    ? "Processed with deterministic MRV calculation"
                                    : "Low confidence - manual review recommended"
                                  }
                                </p>
                                {hasHash && (
                                  <p className="text-xs font-mono text-muted-foreground mt-1">
                                    Hash: {doc.document_hash?.substring(0, 12)}...
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.created_at)}
                          {doc.invoice_number && (
                            <span className="text-xs">• #{doc.invoice_number}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-medium">{formatAmount(doc.amount)}</div>
                      <div className="text-xs text-muted-foreground capitalize">{doc.document_type}</div>
                      </div>
                      {/* Enterprise: Document Provenance */}
                      {isEnterprise && doc.document_hash && (
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-xs font-mono border-primary/20 text-primary">
                            SHA256: {doc.document_hash.substring(0, 12)}…
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </main>
    </div>
  );
};

export default History;