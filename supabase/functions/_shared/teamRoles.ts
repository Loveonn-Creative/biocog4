// Team roles and what each may do, shared by the website (Team page) and the
// invitation email. Must match private.role_can in
// supabase/pending-migrations/20261013100000_org_workspace_roles.sql.
// Pure: no Deno or Supabase imports.

export type TeamRole = 'owner' | 'admin' | 'data_manager' | 'analyst' | 'carbon_auditor' | 'viewer';

export const ROLE_ORDER: TeamRole[] = ['owner', 'admin', 'data_manager', 'analyst', 'carbon_auditor', 'viewer'];

/** Roles that can be given by invitation or role change (the owner is fixed). */
export const ASSIGNABLE_ROLES: TeamRole[] = ['admin', 'data_manager', 'analyst', 'carbon_auditor', 'viewer'];

/** Roles that exist before the workspace migration is applied. */
export const LEGACY_ROLES: TeamRole[] = ['admin', 'analyst', 'viewer'];

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  data_manager: 'Data manager',
  analyst: 'Analyst',
  carbon_auditor: 'Carbon auditor',
  viewer: 'Viewer',
};

export const ROLE_CAPABILITIES: Record<TeamRole, string[]> = {
  owner: ['records.view', 'records.upload', 'records.manage', 'records.verify', 'reports.create', 'team.manage', 'org.edit'],
  admin: ['records.view', 'records.upload', 'records.manage', 'records.verify', 'reports.create', 'team.manage', 'org.edit'],
  data_manager: ['records.view', 'records.upload', 'records.manage', 'records.verify', 'reports.create'],
  analyst: ['records.view', 'records.upload', 'reports.create'],
  carbon_auditor: ['records.view', 'records.verify', 'reports.create'],
  viewer: ['records.view'],
};

/**
 * Before the workspace migration: roles only control the team itself, and
 * every member's records stay in their own account.
 */
export const LEGACY_ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Edits the organisation profile and manages the team. The owner\'s plan sets the seats.',
  admin: 'Invites members, changes their roles and removes them.',
  analyst: 'For members who upload and verify invoices. Sees the team and organisation profile.',
  viewer: 'For members who only read. Sees the team and organisation profile.',
};

/** What each role can do in the shared organisation workspace. */
export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Everything, including the team and organisation profile. The owner\'s plan sets the seats.',
  admin: 'Everything except changing admins: invites members, sets roles, edits the organisation profile.',
  data_manager: 'Adds, corrects and removes unverified invoices, and verifies them.',
  analyst: 'Adds invoices and builds reports. Cannot verify, so a second person checks the numbers.',
  carbon_auditor: 'Reviews and verifies records and builds reports. Cannot add or change invoices.',
  viewer: 'Reads records and reports. Changes nothing.',
};
