-- =============================================
-- READ-ONLY CHECKS (run in the Lovable SQL editor). Nothing here writes.
-- Results are counts only; no personal data is selected.
-- =============================================

-- 1. Plan orders paid without GST since UPI/card checkout with GST started
--    (15 Oct 2026). A paid plan whose invoice total equals the list price was
--    charged without GST and the platform fee. create-razorpay-order now
--    prices any such request as UPI, so new orders cannot skip GST.
SELECT count(*)                         AS orders_without_gst,
       coalesce(sum(s.amount), 0)       AS list_price_total_inr,
       round(coalesce(sum(s.amount), 0) * 0.18) AS gst_not_collected_inr
FROM public.subscriptions s
JOIN public.invoices i ON i.subscription_id = s.id
WHERE s.razorpay_payment_id IS NOT NULL
  AND s.created_at >= '2026-10-15'
  AND s.tier IN ('basic', 'pro')
  AND i.total_amount <= s.amount;
-- Cross-check in the Razorpay dashboard: plan orders since 15 Oct whose
-- notes have no payment_method were created without the GST breakdown.

-- 2. Translation cache: rows whose source text looks personal (email or long digit run).
SELECT count(*) AS cache_rows_that_look_personal
FROM public.translation_cache
WHERE source ~* '[^[:space:]@]+@[^[:space:]@]+\.[a-z]{2,}' OR source ~ '[0-9][0-9 -]{8,}[0-9]';

-- 3. Legacy guest rows (no account). These are what the optional purge below removes.
SELECT 'documents' AS t, count(*) FROM public.documents WHERE user_id IS NULL AND session_id IS NOT NULL
UNION ALL SELECT 'emissions', count(*) FROM public.emissions WHERE user_id IS NULL AND session_id IS NOT NULL
UNION ALL SELECT 'carbon_verifications', count(*) FROM public.carbon_verifications WHERE user_id IS NULL AND session_id IS NOT NULL
UNION ALL SELECT 'reports', count(*) FROM public.reports WHERE user_id IS NULL AND session_id IS NOT NULL
UNION ALL SELECT 'monetization_pathways', count(*) FROM public.monetization_pathways WHERE user_id IS NULL AND session_id IS NOT NULL
UNION ALL SELECT 'chat_history', count(*) FROM public.chat_history WHERE user_id IS NULL AND session_id IS NOT NULL;

-- 4. Storage buckets must all be private.
SELECT id, public FROM storage.buckets ORDER BY id;

-- 5. grant_applications insert rule (who can create an application row).
SELECT policyname, roles, cmd, with_check FROM pg_policies WHERE tablename = 'grant_applications';
