-- Rollback for 20261025100000_profile_size_large. Refuses while any profile
-- holds 'large' (set those to NULL or another size first).
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE size = 'large') THEN
    RAISE EXCEPTION 'profiles with size large exist; change them before rolling back';
  END IF;
END $$;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_size_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_size_check CHECK (size = ANY (ARRAY['micro'::text, 'small'::text, 'medium'::text]));
COMMIT;
