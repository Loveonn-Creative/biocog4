import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useScope3Visibility } from '@/hooks/useScope3Trail';

/** Profile: the manual switch for the line-by-line Scope 3 trail on the MRV dashboard (Pro and Scale). */
export function Scope3FullTrailCard() {
  const v = useScope3Visibility();
  const change = async (next: boolean) => {
    if (!(await v.setFull(next))) toast.error('Could not save this setting. Try again.');
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Full Scope 3 trail</CardTitle>
        <CardDescription>
          Shows every supplier invoice line on your MRV dashboard with its source, classification, emission factor, formula and checks, plus totals by category and supplier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="scope3-full" className={!v.fullAvailable ? 'text-muted-foreground' : ''}>Show the full trail</Label>
            <p className="text-xs text-muted-foreground">
              {v.fullAvailable
                ? (v.fullOn ? <>On. <Link to="/mrv-dashboard#scope3-trail" className="underline underline-offset-2">Open it</Link></> : 'Off keeps the MRV dashboard as it is.')
                : <>Available on Pro and Scale. <Link to="/pricing?plan=pro" className="underline underline-offset-2">Compare plans</Link></>}
            </p>
          </div>
          <Switch id="scope3-full" checked={v.fullAvailable && v.fullOn} onCheckedChange={(c) => { void change(c); }} disabled={!v.fullAvailable || v.loading} />
        </div>
      </CardContent>
    </Card>
  );
}
