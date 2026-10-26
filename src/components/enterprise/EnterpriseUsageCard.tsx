import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { untypedRpc } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';

/**
 * Enterprise usage against the quote, from my_enterprise_usage(): used,
 * included, what happens at the limit and the extra billed so far this
 * contract year. Amounts come back only for owners and admins.
 */
interface UsageRow { kind: string; used: number; included: number; over_limit?: 'stop' | 'bill' | null; extra_paise?: number | null; period?: string | null }

const LABEL: Record<string, string> = {
  suppliers: 'Suppliers',
  seats: 'Team seats',
  reports: 'Report downloads',
  reminders: 'Reminders',
  supplier_reads: 'Supplier bills read',
  questions: 'Questions this month',
};
const ORDER = Object.keys(LABEL);
const inr = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

export function EnterpriseUsageCard() {
  const { user } = useSession();
  const { data: rows = [] } = useQuery({
    queryKey: ['enterprise-usage', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await untypedRpc('my_enterprise_usage');
      if (error) return [];
      return ((data ?? []) as UsageRow[]).filter((r) => LABEL[r.kind]).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    },
  });
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + (r.extra_paise ?? 0), 0);
  const showMoney = rows.some((r) => r.extra_paise != null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Usage this contract year</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground border-b">
              <th className="py-2 pr-3 font-medium" /><th className="py-2 pr-3 font-medium text-right">Used</th>
              <th className="py-2 pr-3 font-medium">At the limit</th>{showMoney && <th className="py-2 font-medium text-right">Extra</th>}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.kind} className="border-b last:border-0">
                  <td className="py-2 pr-3">{LABEL[r.kind]}</td>
                  <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{r.used.toLocaleString('en-IN')} of {r.included.toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.over_limit === 'stop' ? 'Stops' : r.over_limit === 'bill' ? 'Extra invoiced' : '-'}</td>
                  {showMoney && <td className="py-2 text-right tabular-nums">{r.extra_paise ? inr(r.extra_paise) : '-'}</td>}
                </tr>
              ))}
            </tbody>
            {showMoney && total > 0 && (
              <tfoot><tr><td className="pt-3 font-medium" colSpan={3}>Extra so far, before GST</td><td className="pt-3 text-right font-semibold tabular-nums">{inr(total)}</td></tr></tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
