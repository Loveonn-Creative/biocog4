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
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, Building, Phone, MapPin, CreditCard, Shield, 
  Loader2, Save, Crown, Sparkles, Zap, Building2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const tierIcons = {
  snapshot: Sparkles,
  basic: Zap,
  pro: Crown,
  scale: Building2,
};

const tierColors = {
  snapshot: 'bg-muted',
  basic: 'bg-blue-500/10 border-blue-500/20',
  pro: 'bg-primary/10 border-primary/20',
  scale: 'bg-amber-500/10 border-amber-500/20',
};

interface ProfileData {
  business_name: string;
  phone: string;
  gstin: string;
  location: string;
  sector: string;
  size: string;
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, sessionLoading, navigate]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      try {
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
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
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

  const TierIcon = tierIcons[tier];

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
          <Card className={`${tierColors[tier]} border`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-background">
                    <TierIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      Biocog {tier.charAt(0).toUpperCase() + tier.slice(1)}
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
              <CardDescription>Your login details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
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

              <div className="flex justify-end pt-4">
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
