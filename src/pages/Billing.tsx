import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Plus,
  Trash2, 
  Download, 
  FileText, 
  Building2,
  Shield,
  CheckCircle2,
  Loader2,
  MapPin,
  Zap
} from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  snapshot: 'Snapshot',
  essential: 'Essential',
  basic: 'Essential',
  pro: 'Pro',
  scale: 'Scale',
};
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  card_last_four: string;
  card_brand: string;
  card_network?: string;
  is_default: boolean;
  is_autopay_enabled: boolean;
  expires_month?: number;
  expires_year?: number;
}

interface BillingAddress {
  id: string;
  name: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  gstin?: string;
  is_default: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  pdf_url?: string;
}

const Billing = () => {
  const navigate = useNavigate();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const { tier, isPremium } = usePremiumStatus();
  const tierLabel = TIER_LABELS[tier] || 'Snapshot';
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingAddresses, setBillingAddresses] = useState<BillingAddress[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autopayEnabled, setAutopayEnabled] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [sessionLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user?.id) {
      fetchBillingData();
    }
  }, [user?.id]);

  const fetchBillingData = async () => {
    setIsLoading(true);
    try {
      // Fetch payment methods
      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false });
      
      if (methods) {
        setPaymentMethods(methods);
        setAutopayEnabled(methods.some(m => m.is_autopay_enabled));
      }

      // Fetch billing addresses
      const { data: addresses } = await supabase
        .from('billing_addresses')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false });
      
      if (addresses) setBillingAddresses(addresses);

      // Fetch invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (invoiceData) setInvoices(invoiceData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      await supabase.from('payment_methods').delete().eq('id', id);
      setPaymentMethods(prev => prev.filter(m => m.id !== id));
      toast.success('Payment method removed');
    } catch (err) {
      console.error('Error removing payment method:', err);
      toast.error('Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      // Remove default from all
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user!.id);
      
      // Set new default
      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);
      
      setPaymentMethods(prev => 
        prev.map(m => ({ ...m, is_default: m.id === id }))
      );
      toast.success('Default payment method updated');
    } catch (err) {
      console.error('Error updating default payment method:', err);
      toast.error('Failed to update default payment method');
    }
  };

  const toggleAutopay = async () => {
    const defaultMethod = paymentMethods.find(m => m.is_default);
    if (!defaultMethod) {
      toast.error('Please add a payment method first');
      return;
    }

    try {
      const newState = !autopayEnabled;
      await supabase
        .from('payment_methods')
        .update({ is_autopay_enabled: newState })
        .eq('id', defaultMethod.id);
      
      setAutopayEnabled(newState);
      toast.success(newState ? 'Auto-pay enabled' : 'Auto-pay disabled');
    } catch (err) {
      console.error('Error toggling auto-pay:', err);
      toast.error('Failed to update auto-pay settings');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
      <Helmet>
        <title>Billing & Payments — Senseible</title>
        <meta name="description" content="Manage your payment methods, billing addresses, and download invoices." />
      </Helmet>
      
      <CarbonParticles />
      <Navigation onSignOut={() => navigate('/')} />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Billing & Payments</h1>
          <p className="text-muted-foreground">
            Manage your payment methods, billing preferences, and download invoices.
          </p>
        </div>

        {/* Current Plan */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tierLabel} Plan</CardTitle>
                  <CardDescription>
                    {isPremium ? 'Your subscription is active' : 'Upgrade to unlock more features'}
                  </CardDescription>
                </div>
              </div>
              {!isPremium && (
                <Button asChild>
                  <Link to="/pricing">Upgrade Plan</Link>
                </Button>
              )}
              {isPremium && (
                <Badge variant="secondary" className="text-success border-success/20 bg-success/10">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Payment Methods</CardTitle>
                  <CardDescription>Manage your saved cards</CardDescription>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No payment methods saved</p>
                  <p className="text-xs mt-1">Cards are saved during checkout</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map(method => (
                    <div 
                      key={method.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {method.card_brand} •••• {method.card_last_four}
                          </p>
                          {method.expires_month && method.expires_year && (
                            <p className="text-xs text-muted-foreground">
                              Expires {method.expires_month}/{method.expires_year}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-4" />

              {/* Auto-pay Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Auto-pay</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically renew subscription
                  </p>
                </div>
                <Switch
                  checked={autopayEnabled}
                  onCheckedChange={toggleAutopay}
                  disabled={paymentMethods.length === 0}
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Billing Address</CardTitle>
                  <CardDescription>For invoices and receipts</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/settings">
                    <MapPin className="w-4 h-4 mr-1" />
                    Edit
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {billingAddresses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No billing address saved</p>
                  <p className="text-xs mt-1">Add one in Settings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {billingAddresses.filter(a => a.is_default).map(addr => (
                    <div key={addr.id} className="text-sm">
                      <p className="font-medium">{addr.name}</p>
                      {addr.address_line_1 && <p className="text-muted-foreground">{addr.address_line_1}</p>}
                      {addr.address_line_2 && <p className="text-muted-foreground">{addr.address_line_2}</p>}
                      <p className="text-muted-foreground">
                        {[addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-muted-foreground">{addr.country}</p>
                      {addr.gstin && (
                        <p className="text-xs text-muted-foreground mt-2">GSTIN: {addr.gstin}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
            <CardDescription>Download your payment receipts</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No invoices yet</p>
                <p className="text-xs mt-1">Invoices appear here after payment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map(invoice => (
                  <div 
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(invoice.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={invoice.status === 'paid' 
                            ? 'text-success bg-success/10' 
                            : 'text-warning bg-warning/10'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!invoice.pdf_url}
                        onClick={() => invoice.pdf_url && window.open(invoice.pdf_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Secure Payments</p>
            <p className="text-xs text-muted-foreground">
              All payment information is encrypted and processed securely via Razorpay. 
              We never store your full card details.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Billing;
