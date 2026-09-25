ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS data_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_consent_version text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consent_given boolean := COALESCE((NEW.raw_user_meta_data ->> 'data_consent')::boolean, false);
BEGIN
  INSERT INTO public.profiles (
    id,
    business_name,
    phone,
    gstin,
    location,
    data_consent,
    data_consent_at,
    data_consent_version
  )
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'business_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'gstin', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'location', ''),
    consent_given,
    CASE
      WHEN consent_given THEN COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'data_consent_at', '')::timestamptz,
        now()
      )
      ELSE NULL
    END,
    CASE
      WHEN consent_given THEN NULLIF(NEW.raw_user_meta_data ->> 'data_consent_version', '')
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    gstin = COALESCE(EXCLUDED.gstin, public.profiles.gstin),
    location = COALESCE(EXCLUDED.location, public.profiles.location),
    data_consent = EXCLUDED.data_consent,
    data_consent_at = EXCLUDED.data_consent_at,
    data_consent_version = EXCLUDED.data_consent_version;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;