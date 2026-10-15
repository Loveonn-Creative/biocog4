ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
COMMENT ON COLUMN public.profiles.email IS 'Copy of the sign-in email for internal plan reconciliation; maintained from auth only, not user-editable.';

UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id AND email IS DISTINCT FROM NEW.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

CREATE OR REPLACE FUNCTION public.protect_profiles_privileged_columns()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_trusted_db_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.subscription_tier := 'snapshot';
    NEW.subscription_expires_at := NULL;
    NEW.razorpay_customer_id := NULL;
    NEW.razorpay_subscription_id := NULL;
    NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
    RETURN NEW;
  END IF;
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
  NEW.email := OLD.email;
  RETURN NEW;
END;
$function$;