// Who may act on which records, for edge functions that use the service role.
// Pure apart from orgCan, which takes the client as an argument, so the website
// tests run this file too (no Deno or esm.sh imports).
//
// Personal records belong to their uploader. Organisation records (rows with an
// organization_id) belong to the organisation and are governed by team roles,
// checked in the database by public.service_org_can.

export type Capability =
  | 'records.view'
  | 'records.upload'
  | 'records.manage'
  | 'records.verify'
  | 'reports.create'
  | 'team.manage'
  | 'org.edit';

export interface OwnedRow {
  user_id: string | null;
  session_id?: string | null;
  organization_id?: string | null;
}

export type RecordAccess =
  | { kind: 'personal' }
  | { kind: 'guest' }
  | { kind: 'organization'; organizationId: string }
  | { kind: 'denied'; reason: 'mixed_workspaces' | 'not_owner' | 'sign_in_required' };

/**
 * Decides which workspace a set of records belongs to, before any role check.
 * All rows must sit in one workspace; organisation rows need a signed-in user,
 * whose team role the caller then checks with orgCan.
 */
export function decideRecordAccess(rows: OwnedRow[], ctx: { userId: string | null; sessionId: string | null }): RecordAccess {
  const orgIds = new Set(rows.map(r => r.organization_id ?? null));
  if (orgIds.size > 1) return { kind: 'denied', reason: 'mixed_workspaces' };
  const orgId = [...orgIds][0] ?? null;
  if (orgId) {
    return ctx.userId ? { kind: 'organization', organizationId: orgId } : { kind: 'denied', reason: 'sign_in_required' };
  }
  if (ctx.userId) {
    return rows.every(r => r.user_id === ctx.userId) ? { kind: 'personal' } : { kind: 'denied', reason: 'not_owner' };
  }
  if (ctx.sessionId) {
    return rows.every(r => r.user_id === null && r.session_id === ctx.sessionId) ? { kind: 'guest' } : { kind: 'denied', reason: 'not_owner' };
  }
  return { kind: 'denied', reason: 'sign_in_required' };
}

/** Delete rule for one invoice in an organisation: managers any, uploaders their own. */
export function canDeleteOrganizationDocument(
  doc: { user_id: string | null },
  userId: string,
  can: { manage: boolean; upload: boolean },
): boolean {
  return can.manage || (can.upload && doc.user_id === userId);
}

interface RpcClient {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
}

/** Team-role check in the database. Any error (including a missing function) means no. */
export async function orgCan(client: unknown, userId: string, organizationId: string, capability: Capability): Promise<boolean> {
  const { data, error } = await (client as RpcClient).rpc('service_org_can', {
    p_user_id: userId,
    p_organization_id: organizationId,
    p_capability: capability,
  });
  if (error) {
    console.error('service_org_can failed:', error.code || error.message);
    return false;
  }
  return data === true;
}

/** Idempotency key input: personal sets are keyed by user, organisation sets by organisation. */
export function idempotencyCanonical(access: RecordAccess, userId: string, emissionIds: string[]): string {
  const ids = [...emissionIds].sort().join(',');
  return access.kind === 'organization' ? `org:${access.organizationId}:${ids}` : `${userId}:${ids}`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
