import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, Building, Phone, MapPin, Shield, 
  Loader2, Save, Crown, Sparkles, Zap, Building2,
  ShieldCheck, FileCheck, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EnterpriseModeCard } from '@/components/enterprise/EnterpriseModeCard';

const tierIcons = {
  snapshot: Sparkles,
  essential: Zap,
  basic: Zap, // Legacy mapping
  pro: Crown,
  scale: Building2,
};

const tierColors = {
  snapshot: 'bg-muted',
  essential: 'bg-blue-500/10 border-blue-500/20',
  basic: 'bg-blue-500/10 border-blue-500/20', // Legacy mapping
  pro: 'bg-primary/10 border-primary/20',
  scale: 'bg-amber-500/10 border-amber-500/20',
};

const tierLabels: Record<string, string> = {
  snapshot: 'Snapshot',
  essential: 'Essential',
  basic: 'Essential', // Legacy mapping
  pro: 'Pro',
  scale: 'Scale',
};

const roleOptions = [
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'finance_lead', label: 'Finance Lead' },
  { value: 'sustainability_head', label: 'Sustainability Head' },
  { value: 'other', label: 'Other' },
];

interface ProfileData {
  business_name: string;
  phone: string;
  gstin: string;
  location: string;
  sector: string;
  size: string;
  role: string;
  data_consent: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const { tier, isPremium } = usePremiumStatus();
  
  const [profile, setProfile] = useState<ProfileData>({
    business_name: '',
    phone: '',
    gstin: '',
    location: '',
    sector: '',
    size: '',
    role: '',
    data_consent: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'pending' | 'unverified'>('unverified');

  // Redirect if not authenticated or if partner (partners go to PartnerProfile)
  useEffect(() => {
    const checkContext = async () => {
      if (!sessionLoading && !isAuthenticated) {
        navigate('/auth');
        return;
      }
      
      if (user?.id) {
        // Check if user is a partner - redirect to partner profile
        const { data: contextData } = await supabase
          .from('user_contexts')
          .select('context_type')
          .eq('user_id', user.id)
          .eq('context_type', 'partner')
          .eq('is_active', true);
        
        if (contextData && contextData.length > 0) {
          navigate('/partner-profile');
        }
      }
    };
    
    checkContext();
  }, [isAuthenticated, sessionLoading, navigate, user?.id]);

  // Fetch profile data and verification status
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        // Fetch profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfile({
            business_name: data.business_name || '',
            phone: data.phone || '',
            gstin: data.gstin || '',
            location: data.location || '',
            sector: data.sector || '',
            size: data.size || '',
            role: data.role || '',
            data_consent: data.data_consent || false,
          });
        }

        // Fetch latest verification status
        const { data: verifications } = await supabase
          .from('carbon_verifications')
          .select('verification_status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (verifications && verifications.length > 0) {
          const status = verifications[0].verification_status;
          if (status === 'verified') {
            setVerificationStatus('verified');
          } else if (status === 'pending' || status === 'needs_review') {
            setVerificationStatus('pending');
          } else {
            setVerificationStatus('unverified');
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: profile.business_name,
          phone: profile.phone,
          gstin: profile.gstin,
          location: profile.location,
          sector: profile.sector,
          size: profile.size,
          role: profile.role,
          data_consent: profile.data_consent,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const TierIcon = tierIcons[tier] || Sparkles;
  const tierLabel = tierLabels[tier] || 'Snapshot';

  const VerificationIcon = verificationStatus === 'verified' 
    ? ShieldCheck 
    : verificationStatus === 'pending' 
    ? FileCheck 
    : AlertCircle;

  const verificationColors = {
    verified: 'text-success bg-success/10',
    pending: 'text-amber-500 bg-amber-500/10',
    unverified: 'text-muted-foreground bg-muted',
  };

  const verificationLabels = {
    verified: 'Verified',
    pending: 'Pending Review',
    unverified: 'Not Verified',
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Helmet>
        <title>Profile — Senseible</title>
        <meta name="description" content="Manage your Senseible profile and business information." />
      </Helmet>

      <Navigation />

      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Manage your account and business details</p>
        </div>

        <div className="grid gap-6">
          {/* Subscription Card */}
          <Card className={`${tierColors[tier] || tierColors.snapshot} border`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-background">
                    <TierIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      Biocog {tierLabel}
                      {isPremium && <Badge variant="secondary">Active</Badge>}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tier === 'snapshot' ? 'Free forever' : 'Paid subscription'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/subscription">
                    {tier === 'snapshot' ? 'Upgrade' : 'Manage'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your login and role details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Your Role</Label>
                <Select
                  value={profile.role}
                  onValueChange={(value) => setProfile({ ...profile, role: value })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Business Details
              </CardTitle>
              <CardDescription>Information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={profile.business_name}
                    onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                    placeholder="Your company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={profile.gstin}
                    onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="Mumbai, Maharashtra"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector</Label>
                  <Input
                    id="sector"
                    value={profile.sector}
                    onChange={(e) => setProfile({ ...profile, sector: e.target.value })}
                    placeholder="Manufacturing, IT, Retail..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
                  <Input
                    id="size"
                    value={profile.size}
                    onChange={(e) => setProfile({ ...profile, size: e.target.value })}
                    placeholder="10-50 employees"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Data & Privacy
              </CardTitle>
              <CardDescription>Manage your data preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Consent Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label htmlFor="data_consent" className="font-medium">
                    AI Data Processing
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow AI to analyze your business data for personalized insights
                  </p>
                </div>
                <Switch
                  id="data_consent"
                  checked={profile.data_consent}
                  onCheckedChange={(checked) => setProfile({ ...profile, data_consent: checked })}
                />
              </div>

              {/* Verification Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <Label className="font-medium">Verification Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Your carbon data verification status
                  </p>
                </div>
                <Badge className={`${verificationColors[verificationStatus]} flex items-center gap-1.5`}>
                  <VerificationIcon className="w-3.5 h-3.5" />
                  {verificationLabels[verificationStatus]}
                </Badge>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enterprise Mode */}
          <EnterpriseModeCard />

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/auth">Change Password</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
