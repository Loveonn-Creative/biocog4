import { Link, useNavigate } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmissions } from '@/hooks/useEmissions';
import { CheckCircle, AlertTriangle, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/hooks/useSession';
import senseibleLogo from '@/assets/senseible-logo.png';
import { Helmet } from 'react-helmet-async';

const Verify = () => {
  const navigate = useNavigate();
  const { sessionId, user } = useSession();
  const { emissions, getUnverifiedEmissions, refetch } = useEmissions();
  const [isVerifying, setIsVerifying] = useState(false);
  const unverified = getUnverifiedEmissions();

  const handleVerify = async () => {
    if (unverified.length === 0) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-carbon', {
        body: { emissionIds: unverified.map(e => e.id), sessionId, userId: user?.id }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Verification complete! Score: ${(data.data.score * 100).toFixed(0)}%`);
        refetch();
        if (data.data.status === 'verified') navigate('/monetize');
      }
    } catch (err) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background">
      <Helmet><title>Verify Emissions — Senseible</title></Helmet>
      <CarbonParticles />
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/"><img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" /></Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link to="/verify" className="text-foreground font-medium">Verify</Link>
            <Link to="/monetize" className="hover:text-foreground">Monetize</Link>
          </nav>
        </div>
      </header>
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-2">Carbon Verification</h1>
        <p className="text-muted-foreground mb-8">AI-powered verification to ensure accuracy and prevent greenwashing</p>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-accent/10"><Shield className="h-6 w-6 text-accent" /></div>
              <div>
                <h2 className="font-semibold">Emissions to Verify</h2>
                <p className="text-sm text-muted-foreground">{unverified.length} records pending verification</p>
              </div>
            </div>
            
            {unverified.length > 0 ? (
              <>
                <div className="space-y-2 mb-6">
                  {unverified.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="capitalize">{e.category}</span>
                      </div>
                      <span className="font-medium">{e.co2_kg.toFixed(1)} kg CO₂</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={handleVerify} disabled={isVerifying}>
                  {isVerifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : <>Verify All<ArrowRight className="h-4 w-4 ml-2" /></>}
                </Button>
              </>
            ) : emissions.length > 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="font-medium">All emissions verified!</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/monetize')}>Proceed to Monetize</Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No emissions data yet</p>
                <Button variant="outline" onClick={() => navigate('/')}>Upload Invoice</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Verify;
