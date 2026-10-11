-- Reverts 20261011150000_business_ids_on_profiles.sql.
DROP TRIGGER IF EXISTS protect_business_id_status ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_business_id_status();

-- Restore handle_new_user as in migration 20260925132810.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consent_given boolean := COALESCE((NEW.raw_user_meta_data ->> 'data_consent')::boolean, false);
BEGIN
  INSERT INTO public.profiles (id, business_name, phone, gstin, location, data_consent, data_consent_at, data_consent_version)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'business_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'gstin', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'location', ''),
    consent_given,
    CASE WHEN consent_given THEN COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'data_consent_at', '')::timestamptz, now()) ELSE NULL END,
    CASE WHEN consent_given THEN NULLIF(NEW.raw_user_meta_data ->> 'data_consent_version', '') ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    gstin = COALESCE(EXCLUDED.gstin, public.profiles.gstin),
    location = COALESCE(EXCLUDED.location, public.profiles.location),
    data_consent = EXCLUDED.data_consent,
    data_consent_at = EXCLUDED.data_consent_at,
    data_consent_version = EXCLUDED.data_consent_version;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_business_id_status_check;
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS business_id_checked_at,
  DROP COLUMN IF EXISTS business_id_status,
  DROP COLUMN IF EXISTS business_id_type,
  DROP COLUMN IF EXISTS company_pan,
  DROP COLUMN IF EXISTS cin;
