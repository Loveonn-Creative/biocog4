import { useDocuments } from '@/hooks/useDocuments';
import { Link } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calendar, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const History = () => {
  const { documents, isLoading } = useDocuments();
  const [search, setSearch] = useState('');

  const filtered = documents.filter(d => 
    (d.vendor?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (d.document_type?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatAmount = (amount: number | null) => amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) : '-';

  return (
    <div className="relative min-h-screen w-full bg-background">
      <Helmet><title>Invoice History — Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invoice History</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        {isLoading ? <div className="text-center py-20 text-muted-foreground">Loading...</div> : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" /><p className="text-muted-foreground">No documents found</p><Link to="/" className="text-primary text-sm hover:underline">Upload your first invoice</Link></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => (
              <Card key={doc.id} className="hover:bg-secondary/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <div className="font-medium">{doc.vendor || doc.document_type}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-3 w-3" />{formatDate(doc.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatAmount(doc.amount)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{doc.document_type}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
