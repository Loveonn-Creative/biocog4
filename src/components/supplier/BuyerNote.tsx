import { useBuyerRequests } from '@/hooks/useBuyerRequests';

/**
 * Beside a locked feature, for suppliers a buyer invited: the buyer covers
 * sharing and bill reads, not these features, which open on the supplier's
 * own plan. Renders nothing for everyone else.
 */
export function BuyerNote({ className = '' }: { className?: string }) {
  const { buyer } = useBuyerRequests();
  if (!buyer) return null;
  return <p className={`text-xs text-muted-foreground ${className}`}>Not included with {buyer}. It opens on your own plan.</p>;
}
