import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileBarChart, Download, ArrowLeft, Briefcase, ShoppingCart, 
  FileCheck, Clock, CheckCircle, Loader2, ShieldAlert, Package
} from 'lucide-react';
import { CarbonParticles } from '@/components/CarbonParticles';
import { ComplianceSignals } from '@/components/partner/ComplianceSignals';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

interface PurchaseRecord {
  id: string;
  listing_id: string;
  quantity: number;
  price_per_tonne: number;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  purchased_at: string;
  msme_hash: string;
  sector: string;
  vintage: string;
}

interface PortfolioSummary {
  totalCredits: number;
  activeCredits: number;
  retiredCredits: number;
  totalInvested: number;
  averagePrice: number;
}

const PartnerReports = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const [isPartner, setIsPartner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    totalCredits: 0,
    activeCredits: 0,
    retiredCredits: 0,
    totalInvested: 0,
    averagePrice: 0,
  });

  // Check access
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setCheckingAccess(false);
        return;
      }
      
      try {
        const { data: adminData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        setIsAdmin(adminData && adminData.length > 0);
        
        const { data: contextData } = await supabase
          .from('user_contexts')
          .select('context_type')
          .eq('user_id', user.id)
          .eq('context_type', 'partner');
        
        setIsPartner(contextData && contextData.length > 0);
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

  const hasAccess = isPartner || isAdmin;

  useEffect(() => {
    if (hasAccess) {
      fetchPurchaseData();
    }
  }, [hasAccess]);

  const fetchPurchaseData = async () => {
    try {
      // Mock purchase data - in production, this would come from a purchases table
      const mockPurchases: PurchaseRecord[] = [
        {
          id: 'PUR-001',
          listing_id: 'LST-A1B2',
          quantity: 50,
          price_per_tonne: 650,
          total_amount: 32500,
          status: 'completed',
          purchased_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          msme_hash: 'MSME-7X9K',
          sector: 'Textiles',
          vintage: '2024',
        },
        {
          id: 'PUR-002',
          listing_id: 'LST-C3D4',
          quantity: 25,
          price_per_tonne: 720,
          total_amount: 18000,
          status: 'completed',
          purchased_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          msme_hash: 'MSME-4P2Q',
          sector: 'Manufacturing',
          vintage: '2024',
        },
        {
          id: 'PUR-003',
          listing_id: 'LST-E5F6',
          quantity: 100,
          price_per_tonne: 580,
          total_amount: 58000,
          status: 'pending',
          purchased_at: new Date().toISOString(),
          msme_hash: 'MSME-8R3S',
          sector: 'Food Processing',
          vintage: '2025',
        },
      ];

      setPurchases(mockPurchases);

      // Calculate portfolio summary
      const completed = mockPurchases.filter(p => p.status === 'completed');
      const totalCredits = completed.reduce((sum, p) => sum + p.quantity, 0);
      const totalInvested = completed.reduce((sum, p) => sum + p.total_amount, 0);
      
      setPortfolio({
        totalCredits,
        activeCredits: Math.round(totalCredits * 0.8),
        retiredCredits: Math.round(totalCredits * 0.2),
        totalInvested,
        averagePrice: totalCredits > 0 ? Math.round(totalInvested / totalCredits) : 0,
      });
    } catch (error) {
      console.error('Error fetching purchase data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAuditPack = (purchaseId: string) => {
    toast.success(`Generating audit pack for ${purchaseId}...`);
    // In production: generate and download PDF bundle with verification data
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Loading state
  if (sessionLoading || checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied
  if (!isAuthenticated || !hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <CarbonParticles />
        <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
          </div>
        </header>
        
        <main className="relative z-10 container mx-auto px-4 py-8 max-w-lg">
          <Card className="border-primary/20">
            <CardContent className="pt-8 text-center">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h1 className="text-2xl font-semibold mb-2">Partner Access Required</h1>
              <p className="text-muted-foreground mb-6">
                This page is for verified partners only.
              </p>
              <Button asChild>
                <Link to="/partners">Become a Partner</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Partner Reports — Senseible</title>
        <meta name="description" content="View your carbon credit portfolio, purchase history, and download audit packs." />
      </Helmet>
      
      <CarbonParticles />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/partner-dashboard"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Partner Reports</h1>
                <p className="text-sm text-muted-foreground">Portfolio & Audit Documentation</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-2">
              <FileBarChart className="h-3 w-3" />
              Decision-Grade Signals
            </Badge>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 space-y-8">
        {/* Compliance Signals */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Compliance Status
          </h2>
          <ComplianceSignals
            cbamStatus="compliant"
            euTaxonomyStatus="eligible"
            pcafStatus="aligned"
            cctsStatus="eligible"
            lastVerified={new Date().toISOString()}
            auditHash="SHA256-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
          />
        </section>

        {/* Portfolio Overview */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Portfolio Overview
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-foreground">
                  {portfolio.totalCredits}
                </div>
                <p className="text-sm text-muted-foreground">Total Credits (tCO₂e)</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-success">
                  {portfolio.activeCredits}
                </div>
                <p className="text-sm text-muted-foreground">Active Credits</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold font-mono text-muted-foreground">
                  {portfolio.retiredCredits}
                </div>
                <p className="text-sm text-muted-foreground">Retired Credits</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold font-mono text-foreground">
                  {formatCurrency(portfolio.totalInvested)}
                </div>
                <p className="text-sm text-muted-foreground">Total Invested</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(portfolio.averagePrice)}
                </div>
                <p className="text-sm text-muted-foreground">Avg. Price/tCO₂e</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tabs: Purchase History & Audit Packs */}
        <Tabs defaultValue="purchases" className="space-y-4">
          <TabsList>
            <TabsTrigger value="purchases" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Purchase History
            </TabsTrigger>
            <TabsTrigger value="audits" className="gap-2">
              <Package className="h-4 w-4" />
              Audit Packs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>All credit acquisitions with verification status</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No purchases yet</p>
                    <Button variant="outline" asChild className="mt-4">
                      <Link to="/marketplace">Browse Marketplace</Link>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Seller Hash</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Vintage</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price/t</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="text-sm">{formatDate(purchase.purchased_at)}</TableCell>
                          <TableCell>
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {purchase.msme_hash}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">{purchase.sector}</TableCell>
                          <TableCell className="text-sm">{purchase.vintage}</TableCell>
                          <TableCell className="text-right font-mono">{purchase.quantity}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(purchase.price_per_tonne)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(purchase.total_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={purchase.status === 'completed' ? 'default' : purchase.status === 'pending' ? 'secondary' : 'destructive'}>
                              {purchase.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {purchase.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {purchase.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audits">
            <Card>
              <CardHeader>
                <CardTitle>Audit Packs</CardTitle>
                <CardDescription>Download verification bundles for each purchase</CardDescription>
              </CardHeader>
              <CardContent>
                {purchases.filter(p => p.status === 'completed').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No completed purchases yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchases.filter(p => p.status === 'completed').map((purchase) => (
                      <div 
                        key={purchase.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileCheck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Audit Pack - {purchase.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {purchase.quantity} tCO₂e from {purchase.msme_hash} • {formatDate(purchase.purchased_at)}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadAuditPack(purchase.id)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PartnerReports;
