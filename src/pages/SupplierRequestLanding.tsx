import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { untypedRpc } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

interface Preview { company_name: string; supplier_name: string; period_start: string; period_end: string; expired: boolean }

/** /supplier-request/:token — the link in the email. Shows who is asking, then signs the supplier in and opens the request. */
export default function SupplierRequestLanding() {
  const { token = '' } = useParams();
  const { user, isLoading } = useSession();
  const navigate = useNavigate();
  const preview = useQuery({
    queryKey: ['supplier-request-preview', token],
    queryFn: async () => {
      const { data, error } = await untypedRpc('supplier_request_preview', { p_token: token });
      if (error) throw error;
      return ((data ?? []) as Preview[])[0] ?? null;
    },
  });
  const [opening, setOpening] = useState(false);
  // Tried once per visit; a refused link shows why instead of retrying.
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !preview.data || preview.data.expired || opening || refused) return;
    setOpening(true);
    void untypedRpc('accept_supplier_request', { p_token: token }).then(({ data, error }) => {
      if (error) {
        setRefused(error.message.includes('another supplier')
          ? `Someone else has already opened this request. Ask ${preview.data?.company_name ?? 'the buyer'} to send you a new link.`
          : 'This request is closed or has expired.');
        setOpening(false);
        return;
      }
      navigate(`/supplier-share/${data as string}`, { replace: true });
    });
  }, [user, preview.data, token, navigate, opening, refused]);

  const p = preview.data;
  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Emissions request | Senseible</title><meta name="robots" content="noindex" /></Helmet>
      <main className="container mx-auto px-4 py-16 max-w-lg">
        {preview.isPending || isLoading || opening ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !p ? (
          <p className="rounded-xl border p-6 text-sm">This link does not work. Ask the buyer to send it again.</p>
        ) : refused ? (
          <p className="rounded-xl border p-6 text-sm">{refused}</p>
        ) : p.expired ? (
          <p className="rounded-xl border p-6 text-sm">This request from {p.company_name} has closed. Ask them to send a new one.</p>
        ) : (
          <section className="rounded-xl border p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Request for {p.supplier_name}</p>
            <h1 className="text-xl font-semibold">{p.company_name} asks for your emissions, {fmt(p.period_start)} to {fmt(p.period_end)}</h1>
            <p className="text-sm">Upload your electricity, fuel and freight bills. Senseible works out your emissions, and you decide whether to share. Only totals are shared; your bills stay private.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild><Link to={`/auth?mode=signup&next=${encodeURIComponent(`/supplier-request/${token}`)}`}>Create a free account</Link></Button>
              <Button asChild variant="outline"><Link to={`/auth?next=${encodeURIComponent(`/supplier-request/${token}`)}`}>Sign in</Link></Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

