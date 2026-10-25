import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSession } from '@/hooks/useSession';
import { useEnterpriseAccess } from '@/hooks/useEnterpriseAccess';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useOrganization, getFunctionErrorMessage, isMissingRpcError, untypedRpc } from '@/hooks/useOrganization';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Lock,
  Building2,
  UserMinus,
  Database,
  ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationProfileCard } from '@/components/team/OrganizationProfileCard';
import { ROLE_DESCRIPTIONS as PERSONAL_ONLY_DESCRIPTIONS, TEAM_SHARING_NOTE, planIncludesTeam } from '@/lib/organizationProfile';
import { ASSIGNABLE_ROLES, LEGACY_ROLES, ROLE_DESCRIPTIONS as WORKSPACE_DESCRIPTIONS, ROLE_LABELS as ALL_ROLE_LABELS, ROLE_ORDER as ALL_ROLE_ORDER, type TeamRole } from '@/lib/teamRoles';
import { useWorkspace } from '@/hooks/useWorkspace';

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  data_manager: Database,
  analyst: BarChart3,
  carbon_auditor: ClipboardCheck,
  viewer: Eye,
};

const ROLE_LABELS: Record<string, string> = ALL_ROLE_LABELS;


interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at?: string | null;
  invited_email?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string | null;
}

const ROLE_ORDER: Record<string, number> = Object.fromEntries(ALL_ROLE_ORDER.map((r, i) => [r, i]));
const PENDING_MIGRATION_MESSAGE = 'Available after the team access update is applied.';

const Team = () => {
  const { access: enterprise } = useEnterpriseAccess();
  const navigate = useNavigate();
  const { user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const { tier, isLoading: premiumLoading } = usePremiumStatus();
  const {
    activeOrganization,
    organizations,
    organizationsError,
    isLoading: orgLoading,
    createOrganization,
  } = useOrganization();

  // Prefer the active context's organization, then one the user owns, then any membership.
  const organization =
    activeOrganization ??
    organizations.find(o => o.owner_id === user?.id) ??
    organizations[0] ??
    null;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [seatLimit, setSeatLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // organizations.max_members (kept in sync with the owner's plan server-side) is the
  // single source of truth for seats; members and pending invitations both use one.
  const maxMembers = Math.max(seatLimit ?? organization?.max_members ?? 1, 1);
  const seatsUsed = members.length + invitations.length;
  const seatsFull = seatsUsed >= maxMembers;

  const myRole =
    members.find(m => m.user_id === user?.id)?.role ??
    (organization && organization.owner_id === user?.id ? 'owner' : null);
  const isOrgAdmin = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  // The six roles exist once the organisation workspace update is applied;
  // before that only admin, analyst and viewer work, and records are not shared.
  const { workspacesAvailable } = useWorkspace();
  const roleChoices: TeamRole[] = (workspacesAvailable ? ASSIGNABLE_ROLES : LEGACY_ROLES)
    // Only the owner hands out admin access.
    .filter(r => r !== 'admin' || isOwner);
  const describeRole = (role: string) =>
    workspacesAvailable
      ? WORKSPACE_DESCRIPTIONS[role as TeamRole]
      : PERSONAL_ONLY_DESCRIPTIONS[role] ?? WORKSPACE_DESCRIPTIONS[role as TeamRole];
  const referenceRoles: TeamRole[] = workspacesAvailable ? ALL_ROLE_ORDER : ['owner', ...LEGACY_ROLES];

  // Members of someone else's organization can see their team even on a free personal plan.
  const isMemberOfOtherOrg = !!organization && organization.owner_id !== user?.id;
  // Enterprise seats come from their agreement with Senseible, not an MSME plan.
  const showUpgradeWall = !premiumLoading && !planIncludesTeam(tier) && !isMemberOfOtherOrg && !enterprise;

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [sessionLoading, isAuthenticated, navigate]);

  const fetchTeamData = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    setLoadError(null);
    try {
      const [memberRes, inviteRes, orgRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('id, user_id, role, joined_at, invited_email')
          .eq('organization_id', organization.id),
        supabase
          .from('team_invitations')
          .select('id, email, role, expires_at, created_at')
          .eq('organization_id', organization.id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('organizations')
          .select('max_members')
          .eq('id', organization.id)
          .maybeSingle(),
      ]);

      const firstError = memberRes.error || inviteRes.error || orgRes.error;
      if (firstError) setLoadError(firstError.message);

      setMembers(
        ((memberRes.data as TeamMember[] | null) ?? [])
          .slice()
          .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
      );
      setInvitations((inviteRes.data as Invitation[] | null) ?? []);
      if (orgRes.data && typeof orgRes.data.max_members === 'number') {
        setSeatLimit(orgRes.data.max_members);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      setLoadError(error instanceof Error ? error.message : 'Could not load your team.');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) {
      fetchTeamData();
    } else {
      // No organization: nothing to load, so never leave a spinner running.
      setMembers([]);
      setInvitations([]);
      setSeatLimit(null);
      setIsLoading(false);
    }
  }, [organization?.id, fetchTeamData]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newOrgName.trim();
    if (!name) {
      setCreateError('Enter a name for your organization.');
      return;
    }
    setCreateError(null);
    try {
      await createOrganization.mutateAsync(name);
      toast.success(`${name} created`);
      setNewOrgName('');
    } catch (err) {
      console.error('Failed to create organization:', err);
      const message = (err as { message?: string })?.message || 'Could not create the organization.';
      setCreateError(
        /permission denied/i.test(message) ? `${message}. ${PENDING_MIGRATION_MESSAGE}` : message
      );
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !organization?.id) return;
    setInviteError(null);

    if (seatsFull) {
      setInviteError(
        `All ${maxMembers} seats are in use (members plus pending invitations). Cancel an invitation or upgrade to add more.`
      );
      return;
    }

    setIsInviting(true);
    try {
      const { error } = await supabase.functions.invoke('send-team-invitation', {
        body: { email: inviteEmail.trim().toLowerCase(), role: inviteRole, organizationId: organization.id },
      });
      if (error) {
        const message = await getFunctionErrorMessage(error, 'Failed to send invitation');
        setInviteError(message);
        toast.error(message);
        return;
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      fetchTeamData();
    } catch (err) {
      console.error('Failed to send invitation:', err);
      const message = await getFunctionErrorMessage(err, 'Failed to send invitation');
      setInviteError(message);
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { data, error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)
      .select('id');
    if (error) {
      console.error('Failed to cancel invitation:', error);
      toast.error(`Failed to cancel invitation: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      // RLS filtered the row out: nothing was deleted.
      toast.error('Could not cancel this invitation. Only organization admins can cancel invitations.');
      return;
    }
    setInvitations(prev => prev.filter(i => i.id !== invitationId));
    toast.success('Invitation cancelled');
  };

  const handleRoleChange = async (member: TeamMember, role: string) => {
    if (!organization?.id || role === member.role) return;
    setBusyMemberId(member.id);
    try {
      const { error } = await untypedRpc('update_member_role', {
        p_organization_id: organization.id,
        p_user_id: member.user_id,
        p_role: role,
      });
      if (error) {
        toast.error(isMissingRpcError(error) ? PENDING_MIGRATION_MESSAGE : error.message);
        return;
      }
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, role } : m)));
      toast.success(`Role updated to ${ROLE_LABELS[role] || role}`);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!organization?.id) return;
    setBusyMemberId(member.id);
    try {
      const { error } = await untypedRpc('remove_member', {
        p_organization_id: organization.id,
        p_user_id: member.user_id,
      });
      if (error) {
        toast.error(isMissingRpcError(error) ? PENDING_MIGRATION_MESSAGE : error.message);
        return;
      }
      setMembers(prev => prev.filter(m => m.id !== member.id));
      toast.success('Member removed');
    } finally {
      setBusyMemberId(null);
      setMemberToRemove(null);
    }
  };

  const getInitials = (email?: string | null) => {
    if (!email) return '?';
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  // Only emails the database already holds are shown: the invited address, or your own.
  // Owners who created the organization have no invited address, so they are labelled by role.
  const memberLabel = (member: TeamMember) =>
    member.invited_email ||
    (member.user_id === user?.id ? user?.email : null) ||
    (member.role === 'owner' ? `Owner of ${organization?.name || 'this organisation'}` : `${ROLE_LABELS[member.role] || 'Team'} member`);

  if (sessionLoading || orgLoading || premiumLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showUpgradeWall) {
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
                Essential includes 3 seats, Pro 10, and Scale as many as your quote sets. Upgrade to invite your team.
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

  if (!organization) {
    return (
      <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
        <Helmet>
          <title>Organisation and team | Senseible</title>
        </Helmet>
        <CarbonParticles />
        <Navigation onSignOut={() => navigate('/')} />

        <main className="relative z-10 container mx-auto px-4 py-8 max-w-xl">
          {organizationsError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              We could not load your organization: {organizationsError.message}
              {/permission denied/i.test(organizationsError.message) && ` ${PENDING_MIGRATION_MESSAGE}`}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Create your organization
              </CardTitle>
              <CardDescription>
                Your team lives inside an organization. Create one to start inviting colleagues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org_name">Organization name</Label>
                  <Input
                    id="org_name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Your company name"
                    maxLength={120}
                    disabled={createOrganization.isPending}
                  />
                </div>
                {createError && (
                  <p className="text-sm text-destructive" role="alert">{createError}</p>
                )}
                <Button type="submit" disabled={createOrganization.isPending || !newOrgName.trim()}>
                  {createOrganization.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create organization
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
      <Helmet>
        <title>Organisation and team | Senseible</title>
        <meta name="description" content="Your organisation profile, team members and roles." />
      </Helmet>
      
      <CarbonParticles />
      <Navigation onSignOut={() => navigate('/')} />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Organisation and team</h1>
            <p className="text-muted-foreground">
              {isOrgAdmin ? 'Keep your organisation details current and decide who joins.' : `You are a member of ${organization.name || 'this organisation'}.`}
            </p>
          </div>
          
          {isOrgAdmin && (
          <Dialog
            open={inviteDialogOpen}
            onOpenChange={(open) => {
              setInviteDialogOpen(open);
              if (!open) setInviteError(null);
            }}
          >
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
                      {roleChoices.map(r => {
                        const Icon = ROLE_ICONS[r];
                        return (
                          <SelectItem key={r} value={r}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {ROLE_LABELS[r]}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {describeRole(inviteRole)}
                  </p>
                </div>

                {inviteError && (
                  <p className="text-sm text-destructive" role="alert">{inviteError}</p>
                )}
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
          )}
        </div>

        {loadError && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            Some team details could not be loaded: {loadError}
            {/permission denied/i.test(loadError) && ` ${PENDING_MIGRATION_MESSAGE}`}
          </div>
        )}

        <OrganizationProfileCard
          organization={organization}
          canEdit={organization.owner_id === user?.id || (workspacesAvailable && myRole === 'admin')}
          userId={user?.id}
          pendingMessage={PENDING_MIGRATION_MESSAGE}
          editors={workspacesAvailable ? 'the owner and admins' : 'the owner'}
        />

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
                  <p className="text-2xl font-semibold">{seatsUsed} / {maxMembers}</p>
                  {invitations.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {members.length} member{members.length === 1 ? '' : 's'} and {invitations.length} pending invitation{invitations.length === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
              </div>
              {seatsFull && isOrgAdmin && (
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
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(memberLabel(member))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {memberLabel(member)}
                            {member.user_id === user?.id && (
                              <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          {member.joined_at && (
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {isOrgAdmin && member.role !== 'owner' && member.user_id !== user?.id && (isOwner || member.role !== 'admin') ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <Select
                            value={member.role}
                            onValueChange={(role) => handleRoleChange(member, role)}
                            disabled={busyMemberId === member.id}
                          >
                            <SelectTrigger className="h-8 w-[104px] sm:w-[120px]" aria-label="Change role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleChoices.map(r => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setMemberToRemove(member)}
                            disabled={busyMemberId === member.id}
                            aria-label="Remove member"
                          >
                            {busyMemberId === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserMinus className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <RoleIcon className="w-3 h-3" />
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      )}
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
                      {isOrgAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvitation(invite.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      )}
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
            <CardTitle className="text-base">What each role can do</CardTitle>
            <CardDescription>
              {workspacesAvailable
                ? 'Records added in the organisation workspace are shared by role. Personal workspaces stay private.'
                : TEAM_SHARING_NOTE}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {referenceRoles.map(role => {
                const label = ROLE_LABELS[role];
                const Icon = ROLE_ICONS[role];
                return (
                  <div key={role} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                    <Icon className="w-4 h-4 mt-0.5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {describeRole(role)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => { if (!open) setMemberToRemove(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove team member?</AlertDialogTitle>
              <AlertDialogDescription>
                {memberToRemove ? memberLabel(memberToRemove) : 'This member'} will lose access to {organization.name}. You can invite them again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep member</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Team;
