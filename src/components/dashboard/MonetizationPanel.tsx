import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { indicativeValueFromKg, kgToTonnes } from '@/lib/carbonValue';

interface MonetizationPanelProps {
  /** All recorded kgCO2e (verified or not). Used only to decide what to prompt. */
  totalCO2: number;
  hasVerifiedData: boolean;
  /**
   * Verified kgCO2e, each emission counted once. The indicative value is
   * computed from this alone. When it is not passed, no value is shown.
   */
  verifiedCO2Kg?: number;
}

export function MonetizationPanel({ totalCO2, hasVerifiedData, verifiedCO2Kg }: MonetizationPanelProps) {
  const navigate = useNavigate();

  const verifiedTonnes = kgToTonnes(verifiedCO2Kg);
  const indicativeValue = indicativeValueFromKg(verifiedCO2Kg);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Indicative value</h2>
          <Coins className="h-5 w-5 text-primary" />
        </div>

        {totalCO2 > 0 ? (
          <>
            <div className="mb-4">
              {indicativeValue > 0 ? (
                <>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatCurrency(indicativeValue)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From {verifiedTonnes.toFixed(3)} verified tCO₂e
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Verify your emissions to see their value.
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => navigate(hasVerifiedData ? '/monetize' : '/verify')}
            >
              {hasVerifiedData ? 'Explore Options' : 'Verify Data First'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Upload invoices to record emissions
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Get Started
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
