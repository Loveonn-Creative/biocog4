-- Trusted writer: no JWT (migrations, SQL editor) or the service role.
DO $$
BEGIN
  IF to_regprocedure('public.is_trusted_db_writer()') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION public.is_trusted_db_writer()
      RETURNS boolean
      LANGUAGE plpgsql
      STABLE
      SET search_path = public
      AS $body$
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
      $body$
    $f$;
    COMMENT ON FUNCTION public.is_trusted_db_writer() IS 'created by 20261114100000_server_only_records';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refuse_browser_record_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_trusted_db_writer() THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invoices and their records are saved only when the file is read; upload the invoice instead'
    USING ERRCODE = '42501';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refuse_browser_record_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refuse_browser_record_insert ON public.documents;
CREATE TRIGGER refuse_browser_record_insert
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.refuse_browser_record_insert();

DROP TRIGGER IF EXISTS refuse_browser_record_insert ON public.emissions;
CREATE TRIGGER refuse_browser_record_insert
  BEFORE INSERT ON public.emissions
  FOR EACH ROW EXECUTE FUNCTION public.refuse_browser_record_insert();