import { Link } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmissions } from '@/hooks/useEmissions';
import { FileBarChart, Download } from 'lucide-react';
import senseibleLogo from '@/assets/senseible-logo.png';
import { Helmet } from 'react-helmet-async';

const Reports = () => {
  const { summary } = useEmissions();
  const formatNumber = (n: number) => n >= 1000 ? `${(n/1000).toFixed(2)}t` : `${n.toFixed(1)}kg`;

  return (
    <div className="relative min-h-screen w-full bg-background">
      <Helmet><title>Reports — Senseible</title></Helmet>
      <CarbonParticles />
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/"><img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" /></Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link to="/reports" className="text-foreground font-medium">Reports</Link>
          </nav>
        </div>
      </header>
      <main className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-2">Carbon Reports</h1>
        <p className="text-muted-foreground mb-8">Generate compliance reports for stakeholders</p>
        
        {summary.total > 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-lg bg-success/10"><FileBarChart className="h-6 w-6 text-success" /></div>
                <div>
                  <h2 className="font-semibold">Emissions Summary Report</h2>
                  <p className="text-sm text-muted-foreground">Current period overview</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-secondary/50 text-center"><div className="text-lg font-bold">{formatNumber(summary.scope1)}</div><div className="text-xs text-muted-foreground">Scope 1</div></div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center"><div className="text-lg font-bold">{formatNumber(summary.scope2)}</div><div className="text-xs text-muted-foreground">Scope 2</div></div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center"><div className="text-lg font-bold">{formatNumber(summary.scope3)}</div><div className="text-xs text-muted-foreground">Scope 3</div></div>
              </div>
              <Button className="w-full"><Download className="h-4 w-4 mr-2" />Download PDF Report</Button>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="py-12 text-center">
            <FileBarChart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No emissions data to report</p>
            <Button variant="outline" asChild><Link to="/">Upload Invoice</Link></Button>
          </CardContent></Card>
        )}
      </main>
    </div>
  );
};

export default Reports;
