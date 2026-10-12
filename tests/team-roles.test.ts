import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { ASSIGNABLE_ROLES, ROLE_CAPABILITIES, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_ORDER } from '../src/lib/teamRoles';

const sql = readFileSync('supabase/pending-migrations/20261013100000_org_workspace_roles.sql', 'utf8');

describe('team roles', () => {
  test('the app role table matches private.role_can in the migration', () => {
    const body = sql.slice(sql.indexOf('FUNCTION private.role_can'), sql.indexOf('FUNCTION private.org_can'));
    const fromSql: Record<string, string[]> = {};
    for (const m of body.matchAll(/WHEN '([a-z.]+)'\s+THEN _role IN \(([^)]*)\)/g)) {
      for (const role of m[2].match(/'([a-z_]+)'/g)!.map(r => r.slice(1, -1))) {
        (fromSql[role] ||= []).push(m[1]);
      }
    }
    for (const role of ROLE_ORDER) {
      expect([...(fromSql[role] ?? [])].sort()).toEqual([...ROLE_CAPABILITIES[role]].sort());
    }
  });

  test('the migration accepts exactly the assignable roles', () => {
    const inv = sql.match(/team_invitations_role_check\s+CHECK \(role IN \(([^)]*)\)\)/)![1];
    expect(inv.match(/'([a-z_]+)'/g)!.map(r => r.slice(1, -1)).sort()).toEqual([...ASSIGNABLE_ROLES].sort());
  });

  test('separation of duties: no role both uploads and is limited to verifying', () => {
    expect(ROLE_CAPABILITIES.analyst).not.toContain('records.verify');
    expect(ROLE_CAPABILITIES.carbon_auditor).not.toContain('records.upload');
    expect(ROLE_CAPABILITIES.viewer).toEqual(['records.view']);
  });

  test('every role has a label and plain-language description without em dashes', () => {
    for (const role of ROLE_ORDER) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(10);
      expect(ROLE_DESCRIPTIONS[role]).not.toContain('—');
    }
  });
});
