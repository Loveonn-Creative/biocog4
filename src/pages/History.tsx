import { useDocuments } from '@/hooks/useDocuments';
import { RecordsLoadError } from '@/components/RecordsLoadError';
import { useEmissions } from '@/hooks/useEmissions';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Search, ShieldCheck, CheckCircle, TrendingUp, Filter, Download, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { loadSupabase } from '@/integrations/supabase/lazyClient';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import { emitRecordsChanged } from '@/lib/recordsEvents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Helmet } from 'react-helmet-async';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, isWithinInterval } from 'date-fns';
import { GreenCategoryBadge, getGreenCategoryFromEmissionCategory } from '@/components/GreenCategoryBadge';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { documentEmissionStatus, ledgerEvidenceGaps, verifiedEmissionsOnce, verifiedMonthlyTrend, verifiedScopeTotals } from '@/lib/emissionLedger';
import { applyScope } from '@/lib/workspaceScope';
import { cachedGuestHashes, getGuestSource } from '@/lib/guestSourceCache';
import { isSourceFilePath } from '../../supabase/functions/_shared/sourceFiles';

const History = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const { scope, can } = useWorkspace();
  // Personal workspace: your own invoices. Organisation: admins and data
  // managers remove any unverified invoice; uploaders remove their own.
  const canDelete = (doc: { user_id: string | null }) =>
    scope.kind !== 'organization' || can('records.manage') || (can('records.upload') && doc.user_id === user?.id);
  const { documents, isLoading: docsLoading, refetch: refreshDocuments } = useDocuments();
  const { emissions, isLoading: emissionsLoading, refetch: refreshEmissions, error: emissionsError } = useEmissions();
  const { isEnterprise } = useEnterpriseMode();
  const { entries: ledgerEntries, verifiedTotalKg: ledgerVerifiedKg, loaded: ledgerLoaded, exportComplianceXLSX, refetch: refreshLedger } = useComplianceLedger();
  const [restoring, setRestoring] = useState(false);
  const [openingSource, setOpeningSource] = useState<string | null>(null);
  // Guests: which originals this browser still holds (they are never stored on the server).
  const [guestHashes, setGuestHashes] = useState<Set<string>>(new Set());
  useEffect(() => { if (!user) void cachedGuestHashes().then(setGuestHashes); }, [user, documents.length]);

  const canViewSource = (doc: { file_url: string | null; document_hash: string | null }) =>
    user ? isSourceFilePath(doc.file_url) : !!doc.document_hash && guestHashes.has(doc.document_hash);

  // Opens the original file in a new tab: a short-lived link for signed-in
  // users (checked on the server by owner or team role), this browser's copy for guests.
  const openSource = async (doc: { id: string; document_hash: string | null }) => {
    const tab = window.open('', '_blank'); // opened now so the browser does not block it
    if (tab) tab.opener = null;
    setOpeningSource(doc.id);
    try {
      if (!user) {
        const entry = doc.document_hash ? await getGuestSource(doc.document_hash) : null;
        if (!entry) { tab?.close(); toast.error('The original is kept only in the browser it was uploaded from.'); return; }
        const href = URL.createObjectURL(entry.blob);
        if (tab) tab.location.href = href; else window.location.assign(href);
        setTimeout(() => URL.revokeObjectURL(href), 60_000);
        return;
      }
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('document-source-url', { body: { documentId: doc.id } });
      if (error || !data?.url) {
        tab?.close();
        toast.error(error ? await getFunctionErrorMessage(error, 'The original file could not be opened.') : 'The original file could not be opened.');
        return;
      }
      if (tab) tab.location.href = data.url; else window.location.assign(data.url);
    } finally {
      setOpeningSource(null);
    }
  };
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Server-side delete: checks ownership, refuses verified records, logs the removal.
  const deleteDocument = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      const supabase = await loadSupabase();
      const { error } = await supabase.functions.invoke('delete-document', { body: { documentId } });
      if (error) {
        toast.error(await getFunctionErrorMessage(error, 'Could not delete the invoice.'));
        return;
      }
      toast.success('Invoice deleted.');
      emitRecordsChanged('delete');
    } finally {
      setDeletingId(null);
    }
  };
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  const isLoading = docsLoading || emissionsLoading;

  // Read-only consistency check: verified records with no verified audit
  // ledger entry (left by an interrupted verification). Checked only once the
  // ledger was read for this account and workspace, so a failed read is never
  // reported as missing evidence.
  const evidenceGaps = useMemo(
    () => (user && ledgerLoaded && !emissionsLoading ? ledgerEvidenceGaps(emissions, ledgerEntries) : new Map<string, string[]>()),
    [user, ledgerLoaded, emissionsLoading, emissions, ledgerEntries],
  );
  const gapRecordCount = useMemo(() => [...evidenceGaps.values()].reduce((n, ids) => n + ids.length, 0), [evidenceGaps]);

  // Completes the stored verification results that cover those records. The
  // server only fills in what is missing and never creates a new verification.
  const restoreAuditEntries = async () => {
    setRestoring(true);
    try {
      const supabase = await loadSupabase();
      const gapIds = [...evidenceGaps.values()].flat();
      const query = applyScope(
        supabase.from('carbon_verifications').select('id, emission_ids').eq('verification_status', 'verified').overlaps('emission_ids', gapIds),
        scope,
      );
      const { data: stored, error } = query ? await query : { data: [], error: null };
      if (error) { toast.error('Could not read your verification results. Nothing was changed.'); return; }
      const sets = (stored ?? []) as Array<{ id: string; emission_ids: string[] }>;
      if (sets.length === 0) {
        toast.error('No stored verification result covers these records, so nothing was changed. Contact Senseible support.');
        return;
      }
      let failed = 0;
      for (const v of sets) {
        const { data, error: fnError } = await supabase.functions.invoke('verify-carbon', { body: { emissionIds: v.emission_ids, repairOnly: true } });
        if (fnError || data?.reused !== true) failed++;
      }
      emitRecordsChanged('verify');
      if (failed) toast.error(`${failed} of ${sets.length} verification ${sets.length === 1 ? 'result' : 'results'} could not be completed. Try again.`);
      else toast.success('Audit entries restored from your stored verification results.');
    } finally {
      setRestoring(false);
    }
  };
  const emissionsByDocument = useMemo(() => {
    const grouped = new Map<string, typeof emissions>();
    for (const row of emissions) {
      if (!row.document_id) continue;
      grouped.set(row.document_id, [...(grouped.get(row.document_id) || []), row]);
    }
    return grouped;
  }, [emissions]);

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

  // Totals and trend count verified rows only, once per emission id. Pending
  // rows are listed per document below but never added to totals.
  const trendData = useMemo(() => verifiedMonthlyTrend(emissions), [emissions]);
  const scopeBreakdown = useMemo(() => verifiedScopeTotals(emissions), [emissions]);
  const verifiedCount = useMemo(() => verifiedEmissionsOnce(emissions).length, [emissions]);
  const pendingTotal = emissions.length - emissions.filter(e => e.verified === true).length;
  const totalCO2 = scopeBreakdown.total;

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatAmount = (amount: number | null) => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : '-';

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>Invoice History | Senseible</title></Helmet>
      <Navigation />
      {emissionsError && <RecordsLoadError onRetry={() => void refreshEmissions()} />}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Invoice History</h1>
          {user && <Button variant="outline" size="sm" onClick={() => { void refreshDocuments(); void refreshEmissions(); void refreshLedger(); }} aria-label="Refresh saved invoices">Refresh</Button>}
          {ledgerEntries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void exportComplianceXLSX(); }}
              className="gap-2 shrink-0"
              title={`${ledgerEntries.length} audit ledger ${ledgerEntries.length === 1 ? 'record' : 'records'}, ${ledgerVerifiedKg.toFixed(1)} kg CO₂e verified`}
            >
              <Download className="h-4 w-4" />
              Export audit ledger
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

        {gapRecordCount > 0 && (
          <Card className="mb-6 border-warning/40 bg-warning/5" role="status">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <p className="text-sm flex-1">
                {gapRecordCount} verified {gapRecordCount === 1 ? 'record has' : 'records have'} no audit ledger entry
                ({evidenceGaps.size} {evidenceGaps.size === 1 ? 'invoice' : 'invoices'}). An earlier verification was interrupted.
                Totals already count {gapRecordCount === 1 ? 'it' : 'them'}; the audit export does not until the entries are restored.
              </p>
              <Button size="sm" variant="outline" onClick={() => { void restoreAuditEntries(); }} disabled={restoring} className="shrink-0">
                {restoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Restore audit entries
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Emissions Trend Chart */}
        {emissions.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Verified Emissions Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Totals count verified records only.
                {pendingTotal > 0 && ` ${pendingTotal} ${pendingTotal === 1 ? 'record is' : 'records are'} pending verification and not included.`}
              </p>
            </CardHeader>
            <CardContent>
              {verifiedCount === 0 && (
                <p className="text-sm text-muted-foreground mb-4">No verified records yet. Open an invoice in Verify to verify its stored records.</p>
              )}
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Verified CO₂</p>
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
                      formatter={(value: number) => [`${value.toFixed(1)} kg CO₂`, 'Verified emissions']}
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
                const documentRows = emissionsByDocument.get(doc.id) || [];
                const status = documentEmissionStatus(documentRows, doc.cached_result);
                const tooltipText =
                  status.kind === 'verified' ? 'Stored emission records are verified'
                  : status.kind === 'pending' ? `${status.count} stored emission ${status.count === 1 ? 'record needs' : 'records need'} verification`
                  : status.kind === 'processing' ? 'This invoice is still being processed. Refresh in a moment.'
                  : `No emission record was stored because no line item could be calculated (${status.reason}). This is not a verification result.`;
                
                return (
                  <Card key={doc.id} className="hover:bg-secondary/30 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{doc.vendor || doc.document_type || 'Invoice'}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {status.kind === 'verified' ? (
                                <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary py-0 h-5 shrink-0">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : status.kind === 'pending' ? (
                                <Badge variant="outline" className="text-xs bg-warning/10 border-warning/20 text-warning py-0 h-5 shrink-0">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Pending verification
                                </Badge>
                              ) : status.kind === 'processing' ? (
                                <Badge variant="outline" className="text-xs bg-secondary border-border text-muted-foreground py-0 h-5 shrink-0">
                                  <Loader2 className="h-3 w-3 mr-1" />
                                  Processing
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-muted border-border text-muted-foreground py-0 h-5 shrink-0">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Not calculable: {status.reason}
                                </Badge>
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">{tooltipText}</p>
                              {hasHash && (
                                <p className="text-xs font-mono text-muted-foreground mt-1">
                                  Hash: {doc.document_hash?.substring(0, 12)}...
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
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
                      {canViewSource(doc) && (
                        <Button size="sm" variant="ghost" onClick={() => { void openSource(doc); }} disabled={openingSource === doc.id} aria-label={`View the original file for ${doc.vendor || doc.document_type || 'this invoice'}`}>
                          {openingSource === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'View source'}
                        </Button>
                      )}
                      {user && documentRows.length > 0 && <Button size="sm" variant="outline" onClick={() => navigate('/verify', { state: { documentId: doc.id } })} aria-label={`Open ${doc.vendor || doc.document_type} in Verify`}>View in Verify</Button>}
                      {/* Remove a wrongly parsed or duplicate invoice. Verified records are never deletable. */}
                      {user && status.kind !== 'verified' && canDelete(doc) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" disabled={deletingId === doc.id} aria-label={`Delete ${doc.vendor || 'invoice'}`}>
                              {deletingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {doc.vendor || 'This invoice'}{doc.invoice_number ? ` #${doc.invoice_number}` : ''} and its {documentRows.length} unverified emission {documentRows.length === 1 ? 'record' : 'records'} will be removed. Verified records are never deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDocument(doc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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