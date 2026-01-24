import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { Navigation } from '@/components/Navigation';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Leaf, 
  MapPin, 
  Shield, 
  Loader2,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketplaceListing {
  id: string;
  credits_available: number;
  price_per_tonne: number;
  sdg_alignment: number[];
  verification_score: number;
  sector: string;
  region: string;
  vintage: string;
  methodology: string;
  currency: string;
  is_active: boolean;
  listed_at: string;
  msme_hash: string;
}

const SECTORS = [
  'All Sectors',
  'Textiles',
  'Manufacturing',
  'Agriculture',
  'Logistics',
  'Food Processing',
  'Construction',
  'Renewable Energy',
];

const REGIONS = [
  'All Regions',
  'North India',
  'South India',
  'West India',
  'East India',
  'Central India',
];

const SDG_GOALS: Record<number, { name: string; color: string }> = {
  1: { name: 'No Poverty', color: '#E5243B' },
  7: { name: 'Clean Energy', color: '#FCC30B' },
  8: { name: 'Decent Work', color: '#A21942' },
  9: { name: 'Industry', color: '#FD6925' },
  12: { name: 'Responsible Consumption', color: '#BF8B2E' },
  13: { name: 'Climate Action', color: '#3F7E44' },
};

const PartnerMarketplace = () => {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All Sectors');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [minScore, setMinScore] = useState(0);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState(1);
  
  // Role-based access
  const [isPartner, setIsPartner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  // Check user role/context
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setCheckingAccess(false);
        return;
      }
      
      try {
        // Check for admin role
        const { data: adminData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        const hasAdmin = adminData && adminData.length > 0;
        setIsAdmin(hasAdmin);
        
        // Check for partner context
        const { data: contextData } = await supabase
          .from('user_contexts')
          .select('context_type')
          .eq('user_id', user.id)
          .eq('context_type', 'partner');
        
        const hasPartner = contextData && contextData.length > 0;
        setIsPartner(hasPartner);
        
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
    }
  }, [user?.id, isAuthenticated, sessionLoading]);
  
  const canPurchase = isPartner || isAdmin;

  useEffect(() => {
    fetchListings();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('marketplace-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_listings',
          filter: 'is_active=eq.true',
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('is_active', true)
        .order('verification_score', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      toast.error('Failed to load marketplace listings');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSector = listing.sector?.toLowerCase().includes(query);
        const matchesRegion = listing.region?.toLowerCase().includes(query);
        const matchesMethodology = listing.methodology?.toLowerCase().includes(query);
        if (!matchesSector && !matchesRegion && !matchesMethodology) return false;
      }

      // Sector filter
      if (selectedSector !== 'All Sectors' && listing.sector !== selectedSector) {
        return false;
      }

      // Region filter
      if (selectedRegion !== 'All Regions' && listing.region !== selectedRegion) {
        return false;
      }

      // Price filter
      const price = listing.price_per_tonne || 0;
      if (price < priceRange[0] || price > priceRange[1]) {
        return false;
      }

      // Verification score filter
      if ((listing.verification_score || 0) < minScore) {
        return false;
      }

      return true;
    });
  }, [listings, searchQuery, selectedSector, selectedRegion, priceRange, minScore]);

  const totalCredits = useMemo(() => {
    return filteredListings.reduce((sum, l) => sum + l.credits_available, 0);
  }, [filteredListings]);

  const avgPrice = useMemo(() => {
    if (filteredListings.length === 0) return 0;
    const total = filteredListings.reduce((sum, l) => sum + (l.price_per_tonne || 0), 0);
    return total / filteredListings.length;
  }, [filteredListings]);

  const handlePurchaseIntent = (listing: MarketplaceListing) => {
    if (!isAuthenticated) {
      toast.info('Please sign in to purchase carbon credits');
      return;
    }
    if (!canPurchase) {
      toast.info('Partner access required to purchase. Apply to become a partner.');
      return;
    }
    setSelectedListing(listing);
    setPurchaseAmount(1);
  };

  const handleSubmitPurchase = () => {
    if (!selectedListing || !canPurchase) return;
    
    // In real implementation, this would create a purchase intent
    toast.success('Purchase request submitted! Our team will contact you shortly.');
    setSelectedListing(null);
  };

  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
      <SEOHead
        title="Carbon Credit Marketplace — Verified MSME Credits"
        description="Browse and purchase verified carbon credits directly from Indian MSMEs. Transparent pricing, MRV-backed verification, and SDG-aligned projects."
        canonical="/marketplace"
        keywords={['carbon credits', 'buy carbon credits', 'MSME carbon', 'India carbon market', 'verified credits']}
      />
      
      <CarbonParticles />
      <Navigation onSignOut={() => {}} />

      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Partner CTA for non-partners */}
        {!checkingAccess && isAuthenticated && !canPurchase && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-primary" />
                <p className="text-sm">
                  <span className="font-medium">Want to purchase credits directly?</span>{' '}
                  <span className="text-muted-foreground">Become a partner to unlock full marketplace access.</span>
                </p>
              </div>
              <Button size="sm" asChild>
                <Link to="/partners">Apply Now</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Carbon Credit Marketplace
            </h1>
            <p className="text-muted-foreground">
              Verified credits from India's MSME network • Real-time listings
            </p>
          </div>
          <Button variant="outline" onClick={fetchListings} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Available Credits</p>
              <p className="text-2xl font-bold">{totalCredits.toLocaleString()} tCO₂e</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Active Listings</p>
              <p className="text-2xl font-bold">{filteredListings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Avg. Price/tonne</p>
              <p className="text-2xl font-bold">{formatCurrency(avgPrice)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">Sectors</p>
              <p className="text-2xl font-bold">{new Set(listings.map(l => l.sector)).size}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sector, region, methodology..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Min Score:</span>
                <Slider
                  value={[minScore]}
                  onValueChange={(v) => setMinScore(v[0])}
                  max={100}
                  step={10}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-8">{minScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredListings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Leaf className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No listings found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or check back later for new listings.
              </p>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setSelectedSector('All Sectors');
                setSelectedRegion('All Regions');
                setPriceRange([0, 5000]);
                setMinScore(0);
              }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Leaf className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{listing.sector || 'General'}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {listing.region || 'India'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={listing.verification_score >= 90 ? 'bg-success/10 text-success' : ''}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {listing.verification_score || 0}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-semibold">{listing.credits_available.toLocaleString()} tCO₂e</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price/tonne</p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(listing.price_per_tonne || 0, listing.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vintage</p>
                      <p className="font-medium">{listing.vintage || 'Current'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Methodology</p>
                      <p className="font-medium text-xs">{listing.methodology || 'IPCC'}</p>
                    </div>
                  </div>

                  {/* SDG Alignment */}
                  {listing.sdg_alignment && listing.sdg_alignment.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">SDG Alignment</p>
                      <div className="flex gap-1 flex-wrap">
                        {listing.sdg_alignment.slice(0, 4).map((goal) => (
                          <div
                            key={goal}
                            className="w-6 h-6 rounded text-white text-xs flex items-center justify-center font-bold"
                            style={{ backgroundColor: SDG_GOALS[goal]?.color || '#999' }}
                            title={SDG_GOALS[goal]?.name}
                          >
                            {goal}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      MSME #{listing.msme_hash?.slice(0, 8)}
                    </p>
                    {canPurchase ? (
                      <Button size="sm" onClick={() => handlePurchaseIntent(listing)}>
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Purchase
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/partners">
                          <Info className="w-4 h-4 mr-1" />
                          Contact
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Purchase Dialog */}
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase Carbon Credits</DialogTitle>
              <DialogDescription>
                Complete your purchase request for verified MSME carbon credits.
              </DialogDescription>
            </DialogHeader>

            {selectedListing && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Leaf className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{selectedListing.sector}</p>
                      <p className="text-sm text-muted-foreground">{selectedListing.region}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-semibold">{selectedListing.credits_available} tCO₂e</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unit Price</p>
                      <p className="font-semibold text-primary">
                        {formatCurrency(selectedListing.price_per_tonne)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Quantity (tCO₂e)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedListing.credits_available}
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(Math.min(
                      parseInt(e.target.value) || 1,
                      selectedListing.credits_available
                    ))}
                  />
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Subtotal</span>
                    <span>{formatCurrency(purchaseAmount * selectedListing.price_per_tonne)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(purchaseAmount * selectedListing.price_per_tonne)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-sm">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    This is a purchase request. Our team will verify the listing and contact you 
                    to complete the transaction.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedListing(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitPurchase}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Trust Banner */}
        <Card className="mt-8 bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-semibold">MRV-Backed Verification</p>
                  <p className="text-sm text-muted-foreground">
                    All credits are verified using AI-powered MRV technology
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to="/about">Learn About Our Process</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PartnerMarketplace;
