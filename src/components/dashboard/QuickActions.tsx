import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, FileBarChart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  unverifiedCount: number;
  totalEmissions: number;
}

export function QuickActions({ unverifiedCount, totalEmissions }: QuickActionsProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-between group"
            onClick={() => navigate('/')}
          >
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 text-primary" />
              <span>Upload Invoice</span>
            </div>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>

          {unverifiedCount > 0 && (
            <Button 
              variant="outline" 
              className="w-full justify-between group border-accent/50 hover:bg-accent/10"
              onClick={() => navigate('/verify')}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span>Verify Emissions</span>
              </div>
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                {unverifiedCount} pending
              </span>
            </Button>
          )}

          {totalEmissions > 0 && (
            <Button 
              variant="outline" 
              className="w-full justify-between group"
              onClick={() => navigate('/reports')}
            >
              <div className="flex items-center gap-3">
                <FileBarChart className="h-4 w-4 text-success" />
                <span>Generate Report</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
