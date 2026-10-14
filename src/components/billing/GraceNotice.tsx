import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Shown while a paid plan is in its grace period (planLimits.GRACE_DAYS after
 * the paid period ends). Says what changes and when; nothing renews by itself.
 */
export function GraceNotice({ className = '' }: { className?: string }) {
  const { planState, graceEndsAt, expiresAt, tier } = usePremiumStatus();
  if (planState !== 'grace' || !graceEndsAt) return null;
  const name = tier === 'essential' ? 'Essential' : tier.charAt(0).toUpperCase() + tier.slice(1);
  return (
    <div role="status" className={`flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm ${className}`}>
      <Clock className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        Your {name} plan ended{expiresAt ? ` on ${fmt(expiresAt)}` : ''}. It stays active until {fmt(graceEndsAt)}. After that the account moves to Snapshot: your records stay, and paid allowances stop.
      </p>
      <Button asChild size="sm"><Link to="/pricing">Renew</Link></Button>
    </div>
  );
}
