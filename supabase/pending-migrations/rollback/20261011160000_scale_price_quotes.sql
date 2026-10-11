-- Reverts 20261011160000_scale_price_quotes.sql.
-- WARNING: drops all Scale quotes. Export the table first if any rows exist.
-- With the table gone, create-razorpay-order refuses every Scale checkout (42P01 -> 403),
-- and verify-razorpay-payment skips quote consumption.
DROP POLICY IF EXISTS "Users can view their own active scale quotes" ON public.scale_price_quotes;
DROP INDEX IF EXISTS public.scale_price_quotes_user_status_idx;
DROP TABLE IF EXISTS public.scale_price_quotes;
