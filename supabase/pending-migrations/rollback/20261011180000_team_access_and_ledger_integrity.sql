-- =============================================
-- ROLLBACK for pending-migrations/20261011180000_team_access_and_ledger_integrity.sql
-- Restores the exact previous state, including the original (currently failing)
-- RLS policies that call the revoked public.* helpers.
-- =============================================

-- Run as one transaction so a failure leaves nothing half-applied.
BEGIN;

-- ---------------------------------------------
-- e) compliance_ledger
-- ---------------------------------------------
DROP POLICY IF EXISTS "Users can update their own ledger" ON public.compliance_ledger;
CREATE POLICY "Users can update their own ledger" ON public.compliance_ledger
  FOR UPDATE USING (auth.uid() = user_id);

DROP INDEX IF EXISTS public.compliance_ledger_user_emission_key;

-- Put the removed duplicate rows back, column by column (the backup table has
-- two extra columns: kept_ledger_id, backed_up_at).
DO $$
DECLARE
  v_cols text;
BEGIN
  IF to_regclass('public.compliance_ledger_duplicates_backup') IS NULL THEN
    RETURN;
  END IF;
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'compliance_ledger';
  EXECUTE format(
    'INSERT INTO public.compliance_ledger (%1$s)
     SELECT %1$s FROM public.compliance_ledger_duplicates_backup b
      WHERE NOT EXISTS (SELECT 1 FROM public.compliance_ledger l WHERE l.id = b.id)',
    v_cols
  );
END $$;

DROP TABLE IF EXISTS public.compliance_ledger_duplicates_backup;

-- ---------------------------------------------
-- d) / c) RPCs
-- ---------------------------------------------
DROP FUNCTION IF EXISTS public.remove_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.update_member_role(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.create_organization(text);

-- ---------------------------------------------
-- b) Seat sync
-- ---------------------------------------------
DROP TRIGGER IF EXISTS sync_quote_org_seat_limits ON public.scale_price_quotes;
DROP FUNCTION IF EXISTS public.sync_quote_org_seat_limits();
DROP TRIGGER IF EXISTS sync_owner_org_seat_limits ON public.profiles;
DROP TRIGGER IF EXISTS sync_organization_seat_limit ON public.organizations;
DROP FUNCTION IF EXISTS public.sync_owner_org_seat_limits();
DROP FUNCTION IF EXISTS public.sync_organization_seat_limit();
DROP FUNCTION IF EXISTS public.owner_seat_limit(uuid);
DROP FUNCTION IF EXISTS public.seat_limit_for_tier(text);

-- Restore the saved max_members values (runs with no JWT, so the
-- protect_organizations_privileged_columns trigger lets it through).
DO $$
BEGIN
  IF to_regclass('public.organizations_max_members_backup') IS NOT NULL THEN
    UPDATE public.organizations o
       SET max_members = b.max_members
      FROM public.organizations_max_members_backup b
     WHERE b.organization_id = o.id
       AND o.max_members IS DISTINCT FROM b.max_members;
  END IF;
END $$;
DROP TABLE IF EXISTS public.organizations_max_members_backup;

-- ---------------------------------------------
-- a) Restore original policies (calling public.* helpers) and drop private helpers
-- ---------------------------------------------
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members can view their org" ON public.organizations;
CREATE POLICY "Members can view their org"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can insert members" ON public.organization_members;
CREATE POLICY "Admins can insert members"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;
CREATE POLICY "Admins can update members"
  ON public.organization_members FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can remove members" ON public.organization_members;
CREATE POLICY "Admins can remove members"
  ON public.organization_members FOR DELETE
  USING (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Partner members can view their org" ON public.partner_organizations;
CREATE POLICY "Partner members can view their org"
  ON public.partner_organizations FOR SELECT
  USING (public.has_partner_access(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can manage partners" ON public.partner_organizations;
CREATE POLICY "Admins can manage partners"
  ON public.partner_organizations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Partner admins can manage access" ON public.partner_access;
CREATE POLICY "Partner admins can manage access"
  ON public.partner_access FOR ALL
  USING (public.is_partner_admin(auth.uid(), partner_id));

DROP POLICY IF EXISTS "Orgs can manage their listings" ON public.marketplace_listings;
CREATE POLICY "Orgs can manage their listings"
  ON public.marketplace_listings FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;
CREATE POLICY "System can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Org admins can view invitations" ON public.team_invitations;
CREATE POLICY "Org admins can view invitations"
  ON public.team_invitations FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can create invitations" ON public.team_invitations;
CREATE POLICY "Org admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can delete invitations" ON public.team_invitations;
CREATE POLICY "Org admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage applications" ON public.partner_applications;
CREATE POLICY "Admins can manage applications"
ON public.partner_applications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP FUNCTION IF EXISTS private.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS private.is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS private.is_org_admin(uuid, uuid);
DROP FUNCTION IF EXISTS private.has_partner_access(uuid, uuid);
DROP FUNCTION IF EXISTS private.is_partner_admin(uuid, uuid);

REVOKE USAGE ON SCHEMA private FROM authenticated, anon;
-- RESTRICT: fails (and keeps the schema) if anything else was added to it since.
DROP SCHEMA IF EXISTS private RESTRICT;

COMMIT;
