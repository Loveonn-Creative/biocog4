import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { untypedRpc } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** The exact words the supplier agrees to; its SHA-256 is stored with the consent. */
const consentText = (company: string, start: string, end: string) =>
  `I share with ${company}, for ${fmt(start)} to ${fmt(end)}: my emissions by scope and category, the energy units on my bills, how many bills, and each bill's fingerprint. Not the bills, their amounts or any other record. I can stop sharing at any time; what was already shared stays with ${company}.`;

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface MyRequest { request_id: string; company_name: string; buys: string | null; period_start: string; period_end: string; status: string; expires_at: string; shared_at: string | null }

/** /supplier-share/:requestId — signed-in supplier reviews what would be shared and presses Share. */
export default function SupplierShare() {
  const { requestId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const [declared, setDeclared] = useState('');
  const [sharing, setSharing] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stoppedFrom, setStoppedFrom] = useState<string | null>(null);

  const req = useQuery({
    queryKey: ['my-supplier-request', user?.id, requestId],
    enabled: !!user?.id,
    queryFn: async () => {
      // Opening by id links the request when it names this account's email or GSTIN.
      await untypedRpc('accept_supplier_request', { p_request_id: requestId });
      const { data, error } = await untypedRpc('my_supplier_requests');
      if (error) throw error;
      return ((data ?? []) as MyRequest[]).find((r) => r.request_id === requestId) ?? null;
    },
  });
  const r = req.data;

  // What would be shared: the same in-period records the server will total.
  const mine = useQuery({
    queryKey: ['supplier-share-preview', user?.id, r?.period_start, r?.period_end],
    enabled: !!user?.id && !!r,
    queryFn: async () => {
      const { data, error } = await supabase.from('emissions')
        .select('scope, co2_kg, verified, document_id, created_at, documents(invoice_date)')
        .eq('user_id', user!.id).is('organization_id', null);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ scope: number; co2_kg: number; verified: boolean | null; document_id: string | null; created_at: string; documents: { invoice_date: string | null } | null }>;
      const inPeriod = rows.filter((e) => { const d = e.documents?.invoice_date ?? e.created_at.slice(0, 10); return d >= r!.period_start && d <= r!.period_end; });
      const kg = (s?: number) => inPeriod.filter((e) => s === undefined || e.scope === s).reduce((a, e) => a + Number(e.co2_kg || 0), 0);
      return { total: kg(), s1: kg(1), s2: kg(2), s3: kg(3), bills: new Set(inPeriod.map((e) => e.document_id).filter(Boolean)).size, verified: inPeriod.filter((e) => e.verified).reduce((a, e) => a + Number(e.co2_kg || 0), 0) };
    },
  });
  const m = mine.data;
  const text = useMemo(() => (r ? consentText(r.company_name, r.period_start, r.period_end) : ''), [r]);

  const share = async () => {
    if (!r) return;
    const declaredKg = declared.trim() ? Number(declared) * 1000 : null;
    if (declaredKg !== null && (!Number.isFinite(declaredKg) || declaredKg < 0)) { toast.error('Enter your figure in tonnes, for example 120.5'); return; }
    setSharing(true);
    const { error } = await untypedRpc('share_with_enterprise', {
      p_request_id: r.request_id, p_consent_version: 'v1', p_consent_text_hash: await sha256Hex(text),
      p_declared_kg: declaredKg, p_declared_note: declaredKg !== null ? 'Supplier figure, no bills' : null,
    });
    setSharing(false);
    if (error) { toast.error(error.message.includes('no records') ? 'No bills in this period yet. Upload bills or enter your own figure.' : 'Not shared. Try again.'); return; }
    toast.success(`Shared with ${r.company_name}`);
    void req.refetch();
  };

  // Withdraws consent for this request; the buyer keeps what was already shared and sees the request as Declined.
  const stopSharing = async () => {
    if (!r) return;
    setStopping(true);
    const { error } = await untypedRpc('withdraw_supplier_consent', { p_request_id: r.request_id });
    setStopping(false);
    if (error) { toast.error('Sharing not stopped. Try again.'); return; }
    setConfirmStop(false);
    setStoppedFrom(r.company_name);
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Helmet><title>Share with your buyer | Senseible</title><meta name="robots" content="noindex" /></Helmet>
      <Navigation onSignOut={() => navigate('/')} />
      <main className="container mx-auto px-4 py-8 max-w-xl space-y-5">
        {stoppedFrom ? (
          <section className="rounded-xl border p-6 space-y-3">
            <h1 className="text-xl font-semibold">You stopped sharing with {stoppedFrom}</h1>
            <p className="text-sm text-muted-foreground">They get nothing new from you. Totals you already shared stay with them.</p>
            <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
          </section>
        ) : req.isPending ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        : !r ? <p className="rounded-xl border p-6 text-sm">This request is not for this account, or it has closed.</p>
        : r.status === 'shared' ? (
          <section className="rounded-xl border p-6 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-semibold">Shared with {r.company_name}</h1>
            <p className="text-sm text-muted-foreground">They now see your totals for {fmt(r.period_start)} to {fmt(r.period_end)}. Upload more bills and share again to update them.</p>
            <div className="flex flex-wrap gap-2"><Button onClick={() => void share()} disabled={sharing || stopping} variant="outline">Share again</Button><Button asChild variant="ghost"><Link to="/dashboard">Back to dashboard</Link></Button></div>
            <div className="border-t pt-3">
              {confirmStop ? (
                <div className="space-y-2">
                  <p className="text-sm">Stop sharing with {r.company_name}? They keep what you already shared.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive" size="sm" onClick={() => void stopSharing()} disabled={stopping}>{stopping && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Stop sharing</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmStop(false)} disabled={stopping}>Keep sharing</Button>
                  </div>
                </div>
              ) : (
                <Button variant="link" size="sm" className="px-0 text-muted-foreground" onClick={() => setConfirmStop(true)}>Stop sharing</Button>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border p-6 space-y-4">
            <p className="text-sm text-muted-foreground">{r.company_name}{r.buys ? ` · ${r.buys}` : ''}</p>
            <h1 className="text-xl font-semibold">Share your emissions for {fmt(r.period_start)} to {fmt(r.period_end)}</h1>
            {mine.isPending ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : m && m.total > 0 ? (
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">Total</dt><dd className="text-lg font-semibold tabular-nums">{(m.total / 1000).toFixed(2)} t</dd></div>
                <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">From</dt><dd className="text-lg font-semibold tabular-nums">{m.bills} bills</dd></div>
                <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">Backed by verified bills</dt><dd className="text-lg font-semibold tabular-nums">{m.total ? Math.round((m.verified / m.total) * 100) : 0}%</dd></div>
              </dl>
            ) : (
              <div className="rounded-lg border p-4 text-sm space-y-3">
                <p>No bills dated in this period yet.</p>
                <Button asChild size="sm"><Link to="/dashboard">Upload bills</Link></Button>
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="declared">Or enter your own figure (t CO₂e)</Label>
                  <Input id="declared" inputMode="decimal" value={declared} onChange={(e) => setDeclared(e.target.value)} placeholder="120.5" />
                  <p className="text-xs text-muted-foreground">{r.company_name} sees it marked as your own number, without bills.</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground flex gap-2"><Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />{text}</p>
            <Button onClick={() => void share()} disabled={sharing || (!(m && m.total > 0) && !declared.trim())}>
              {sharing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Share with {r.company_name}
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
