-- =============================================
-- Protect privileged / server-owned columns from browser writes.
--
-- RLS lets owners UPDATE their own rows but cannot restrict columns, so a
-- signed-in user could set their own subscription tier, raise org seat limits,
-- or mark their own emissions/verifications as verified. These BEFORE triggers
-- silently restore server-owned columns for any caller that is not
-- service_role (edge functions) or a direct DB/migration context (no JWT).
-- Silent reset (not an exception) keeps whole-row profile/settings saves working.
-- =============================================

-- True for service_role JWTs and for contexts with no PostgREST JWT at all
-- (postgres, migrations, supabase_auth_admin running handle_new_user).
CREATE OR REPLACE FUNCTION public.is_trusted_db_writer()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_claims text := NULLIF(current_setting('request.jwt.claims', true), '');
  v_role text;
BEGIN
  IF v_claims IS NOT NULL THEN
    v_role := v_claims::json ->> 'role';
  ELSE
    v_role := NULLIF(current_setting('request.jwt.claim.role', true), '');
  END IF;
  RETURN v_role IS NULL OR v_role = 'service_role';
END;
$$;

-- ---------- profiles (C1) ----------
CREATE OR REPLACE FUNCTION public.protect_profiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_tier := 'snapshot';
    NEW.subscription_expires_at := NULL;
    NEW.razorpay_customer_id := NULL;
    NEW.razorpay_subscription_id := NULL;
    RETURN NEW;
  END IF;

  -- Allow the client-side expiry downgrade (usePremiumStatus) only when the
  -- stored subscription has genuinely expired.
  IF NOT (
    OLD.subscription_expires_at IS NOT NULL
    AND OLD.subscription_expires_at < now()
    AND NEW.subscription_tier = 'snapshot'
    AND NEW.subscription_expires_at IS NULL
  ) THEN
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
  END IF;
  NEW.razorpay_customer_id := OLD.razorpay_customer_id;
  NEW.razorpay_subscription_id := OLD.razorpay_subscription_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profiles_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profiles_privileged_columns();

-- ---------- organizations (M4) ----------
CREATE OR REPLACE FUNCTION public.protect_organizations_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_tier := 'snapshot';
    NEW.max_members := 1;
  ELSE
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.max_members := OLD.max_members;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_organizations_privileged_columns ON public.organizations;
CREATE TRIGGER protect_organizations_privileged_columns
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.protect_organizations_privileged_columns();

-- ---------- emissions (H2) ----------
-- Browser inserts rows with verified = false and provenance in
-- verification_notes, and never updates rows. Only verify-carbon
-- (service role) may flip verified.
CREATE OR REPLACE FUNCTION public.protect_emissions_verification_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
  ELSE
    NEW.verified := OLD.verified;
    NEW.verification_notes := OLD.verification_notes;
    NEW.co2_kg := OLD.co2_kg;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_emissions_verification_columns ON public.emissions;
CREATE TRIGGER protect_emissions_verification_columns
  BEFORE INSERT OR UPDATE ON public.emissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_emissions_verification_columns();

-- ---------- carbon_verifications (H2) ----------
-- Browser never inserts or updates these; verify-carbon (service role) does.
CREATE OR REPLACE FUNCTION public.protect_carbon_verification_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verification_status := 'pending';
    NEW.verification_score := NULL;
    NEW.greenwashing_risk := NULL;
    NEW.ccts_eligible := false;
    NEW.cbam_compliant := false;
    NEW.verified_at := NULL;
  ELSE
    NEW.emission_ids := OLD.emission_ids;
    NEW.total_co2_kg := OLD.total_co2_kg;
    NEW.verification_status := OLD.verification_status;
    NEW.verification_score := OLD.verification_score;
    NEW.greenwashing_risk := OLD.greenwashing_risk;
    NEW.ai_analysis := OLD.ai_analysis;
    NEW.ccts_eligible := OLD.ccts_eligible;
    NEW.cbam_compliant := OLD.cbam_compliant;
    NEW.verified_at := OLD.verified_at;
    NEW.idempotency_key := OLD.idempotency_key;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_carbon_verification_columns ON public.carbon_verifications;
CREATE TRIGGER protect_carbon_verification_columns
  BEFORE INSERT OR UPDATE ON public.carbon_verifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_carbon_verification_columns();

-- ---------- monetization_pathways (H2) ----------
-- Browser inserts applications (status 'applied', client estimated_value) but
-- never updates; approval/completion outcomes are server-owned.
CREATE OR REPLACE FUNCTION public.protect_monetization_pathway_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('available', 'applied') THEN
      NEW.status := 'applied';
    END IF;
    NEW.completed_at := NULL;
  ELSE
    NEW.verification_id := OLD.verification_id;
    NEW.estimated_value := OLD.estimated_value;
    NEW.status := OLD.status;
    NEW.completed_at := OLD.completed_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_monetization_pathway_columns ON public.monetization_pathways;
CREATE TRIGGER protect_monetization_pathway_columns
  BEFORE INSERT OR UPDATE ON public.monetization_pathways
  FOR EACH ROW EXECUTE FUNCTION public.protect_monetization_pathway_columns();

REVOKE ALL ON FUNCTION public.protect_profiles_privileged_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_organizations_privileged_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_emissions_verification_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_carbon_verification_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_monetization_pathway_columns() FROM PUBLIC, anon, authenticated;
