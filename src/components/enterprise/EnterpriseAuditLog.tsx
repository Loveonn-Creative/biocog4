import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

interface AuditEntry {
  id: string;
  verification_status: string | null;
  total_co2_kg: number;
  verification_score: number | null;
  created_at: string;
}

export function EnterpriseAuditLog() {
  const { user, sessionId } = useSession();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('carbon_verifications')
        .select('id, verification_status, total_co2_kg, verification_score, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (user?.id) query = query.eq('user_id', user.id);
      else if (sessionId) query = query.eq('session_id', sessionId);

      const { data } = await query;
      if (data) setEntries(data);
    };
    fetch();
  }, [user?.id, sessionId]);

  if (entries.length === 0) return null;

  const statusColor = (s: string | null) =>
    s === 'verified' ? 'bg-success/10 text-success' :
    s === 'needs_review' ? 'bg-warning/10 text-warning' :
    'bg-muted text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Audit Log
          <Badge variant="outline" className="text-xs ml-auto">Enterprise</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
              <div className="flex items-center gap-3">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <Badge className={`${statusColor(e.verification_status)} text-xs`}>
                  {e.verification_status?.replace('_', ' ') || 'pending'}
                </Badge>
              </div>
              <div className="text-right">
                <span className="font-mono font-medium">{e.total_co2_kg.toFixed(1)} kg</span>
                {e.verification_score != null && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {Math.round(e.verification_score * 100)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
