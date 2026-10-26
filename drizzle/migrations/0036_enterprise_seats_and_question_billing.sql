DO $$
BEGIN
  IF to_regclass('public.enterprise_access') IS NULL OR to_regclass('public.enterprise_usage') IS NULL THEN
    RAISE EXCEPTION 'Apply the enterprise pilot and billing migrations first.';
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.enterprise_seat_ceiling() RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 1000 $$;

ALTER FUNCTION public.owner_seat_limit(uuid) RENAME TO owner_plan_seat_limit;
REVOKE ALL ON FUNCTION public.owner_plan_seat_limit(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.owner_seat_limit(p_owner_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.enterprise_access ea
      JOIN public.organizations o ON o.id = ea.organization_id
      WHERE o.owner_id = p_owner_id AND ea.status = 'active'
    ) THEN GREATEST(public.owner_plan_seat_limit(p_owner_id), private.enterprise_seat_ceiling())
    ELSE public.owner_plan_seat_limit(p_owner_id)
  END $$;
REVOKE ALL ON FUNCTION public.owner_seat_limit(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.sync_enterprise_org_seats() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    UPDATE public.organizations o SET max_members = public.owner_seat_limit(o.owner_id)
     WHERE o.id = NEW.organization_id AND o.owner_id IS NOT NULL
       AND o.max_members IS DISTINCT FROM public.owner_seat_limit(o.owner_id);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.organization_id IS NOT NULL AND OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    UPDATE public.organizations o SET max_members = public.owner_seat_limit(o.owner_id)
     WHERE o.id = OLD.organization_id AND o.owner_id IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_enterprise_org_seats() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS enterprise_access_sync_seats ON public.enterprise_access;
CREATE TRIGGER enterprise_access_sync_seats AFTER INSERT OR UPDATE OF organization_id, status ON public.enterprise_access
  FOR EACH ROW EXECUTE FUNCTION private.sync_enterprise_org_seats();

UPDATE public.organizations o SET max_members = public.owner_seat_limit(o.owner_id)
 WHERE o.owner_id IS NOT NULL AND o.id IN (SELECT organization_id FROM public.enterprise_access WHERE organization_id IS NOT NULL)
   AND o.max_members IS DISTINCT FROM public.owner_seat_limit(o.owner_id);

CREATE OR REPLACE FUNCTION private.enterprise_bill(p_org uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (kind text, quantity integer, amount_paise bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.kind, sum(u.quantity)::integer,
         sum(CASE WHEN u.kind = 'reads' THEN (u.quantity / 100.0) * u.unit_paise
                  WHEN u.kind = 'question' THEN (u.quantity / 1000.0) * u.unit_paise
                  ELSE u.quantity * u.unit_paise END)::bigint
  FROM public.enterprise_usage u
  WHERE u.enterprise_org_id = p_org AND u.billable AND u.created_at >= p_from AND u.created_at < p_to
  GROUP BY u.kind
  UNION ALL
  SELECT 'seat', greatest(count(m.*)::integer - max(ea.seats_included), 0),
         (greatest(count(m.*)::integer - max(ea.seats_included), 0) * private.enterprise_rate('seat'))::bigint
  FROM public.enterprise_access ea
  LEFT JOIN public.organization_members m ON m.organization_id = ea.organization_id
  WHERE ea.organization_id = p_org
$$;
REVOKE ALL ON FUNCTION private.enterprise_bill(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;