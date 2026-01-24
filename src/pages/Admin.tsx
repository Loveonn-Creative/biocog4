import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Leaf, 
  Users,
  Loader2,
  Lock,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketplaceListing {
  id: string;
  sector: string;
  region: string;
  credits_available: number;
  price_per_tonne: number;
  verification_score: number;
  is_active: boolean;
  listed_at: string;
  msme_hash: string;
}

interface PartnerApplication {
  id: string;
  user_id: string;
  organization_name: string;
  organization_type: string;
  contact_email: string;
  website: string | null;
  status: string;
  created_at: string;
}

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  totalCredits: number;
  avgPrice: number;
  totalUsers: number;
  recentVerifications: number;
  pendingApplications: number;
  approvedPartners: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
  }, [sessionLoading, isAuthenticated, navigate]);

  const checkAdminAccess = async () => {
    if (!user?.id) return;
    
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roles) {
        setIsAdmin(true);
        await Promise.all([fetchListings(), fetchStats(), fetchApplications()]);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error checking admin access:', err);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .order('listed_at', { ascending: false });

    if (!error && data) {
      setListings(data);
    }
  };

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: listingsData } = await supabase
        .from('marketplace_listings')
        .select('credits_available, price_per_tonne, is_active');

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: verificationCount } = await supabase
        .from('carbon_verifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { count: pendingApps } = await supabase
        .from('partner_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: approvedPartners } = await supabase
        .from('partner_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (listingsData) {
        const activeListings = listingsData.filter(l => l.is_active);
        setStats({
          totalListings: listingsData.length,
          activeListings: activeListings.length,
          totalCredits: activeListings.reduce((sum, l) => sum + (l.credits_available || 0), 0),
          avgPrice: activeListings.length > 0
            ? Math.round(activeListings.reduce((sum, l) => sum + (l.price_per_tonne || 0), 0) / activeListings.length)
            : 0,
          totalUsers: userCount || 0,
          recentVerifications: verificationCount || 0,
          pendingApplications: pendingApps || 0,
          approvedPartners: approvedPartners || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const sendPartnerNotification = async (email: string, organization_name: string, decision: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase.functions.invoke('send-partner-notification', {
        body: { email, organization_name, decision }
      });
      if (error) console.error('Email notification failed:', error);
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  const handleApproveApplication = async (app: PartnerApplication) => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('partner_applications')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id 
        })
        .eq('id', app.id);

      if (updateError) throw updateError;

      // Create partner context for user
      const { error: contextError } = await supabase
        .from('user_contexts')
        .insert({
          user_id: app.user_id,
          context_type: 'partner',
          context_id: app.id,
          context_name: app.organization_name,
          is_active: false
        });

      if (contextError) throw contextError;

      // Send approval notification email
      await sendPartnerNotification(app.contact_email, app.organization_name, 'approved');

      toast.success(`Partner "${app.organization_name}" approved — notification sent`);
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (err) {
      console.error('Error approving application:', err);
      toast.error('Failed to approve application');
    }
  };

  const handleRejectApplication = async (app: PartnerApplication) => {
    try {
      const { error } = await supabase
        .from('partner_applications')
        .update({ 
          status: 'rejected', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id 
        })
        .eq('id', app.id);

      if (error) throw error;

      // Send rejection notification email
      await sendPartnerNotification(app.contact_email, app.organization_name, 'rejected');

      toast.success('Application rejected — notification sent');
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (err) {
      console.error('Error rejecting application:', err);
      toast.error('Failed to reject application');
    }
  };

  const toggleListingActive = async (id: string, currentState: boolean) => {
    try {
      await supabase
        .from('marketplace_listings')
        .update({ is_active: !currentState })
        .eq('id', id);

      setListings(prev => 
        prev.map(l => l.id === id ? { ...l, is_active: !currentState } : l)
      );
      toast.success(`Listing ${!currentState ? 'activated' : 'deactivated'}`);
      fetchStats();
    } catch (err) {
      toast.error('Failed to update listing');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  if (sessionLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
        <CarbonParticles />
        <Navigation onSignOut={() => navigate('/')} />
        
        <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground mb-4">
                You don't have admin privileges to access this dashboard.
              </p>
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
      <Helmet>
        <title>Admin Dashboard — Senseible</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      
      <CarbonParticles />
      <Navigation onSignOut={() => navigate('/')} />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground">
              Manage marketplace, partners, and platform settings
            </p>
          </div>
          <Button variant="outline" onClick={() => Promise.all([fetchListings(), fetchStats(), fetchApplications()])}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-bold">{stats.totalListings}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{stats.activeListings}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold">{stats.totalCredits.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Avg Price</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgPrice)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">7d Verifications</p>
                <p className="text-2xl font-bold">{stats.recentVerifications}</p>
              </CardContent>
            </Card>
            <Card className={stats.pendingApplications > 0 ? 'border-warning' : ''}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Pending Apps</p>
                <p className={`text-2xl font-bold ${stats.pendingApplications > 0 ? 'text-warning' : ''}`}>
                  {stats.pendingApplications}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Partners</p>
                <p className="text-2xl font-bold text-primary">{stats.approvedPartners}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings" className="gap-1">
              <Leaf className="w-4 h-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1">
              <Users className="w-4 h-4" />
              Applications
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Marketplace Listings</CardTitle>
                    <CardDescription>Manage carbon credit listings</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/marketplace">
                      View Marketplace
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {listings.map(listing => (
                    <div 
                      key={listing.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Leaf className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{listing.sector}</p>
                          <p className="text-sm text-muted-foreground">{listing.region}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium">{listing.credits_available.toLocaleString()} tCO₂e</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(listing.price_per_tonne)}/t</p>
                        </div>
                        
                        <Badge 
                          variant="secondary"
                          className={listing.verification_score >= 90 ? 'bg-success/10 text-success' : ''}
                        >
                          {listing.verification_score}%
                        </Badge>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {listing.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Switch
                            checked={listing.is_active}
                            onCheckedChange={() => toggleListingActive(listing.id, listing.is_active)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {listings.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Leaf className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No listings found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Partner Applications</CardTitle>
                <CardDescription>Review and approve partner registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {applications.map(app => (
                    <div 
                      key={app.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{app.organization_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{app.organization_type}</p>
                          <p className="text-xs text-muted-foreground">{app.contact_email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(app.created_at)}
                          </div>
                          {app.website && (
                            <a 
                              href={app.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                            >
                              Website
                            </a>
                          )}
                        </div>
                        
                        {app.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveApplication(app)}
                              className="gap-1"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleRejectApplication(app)}
                              className="gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Badge 
                            variant={app.status === 'approved' ? 'default' : 'destructive'}
                            className="capitalize"
                          >
                            {app.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {applications.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No applications yet</p>
                      <p className="text-sm mt-1">Partner applications will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platform Analytics</CardTitle>
                <CardDescription>Overview of platform performance</CardDescription>
              </CardHeader>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm mt-2">View detailed metrics and reports</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
