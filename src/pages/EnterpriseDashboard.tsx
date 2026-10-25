import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Download, Send, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEnterpriseAccess } from '@/hooks/useEnterpriseAccess';
import { AskSupplierData } from '@/components/enterprise/AskSupplierData';
import { untypedRpc } from '@/hooks/useOrganization';
import { canAskSuppliers, canDownload } from '@/lib/enterprise/access';
import {
  buildLines, financialYears, nextActions, overview, supplierCsv, tonnes,
  type SupplierLine, type SupplierRequestRow, type SupplierSnapshotRow,
} from '@/lib/enterprise/supplierPilot';

const STATUS_LABEL: Record<SupplierLine['status'], string> = { shared: 'Shared', opened: 'Opened', waiting: 'Sent', overdue: 'Overdue', declined: 'Declined' };
const STATUS_TONE: Record<SupplierLine['status'], string> = {
  shared: 'bg-primary/10 text-primary', opened: 'bg-muted text-muted-foreground', waiting: 'bg-muted text-muted-foreground',
  overdue: 'bg-destructive/10 text-destructive', declined: 'bg-muted text-muted-foreground',
};
const PROOF_LABEL: Record<SupplierLine['proof'], string> = { bills: 'Bills', own_number: 'Own number', none: '-' };

function download(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** "Name, email or GSTIN, what you buy, share of purchases %" per line. */
function parseRows(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, contact, buys, share] = l.split(/\t|,/).map((c) => c?.trim() ?? '');
    const isGstin = /^[0-9]{2}[A-Za-z0-9]{13}$/.test(contact ?? '');
    return { name, email: isGstin ? null : contact || null, gstin: isGstin ? contact : null, buys: buys || null, purchaseSharePct: share ? Number(share) : null };
  });
}

export default function EnterpriseDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { access, isLoading: accessLoading } = useEnterpriseAccess();
  const years = useMemo(() => financialYears(new Date(), 3), []);
  const [period, setPeriod] = useState(years[1] ?? years[0]);
  const [adding, setAdding] = useState(false);
  const [rowsText, setRowsText] = useState('');
  const [sending, setSending] = useState(false);

  const org = access?.organizationId;
  const data = useQuery({
    queryKey: ['enterprise-suppliers', org, period.start, period.end],
    enabled: !!org,
    queryFn: async () => {
      const [r, s] = await Promise.all([
        supabase.from('supplier_requests' as never).select('*').eq('enterprise_org_id', org!).eq('period_start', period.start).eq('period_end', period.end),
        supabase.from('supplier_snapshots' as never).select('*').eq('enterprise_org_id', org!).eq('period_start', period.start).eq('period_end', period.end),
      ]);
      if (r.error) throw r.error;
      if (s.error) throw s.error;
      return { requests: (r.data ?? []) as unknown as SupplierRequestRow[], snapshots: (s.data ?? []) as unknown as SupplierSnapshotRow[] };
    },
  });

  const lines = useMemo(() => buildLines(data.data?.requests ?? [], data.data?.snapshots ?? []), [data.data]);
  const o = useMemo(() => overview(lines), [lines]);
  const actions = useMemo(() => nextActions(lines), [lines]);
  const hot = lines.filter((l) => l.status === 'shared' && l.kg > 0).slice(0, 5);
  const maxKg = hot[0]?.kg ?? 1;

  if (accessLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!access) return <Navigate to="/dashboard" replace />;
  const mayAsk = canAskSuppliers(access.role);
  const mayDownload = canDownload(access.role);

  // Each download is counted against the quote (billed past it). Before the
  // billing migration the call is missing and the download goes ahead.
  const downloadSheet = async () => {
    const { error } = await untypedRpc('record_enterprise_download', { p_what: 'supplier_sheet' });
    if (error?.code === '42501') { toast.error('Your role can view suppliers but not download.'); return; }
    download(csvName, supplierCsv(lines, period));
  };

  const invoke = async (body: Record<string, unknown>) => {
    const { data: res, error } = await supabase.functions.invoke('supplier-requests', { body });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      const msg = ctx ? ((await ctx.json().catch(() => null)) as { error?: string } | null)?.error : null;
      throw new Error(msg || 'Could not reach Senseible. Try again.');
    }
    return res as Record<string, unknown>;
  };

  const sendRequests = async () => {
    const suppliers = parseRows(rowsText);
    if (!suppliers.length) { toast.error('Add at least one supplier.'); return; }
    setSending(true);
    try {
      const res = await invoke({ action: 'create', periodStart: period.start, periodEnd: period.end, suppliers });
      const results = (res.results ?? []) as Array<{ name: string; ok: boolean; error?: string }>;
      const ok = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (ok) toast.success(`${ok} ${ok === 1 ? 'supplier' : 'suppliers'} asked`);
      failed.slice(0, 3).forEach((f) => toast.error(f.error ?? `${f.name}: not sent`));
      if (!failed.length) { setAdding(false); setRowsText(''); }
      void qc.invalidateQueries({ queryKey: ['enterprise-suppliers', org] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Not sent');
    } finally {
      setSending(false);
    }
  };

  const remind = async (ids: string[]) => {
    let sent = 0;
    for (const id of ids) {
      try { await invoke({ action: 'remind', requestId: id }); sent += 1; } catch (e) { toast.error(e instanceof Error ? e.message : 'Not sent'); }
    }
    if (sent) toast.success(`Reminder sent to ${sent} ${sent === 1 ? 'supplier' : 'suppliers'}`);
    void qc.invalidateQueries({ queryKey: ['enterprise-suppliers', org] });
  };

  const csvName = `supplier-emissions-${period.label.replace(/\s+/g, '-').toLowerCase()}.csv`;

  return (
    <div className="min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>Supplier emissions | Senseible</title><meta name="robots" content="noindex" /></Helmet>
      <Navigation onSignOut={() => navigate('/')} />
      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="text-xs text-muted-foreground">{access.companyName}</p>
            <h1 className="text-2xl font-semibold tracking-tight">Your suppliers' emissions</h1>
          </div>
          <select aria-label="Reporting period" value={period.start} onChange={(e) => setPeriod(years.find((y) => y.start === e.target.value) ?? years[0])}
            className="h-10 rounded-md border bg-background px-3 text-sm">
            {years.map((y) => <option key={y.start} value={y.start}>{y.label}</option>)}
          </select>
          {mayAsk && <Button onClick={() => setAdding(true)}><UserPlus className="w-4 h-4 mr-2" />Ask suppliers</Button>}
        </header>

        {data.isPending ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : data.error ? (
          <p className="rounded-lg border p-6 text-sm">Supplier data could not load. Refresh the page; if it keeps happening, tell Senseible.</p>
        ) : lines.length === 0 ? (
          <section className="rounded-xl border p-8 text-center space-y-3">
            <h2 className="text-lg font-semibold">Start with the suppliers you buy most from</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Each one gets an email, uploads their bills, and shares their totals with you. You see who has shared, who is late and where your Scope 3 sits.</p>
            {mayAsk && <Button onClick={() => setAdding(true)}><UserPlus className="w-4 h-4 mr-2" />Ask suppliers</Button>}
          </section>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Summary">
              <Kpi label="Scope 3 from suppliers" value={`${tonnes(o.totalKg)} t`} note={`CO₂e from the ${o.sharing} who shared`} />
              <Kpi label="Suppliers sharing" value={`${o.sharing} of ${o.asked}`} note={o.overdue ? `${o.overdue} overdue` : 'None overdue'} />
              <Kpi label="Purchases covered" value={o.purchasesCoveredPct != null ? `${o.purchasesCoveredPct}%` : 'Not set'}
                note={o.purchasesCoveredPct != null ? 'of spend, from suppliers who shared' : 'Add share of purchases per supplier'} />
              <Kpi label="Backed by verified bills" value={o.verifiedPct != null ? `${o.verifiedPct}%` : '-'} note="of the counted emissions" />
            </section>

            <section className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border p-4 min-w-0">
                <h2 className="text-sm font-semibold mb-3">{o.top5Pct != null ? `Five suppliers cause ${o.top5Pct}% of it` : 'Largest suppliers'}</h2>
                {hot.length === 0 ? <p className="text-sm text-muted-foreground">No supplier has shared yet.</p> : (
                  <ul className="space-y-2">
                    {hot.map((l) => (
                      <li key={l.requestId} className="grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-2 text-sm">
                        <span className="truncate" title={l.name}>{l.name}</span>
                        <span className="h-2.5 rounded bg-muted overflow-hidden"><span className={`block h-full rounded ${l.proof === 'bills' ? 'bg-primary' : 'bg-amber-600'}`} style={{ width: `${Math.max(4, (l.kg / maxKg) * 100)}%` }} /></span>
                        <span className="text-right tabular-nums">{tonnes(l.kg)} t</span>
                      </li>
                    ))}
                  </ul>
                )}
                {hot.some((l) => l.proof === 'own_number') && <p className="text-xs text-muted-foreground mt-3">Amber: the supplier's own number, no bills.</p>}
              </div>
              <div className="rounded-xl border p-4">
                <h2 className="text-sm font-semibold mb-3">Do next</h2>
                {actions.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting on you.</p> : (
                  <ul className="space-y-2">
                    {actions.map((a) => (
                      <li key={a.kind} className="rounded-lg border p-3 text-sm flex items-start gap-3">
                        <span className="font-semibold text-primary min-w-6">{a.count}</span>
                        {a.kind === 'big_missing' && <span className="flex-1">{a.count === 1 ? 'supplier' : 'suppliers'} ({a.purchasePct}% of purchases) {a.count === 1 ? 'has' : 'have'} not shared: {a.names.join(', ')}{a.count > a.names.length ? ` and ${a.count - a.names.length} more` : ''}.{a.overdueIds.length > 0 && <> {a.overdueIds.length} overdue.{mayAsk && <> <button className="font-semibold underline" onClick={() => void remind(a.overdueIds)}>Remind {a.overdueIds.length === 1 ? 'them' : 'all'}</button></>}</>}</span>}
                        {a.kind === 'remind' && <span className="flex-1">{a.count === 1 ? 'supplier is' : 'suppliers are'} overdue.{mayAsk && <> <button className="font-semibold underline" onClick={() => void remind(a.requestIds)}>Remind {a.count === 1 ? 'them' : 'all'}</button></>}</span>}
                        {a.kind === 'ask_bills' && <span>of your largest suppliers gave numbers without bills: {a.names.join(', ')}. Ask them to upload bills.</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <AskSupplierData key={period.start} period={period} />

            <section className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold mr-auto">Suppliers, largest first</h2>
                {mayDownload && <Button variant="outline" size="sm" onClick={() => void downloadSheet()}><Download className="w-4 h-4 mr-2" />Supplier sheet (CSV)</Button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead><tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Supplier</th><th className="py-2 pr-3 font-medium">You buy</th><th className="py-2 pr-3 font-medium">Share of purchases</th>
                    <th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Proof</th><th className="py-2 pr-3 font-medium text-right">Scope 1</th>
                    <th className="py-2 pr-3 font-medium text-right">Scope 2</th><th className="py-2 pr-3 font-medium text-right">t CO₂e</th><th className="py-2 font-medium" />
                  </tr></thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.requestId} className="border-b last:border-0">
                        <td className="py-2 pr-3"><div className="font-medium">{l.name}</div>{l.gstin && <div className="text-xs text-muted-foreground">{l.gstin}</div>}</td>
                        <td className="py-2 pr-3">{l.buys ?? '-'}</td>
                        <td className="py-2 pr-3 tabular-nums">{l.purchaseSharePct != null ? `${l.purchaseSharePct}%` : '-'}</td>
                        <td className="py-2 pr-3"><span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_TONE[l.status]}`}>{STATUS_LABEL[l.status]}</span></td>
                        <td className="py-2 pr-3">{PROOF_LABEL[l.proof]}{l.grade && <span className="text-xs text-muted-foreground"> · {l.grade}</span>}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{l.proof === 'bills' ? tonnes(l.scope1Kg, 2) : '-'}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{l.proof === 'bills' ? tonnes(l.scope2Kg, 2) : '-'}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-medium">{l.kg > 0 ? tonnes(l.kg, 2) : '-'}</td>
                        <td className="py-2 text-right">{mayAsk && l.canRemind && <Button variant="ghost" size="sm" onClick={() => void remind([l.requestId])}><Send className="w-3.5 h-3.5 mr-1" />Remind</Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Grade A to D: how much of a supplier's figure comes from verified bills. Each figure in the CSV has a fingerprint an auditor can match to the supplier's record.</p>
            </section>
          </>
        )}
      </main>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ask suppliers for {period.label}</DialogTitle>
            <DialogDescription>One per line: name, email or GSTIN, what you buy, % of purchases. Pasting from a spreadsheet works.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="supplier-rows">Suppliers</Label>
            <Textarea id="supplier-rows" rows={7} value={rowsText} onChange={(e) => setRowsText(e.target.value)}
              placeholder={'Supplier A, accounts@supplier-a.in, Steel coils, 18\nSupplier B, 27AAFCP1234Q1Z2, Forgings, 6'} />
            <p className="text-xs text-muted-foreground">Suppliers get it by email, and on Senseible when they sign in.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={() => void sendRequests()} disabled={sending}>{sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Send requests</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-0.5">{value}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
