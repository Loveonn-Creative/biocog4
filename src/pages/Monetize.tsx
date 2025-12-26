import { Link } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmissions } from '@/hooks/useEmissions';
import { Coins, Building2, Gift, ExternalLink, CheckCircle } from 'lucide-react';
import senseibleLogo from '@/assets/senseible-logo.png';
import { Helmet } from 'react-helmet-async';

const Monetize = () => {
  const { summary, getVerifiedEmissions } = useEmissions();
  const verified = getVerifiedEmissions();
  const co2Tons = summary.total / 1000;
  const creditValue = Math.round(co2Tons * 750);
  const loanSavings = Math.round(500000 * 0.005);

  const pathways = [
    { type: 'carbon_credit', icon: Coins, color: 'text-yellow-500', bg: 'bg-yellow-500/10', title: 'Carbon Credits', value: creditValue, desc: 'Sell verified credits to buyers', partner: 'IEX Green Market' },
    { type: 'green_loan', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Green Loans', value: loanSavings, desc: '0.5% lower interest rate', partner: 'SBI Green Finance' },
    { type: 'govt_incentive', icon: Gift, color: 'text-green-500', bg: 'bg-green-500/10', title: 'Govt Incentives', value: Math.round(creditValue * 1.5), desc: 'ZED certification subsidy', partner: 'MSME Ministry' }
  ];

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="relative min-h-screen w-full bg-background">
      <Helmet><title>Monetize — Senseible</title></Helmet>
      <CarbonParticles />
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/"><img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" /></Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link to="/verify" className="hover:text-foreground">Verify</Link>
            <Link to="/monetize" className="text-foreground font-medium">Monetize</Link>
          </nav>
        </div>
      </header>
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-2">Monetize Your Carbon Data</h1>
        <p className="text-muted-foreground mb-8">Turn verified emissions into real value</p>
        
        {verified.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Verify your emissions first to unlock monetization</p>
            <Button variant="outline" asChild><Link to="/verify">Go to Verification</Link></Button>
          </CardContent></Card>
        ) : (
          <>
            <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
              <div><span className="text-sm text-muted-foreground">Total Potential Value</span><div className="text-2xl font-bold text-primary">{formatCurrency(creditValue + loanSavings + Math.round(creditValue * 1.5))}</div></div>
              <div className="flex items-center gap-2 text-sm text-success"><CheckCircle className="h-4 w-4" />{verified.length} verified records</div>
            </div>
            <div className="space-y-4">
              {pathways.map(p => (
                <Card key={p.type} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${p.bg}`}><p.icon className={`h-6 w-6 ${p.color}`} /></div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="text-sm text-muted-foreground">{p.desc}</p>
                      <p className="text-xs text-muted-foreground mt-1">via {p.partner}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(p.value)}</div>
                      <Button size="sm" variant="outline" className="mt-2"><ExternalLink className="h-3 w-3 mr-1" />Apply</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Monetize;
