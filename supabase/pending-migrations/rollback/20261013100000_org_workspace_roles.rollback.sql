-- Rollback for 20261013100000_org_workspace_roles.sql
-- Returns to the 20261011180000 state. Members holding a new role are mapped to
-- the nearest old role (data_manager -> analyst, carbon_auditor -> viewer) and
-- their previous roles are kept in public.org_role_rollback_backup.
-- organization_id values already written on documents, emissions, reports and
-- carbon_verifications are left in place (those columns predate this migration);
-- compliance_ledger.organization_id is dropped.
BEGIN;

CREATE TABLE IF NOT EXISTS public.org_role_rollback_backup (
  source text NOT NULL, row_id uuid NOT NULL, role text NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (source, row_id));
ALTER TABLE public.org_role_rollback_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.org_role_rollback_backup FROM PUBLIC, anon, authenticated;
INSERT INTO public.org_role_rollback_backup (source, row_id, role)
SELECT 'member', id, role FROM public.organization_members WHERE role IN ('data_manager', 'carbon_auditor')
UNION ALL
SELECT 'invitation', id, role FROM public.team_invitations WHERE role IN ('data_manager', 'carbon_auditor')
ON CONFLICT DO NOTHING;

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.team_invitations DROP CONSTRAINT IF EXISTS team_invitations_role_check;
UPDATE public.organization_members SET role = CASE role WHEN 'data_manager' THEN 'analyst' ELSE 'viewer' END
 WHERE role IN ('data_manager', 'carbon_auditor');
UPDATE public.team_invitations SET role = CASE role WHEN 'data_manager' THEN 'analyst' ELSE 'viewer' END
 WHERE role IN ('data_manager', 'carbon_auditor');
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'analyst'::text, 'viewer'::text]));
ALTER TABLE public.team_invitations ADD CONSTRAINT team_invitations_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'analyst'::text, 'viewer'::text]));

DROP POLICY IF EXISTS "Org members can view org documents" ON public.documents;
DROP POLICY IF EXISTS "Org members can view org emissions" ON public.emissions;
DROP POLICY IF EXISTS "Org members can view org verifications" ON public.carbon_verifications;
DROP POLICY IF EXISTS "Org members can view org reports" ON public.reports;
DROP POLICY IF EXISTS "Org members can view org ledger" ON public.compliance_ledger;
DROP POLICY IF EXISTS "Org admins can update their organization" ON public.organizations;

DROP TRIGGER IF EXISTS guard_record_organization ON public.documents;
DROP TRIGGER IF EXISTS guard_record_organization ON public.emissions;
DROP TRIGGER IF EXISTS guard_record_organization ON public.reports;
DROP TRIGGER IF EXISTS guard_record_organization ON public.carbon_verifications;
DROP TRIGGER IF EXISTS guard_record_organization ON public.compliance_ledger;
DROP FUNCTION IF EXISTS public.guard_record_organization();
DROP TRIGGER IF EXISTS guard_organization_owner ON public.organizations;
DROP FUNCTION IF EXISTS public.guard_organization_owner();

DROP INDEX IF EXISTS public.documents_org_hash_key;
DROP INDEX IF EXISTS public.documents_organization_id_idx;
DROP INDEX IF EXISTS public.emissions_organization_id_idx;
DROP INDEX IF EXISTS public.carbon_verifications_organization_id_idx;
DROP INDEX IF EXISTS public.reports_organization_id_idx;
DROP INDEX IF EXISTS public.compliance_ledger_organization_id_idx;
ALTER TABLE public.compliance_ledger DROP COLUMN IF EXISTS organization_id;

DROP FUNCTION IF EXISTS public.service_org_can(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.my_org_permissions(uuid);

-- Previous definitions (20260925151016 and 20261011180000), restored verbatim.
CREATE OR REPLACE FUNCTION public.service_create_team_invitation(
  p_actor_id uuid, p_organization_id uuid, p_email text, p_role text, p_token text
)
RETURNS public.team_invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_email text := lower(trim(p_email)); v_limit integer; v_used integer; v_result public.team_invitations;
BEGIN
  IF NOT public.is_org_admin(p_actor_id, p_organization_id) THEN RAISE EXCEPTION 'Organization administrator access required'; END IF;
  IF p_role NOT IN ('admin','analyst','viewer') THEN RAISE EXCEPTION 'Invalid team role'; END IF;
  IF v_email = '' OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Valid email required'; END IF;
  SELECT GREATEST(COALESCE(max_members,1),1) INTO v_limit FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;
  SELECT count(*) INTO v_used FROM public.organization_members WHERE organization_id=p_organization_id;
  SELECT v_used + count(*) INTO v_used FROM public.team_invitations WHERE organization_id=p_organization_id AND accepted_at IS NULL AND expires_at>now();
  IF v_used >= v_limit THEN RAISE EXCEPTION 'Organization member limit reached'; END IF;
  IF EXISTS (SELECT 1 FROM public.team_invitations WHERE organization_id=p_organization_id AND lower(email)=v_email AND accepted_at IS NULL AND expires_at>now()) THEN RAISE EXCEPTION 'An active invitation already exists for this email'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members om JOIN auth.users u ON u.id=om.user_id WHERE om.organization_id=p_organization_id AND lower(u.email)=v_email) THEN RAISE EXCEPTION 'This account is already an organization member'; END IF;
  INSERT INTO public.team_invitations(organization_id,email,role,invited_by,token) VALUES(p_organization_id,v_email,p_role,p_actor_id,p_token) RETURNING * INTO v_result;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.update_member_role(p_organization_id uuid, p_user_id uuid, p_role text)
RETURNS public.organization_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_member public.organization_members;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF NOT private.is_org_admin(v_uid, p_organization_id) THEN
    RAISE EXCEPTION 'Organization administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('admin', 'analyst', 'viewer') THEN
    RAISE EXCEPTION 'Invalid team role' USING ERRCODE = '22023';
  END IF;
  IF p_user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot change your own role' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_member
    FROM public.organization_members
   WHERE organization_id = p_organization_id AND user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_member.role = 'owner' OR EXISTS (
    SELECT 1 FROM public.organizations WHERE id = p_organization_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'The organization owner cannot be changed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organization_members
     SET role = p_role
   WHERE id = v_member.id
  RETURNING * INTO v_member;
  RETURN v_member;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_member(p_organization_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_member public.organization_members;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  -- Admins can remove others; any non-owner member can leave.
  IF p_user_id <> v_uid AND NOT private.is_org_admin(v_uid, p_organization_id) THEN
    RAISE EXCEPTION 'Organization administrator access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_member
    FROM public.organization_members
   WHERE organization_id = p_organization_id AND user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_member.role = 'owner' OR EXISTS (
    SELECT 1 FROM public.organizations WHERE id = p_organization_id AND owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'The organization owner cannot be removed' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.organization_members WHERE id = v_member.id;
  DELETE FROM public.user_contexts
   WHERE user_id = p_user_id AND context_type = 'msme' AND context_id = p_organization_id;
END;
$$;

DROP FUNCTION IF EXISTS private.org_can(uuid, uuid, text);
DROP FUNCTION IF EXISTS private.role_can(text, text);
DROP FUNCTION IF EXISTS private.org_role(uuid, uuid);
REVOKE USAGE ON SCHEMA private FROM service_role;

COMMIT;
