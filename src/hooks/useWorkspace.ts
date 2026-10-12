import { useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { useOrganization, untypedRpc, isMissingRpcError, type Organization } from '@/hooks/useOrganization';
import type { Capability, WorkspaceScope } from '@/lib/workspaceScope';
import { scopeCan } from '@/lib/workspaceScope';
import { pickOrganizationId, readWorkspaceChoice, subscribeWorkspaceChoice, workspaceChoiceVersion } from '@/lib/workspaceChoice';

export { chooseWorkspace } from '@/lib/workspaceChoice';


export interface WorkspaceState {
  scope: WorkspaceScope;
  /** False until the session, organisations and permissions have loaded. */
  ready: boolean;
  /** True once the organisation workspace migration is live. */
  workspacesAvailable: boolean;
  organizations: Organization[];
  organization: Organization | null;
  role: string | null;
  can: (capability: Capability) => boolean;
}

export function useWorkspace(): WorkspaceState {
  const { user, sessionId, isLoading: sessionLoading } = useSession();
  const { organizations, isLoading: orgLoading } = useOrganization();
  useSyncExternalStore(subscribeWorkspaceChoice, workspaceChoiceVersion, workspaceChoiceVersion);

  const uid = user?.id ?? null;
  const chosenId = uid ? pickOrganizationId(uid, readWorkspaceChoice(uid), organizations) : null;
  const chosenOrg = organizations.find(o => o.id === chosenId) ?? null;

  const perms = useQuery({
    queryKey: ['org-permissions', uid, chosenOrg?.id ?? null],
    enabled: !!uid && !orgLoading,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      // Called with null to learn whether the migration is live.
      const { data, error } = await untypedRpc('my_org_permissions', { p_organization_id: chosenOrg?.id ?? null });
      if (error) {
        if (isMissingRpcError(error)) return { available: false, role: null, capabilities: [] as Capability[] };
        throw error;
      }
      const d = (data ?? {}) as { role?: string | null; capabilities?: Capability[] };
      return { available: true, role: d.role ?? null, capabilities: d.capabilities ?? [] };
    },
  });

  return useMemo(() => {
    const available = perms.data?.available ?? false;
    let scope: WorkspaceScope = { kind: 'none' };
    let role: string | null = null;
    if (uid) {
      if (available && chosenOrg && perms.data?.role) {
        role = perms.data.role;
        scope = { kind: 'organization', userId: uid, organizationId: chosenOrg.id, capabilities: perms.data.capabilities };
      } else {
        scope = { kind: 'personal', userId: uid, excludeOrganizationRecords: available };
      }
    } else if (sessionId) {
      scope = { kind: 'guest', sessionId };
    }
    const ready = !sessionLoading && (!uid || (!orgLoading && !perms.isLoading));
    return {
      scope,
      ready,
      workspacesAvailable: available,
      organizations,
      organization: scope.kind === 'organization' ? chosenOrg : null,
      role,
      can: (c: Capability) => scopeCan(scope, c),
    };
  }, [uid, sessionId, sessionLoading, orgLoading, perms.isLoading, perms.data, chosenOrg, organizations]);
}
