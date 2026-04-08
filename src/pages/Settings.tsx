import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Building2, Globe, Target, Shield, Save, Check, Layers, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getCountryList, getCountryConfig } from '@/lib/countryConfig';
import { useTrustLayerSettings, type TrustFeatureKey } from '@/hooks/useTrustLayerSettings';
import { Link } from 'react-router-dom';

interface CompanyProfile {
  businessName: string;
  sector: string;
  size: 'micro' | 'small' | 'medium' | 'large';
  location: string;
  gstin: string;
  exportsToEU: boolean;
  seekingFinance: boolean;
  hasNetZeroTarget: boolean;
}

const DEFAULT_PROFILE: CompanyProfile = {
  businessName: '',
  sector: 'manufacturing',
  size: 'small',
  location: 'India',
  gstin: '',
  exportsToEU: false,
  seekingFinance: true,
  hasNetZeroTarget: false,
};

const SECTORS = [
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'textile', label: 'Textile & Apparel' },
  { value: 'food_processing', label: 'Food Processing' },
  { value: 'chemicals', label: 'Chemicals & Pharma' },
  { value: 'logistics', label: 'Logistics & Transport' },
  { value: 'construction', label: 'Construction' },
  { value: 'services', label: 'Services' },
  { value: 'retail', label: 'Retail & Trading' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];

const Settings = () => {
  const { user, sessionId } = useSession();
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { prefs, toggleFeature, isPremium, features } = useTrustLayerSettings();

  const countryConfig = getCountryConfig(profile.location);
  const countries = getCountryList();

  useEffect(() => {
    loadProfile();
  }, [user?.id, sessionId]);

  const loadProfile = async () => {
    if (user?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setProfile({
          businessName: data.business_name || '',
          sector: data.sector || 'manufacturing',
          size: (data.size as CompanyProfile['size']) || 'small',
          location: data.location || 'India',
          gstin: data.gstin || '',
          exportsToEU: false,
          seekingFinance: true,
          hasNetZeroTarget: false,
        });
        
        const stored = localStorage.getItem('senseible_profile_triggers');
        if (stored) {
          const triggers = JSON.parse(stored);
          setProfile(prev => ({ ...prev, ...triggers }));
        }
      }
    } else {
      const stored = localStorage.getItem('senseible_company_profile');
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    
    try {
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            business_name: profile.businessName,
            sector: profile.sector,
            size: profile.size,
            location: profile.location,
            gstin: profile.gstin,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        
        localStorage.setItem('senseible_profile_triggers', JSON.stringify({
          exportsToEU: profile.exportsToEU,
          seekingFinance: profile.seekingFinance,
          hasNetZeroTarget: profile.hasNetZeroTarget,
        }));
      } else {
        localStorage.setItem('senseible_company_profile', JSON.stringify(profile));
      }
      
      setHasChanges(false);
      toast.success('Profile saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = (key: keyof CompanyProfile, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getTriggeredFrameworks = () => {
    const frameworks: string[] = [...countryConfig.frameworks, 'GRI', 'GHG Protocol'];
    
    if (profile.exportsToEU) {
      frameworks.push('CBAM', 'CSRD/ESRS', 'ISSB');
    }
    if (profile.seekingFinance) {
      frameworks.push('TCFD', 'CDP');
    }
    if (profile.hasNetZeroTarget) {
      frameworks.push('SBTi', 'UN SDGs');
    }
    
    return [...new Set(frameworks)];
  };

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet>
        <title>Settings — Senseible</title>
        <meta name="description" content="Configure your company profile and framework preferences." />
      </Helmet>
      
      <CarbonParticles />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Configure your company profile to auto-trigger relevant reporting frameworks
          </p>
        </div>

        <div className="space-y-6">
          {/* Company Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={profile.businessName}
                    onChange={e => updateProfile('businessName', e.target.value)}
                    placeholder="Your company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstin">{countryConfig.taxIdLabel}</Label>
                  <Input
                    id="gstin"
                    value={profile.gstin}
                    onChange={e => updateProfile('gstin', e.target.value)}
                    placeholder={countryConfig.taxIdPlaceholder}
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sector">Industry Sector</Label>
                  <Select value={profile.sector} onValueChange={v => updateProfile('sector', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
                  <Select value={profile.size} onValueChange={v => updateProfile('size', v as CompanyProfile['size'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="micro">Micro (&lt;10 employees)</SelectItem>
                      <SelectItem value="small">Small (10-50 employees)</SelectItem>
                      <SelectItem value="medium">Medium (50-250 employees)</SelectItem>
                      <SelectItem value="large">Large (&gt;250 employees)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Country</Label>
                <Select value={profile.location} onValueChange={v => updateProfile('location', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(c => (
                      <SelectItem key={c.code} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Grid factor: {countryConfig.gridFactor} kgCO₂e/kWh • Gov body: {countryConfig.govBody}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Framework Triggers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Reporting Framework Triggers
              </CardTitle>
              <CardDescription>
                These settings automatically include relevant frameworks in your reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exports to EU</Label>
                  <p className="text-sm text-muted-foreground">
                    Enables CBAM, CSRD/ESRS, and ISSB compliance
                  </p>
                </div>
                <Switch
                  checked={profile.exportsToEU}
                  onCheckedChange={v => updateProfile('exportsToEU', v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Seeking Green Finance</Label>
                  <p className="text-sm text-muted-foreground">
                    Enables TCFD, CDP, and investor-focused disclosures
                  </p>
                </div>
                <Switch
                  checked={profile.seekingFinance}
                  onCheckedChange={v => updateProfile('seekingFinance', v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Net-Zero Commitment</Label>
                  <p className="text-sm text-muted-foreground">
                    Enables SBTi, UN SDGs, and TNFD frameworks
                  </p>
                </div>
                <Switch
                  checked={profile.hasNetZeroTarget}
                  onCheckedChange={v => updateProfile('hasNetZeroTarget', v)}
                />
              </div>

              {/* Active Frameworks Preview */}
              <div className="pt-4 border-t">
                <Label className="text-sm text-muted-foreground mb-3 block">
                  Active Frameworks in Reports:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {getTriggeredFrameworks().map(fw => (
                    <span
                      key={fw}
                      className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Layer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Trust Layer Controls
              </CardTitle>
              <CardDescription>
                Toggle advanced trust & transparency features. Trust Score and Confidence Band are always visible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPremium && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 mb-4">
                  <div className="flex items-center gap-2 text-sm text-warning font-medium">
                    <Lock className="h-4 w-4" />
                    <span>Upgrade to unlock Trust Layer controls</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    These features are available on Essential plan and above.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link to="/pricing">View Plans</Link>
                  </Button>
                </div>
              )}
              {features.map(feature => (
                <div key={feature.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className={!isPremium ? 'text-muted-foreground' : ''}>{feature.label}</Label>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                  <Switch
                    checked={isPremium && (prefs[feature.key] ?? false)}
                    onCheckedChange={() => toggleFeature(feature.key)}
                    disabled={!isPremium}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Data Storage Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Data Storage</h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.id 
                      ? "Your profile is securely stored in the cloud and synced across devices."
                      : "As a guest, your profile is stored locally in this browser. Sign up to sync across devices and enable premium features."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="default"
              onClick={saveProfile}
              disabled={isSaving || !hasChanges}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </span>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
