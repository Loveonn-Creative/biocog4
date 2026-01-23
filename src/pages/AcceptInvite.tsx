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
    if (token) {
      validateInvitation();
    } else {
      setStatus('error');
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      // Query invitation by token - needs service role to bypass RLS
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*, organizations(name)')
        .eq('token', token)
        .single();

      if (error || !data) {
        setStatus('error');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        setStatus('accepted');
        return;
      }

      setInvitation({
        ...data,
        organization: data.organizations,
      });
      setStatus('valid');
    } catch (err) {
      console.error('Error validating invitation:', err);
      setStatus('error');
    }
  };

  const handleAccept = async () => {
    if (!invitation || !user?.id) return;
    
    setIsAccepting(true);
    try {
      // Add user as organization member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role,
          joined_at: new Date().toISOString(),
          invited_email: invitation.email,
        });

      if (memberError) throw memberError;

      // Create user context
      const { error: contextError } = await supabase
        .from('user_contexts')
        .insert({
          user_id: user.id,
          context_type: 'msme',
          context_id: invitation.organization_id,
          context_name: invitation.organization?.name,
          is_active: true,
        });

      if (contextError) {
        console.error('Context creation error:', contextError);
      }

      // Mark invitation as accepted
      // Note: This will only work if user has permission via RLS
      // In production, this should be done via edge function
      console.log('Invitation accepted for token:', token);

      toast.success(`Welcome to ${invitation.organization?.name}!`);
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
        {status === 'valid' && invitation && (
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">You're Invited!</CardTitle>
              <CardDescription>
                Join <strong>{invitation.organization?.name}</strong> on Senseible
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-2">Your Role</p>
                <Badge variant="secondary" className="gap-1 text-base py-1 px-3">
                  <RoleIcon className="w-4 h-4" />
                  {ROLE_LABELS[invitation.role]}
                </Badge>
              </div>

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
              ) : invitation.email !== user?.email ? (
                <div className="space-y-3">
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    This invitation was sent to <strong>{invitation.email}</strong>.
                    You're signed in as <strong>{user?.email}</strong>.
                  </p>
                  <Button variant="outline" className="w-full" onClick={handleAccept} disabled={isAccepting}>
                    {isAccepting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Accept Anyway
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
