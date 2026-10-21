import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Loader2, Lock, LogOut, Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useWorkspace } from '@/hooks/useWorkspace';
import { applyScope } from '@/lib/workspaceScope';
import { hasPasswordIdentity } from '@/lib/authIdentity';
import { EMAIL_REDIRECT_URL } from '@/lib/authLink';
import { buildAccountExport } from '@/lib/accountExport';

// Security & data: sign out everywhere, download your own records (Scale),
// and change the sign-in email with both inboxes confirming.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function SignOutEverywhere() {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setBusy(false);
    if (error) { toast.error('Could not sign out everywhere. Check your connection and try again.'); return; }
    toast.success('Signed out on every device.');
    navigate('/auth');
  };
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium"><LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Sign out of all devices</p>
        <p className="text-xs text-muted-foreground">Lost a phone or used a shared computer? End every session, including this one.</p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={() => void go()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign out everywhere'}</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setConfirming(true)}>Sign out all</Button>
      )}
    </div>
  );
}

function DownloadMyData() {
  const { tier } = usePremiumStatus();
  const { scope, ready } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const allowed = tier === 'scale';
  const download = async () => {
    if (!allowed || !ready) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('signed out');
      const scoped = <T,>(q: T) => applyScope(q as never, scope) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }> | null;
      const q = (table: string, cols: string) => scoped(supabase.from(table as never).select(cols).order('created_at', { ascending: true }).limit(10000));
      const [profile, documents, emissions, verifications, ledger] = await Promise.all([
        supabase.from('profiles').select('business_name, gstin, sector, size, location').eq('id', uid).maybeSingle(),
        q('documents', 'id, created_at, invoice_date, vendor, document_type, invoice_number, amount, currency'),
        q('emissions', 'id, document_id, created_at, scope, category, activity_data, activity_unit, emission_factor, co2_kg, verified, data_quality'),
        q('carbon_verifications', 'created_at, verification_status, verification_score, total_co2_kg'),
        q('compliance_ledger', 'document_id, created_at, invoice_date, vendor, scope, activity_data, activity_unit, emission_factor, factor_source, methodology_version, co2_kg, verification_status'),
      ]);
      const rows = (r: Awaited<NonNullable<ReturnType<typeof q>>> | null) => (r && !r.error ? r.data ?? [] : []);
      const today = new Date().toISOString().slice(0, 10);
      const sheets = buildAccountExport({
        profile: (profile.data as Record<string, unknown> | null) ?? null,
        documents: rows(await documents), emissions: rows(await emissions), verifications: rows(await verifications), ledger: rows(await ledger),
      }, today);
      const XLSX = await import('xlsx');
      const book = XLSX.utils.book_new();
      for (const s of sheets) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ '': 'Nothing yet' }]), s.name);
      XLSX.writeFile(book, `senseible-my-data-${today}.xlsx`);
      toast.success('Your data is downloading.');
    } catch {
      toast.error('Could not prepare your data. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium"><Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Download my data</p>
        <p className="text-xs text-muted-foreground">Documents, emissions, verifications and the audit ledger in one spreadsheet. Original files and private records stay private.</p>
      </div>
      {allowed ? (
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => void download()} disabled={busy || !ready}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Download'}</Button>
      ) : (
        <Link to="/pricing" className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Opens on Scale</Link>
      )}
    </div>
  );
}

function ChangeEmail({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const canUsePassword = hasPasswordIdentity(user);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = email.trim().toLowerCase();
    if (!EMAIL.test(next)) { toast.error('Enter a valid email address.'); return; }
    if (next === (user.email ?? '').toLowerCase()) { toast.error('That is already your email.'); return; }
    if (!password) { toast.error('Enter your current password.'); return; }
    setBusy(true);
    try {
      // Prove it is really the owner before the address can move.
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password });
      if (authError) { toast.error('That password is not right.'); return; }
      const { error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: EMAIL_REDIRECT_URL });
      if (error) {
        const taken = /already|registered|exists/i.test(error.message);
        const limited = error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit';
        toast.error(taken ? 'That email is already used by another account.' : limited ? 'Too many attempts. Wait a few minutes and try again.' : 'Could not start the change. Try again.');
        return;
      }
      setSentTo(next);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Change email</p>
          <p className="text-xs text-muted-foreground">{canUsePassword ? `Signed in as ${user.email}.` : 'You sign in with Google, so your email follows your Google account.'}</p>
        </div>
        {canUsePassword && !open && !sentTo && <Button size="sm" variant="outline" className="shrink-0" onClick={() => setOpen(true)}>Change</Button>}
      </div>
      {sentTo ? (
        <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm" role="status">Check both inboxes. Your email changes to <span className="font-medium">{sentTo}</span> only after you open the link sent to each address. Until then, keep signing in with {user.email}.</p>
      ) : open && (
        <form onSubmit={(e) => void submit(e)} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="new-email">New email</Label>
            <Input id="new-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email-password">Current password</Label>
            <Input id="email-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send confirmation links'}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); setPassword(''); }} disabled={busy}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function SecurityDataCard({ user }: { user: User | null }) {
  if (!user) return null;
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Security and data</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <SignOutEverywhere />
        <ChangeEmail user={user} />
        <DownloadMyData />
      </CardContent>
    </Card>
  );
}
