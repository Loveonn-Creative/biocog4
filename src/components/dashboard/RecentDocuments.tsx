import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Document } from '@/hooks/useDocuments';

interface RecentDocumentsProps {
  documents: Document[];
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Documents</h2>
          <Link 
            to="/history" 
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map(doc => (
              <div 
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {doc.vendor || doc.document_type || 'Document'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(doc.created_at)}
                  </div>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {formatAmount(doc.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No documents yet</p>
            <Link 
              to="/" 
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Upload your first invoice
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
