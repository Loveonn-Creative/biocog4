-- =============================================
-- Business identifiers on profiles (NOT APPLIED; awaiting approval).
--
-- Signup already writes cin, company_pan and business_id_check into auth
-- user metadata. This adds profile columns and extends handle_new_user so
-- they sync into the profile, like gstin does today. The browser may record
-- 'format_ok' or 'unavailable'; only service_role (a server-side registry
-- check) may set 'verified' or 'not_found'.
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cin text,
  ADD COLUMN IF NOT EXISTS company_pan text,
  ADD COLUMN IF NOT EXISTS business_id_type text,
  ADD COLUMN IF NOT EXISTS business_id_status text,
  ADD COLUMN IF NOT EXISTS business_id_checked_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_business_id_status_check,
  ADD CONSTRAINT profiles_business_id_status_check
    CHECK (business_id_status IS NULL OR business_id_status IN ('format_ok', 'unavailable', 'verified', 'not_found', 'invalid', 'pending'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consent_given boolean := COALESCE((NEW.raw_user_meta_data ->> 'data_consent')::boolean, false);
  id_status text := NULLIF(NEW.raw_user_meta_data -> 'business_id_check' ->> 'status', '');
BEGIN
  -- A signup can never self-assert a registry result.
  IF id_status IN ('verified', 'not_found') THEN
    id_status := 'unavailable';
  END IF;

  INSERT INTO public.profiles (
    id, business_name, phone, gstin, location,
    cin, company_pan, business_id_type, business_id_status, business_id_checked_at,
    data_consent, data_consent_at, data_consent_version
  )
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'business_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'gstin', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'location', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'cin', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'company_pan', ''),
    NULLIF(NEW.raw_user_meta_data -> 'business_id_check' ->> 'type', ''),
    id_status,
    NULLIF(NEW.raw_user_meta_data -> 'business_id_check' ->> 'checked_at', '')::timestamptz,
    consent_given,
    CASE WHEN consent_given THEN COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'data_consent_at', '')::timestamptz, now()) ELSE NULL END,
    CASE WHEN consent_given THEN NULLIF(NEW.raw_user_meta_data ->> 'data_consent_version', '') ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    gstin = COALESCE(EXCLUDED.gstin, public.profiles.gstin),
    location = COALESCE(EXCLUDED.location, public.profiles.location),
    cin = COALESCE(EXCLUDED.cin, public.profiles.cin),
    company_pan = COALESCE(EXCLUDED.company_pan, public.profiles.company_pan),
    business_id_type = COALESCE(EXCLUDED.business_id_type, public.profiles.business_id_type),
    business_id_status = COALESCE(EXCLUDED.business_id_status, public.profiles.business_id_status),
    business_id_checked_at = COALESCE(EXCLUDED.business_id_checked_at, public.profiles.business_id_checked_at),
    data_consent = EXCLUDED.data_consent,
    data_consent_at = EXCLUDED.data_consent_at,
    data_consent_version = EXCLUDED.data_consent_version;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Browser updates may not claim a registry result either.
CREATE OR REPLACE FUNCTION public.protect_business_id_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;
  IF NEW.business_id_status IN ('verified', 'not_found')
     AND NEW.business_id_status IS DISTINCT FROM OLD.business_id_status THEN
    NEW.business_id_status := OLD.business_id_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_business_id_status ON public.profiles;
CREATE TRIGGER protect_business_id_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_business_id_status();
