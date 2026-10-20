-- Rollback for 20261103100000_subscriptions_staff_email. Nothing stored is changed.
DROP FUNCTION IF EXISTS public.reconcile_subscription_by_email(text, text, text, timestamptz, timestamptz, numeric, text, text, text);
DROP VIEW IF EXISTS public.subscriptions_with_email;
