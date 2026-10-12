/**
 * The viewer's chosen workspace, shared by useWorkspace (pages) and the
 * upload path on the home page, which must not import the Supabase client up
 * front. Stored in localStorage as a per-viewer convenience only; the database
 * decides what each workspace may read or write.
 */
import type { Capability, WorkspaceScope } from './workspaceScope';

const KEY = (uid: string) => `senseible_workspace_${uid}`;
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

export function readWorkspaceChoice(uid: string): string | null {
  if (memory.has(uid)) return memory.get(uid) ?? null;
  try {
    return localStorage.getItem(KEY(uid));
  } catch {
    return null;
  }
}

export function chooseWorkspace(uid: string, choice: 'personal' | string) {
  memory.set(uid, choice);
  try {
    localStorage.setItem(KEY(uid), choice);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  version += 1;
  listeners.forEach(l => l());
}

export const subscribeWorkspaceChoice = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const workspaceChoiceVersion = () => version;

/**
 * Which organisation to open. An explicit choice wins; otherwise members invited
 * into someone else's organisation start there, and owners start in their
 * personal workspace, where their history already is.
 */
export function pickOrganizationId(
  uid: string,
  stored: string | null,
  organizations: { id: string; owner_id: string | null }[],
): string | null {
  if (stored === 'personal') return null;
  if (stored) return organizations.some(o => o.id === stored) ? stored : null;
  return organizations.find(o => o.owner_id !== uid)?.id ?? null;
}

interface RpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
  from: (table: string) => { select: (cols: string) => PromiseLike<{ data: unknown; error: unknown }> };
}

const isMissingRpc = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42883' || e.code === 'PGRST202' || /could not find the function/i.test(e.message || ''));

/**
 * Resolves the scope for a write outside React (the upload path). Falls back to
 * the personal workspace whenever organisation workspaces are not live.
 */
export async function resolveWorkspaceScope(client: unknown, uid: string): Promise<WorkspaceScope & { organizationName?: string }> {
  const c = client as RpcClient;
  const { data: orgs, error: orgError } = await c.from('organizations').select('id, owner_id, name');
  const list = (orgError ? [] : (orgs as { id: string; owner_id: string | null; name: string }[]) ?? []);
  const orgId = pickOrganizationId(uid, readWorkspaceChoice(uid), list);
  const { data, error } = await c.rpc('my_org_permissions', { p_organization_id: orgId });
  if (error) {
    if (isMissingRpc(error)) return { kind: 'personal', userId: uid, excludeOrganizationRecords: false };
    throw new Error(error.message || 'Could not check your workspace');
  }
  const perms = (data ?? {}) as { role?: string | null; capabilities?: Capability[] };
  if (orgId && perms.role) {
    return {
      kind: 'organization',
      userId: uid,
      organizationId: orgId,
      capabilities: perms.capabilities ?? [],
      organizationName: list.find(o => o.id === orgId)?.name,
    };
  }
  return { kind: 'personal', userId: uid, excludeOrganizationRecords: true };
}
