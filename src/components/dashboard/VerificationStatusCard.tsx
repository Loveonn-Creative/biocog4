import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, AlertCircle, Upload, ArrowRight, Shield, 
  Coins, FileBarChart, Clock
} from 'lucide-react';

interface VerificationStatusCardProps {
  verificationScore: number;
  totalEmissions: number;
  unverifiedCount: number;
  hasVerifiedData: boolean;
  latestStatus?: 'verified' | 'needs_review' | 'pending' | null;
  eligibleCredits?: number;
}

export const VerificationStatusCard = ({
  verificationScore,
  totalEmissions,
  unverifiedCount,
  hasVerifiedData,
  latestStatus,
  eligibleCredits = 0,
}: VerificationStatusCardProps) => {
  // Determine the next action based on current state
  const getNextAction = () => {
    if (totalEmissions === 0) {
      return {
        message: 'Upload your first invoice to start tracking carbon emissions',
        action: 'Upload Invoice',
        link: '/',
        icon: Upload,
        color: 'text-primary',
      };
    }
    
    if (unverifiedCount > 0) {
      return {
        message: `${unverifiedCount} emission${unverifiedCount > 1 ? 's' : ''} pending verification. Verify now to unlock monetization.`,
        action: 'Verify Emissions',
        link: '/verify',
        icon: Shield,
        color: 'text-warning',
      };
    }
    
    if (hasVerifiedData && eligibleCredits > 0) {
      return {
        message: `${eligibleCredits} carbon credit${eligibleCredits > 1 ? 's' : ''} ready for monetization. Start earning now!`,
        action: 'Monetize Now',
        link: '/monetize',
        icon: Coins,
        color: 'text-success',
      };
    }
    
    if (hasVerifiedData) {
      return {
        message: 'All emissions verified. Generate compliance reports or upload more invoices.',
        action: 'View Reports',
        link: '/reports',
        icon: FileBarChart,
        color: 'text-accent',
      };
    }
    
    return {
      message: 'Upload invoices to begin your carbon tracking journey',
      action: 'Get Started',
      link: '/',
      icon: Upload,
      color: 'text-primary',
    };
  };

  const nextAction = getNextAction();
  const Icon = nextAction.icon;

  const getStatusIcon = () => {
    if (latestStatus === 'verified') return <CheckCircle className="h-6 w-6 text-success" />;
    if (latestStatus === 'needs_review') return <Clock className="h-6 w-6 text-warning" />;
    if (unverifiedCount > 0) return <AlertCircle className="h-6 w-6 text-warning" />;
    if (totalEmissions === 0) return <Upload className="h-6 w-6 text-muted-foreground" />;
    return <CheckCircle className="h-6 w-6 text-success" />;
  };

  const getStatusBg = () => {
    if (latestStatus === 'verified' || (hasVerifiedData && unverifiedCount === 0)) return 'bg-success/10';
    if (unverifiedCount > 0 || latestStatus === 'needs_review') return 'bg-warning/10';
    return 'bg-secondary';
  };

  return (
    <Card className="border-2 border-primary/20 overflow-hidden">
      <CardContent className="p-0">
        {/* Score Header */}
        <div className={`p-4 ${getStatusBg()}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-background/80">
                {getStatusIcon()}
              </div>
              <div>
                <h3 className="font-semibold">Verification Score</h3>
                <p className="text-xs text-muted-foreground">
                  {latestStatus === 'verified' ? 'Data verified' : 
                   unverifiedCount > 0 ? 'Action needed' : 
                   totalEmissions === 0 ? 'No data yet' : 'Ready'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">
                {verificationScore}<span className="text-lg text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <Progress value={verificationScore} className="h-2" />
        </div>

        {/* Action Section */}
        <div className="p-4 bg-background">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-secondary ${nextAction.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-3">
                {nextAction.message}
              </p>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link to={nextAction.link}>
                  {nextAction.action}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {hasVerifiedData && (
          <div className="px-4 pb-4 flex gap-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/mrv-dashboard">
                <Shield className="h-4 w-4 mr-1" />
                MRV
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/monetize">
                <Coins className="h-4 w-4 mr-1" />
                Monetize
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/reports">
                <FileBarChart className="h-4 w-4 mr-1" />
                Reports
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
