import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Mail, 
  Crown, 
  Shield, 
  BarChart3, 
  Eye,
  Loader2,
  UserPlus,
  Clock,
  Trash2,
  Lock
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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access including billing and team management',
  admin: 'All features except billing. Can manage team members',
  analyst: 'Upload, verify, reports, and intelligence access',
  viewer: 'Read-only access to dashboard and reports',
};

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at?: string;
  invited_email?: string;
  email?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

const Team = () => {
  const navigate = useNavigate();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const { tier, features } = usePremiumStatus();
  const { activeOrganization, isLoading: orgLoading } = useOrganization();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const canManageTeam = tier === 'pro' || tier === 'scale';
  const maxMembers = features?.teamMembers || 1;

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [sessionLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (activeOrganization?.id) {
      fetchTeamData();
    }
  }, [activeOrganization?.id]);

  const fetchTeamData = async () => {
    if (!activeOrganization?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch members
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', activeOrganization.id)
        .order('role', { ascending: true });
      
      if (memberData) setMembers(memberData);

      // Fetch pending invitations
      const { data: inviteData } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', activeOrganization.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (inviteData) setInvitations(inviteData);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !activeOrganization?.id) return;
    
    if (members.length >= maxMembers) {
      toast.error(`Your plan allows up to ${maxMembers} team members. Upgrade to add more.`);
      return;
    }

    setIsInviting(true);
    try {
      const token = crypto.randomUUID();
      
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          organization_id: activeOrganization.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user!.id,
          token,
        });
      
      if (error) throw error;

      // Send invitation email via edge function
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-team-invitation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              invitationId: token,
              email: inviteEmail,
              role: inviteRole,
              organizationName: activeOrganization.name,
              inviterName: user?.email?.split('@')[0],
              token,
            }),
          }
        );
      } catch (emailErr) {
        console.error('Failed to send invitation email:', emailErr);
        // Continue anyway - invitation was created
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      fetchTeamData();
    } catch (err) {
      console.error('Failed to send invitation:', err);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await supabase.from('team_invitations').delete().eq('id', invitationId);
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      toast.success('Invitation cancelled');
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      toast.error('Failed to cancel invitation');
    }
  };

  const getInitials = (email?: string) => {
    if (!email) return '?';
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  if (sessionLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageTeam) {
    return (
      <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
        <CarbonParticles />
        <Navigation onSignOut={() => navigate('/')} />
        
        <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Team Management</h2>
              <p className="text-muted-foreground mb-4">
                Upgrade to Pro or Scale to invite team members and collaborate.
              </p>
              <Button asChild>
                <a href="/pricing">View Plans</a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
      <Helmet>
        <title>Team Management — Senseible</title>
        <meta name="description" content="Invite team members and manage roles for your organization." />
      </Helmet>
      
      <CarbonParticles />
      <Navigation onSignOut={() => navigate('/')} />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Team Management</h1>
            <p className="text-muted-foreground">
              Invite members and manage access to {activeOrganization?.name || 'your organization'}.
            </p>
          </div>
          
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="analyst">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Analyst
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Viewer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[inviteRole]}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail || isInviting}>
                  {isInviting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Stats */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Team Size</p>
                  <p className="text-2xl font-semibold">{members.length} / {maxMembers}</p>
                </div>
              </div>
              {members.length >= maxMembers && (
                <Button variant="outline" asChild>
                  <a href="/pricing">Upgrade for More</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Team Members</CardTitle>
            <CardDescription>People with access to this organization</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No team members yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(member => {
                  const RoleIcon = ROLE_ICONS[member.role] || Eye;
                  return (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(member.invited_email || member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.invited_email || member.email || 'Unknown'}
                          </p>
                          {member.joined_at && (
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <RoleIcon className="w-3 h-3" />
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invitations</CardTitle>
              <CardDescription>Invitations waiting to be accepted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map(invite => (
                  <div 
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ROLE_LABELS[invite.role]}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvitation(invite.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Reference */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(ROLE_LABELS).map(([role, label]) => {
                const Icon = ROLE_ICONS[role];
                return (
                  <div key={role} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                    <Icon className="w-4 h-4 mt-0.5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Team;
