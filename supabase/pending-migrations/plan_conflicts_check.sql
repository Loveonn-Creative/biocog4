-- Read-only. Run in the SQL editor BEFORE deploying the canonical-plan change.
-- Lists accounts whose profile copy grants a higher plan than their active
-- subscription row. After the change the row decides, so each account listed
-- here would see the row's plan. Reconcile each one first with
-- public.reconcile_subscription_manual (after verifying payment), or confirm
-- the row is right. Shows ids and tiers only, no names or emails.
WITH ranked AS (
  SELECT p.id AS user_id,
         CASE p.subscription_tier WHEN 'scale' THEN 3 WHEN 'pro' THEN 2 WHEN 'basic' THEN 1 WHEN 'essential' THEN 1 ELSE 0 END AS profile_rank,
         p.subscription_tier AS profile_tier, p.subscription_expires_at AS profile_expires,
         (SELECT max(CASE s.tier WHEN 'scale' THEN 3 WHEN 'pro' THEN 2 WHEN 'basic' THEN 1 ELSE 0 END)
            FROM public.subscriptions s
           WHERE s.user_id = p.id AND s.status = 'active' AND s.expires_at > now() - interval '7 days') AS row_rank
  FROM public.profiles p
  WHERE p.subscription_expires_at > now() - interval '7 days'
)
SELECT user_id, profile_tier, profile_expires, row_rank
FROM ranked
WHERE row_rank IS NOT NULL AND profile_rank > row_rank
ORDER BY profile_expires DESC;
