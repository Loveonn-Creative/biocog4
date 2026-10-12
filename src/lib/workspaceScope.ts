/**
 * Which records a page reads and writes: a guest session, the signed-in user's
 * personal workspace, or an organisation workspace. Every records query goes
 * through applyScope so all pages agree. RLS still decides what is returned;
 * this only picks the right slice.
 */

export type Capability =
  | 'records.view'
  | 'records.upload'
  | 'records.manage'
  | 'records.verify'
  | 'reports.create'
  | 'team.manage'
  | 'org.edit';

export type WorkspaceScope =
  | { kind: 'none' }
  | { kind: 'guest'; sessionId: string }
  | {
      kind: 'personal';
      userId: string;
      /** True once organisation workspaces exist in the database: personal views then leave out organisation records. */
      excludeOrganizationRecords: boolean;
    }
  | { kind: 'organization'; userId: string; organizationId: string; capabilities: Capability[] };

// Minimal shape of a PostgREST filter builder. Constraining T to it makes the
// generated client types recurse too deeply, so the cast happens inside.
interface Filterable {
  eq(column: string, value: string): Filterable;
  is(column: string, value: null): Filterable;
}

/** Adds the owner filter for the scope. Returns null when there is nothing to read. */
export function applyScope<T>(builder: T, scope: WorkspaceScope): T | null {
  const query = builder as unknown as Filterable;
  return applyFilters(query, scope) as unknown as T | null;
}

function applyFilters(query: Filterable, scope: WorkspaceScope): Filterable | null {
  switch (scope.kind) {
    case 'organization':
      return query.eq('organization_id', scope.organizationId);
    case 'personal': {
      const own = query.eq('user_id', scope.userId);
      return scope.excludeOrganizationRecords ? own.is('organization_id', null) : own;
    }
    case 'guest':
      return query.eq('session_id', scope.sessionId);
    default:
      return null;
  }
}

/** Realtime channels accept one equality filter. */
export function realtimeFilter(scope: WorkspaceScope): string | null {
  switch (scope.kind) {
    case 'organization':
      return `organization_id=eq.${scope.organizationId}`;
    case 'personal':
      return `user_id=eq.${scope.userId}`;
    case 'guest':
      return `session_id=eq.${scope.sessionId}`;
    default:
      return null;
  }
}

/** Owner columns for a new document or emission row. */
export function ownerColumns(scope: WorkspaceScope): { user_id: string | null; session_id: string | null; organization_id?: string } {
  switch (scope.kind) {
    case 'organization':
      return { user_id: scope.userId, session_id: null, organization_id: scope.organizationId };
    case 'personal':
      return { user_id: scope.userId, session_id: null };
    case 'guest':
      return { user_id: null, session_id: scope.sessionId };
    default:
      return { user_id: null, session_id: null };
  }
}

/** Stable key for effect and query dependencies. */
export function scopeKey(scope: WorkspaceScope): string {
  switch (scope.kind) {
    case 'organization':
      return `org:${scope.organizationId}:${scope.userId}`;
    case 'personal':
      return `user:${scope.userId}:${scope.excludeOrganizationRecords ? 1 : 0}`;
    case 'guest':
      return `guest:${scope.sessionId}`;
    default:
      return 'none';
  }
}

/** In your own workspace you can do everything to your own records. */
export function scopeCan(scope: WorkspaceScope, capability: Capability): boolean {
  if (scope.kind === 'organization') return scope.capabilities.includes(capability);
  if (capability === 'team.manage' || capability === 'org.edit') return false;
  return scope.kind !== 'none';
}

/** Short reason shown next to a disabled action in an organisation workspace. */
export const CAPABILITY_REASON: Record<Capability, string> = {
  'records.view': 'Your team role cannot view records here.',
  'records.upload': 'Your team role cannot add invoices here. Ask an admin for analyst or data manager access.',
  'records.manage': 'Only admins and data managers can remove records here.',
  'records.verify': 'Only admins, data managers and carbon auditors can verify here.',
  'reports.create': 'Your team role cannot create reports here.',
  'team.manage': 'Only the owner and admins can manage the team.',
  'org.edit': 'Only the owner and admins can edit the organisation profile.',
};
