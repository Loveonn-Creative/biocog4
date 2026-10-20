-- Finance insights (owner approval, 20 October 2026). Requires
-- 20261026100000_financial_documents.sql.
--
-- Users can now see insights from their own bank statements and tax returns on
-- their Dashboard, opt-in (profiles.trust_layer_prefs.finance_insights), by
-- plan. Files stay private: they are never returned to a browser, and the
-- table keeps no browser grants. Two functions return only the calling
-- account's own aggregates:
--
-- * my_private_records(): what was uploaded (kind, period, whether figures
--   could be read, date), for the History page. No figures.
-- * my_finance_insights(): figures by plan, only when the switch is on.
--     Snapshot: nothing (modules show locked).
--     Essential: monthly money in, money out and balances.
--     Pro and Scale: also the summary figures and monthly spend by category.
--
-- financial_documents.monthly holds month-by-month totals read from bank
-- statements: money in, money out, opening and closing balance, and money out
-- by a fixed list of categories. Transaction descriptions, payees and account
-- details are never stored (financeInsights.ts cleans every value).

ALTER TABLE public.financial_documents
  ADD COLUMN IF NOT EXISTS monthly jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.financial_documents
  ADD CONSTRAINT financial_documents_monthly_array CHECK (jsonb_typeof(monthly) = 'array');

-- The plan in force for the calling account, the way the server counts it
-- (planLimits.ts): the stronger of the profile copy and any active
-- subscription row, each counted through the 7-day grace period.
CREATE OR REPLACE FUNCTION public.finance_insights_plan(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH rows AS (
    SELECT subscription_tier AS tier, subscription_expires_at AS expires_at FROM public.profiles WHERE id = p_user
    UNION ALL
    SELECT tier, expires_at FROM public.subscriptions WHERE user_id = p_user AND status = 'active'
  ), ranked AS (
    SELECT CASE lower(tier) WHEN 'scale' THEN 3 WHEN 'pro' THEN 2 WHEN 'essential' THEN 1 WHEN 'basic' THEN 1 ELSE 0 END AS r
    FROM rows
    WHERE expires_at IS NOT NULL AND expires_at > now() - interval '7 days'
  )
  SELECT CASE coalesce(max(r), 0) WHEN 3 THEN 'scale' WHEN 2 THEN 'pro' WHEN 1 THEN 'essential' ELSE 'snapshot' END FROM ranked;
$$;
REVOKE ALL ON FUNCTION public.finance_insights_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_insights_plan(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.my_private_records()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'kind', doc_kind,
    'read', figures <> '{}'::jsonb OR jsonb_array_length(monthly) > 0,
    'period_from', figures->>'period_from',
    'period_to', figures->>'period_to',
    'financial_year', figures->>'financial_year',
    'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  FROM public.financial_documents
  WHERE auth.uid() IS NOT NULL AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_finance_insights()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_on boolean;
  v_plan text;
  v_records jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('enabled', false, 'plan', 'snapshot', 'records', '[]'::jsonb);
  END IF;
  SELECT coalesce((trust_layer_prefs->>'finance_insights')::boolean, false) INTO v_on FROM public.profiles WHERE id = v_uid;
  v_plan := public.finance_insights_plan(v_uid);
  IF NOT coalesce(v_on, false) OR v_plan = 'snapshot' THEN
    RETURN jsonb_build_object('enabled', coalesce(v_on, false), 'plan', v_plan, 'records', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(
    CASE WHEN v_plan = 'essential' THEN
      jsonb_build_object(
        'id', id, 'kind', doc_kind, 'created_at', created_at,
        'period_from', figures->>'period_from', 'period_to', figures->>'period_to',
        -- Essential sees money in, money out and balances only.
        'monthly', (SELECT coalesce(jsonb_agg(m - 'categories'), '[]'::jsonb) FROM jsonb_array_elements(monthly) m)
      )
    ELSE
      jsonb_build_object(
        'id', id, 'kind', doc_kind, 'created_at', created_at,
        'period_from', figures->>'period_from', 'period_to', figures->>'period_to',
        'figures', figures, 'monthly', monthly
      )
    END ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_records
  FROM public.financial_documents
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('enabled', true, 'plan', v_plan, 'records', v_records);
END;
$$;

REVOKE ALL ON FUNCTION public.my_private_records() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_finance_insights() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_private_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_finance_insights() TO authenticated;

COMMENT ON TABLE public.financial_documents IS 'Bank statements, tax returns and financial statements from the invoice reader. Files are server only. Allow-listed figures and monthly totals reach their owner only through my_finance_insights() and my_private_records(), by plan and opt-in.';
