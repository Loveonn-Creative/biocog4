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
  LayoutDashboard, 
  Leaf, 
  ShoppingCart, 
  Users,
  Loader2,
  Lock,
  TrendingUp,
  ToggleRight,
  ExternalLink,
  RefreshCw
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

interface PurchaseRequest {
  id: string;
  listing_id: string;
  user_id: string;
  quantity: number;
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
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
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
      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (roles) {
        setIsAdmin(true);
        await Promise.all([fetchListings(), fetchStats()]);
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

  const fetchStats = async () => {
    try {
      // Get listing stats
      const { data: listingsData } = await supabase
        .from('marketplace_listings')
        .select('credits_available, price_per_tonne, is_active');

      // Get user count (profiles)
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get recent verifications count
      const { count: verificationCount } = await supabase
        .from('carbon_verifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

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
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
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
              Manage marketplace, users, and platform settings
            </p>
          </div>
          <Button variant="outline" onClick={() => Promise.all([fetchListings(), fetchStats()])}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings" className="gap-1">
              <Leaf className="w-4 h-4" />
              Listings
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
                    <Link to="/partner-marketplace">
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
