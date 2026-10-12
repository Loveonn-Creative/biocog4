import { describe, expect, test } from 'bun:test';
import {
  canDeleteOrganizationDocument,
  decideRecordAccess,
  idempotencyCanonical,
  orgCan,
} from '../supabase/functions/_shared/workspaceAccess';
import { applyScope, ownerColumns, realtimeFilter, scopeCan, scopeKey, type WorkspaceScope } from '../src/lib/workspaceScope';
import { pickOrganizationId } from '../src/lib/workspaceChoice';

const U = 'u-1', V = 'u-2', S = 's-1', ORG = 'o-1', ORG2 = 'o-2';

describe('decideRecordAccess', () => {
  test('personal rows must all be the caller\'s', () => {
    expect(decideRecordAccess([{ user_id: U }, { user_id: U }], { userId: U, sessionId: null })).toEqual({ kind: 'personal' });
    expect(decideRecordAccess([{ user_id: U }, { user_id: V }], { userId: U, sessionId: null })).toEqual({ kind: 'denied', reason: 'not_owner' });
  });
  test('a signed-in user cannot claim guest rows by sending a session id', () => {
    expect(decideRecordAccess([{ user_id: null, session_id: S }], { userId: U, sessionId: S }).kind).toBe('denied');
  });
  test('organisation rows go to the role check, whoever uploaded them', () => {
    expect(decideRecordAccess([{ user_id: V, organization_id: ORG }, { user_id: U, organization_id: ORG }], { userId: U, sessionId: null }))
      .toEqual({ kind: 'organization', organizationId: ORG });
  });
  test('one call never mixes workspaces', () => {
    expect(decideRecordAccess([{ user_id: U, organization_id: ORG }, { user_id: U }], { userId: U, sessionId: null }).kind).toBe('denied');
    expect(decideRecordAccess([{ user_id: U, organization_id: ORG }, { user_id: U, organization_id: ORG2 }], { userId: U, sessionId: null }).kind).toBe('denied');
  });
  test('guests keep their session path; organisation rows need sign-in', () => {
    expect(decideRecordAccess([{ user_id: null, session_id: S }], { userId: null, sessionId: S })).toEqual({ kind: 'guest' });
    expect(decideRecordAccess([{ user_id: V, organization_id: ORG }], { userId: null, sessionId: S }).kind).toBe('denied');
  });
});

describe('organisation rules', () => {
  test('delete: managers any invoice, uploaders their own, others none', () => {
    expect(canDeleteOrganizationDocument({ user_id: V }, U, { manage: true, upload: true })).toBe(true);
    expect(canDeleteOrganizationDocument({ user_id: U }, U, { manage: false, upload: true })).toBe(true);
    expect(canDeleteOrganizationDocument({ user_id: V }, U, { manage: false, upload: true })).toBe(false);
    expect(canDeleteOrganizationDocument({ user_id: U }, U, { manage: false, upload: false })).toBe(false);
  });
  test('the same emission set has one idempotency key per organisation, whoever verifies', () => {
    const access = { kind: 'organization', organizationId: ORG } as const;
    expect(idempotencyCanonical(access, U, ['b', 'a'])).toBe(idempotencyCanonical(access, V, ['a', 'b']));
    expect(idempotencyCanonical({ kind: 'personal' }, U, ['b', 'a'])).toBe(`${U}:a,b`);
  });
  test('orgCan is false on any database error, including a missing function', async () => {
    const missing = { rpc: async () => ({ data: null, error: { code: 'PGRST202' } }) };
    expect(await orgCan(missing, U, ORG, 'records.verify')).toBe(false);
    const yes = { rpc: async (_: string, args: Record<string, unknown>) => ({ data: args.p_capability === 'records.verify', error: null }) };
    expect(await orgCan(yes, U, ORG, 'records.verify')).toBe(true);
    expect(await orgCan(yes, U, ORG, 'records.upload')).toBe(false);
  });
});

describe('workspace scope in the app', () => {
  // A stand-in builder that records the filters it receives.
  const builder = () => {
    const calls: string[] = [];
    const b = {
      eq: (c: string, v: string) => { calls.push(`${c}=${v}`); return b; },
      is: (c: string, v: null) => { calls.push(`${c} is ${v}`); return b; },
      calls,
    };
    return b;
  };
  const org: WorkspaceScope = { kind: 'organization', userId: U, organizationId: ORG, capabilities: ['records.view', 'records.upload'] };

  test('filters per workspace', () => {
    let b = builder(); applyScope(b, org); expect(b.calls).toEqual([`organization_id=${ORG}`]);
    b = builder(); applyScope(b, { kind: 'personal', userId: U, excludeOrganizationRecords: true });
    expect(b.calls).toEqual([`user_id=${U}`, 'organization_id is null']);
    b = builder(); applyScope(b, { kind: 'personal', userId: U, excludeOrganizationRecords: false });
    expect(b.calls).toEqual([`user_id=${U}`]);
    b = builder(); applyScope(b, { kind: 'guest', sessionId: S }); expect(b.calls).toEqual([`session_id=${S}`]);
    expect(applyScope(builder(), { kind: 'none' })).toBeNull();
  });
  test('owner columns, realtime filter and keys', () => {
    expect(ownerColumns(org)).toEqual({ user_id: U, session_id: null, organization_id: ORG });
    expect(ownerColumns({ kind: 'guest', sessionId: S })).toEqual({ user_id: null, session_id: S });
    expect(realtimeFilter(org)).toBe(`organization_id=eq.${ORG}`);
    expect(scopeKey(org)).not.toBe(scopeKey({ kind: 'personal', userId: U, excludeOrganizationRecords: true }));
  });
  test('capabilities: organisation roles decide; personal owners can act on their own records', () => {
    expect(scopeCan(org, 'records.upload')).toBe(true);
    expect(scopeCan(org, 'records.verify')).toBe(false);
    expect(scopeCan({ kind: 'personal', userId: U, excludeOrganizationRecords: true }, 'records.verify')).toBe(true);
    expect(scopeCan({ kind: 'personal', userId: U, excludeOrganizationRecords: true }, 'team.manage')).toBe(false);
  });
  test('default workspace: invited members start in the organisation, owners in personal', () => {
    const orgs = [{ id: ORG, owner_id: U }, { id: ORG2, owner_id: V }];
    expect(pickOrganizationId(U, null, orgs)).toBe(ORG2);
    expect(pickOrganizationId(U, null, [{ id: ORG, owner_id: U }])).toBeNull();
    expect(pickOrganizationId(U, 'personal', orgs)).toBeNull();
    expect(pickOrganizationId(U, ORG, orgs)).toBe(ORG);
    expect(pickOrganizationId(U, 'gone', orgs)).toBeNull();
  });
});
