import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Building2, Gift, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MonetizationPanelProps {
  totalCO2: number;
  hasVerifiedData: boolean;
}

const CARBON_CREDIT_RATE = 750; // INR per ton

export function MonetizationPanel({ totalCO2, hasVerifiedData }: MonetizationPanelProps) {
  const navigate = useNavigate();
  
  const co2Tons = totalCO2 / 1000;
  const potentialValue = Math.round(co2Tons * CARBON_CREDIT_RATE);

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
          <h2 className="text-lg font-semibold text-foreground">Monetization</h2>
          <Coins className="h-5 w-5 text-primary" />
        </div>

        {totalCO2 > 0 ? (
          <>
            <div className="mb-4">
              <div className="text-2xl font-bold text-primary mb-1">
                {formatCurrency(potentialValue)}
              </div>
              <p className="text-sm text-muted-foreground">
                Potential value from {co2Tons.toFixed(2)} tons CO₂
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">Carbon Credits</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Green Loans</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Govt Incentives</span>
              </div>
            </div>

            <Button 
              className="w-full"
              onClick={() => navigate('/monetize')}
              disabled={!hasVerifiedData}
            >
              {hasVerifiedData ? 'Explore Options' : 'Verify Data First'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {!hasVerifiedData && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Verify your emissions to unlock monetization
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Upload invoices to calculate potential earnings
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
