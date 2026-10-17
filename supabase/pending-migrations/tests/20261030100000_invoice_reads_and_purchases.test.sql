-- Behaviour tests for the invoice reads ledger, credit packs and service orders.
\set ON_ERROR_STOP on
SET client_min_messages = notice;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'r1@x.in'),
  ('00000000-0000-4000-8000-0000000000b2', 'r2@x.in') ON CONFLICT DO NOTHING;
-- Ledger started before this test period, so no legacy documents count.
UPDATE public.invoice_read_settings SET ledger_started_at = '2026-10-01T00:00:00+05:30';

DO $$
DECLARE
  u uuid := '00000000-0000-4000-8000-0000000000b1';
  u2 uuid := '00000000-0000-4000-8000-0000000000b2';
  p timestamptz := '2026-11-01T00:00:00+05:30';  -- period start
  r jsonb; r2 jsonb; id1 uuid; n int; pack uuid;
BEGIN
  -- Before the account's switch date a file counts as one.
  r := public.reserve_invoice_read(u, NULL, 'h1', 25, 10, '2026-10-01T00:00:00+05:30', p, '2026-10-20T10:00:00+05:30');
  IF (r->>'counting') <> 'document' OR (r->>'units')::int <> 1 THEN RAISE EXCEPTION 'FAIL: before switch a 25-page PDF should count 1, got %', r; END IF;
  RAISE NOTICE 'ok: before the switch date a file counts as one';
  PERFORM public.commit_invoice_read((r->>'id')::uuid);

  -- From the switch date each page counts.
  r := public.reserve_invoice_read(u, NULL, 'h2', 3, 10, p, p, '2026-11-02T10:00:00+05:30');
  IF (r->>'counting') <> 'page' OR (r->>'units')::int <> 3 OR (r->>'used')::int <> 3 THEN RAISE EXCEPTION 'FAIL: page counting %', r; END IF;
  RAISE NOTICE 'ok: from the switch date each page counts';
  id1 := (r->>'id')::uuid;
  PERFORM public.commit_invoice_read(id1, gen_random_uuid());

  -- A committed read is never given back (delete or re-upload).
  IF public.release_invoice_read(id1) THEN RAISE EXCEPTION 'FAIL: committed read released'; END IF;
  RAISE NOTICE 'ok: a committed read cannot be released';

  -- A released read (failed, empty, duplicate) costs nothing.
  r := public.reserve_invoice_read(u, NULL, 'h3', 4, 10, p, p, '2026-11-02T11:00:00+05:30');
  IF NOT public.release_invoice_read((r->>'id')::uuid) THEN RAISE EXCEPTION 'FAIL: release'; END IF;
  r := public.reserve_invoice_read(u, NULL, 'h4', 7, 10, p, p, '2026-11-02T12:00:00+05:30');
  IF NOT (r->>'ok')::boolean OR (r->>'used')::int <> 10 THEN RAISE EXCEPTION 'FAIL: released read still counted %', r; END IF;
  RAISE NOTICE 'ok: released reads are not counted';
  PERFORM public.commit_invoice_read((r->>'id')::uuid);

  -- Limit reached, no credits: refused, nothing written.
  SELECT count(*) INTO n FROM public.invoice_reads WHERE user_id = u;
  r := public.reserve_invoice_read(u, NULL, 'h5', 1, 10, p, p, '2026-11-03T10:00:00+05:30');
  IF (r->>'ok')::boolean OR (r->>'reason') <> 'limit' THEN RAISE EXCEPTION 'FAIL: over limit %', r; END IF;
  IF (SELECT count(*) FROM public.invoice_reads WHERE user_id = u) <> n THEN RAISE EXCEPTION 'FAIL: refused read was written'; END IF;
  RAISE NOTICE 'ok: over the limit is refused and writes nothing';

  -- Credits are used after the plan allowance, and given back on release.
  INSERT INTO public.invoice_credit_packs (user_id, razorpay_order_id, packs, credits, base_paise, amount_paise, validity, status, paid_at, expires_at)
  VALUES (u, 'order_t1', 1, 100, 7900, 9322, 'monthly', 'active', '2026-11-01', '2026-12-01') RETURNING id INTO pack;
  r := public.reserve_invoice_read(u, NULL, 'h6', 5, 10, p, p, '2026-11-03T11:00:00+05:30');
  IF NOT (r->>'ok')::boolean OR (SELECT used FROM public.invoice_credit_packs WHERE id = pack) <> 5 THEN RAISE EXCEPTION 'FAIL: credits not used %', r; END IF;
  PERFORM public.release_invoice_read((r->>'id')::uuid);
  IF (SELECT used FROM public.invoice_credit_packs WHERE id = pack) <> 0 THEN RAISE EXCEPTION 'FAIL: credits not returned'; END IF;
  RAISE NOTICE 'ok: credits cover reads past the allowance and return on release';

  -- An expired pack is not used.
  r := public.reserve_invoice_read(u, NULL, 'h7', 1, 10, p, p, '2026-12-02T10:00:00+05:30');
  -- New period (December) so the plan allowance covers it; check credits figure only.
  IF (r->>'credits')::int <> 0 THEN RAISE EXCEPTION 'FAIL: expired pack counted %', r; END IF;
  PERFORM public.release_invoice_read((r->>'id')::uuid);
  RAISE NOTICE 'ok: expired packs are not used';

  -- Yearly pack stops 30 days after the paid plan ends.
  INSERT INTO public.subscriptions (user_id, tier, billing_cycle, status, amount, expires_at, razorpay_order_id)
  VALUES (u2, 'pro', 'yearly', 'active', 4999, '2026-11-10', 'order_sub_t2');
  INSERT INTO public.invoice_credit_packs (user_id, razorpay_order_id, packs, credits, base_paise, amount_paise, validity, status, paid_at, expires_at)
  VALUES (u2, 'order_t2', 1, 100, 7900, 9322, 'yearly', 'active', '2026-11-01', '2027-11-01');
  r := public.reserve_invoice_read(u2, NULL, 'y1', 1, 0, p, p, '2026-12-05T10:00:00+05:30');
  IF NOT (r->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL: yearly pack within 30 days of plan end %', r; END IF;
  r2 := public.reserve_invoice_read(u2, NULL, 'y2', 1, 0, p, p, '2026-12-11T10:00:00+05:30');
  IF (r2->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL: yearly pack used more than 30 days after plan end %', r2; END IF;
  RAISE NOTICE 'ok: yearly packs end 30 days after the plan ends';

  -- Stale reservations (crashed reads) stop counting after 15 minutes.
  r := public.reserve_invoice_read(u2, NULL, 'y3', 1, 1, '2027-01-01', '2026-11-01', '2027-01-02T10:00:00Z');
  r2 := public.reserve_invoice_read(u2, NULL, 'y4', 1, 1, '2027-01-01', '2026-11-01', '2027-01-02T10:20:00Z');
  IF NOT (r2->>'ok')::boolean THEN RAISE EXCEPTION 'FAIL: stale reservation still counted %', r2; END IF;
  RAISE NOTICE 'ok: abandoned reservations expire';
END $$;

-- Owners read their own rows; nobody else, and no one writes from a browser.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.invoice_reads) = 0 THEN RAISE EXCEPTION 'FAIL: owner cannot read own reads'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoice_reads WHERE user_id <> '00000000-0000-4000-8000-0000000000b2') THEN RAISE EXCEPTION 'FAIL: sees other reads'; END IF;
  BEGIN
    INSERT INTO public.invoice_credit_packs (user_id, razorpay_order_id, packs, credits, base_paise, amount_paise, validity) VALUES ('00000000-0000-4000-8000-0000000000b2', 'x', 1, 100, 1, 1, 'monthly');
    RAISE EXCEPTION 'FAIL: browser inserted a pack';
  EXCEPTION WHEN insufficient_privilege THEN NULL; WHEN others THEN IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF; END;
  BEGIN
    PERFORM public.reserve_invoice_read('00000000-0000-4000-8000-0000000000b2', NULL, 'z', 1, 99999, now(), now());
    RAISE EXCEPTION 'FAIL: browser could reserve';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.release_invoice_read(gen_random_uuid());
    RAISE EXCEPTION 'FAIL: browser could release';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE NOTICE 'ok: browsers read only their own rows and cannot write or call the functions';
END $$;
RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ALL INVOICE READS TESTS PASSED'; END $$;
