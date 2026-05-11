import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';

interface ActiveSub {
  tier: string;
  billing_cycle: string;
  expires_at: string | null;
  status: string;
}

const TIER_LABELS: Record<string, string> = {
  snapshot: 'Snapshot',
  essential: 'Essential',
  basic: 'Essential',
  pro: 'Pro',
  scale: 'Scale',
};

export const SubscriptionStatusBanner = () => {
  const { user, isAuthenticated } = useSession();
  const [sub, setSub] = useState<ActiveSub | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('tier, billing_cycle, expires_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active && data) setSub(data as ActiveSub);
    })();
    return () => { active = false; };
  }, [isAuthenticated, user?.id]);

  if (!sub) return null;

  const renewDate = sub.expires_at
    ? new Date(sub.expires_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';
  const cycleLabel = sub.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly';

  return (
    <div className="container mx-auto px-4 mb-6">
      <div className="max-w-4xl mx-auto rounded-xl border border-success/30 bg-success/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <div>
            <span className="font-medium text-foreground">
              {TIER_LABELS[sub.tier] || sub.tier} · {cycleLabel}
            </span>
            <span className="text-muted-foreground ml-2 inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Renews {renewDate}
            </span>
          </div>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to="/billing">
            Manage billing
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
