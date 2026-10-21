import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CREDIT_VALUE_WITHHELD, kgToTonnes } from '@/lib/carbonValue';

interface MonetizationPanelProps {
  /** All recorded kgCO2e (verified or not). Used only to decide what to prompt. */
  totalCO2: number;
  hasVerifiedData: boolean;
  /**
   * Verified kgCO2e, each emission counted once. Shown as a quantity; no
   * rupee value is derived from emissions (see carbonValue.ts).
   */
  verifiedCO2Kg?: number;
}

export function MonetizationPanel({ totalCO2, hasVerifiedData, verifiedCO2Kg }: MonetizationPanelProps) {
  const navigate = useNavigate();

  const verifiedTonnes = kgToTonnes(verifiedCO2Kg);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Verified data</h2>
          <Coins className="h-5 w-5 text-primary" />
        </div>

        {totalCO2 > 0 ? (
          <>
            <div className="mb-4">
              {verifiedTonnes > 0 ? (
                <>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {verifiedTonnes.toFixed(3)} tCO₂e verified
                  </div>
                  <p className="text-sm text-muted-foreground">{CREDIT_VALUE_WITHHELD}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Verify your emissions to see your financing and compliance options.
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
