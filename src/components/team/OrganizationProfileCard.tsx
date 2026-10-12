import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { Organization } from '@/hooks/useOrganization';
import { getCountryList, getCountryConfig } from '@/lib/countryConfig';
import {
  COMPANY_SECTORS,
  COMPANY_SIZES,
  buildOrganizationUpdate,
  isOrganizationProfileEmpty,
  readOrganizationProfile,
  validateOrganizationProfile,
  type OrganizationProfile,
} from '@/lib/organizationProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  organization: Organization;
  canEdit: boolean;
  userId?: string;
  pendingMessage: string;
}

const labelOf = (list: { value: string; label: string }[], value: string) =>
  list.find(o => o.value === value)?.label || '';

export function OrganizationProfileCard({ organization, canEdit, userId, pendingMessage }: Props) {
  const queryClient = useQueryClient();
  const saved = useMemo(() => readOrganizationProfile(organization), [organization]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrganizationProfile>(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof OrganizationProfile, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const countries = useMemo(() => getCountryList(), []);
  const taxIdLabel = getCountryConfig(draft.country || 'India').taxIdLabel || 'Tax ID';

  useEffect(() => {
    if (!editing) setDraft(saved);
  }, [saved, editing]);

  const set = <K extends keyof OrganizationProfile>(key: K, value: OrganizationProfile[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // Owners often typed these on their personal profile already.
  const copyFromMyProfile = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('business_name, gstin, location, sector, size')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      toast.error('Could not read your business details.');
      return;
    }
    setDraft(prev => ({
      ...prev,
      name: prev.name || data.business_name || '',
      taxId: prev.taxId || (data.gstin || '').toUpperCase(),
      country: prev.country || (countries.some(c => c.value === data.location) ? data.location || '' : ''),
      sector: prev.sector || (COMPANY_SECTORS.some(s => s.value === data.sector) ? data.sector || '' : ''),
      size: prev.size || (COMPANY_SIZES.some(s => s.value === data.size) ? data.size || '' : ''),
    }));
  };

  const save = async () => {
    const found = validateOrganizationProfile(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const update = buildOrganizationUpdate(organization.metadata, draft);
      const { data, error } = await supabase
        .from('organizations')
        .update({ name: update.name, metadata: update.metadata as Json })
        .eq('id', organization.id)
        .select('id');
      if (error) {
        setSaveError(/permission denied/i.test(error.message) ? `${error.message}. ${pendingMessage}` : error.message);
        return;
      }
      if (!data || data.length === 0) {
        // RLS filtered the row: only the owner may edit.
        setSaveError('Only the organisation owner can edit this profile.');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setEditing(false);
      toast.success('Organisation profile saved');
    } finally {
      setIsSaving(false);
    }
  };

  const rows: [string, string][] = [
    [getCountryConfig(saved.country || 'India').taxIdLabel || 'Tax ID', saved.taxId],
    ['Sector', labelOf(COMPANY_SECTORS, saved.sector)],
    ['Country', saved.country],
    ['Size', labelOf(COMPANY_SIZES, saved.size)],
    ['Website', saved.website],
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4" />
            Organisation profile
          </CardTitle>
          <CardDescription>
            {canEdit ? 'Shared with everyone on your team.' : 'Set by the organisation owner.'}
          </CardDescription>
        </div>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div>
            <p className="text-lg font-semibold">{saved.name || 'Unnamed organisation'}</p>
            {isOrganizationProfileEmpty(saved) ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {canEdit ? 'Add your tax ID, sector and country so your team sees the same details.' : 'No details added yet.'}
              </p>
            ) : (
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
                {rows.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2 min-w-0">
                    <dt className="text-muted-foreground shrink-0">{k}</dt>
                    <dd className="font-medium truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org_profile_name">Organisation name</Label>
                <Input id="org_profile_name" value={draft.name} maxLength={120} onChange={e => set('name', e.target.value)} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="org_profile_tax">{taxIdLabel}</Label>
                <Input
                  id="org_profile_tax"
                  value={draft.taxId}
                  maxLength={20}
                  onChange={e => set('taxId', e.target.value.toUpperCase())}
                  placeholder={getCountryConfig(draft.country || 'India').taxIdPlaceholder}
                />
                {errors.taxId && <p className="text-xs text-destructive">{errors.taxId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select value={draft.sector} onValueChange={v => set('sector', v)}>
                  <SelectTrigger aria-label="Sector"><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SECTORS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={draft.size} onValueChange={v => set('size', v)}>
                  <SelectTrigger aria-label="Size"><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={draft.country} onValueChange={v => set('country', v)}>
                  <SelectTrigger aria-label="Country"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.code} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org_profile_web">Website</Label>
                <Input
                  id="org_profile_web"
                  value={draft.website}
                  maxLength={200}
                  onChange={e => set('website', e.target.value)}
                  placeholder="https://example.com"
                />
                {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
              </div>
            </div>
            {saveError && <p className="text-sm text-destructive" role="alert">{saveError}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save profile
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setErrors({});
                  setSaveError(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="button" variant="link" className="ml-auto px-0" onClick={copyFromMyProfile} disabled={isSaving}>
                Fill from my business details
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
