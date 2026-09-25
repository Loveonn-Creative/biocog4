import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { CarbonParticles } from '@/components/CarbonParticles';
import { MinimalNav } from '@/components/MinimalNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Users, 
  Shield, 
  BarChart3, 
  Eye, 
  Crown,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  analyst: BarChart3,
  viewer: Eye,
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  expires_at: string;
  organization?: {
    name: string;
  };
}

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'accepted' | 'error'>('loading');
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (token && isAuthenticated) {
      validateInvitation();
    } else if (token && !sessionLoading) {
      setStatus('valid');
    } else {
      setStatus('error');
    }
  }, [token, isAuthenticated, sessionLoading]);

  const validateInvitation = async () => {
    try {
      setStatus('valid');
    } catch (err) {
      console.error('Error validating invitation:', err);
      setStatus('error');
    }
  };

  const handleAccept = async () => {
    if (!token || !user?.id) return;
    
    setIsAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-team-invitation', { body: { token } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Invitation acceptance failed');
      toast.success(`Welcome to ${data.membership?.organization_name || 'your team'}!`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const RoleIcon = invitation?.role ? ROLE_ICONS[invitation.role] || Eye : Eye;

  if (sessionLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden">
      <Helmet>
        <title>Accept Team Invitation — Senseible</title>
      </Helmet>
      
      <CarbonParticles />
      <MinimalNav />

      <main className="relative z-10 container mx-auto px-4 py-20 max-w-md">
        {status === 'valid' && (
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">You're Invited!</CardTitle>
              <CardDescription>
                 Join your invited organization on Senseible
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in or create an account to accept this invitation
                  </p>
                  <Button className="w-full" asChild>
                    <Link to={`/auth?redirect=/accept-invite?token=${token}`}>
                      Sign In to Accept
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={handleAccept} disabled={isAccepting}>
                  {isAccepting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Accept Invitation
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {status === 'expired' && (
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Invitation Expired</CardTitle>
              <CardDescription>
                This invitation link has expired. Please ask your team admin to send a new invitation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/">Go to Homepage</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'accepted' && (
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Already Accepted</CardTitle>
              <CardDescription>
                This invitation has already been accepted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Invalid Invitation</CardTitle>
              <CardDescription>
                This invitation link is invalid or has been revoked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/">Go to Homepage</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AcceptInvite;
