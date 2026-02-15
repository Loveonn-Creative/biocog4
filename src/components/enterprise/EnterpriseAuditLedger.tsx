import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Database, Clock } from 'lucide-react';

interface EmissionEntry {
  id: string;
  category: string;
  scope: number;
  co2_kg: number;
  created_at: string;
  document_id?: string | null;
  data_quality?: string | null;
  emission_factor?: number | null;
}

interface Props {
  emissions: EmissionEntry[];
}

export function EnterpriseAuditLedger({ emissions }: Props) {
  if (emissions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Audit-Grade Ledger
          <Badge variant="outline" className="text-xs ml-auto">Enterprise</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Scope</TableHead>
                <TableHead className="text-xs text-right">CO₂ (kg)</TableHead>
                <TableHead className="text-xs">Factor</TableHead>
                <TableHead className="text-xs">Quality</TableHead>
                <TableHead className="text-xs">Doc ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emissions.slice(0, 20).map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </TableCell>
                  <TableCell className="text-xs capitalize font-medium">{e.category}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{e.scope}</Badge></TableCell>
                  <TableCell className="text-xs font-mono text-right">{e.co2_kg.toFixed(1)}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{e.emission_factor ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${
                      e.data_quality === 'high' ? 'border-success/30 text-success' :
                      e.data_quality === 'medium' ? 'border-warning/30 text-warning' :
                      'border-muted'
                    }`}>
                      {e.data_quality || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {e.document_id ? e.document_id.substring(0, 8) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Extended data retention active • Showing last {Math.min(emissions.length, 20)} entries
        </div>
      </CardContent>
    </Card>
  );
}
