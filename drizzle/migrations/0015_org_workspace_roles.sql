-- Applied through Lovable (drizzle). Source: supabase/pending-migrations/20261013100000_org_workspace_roles.sql
-- Rollback: supabase/pending-migrations/rollback/20261013100000_org_workspace_roles.rollback.sql
-- =============================================
-- PENDING (NOT APPLIED). Organisation workspace with role-based access.
-- Rollback: rollback/20261013100000_org_workspace_roles.rollback.sql
--
-- Depends on 20261011180000_team_access_and_ledger_integrity.sql (private
-- schema helpers, update_member_role). Aborts if that is missing.
--
-- What it does
--  a) Six team roles and one permission matrix (private.org_can).
--  b) service_org_can(): the same check for edge functions (service_role only).
--  c) Owners and admins can edit the organisation profile; nobody can change
--     owner_id or plan columns from the browser.
--  d) Records uploaded in an organisation workspace carry organization_id.
--     A trigger checks the uploader may add records there; emissions inherit
--     the organisation of their invoice; the tag cannot be changed later.
--  e) Members read their organisation's records through additive SELECT
--     policies. Existing owner policies are untouched, so personal records
--     stay private and nothing a user sees today disappears.
--  f) Invitations and role changes accept the new roles.
--
-- Nothing here deletes or rewrites existing rows.
-- =============================================


DO $$
BEGIN
  IF to_regprocedure('private.is_org_admin(uuid, uuid)') IS NULL
     OR to_regprocedure('public.update_member_role(uuid, uuid, text)') IS NULL THEN
    RAISE EXCEPTION 'Apply 20261011180000_team_access_and_ledger_integrity.sql first';
  END IF;
END $$;

-- ---------------------------------------------
-- a) Roles and the permission matrix
-- ---------------------------------------------
-- Six roles, modelled on cloud IAM: a fixed set of capabilities per role,
-- checked in one place (private.org_can) by every policy, trigger and RPC.
--
--   capability        owner admin data_manager analyst carbon_auditor viewer
--   records.view        x     x        x          x          x          x
--   records.upload      x     x        x          x
--   records.manage      x     x        x                                    (edit/delete any unverified org record)
--   records.verify      x     x        x                     x
--   reports.create      x     x        x          x          x
--   team.manage         x     x
--   org.edit            x     x
--
-- Billing stays with the owner's own subscription and is not a team capability.

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'data_manager', 'analyst', 'carbon_auditor', 'viewer'));

ALTER TABLE public.team_invitations DROP CONSTRAINT IF EXISTS team_invitations_role_check;
ALTER TABLE public.team_invitations ADD CONSTRAINT team_invitations_role_check
  CHECK (role IN ('admin', 'data_manager', 'analyst', 'carbon_auditor', 'viewer'));

CREATE OR REPLACE FUNCTION private.org_role(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _org_id AND o.owner_id = _user_id) THEN 'owner'
    ELSE (SELECT m.role FROM public.organization_members m
           WHERE m.organization_id = _org_id AND m.user_id = _user_id)
  END
$$;

CREATE OR REPLACE FUNCTION private.role_can(_role text, _capability text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE _capability
    WHEN 'records.view'   THEN _role IN ('owner', 'admin', 'data_manager', 'analyst', 'carbon_auditor', 'viewer')
    WHEN 'records.upload' THEN _role IN ('owner', 'admin', 'data_manager', 'analyst')
    WHEN 'records.manage' THEN _role IN ('owner', 'admin', 'data_manager')
    WHEN 'records.verify' THEN _role IN ('owner', 'admin', 'data_manager', 'carbon_auditor')
    WHEN 'reports.create' THEN _role IN ('owner', 'admin', 'data_manager', 'analyst', 'carbon_auditor')
    WHEN 'team.manage'    THEN _role IN ('owner', 'admin')
    WHEN 'org.edit'       THEN _role IN ('owner', 'admin')
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION private.org_can(_user_id uuid, _org_id uuid, _capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL AND _org_id IS NOT NULL
     AND coalesce(private.role_can(private.org_role(_user_id, _org_id), _capability), false)
$$;

REVOKE ALL ON FUNCTION private.org_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.role_can(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.org_can(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.org_role(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.role_can(text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION private.org_can(uuid, uuid, text) TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA private TO service_role;

-- What the browser needs to draw the right buttons. Returns NULL role for non-members.
CREATE OR REPLACE FUNCTION public.my_org_permissions(p_organization_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'role', private.org_role(auth.uid(), p_organization_id),
    'capabilities', coalesce((
      SELECT jsonb_agg(c ORDER BY c) FROM unnest(ARRAY[
        'records.view', 'records.upload', 'records.manage', 'records.verify',
        'reports.create', 'team.manage', 'org.edit']) AS c
      WHERE private.org_can(auth.uid(), p_organization_id, c)
    ), '[]'::jsonb)
  )
$$;
REVOKE ALL ON FUNCTION public.my_org_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_org_permissions(uuid) TO authenticated;

-- ---------------------------------------------
-- b) The same check for edge functions
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.service_org_can(p_user_id uuid, p_organization_id uuid, p_capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.org_can(p_user_id, p_organization_id, p_capability)
$$;
REVOKE ALL ON FUNCTION public.service_org_can(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_org_can(uuid, uuid, text) TO service_role;

-- ---------------------------------------------
-- c) Organisation profile: owners and admins edit; owner_id is fixed
-- ---------------------------------------------
DROP POLICY IF EXISTS "Org admins can update their organization" ON public.organizations;
CREATE POLICY "Org admins can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (private.org_can(auth.uid(), id, 'org.edit'))
  WITH CHECK (private.org_can(auth.uid(), id, 'org.edit'));

-- subscription_tier and max_members are already restored by
-- protect_organizations_privileged_columns. This adds owner_id, so an admin
-- cannot make themselves owner. Ownership transfer is not offered yet.
CREATE OR REPLACE FUNCTION public.guard_organization_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_trusted_db_writer() AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'The organisation owner cannot be changed here' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_organization_owner() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_organization_owner ON public.organizations;
CREATE TRIGGER guard_organization_owner
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_organization_owner();

-- ---------------------------------------------
-- d) Organisation tag on records
-- ---------------------------------------------
ALTER TABLE public.compliance_ledger
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documents_organization_id_idx ON public.documents (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS emissions_organization_id_idx ON public.emissions (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS carbon_verifications_organization_id_idx ON public.carbon_verifications (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_organization_id_idx ON public.reports (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS compliance_ledger_organization_id_idx ON public.compliance_ledger (organization_id) WHERE organization_id IS NOT NULL;
-- One document per invoice file inside an organisation, so two members cannot
-- count the same invoice twice.
CREATE UNIQUE INDEX IF NOT EXISTS documents_org_hash_key
  ON public.documents (organization_id, document_hash)
  WHERE organization_id IS NOT NULL AND document_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_record_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_doc_org uuid;
  v_capability text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id AND NOT public.is_trusted_db_writer() THEN
      RAISE EXCEPTION 'A record cannot be moved between workspaces' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Emissions belong to the workspace of their invoice.
  -- (Nested IF: PL/pgSQL would otherwise read NEW.document_id on tables without it.)
  IF TG_TABLE_NAME = 'emissions' THEN
    IF NEW.document_id IS NOT NULL THEN
      SELECT d.organization_id INTO v_doc_org FROM public.documents d WHERE d.id = NEW.document_id;
      IF NEW.organization_id IS NULL THEN
        NEW.organization_id := v_doc_org;
      ELSIF NEW.organization_id IS DISTINCT FROM v_doc_org THEN
        RAISE EXCEPTION 'Emission and invoice belong to different workspaces' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF NEW.organization_id IS NULL OR public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;

  v_capability := CASE TG_TABLE_NAME
    WHEN 'reports' THEN 'reports.create'
    WHEN 'carbon_verifications' THEN 'records.verify'
    WHEN 'compliance_ledger' THEN 'records.verify'
    ELSE 'records.upload'
  END;
  IF NOT private.org_can(auth.uid(), NEW.organization_id, v_capability) THEN
    RAISE EXCEPTION 'Your team role does not allow this in the organisation workspace' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_record_organization() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_record_organization ON public.documents;
CREATE TRIGGER guard_record_organization BEFORE INSERT OR UPDATE OF organization_id ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_record_organization();
DROP TRIGGER IF EXISTS guard_record_organization ON public.emissions;
CREATE TRIGGER guard_record_organization BEFORE INSERT OR UPDATE OF organization_id ON public.emissions
  FOR EACH ROW EXECUTE FUNCTION public.guard_record_organization();
DROP TRIGGER IF EXISTS guard_record_organization ON public.reports;
CREATE TRIGGER guard_record_organization BEFORE INSERT OR UPDATE OF organization_id ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_record_organization();
DROP TRIGGER IF EXISTS guard_record_organization ON public.carbon_verifications;
CREATE TRIGGER guard_record_organization BEFORE INSERT OR UPDATE OF organization_id ON public.carbon_verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_record_organization();
DROP TRIGGER IF EXISTS guard_record_organization ON public.compliance_ledger;
CREATE TRIGGER guard_record_organization BEFORE INSERT OR UPDATE OF organization_id ON public.compliance_ledger
  FOR EACH ROW EXECUTE FUNCTION public.guard_record_organization();

-- ---------------------------------------------
-- e) Members read their organisation's records (additive)
-- ---------------------------------------------
DROP POLICY IF EXISTS "Org members can view org documents" ON public.documents;
CREATE POLICY "Org members can view org documents" ON public.documents FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND private.org_can(auth.uid(), organization_id, 'records.view'));
DROP POLICY IF EXISTS "Org members can view org emissions" ON public.emissions;
CREATE POLICY "Org members can view org emissions" ON public.emissions FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND private.org_can(auth.uid(), organization_id, 'records.view'));
DROP POLICY IF EXISTS "Org members can view org verifications" ON public.carbon_verifications;
CREATE POLICY "Org members can view org verifications" ON public.carbon_verifications FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND private.org_can(auth.uid(), organization_id, 'records.view'));
DROP POLICY IF EXISTS "Org members can view org reports" ON public.reports;
CREATE POLICY "Org members can view org reports" ON public.reports FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND private.org_can(auth.uid(), organization_id, 'records.view'));
DROP POLICY IF EXISTS "Org members can view org ledger" ON public.compliance_ledger;
CREATE POLICY "Org members can view org ledger" ON public.compliance_ledger FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND private.org_can(auth.uid(), organization_id, 'records.view'));

-- ---------------------------------------------
-- f) Invitations and role changes accept the new roles
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.service_create_team_invitation(
  p_actor_id uuid, p_organization_id uuid, p_email text, p_role text, p_token text
)
RETURNS public.team_invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_email text := lower(trim(p_email)); v_limit integer; v_used integer; v_result public.team_invitations;
BEGIN
  IF NOT private.org_can(p_actor_id, p_organization_id, 'team.manage') THEN RAISE EXCEPTION 'Organization administrator access required'; END IF;
  IF p_role NOT IN ('admin','data_manager','analyst','carbon_auditor','viewer') THEN RAISE EXCEPTION 'Invalid team role'; END IF;
  IF p_role = 'admin' AND private.org_role(p_actor_id, p_organization_id) <> 'owner' THEN RAISE EXCEPTION 'Only the organisation owner can invite an admin'; END IF;
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
  IF p_role NOT IN ('admin', 'data_manager', 'analyst', 'carbon_auditor', 'viewer') THEN
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

  -- Only the owner grants or takes away admin rights.
  IF (p_role = 'admin' OR v_member.role = 'admin') AND private.org_role(v_uid, p_organization_id) <> 'owner' THEN
    RAISE EXCEPTION 'Only the organisation owner can change admin access' USING ERRCODE = '42501';
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

  IF v_member.role = 'admin' AND p_user_id <> v_uid AND private.org_role(v_uid, p_organization_id) <> 'owner' THEN
    RAISE EXCEPTION 'Only the organisation owner can remove an admin' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.organization_members WHERE id = v_member.id;
  DELETE FROM public.user_contexts
   WHERE user_id = p_user_id AND context_type = 'msme' AND context_id = p_organization_id;
END;
$$;

