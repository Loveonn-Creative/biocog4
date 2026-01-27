import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, Phone, Globe, Shield, 
  Loader2, Save, Handshake, Key, 
  BarChart3, ShoppingCart, FileCheck,
  ShieldAlert
} from 'lucide-react';

interface PartnerData {
  organization_name: string;
  organization_type: string;
  contact_email: string;
  website: string;
  phone: string;
  status: string;
}

const orgTypeLabels: Record<string, string> = {
  'carbon-buyers': 'Carbon Credit Buyer',
  'banks': 'Bank / Financial Institution',
  'erp': 'ERP / Software Platform',
  'auditors': 'Auditor / Verifier',
  'other': 'Other Partner',
};

const PartnerProfile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  
  const [partnerData, setPartnerData] = useState<PartnerData>({
    organization_name: '',
    organization_type: '',
    contact_email: '',
    website: '',
    phone: '',
    status: 'pending',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check partner access
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setCheckingAccess(false);
        return;
      }
      
      try {
        const { data: contextData } = await supabase
          .from('user_contexts')
          .select('context_type')
          .eq('user_id', user.id)
          .eq('context_type', 'partner');
        
        const hasPartner = contextData && contextData.length > 0;
        setIsPartner(hasPartner);
        
        if (!hasPartner) {
          // Redirect MSME users to regular profile
          navigate('/profile');
          return;
        }
      } catch (err) {
        console.error('Error checking access:', err);
      } finally {
        setCheckingAccess(false);
      }
    };
    
    if (isAuthenticated) {
      checkAccess();
    } else if (!sessionLoading) {
      setCheckingAccess(false);
      navigate('/auth');
    }
  }, [user?.id, isAuthenticated, sessionLoading, navigate]);

  // Fetch partner application data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !isPartner) return;
      
      try {
        const { data, error } = await supabase
          .from('partner_applications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setPartnerData({
            organization_name: data.organization_name || '',
            organization_type: data.organization_type || '',
            contact_email: data.contact_email || user.email || '',
            website: data.website || '',
            phone: '',
            status: data.status || 'pending',
          });
        }
      } catch (error) {
        console.error('Error fetching partner data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isPartner) {
      fetchData();
    }
  }, [user?.id, isPartner]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Update partner application
      const { error } = await supabase
        .from('partner_applications')
        .update({
          organization_name: partnerData.organization_name,
          contact_email: partnerData.contact_email,
          website: partnerData.website,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Partner profile updated successfully');
    } catch (error) {
      console.error('Error saving partner profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionLoading || checkingAccess || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isPartner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-8 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-semibold mb-2">Partner Access Required</h1>
            <p className="text-muted-foreground mb-6">
              This profile is for verified partners only.
            </p>
            <Button asChild>
              <Link to="/partners">Become a Partner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    approved: 'bg-success/10 text-success border-success/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Helmet>
        <title>Partner Profile — Senseible</title>
        <meta name="description" content="Manage your Senseible partner profile and organization settings." />
      </Helmet>

      <Navigation />

      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">Partner Profile</h1>
            <Badge className={statusColors[partnerData.status as keyof typeof statusColors] || statusColors.pending}>
              {partnerData.status === 'approved' ? 'Verified' : partnerData.status === 'pending' ? 'Pending Review' : 'Under Review'}
            </Badge>
          </div>
          <p className="text-muted-foreground">Manage your partner organization and access settings</p>
        </div>

        <div className="grid gap-6">
          {/* Partner Status Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-background">
                    <Handshake className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {orgTypeLabels[partnerData.organization_type] || 'Partner Organization'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {partnerData.status === 'approved' ? 'Full access to partner features' : 'Application under review'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/partner-dashboard">
                    Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization Information
              </CardTitle>
              <CardDescription>Your partner organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org_name">Organization Name</Label>
                <Input
                  id="org_name"
                  value={partnerData.organization_name}
                  onChange={(e) => setPartnerData({ ...partnerData, organization_name: e.target.value })}
                  placeholder="Your organization name"
                />
              </div>

              <div className="space-y-2">
                <Label>Organization Type</Label>
                <Input 
                  value={orgTypeLabels[partnerData.organization_type] || partnerData.organization_type} 
                  disabled 
                  className="bg-muted" 
                />
                <p className="text-xs text-muted-foreground">
                  Organization type cannot be changed. Contact support if needed.
                </p>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email" className="flex items-center gap-2">
                    Contact Email
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={partnerData.contact_email}
                    onChange={(e) => setPartnerData({ ...partnerData, contact_email: e.target.value })}
                    placeholder="partner@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={partnerData.website}
                    onChange={(e) => setPartnerData({ ...partnerData, website: e.target.value })}
                    placeholder="https://company.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partner Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Partner Access
              </CardTitle>
              <CardDescription>Your available partner features and modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Marketplace Access</p>
                    <p className="text-xs text-muted-foreground">Browse and purchase carbon credits</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Partner Dashboard</p>
                    <p className="text-xs text-muted-foreground">View cluster analytics and MSME data</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Credit Reports</p>
                    <p className="text-xs text-muted-foreground">Download verification and audit packs</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 opacity-50">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">API Access</p>
                    <p className="text-xs text-muted-foreground">Coming soon for approved partners</p>
                  </div>
                </div>
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
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" asChild>
                <Link to="/auth">Change Password</Link>
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PartnerProfile;
