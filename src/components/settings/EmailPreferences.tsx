import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Email preferences (public.email_preferences, one row per account; no row
// means everything on). Plan and payment emails always send and are listed
// for clarity only. Until the migration is applied the table does not exist
// and this card is not shown.

type Prefs = { record_tips: boolean; supplier_summary: boolean };
type Key = keyof Prefs;
const DEFAULTS: Prefs = { record_tips: true, supplier_summary: true };
// Each switch shows only once its email is sending; until then it would control nothing.
const LIVE = { record_tips: false, supplier_summary: false };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in the generated types until the migration is applied
const table = () => (supabase as any).from('email_preferences');

export function EmailPreferences({ userId, enterprise }: { userId: string; enterprise: boolean }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [exists, setExists] = useState(false);
  const [saving, setSaving] = useState<Key | null>(null);

  useEffect(() => {
    let live = true;
    table().select('record_tips, supplier_summary').eq('user_id', userId).maybeSingle()
      .then(({ data, error }: { data: Prefs | null; error: unknown }) => {
        if (!live || error) return;
        setExists(!!data);
        setPrefs(data ?? DEFAULTS);
      });
    return () => { live = false; };
  }, [userId]);

  if (!prefs) return null;

  const set = async (key: Key, value: boolean) => {
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSaving(key);
    const { error } = exists
      ? await table().update({ [key]: value, updated_at: new Date().toISOString() }).eq('user_id', userId)
      : await table().insert({ user_id: userId, ...prefs, [key]: value });
    setSaving(null);
    if (error) { setPrefs(prev); toast.error('Could not save this setting. Try again.'); return; }
    setExists(true);
  };

  return (
    <Card id="emails" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Emails</CardTitle>
        <CardDescription>{LIVE.record_tips || (enterprise && LIVE.supplier_summary) ? 'Choose what reaches your inbox.' : 'What we email you about.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Plan and payments</p>
            <p className="text-xs text-muted-foreground">Receipts, invoices and a reminder before your plan ends.</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Always on</span>
        </div>
        {LIVE.record_tips && (
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="email-record-tips">Tips on your records</Label>
            <p className="text-xs text-muted-foreground">A short note when a bill is missing or records are waiting to be verified. One a week at most.</p>
          </div>
          <Switch id="email-record-tips" checked={prefs.record_tips} disabled={saving !== null} onCheckedChange={(c) => set('record_tips', c)} />
        </div>
        )}
        {enterprise && LIVE.supplier_summary && (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="email-supplier-summary">Supplier summary</Label>
              <p className="text-xs text-muted-foreground">A Monday round-up of supplier replies. Skipped when nothing changed.</p>
            </div>
            <Switch id="email-supplier-summary" checked={prefs.supplier_summary} disabled={saving !== null} onCheckedChange={(c) => set('supplier_summary', c)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EmailPreferences;
