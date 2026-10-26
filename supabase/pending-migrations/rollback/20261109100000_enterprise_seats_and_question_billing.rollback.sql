-- Rollback for 20261109100000_enterprise_seats_and_question_billing.sql.
-- Restores the plan-only seat limit and the original bill function. Enterprise
-- organisations fall back to their owner's plan seats; members already added
-- stay (the limit only stops new invites).
DROP TRIGGER IF EXISTS enterprise_access_sync_seats ON public.enterprise_access;
DROP FUNCTION IF EXISTS private.sync_enterprise_org_seats();
DROP FUNCTION IF EXISTS public.owner_seat_limit(uuid);
ALTER FUNCTION public.owner_plan_seat_limit(uuid) RENAME TO owner_seat_limit;
REVOKE ALL ON FUNCTION public.owner_seat_limit(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS private.enterprise_seat_ceiling();
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
         sum(CASE WHEN u.kind = 'reads' THEN (u.quantity / 100.0) * u.unit_paise ELSE u.quantity * u.unit_paise END)::bigint
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
