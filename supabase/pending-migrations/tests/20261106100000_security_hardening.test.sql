-- Behaviour tests for 20261106100000_security_hardening.sql (run_security_hardening.sh).
\set ON_ERROR_STOP on
SET client_min_messages = notice;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'sa@x.in'),
  ('00000000-0000-4000-8000-0000000000a2', 'sb@x.in') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES ('00000000-0000-4000-8000-0000000000a1'), ('00000000-0000-4000-8000-0000000000a2') ON CONFLICT DO NOTHING;
-- A legacy guest session with a guest invoice and a guest chat line.
INSERT INTO public.sessions (id, device_fingerprint, is_active) VALUES ('00000000-0000-4000-8000-00000000b001', 'Mozilla/5.0 Test', true) ON CONFLICT DO NOTHING;
INSERT INTO public.documents (id, session_id, vendor, document_type) VALUES ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-00000000b001', 'Guest Vendor', 'invoice') ON CONFLICT DO NOTHING;
INSERT INTO public.chat_history (session_id, role, content) VALUES ('00000000-0000-4000-8000-00000000b001', 'user', 'guest secret') ON CONFLICT DO NOTHING;
-- A signed-in user's own invoice and verification.
INSERT INTO public.documents (id, user_id, vendor, document_type) VALUES ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-0000000000a1', 'A Vendor', 'invoice') ON CONFLICT DO NOTHING;
INSERT INTO public.carbon_verifications (id, user_id, total_co2_kg, emission_ids) VALUES ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-0000000000a1', 1, '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.carbon_verifications (id, user_id, total_co2_kg, emission_ids) VALUES ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-0000000000a2', 1, '{}') ON CONFLICT DO NOTHING;
INSERT INTO public.story_submissions (status, publish_consent, slug, story, buyer, industry, attribution, consent_version, consent_text_hash, published_at)
  VALUES ('published', true, 'acme-story', '{"t":"x"}'::jsonb, 'msme', 'steel', 'anonymous', 'v1', repeat('a', 64), now()) ON CONFLICT DO NOTHING;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Guests: nothing readable by user-agent, no guest chat.
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.headers', '{"user-agent":"Mozilla/5.0 Test"}', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.documents) <> 0 THEN RAISE EXCEPTION 'FAIL: guest invoice readable by user-agent'; END IF;
  IF (SELECT count(*) FROM public.chat_history) <> 0 THEN RAISE EXCEPTION 'FAIL: guest chat readable'; END IF;
  RAISE NOTICE 'ok: no guest invoice or chat is readable by matching a user-agent';
  BEGIN PERFORM public.get_session_by_fingerprint('Mozilla/5.0 Test'); RAISE EXCEPTION 'FAIL: session lookup open to anon';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: session lookup by fingerprint is closed'; END;
  BEGIN UPDATE public.case_studies_public SET story = '{"t":"defaced"}' WHERE slug = 'acme-story'; RAISE EXCEPTION 'FAIL: anon edited a story';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: visitors cannot edit published stories'; END;
  BEGIN DELETE FROM public.case_studies_public WHERE slug = 'acme-story'; RAISE EXCEPTION 'FAIL: anon deleted a story';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: visitors cannot delete published stories'; END;
END $$;
ROLLBACK;

-- Signed-in user A.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000a1"}', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.documents) <> 1 THEN RAISE EXCEPTION 'FAIL: user lost access to own invoice'; END IF;
  RAISE NOTICE 'ok: a signed-in user still reads their own invoices';
  BEGIN
    INSERT INTO public.compliance_ledger (user_id, verification_status, co2_kg) VALUES (auth.uid(), 'verified', -500000);
    RAISE EXCEPTION 'FAIL: browser inserted a ledger row';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: browsers cannot write the compliance ledger'; END;
  BEGIN
    INSERT INTO public.invoices (user_id, status, invoice_number, amount, total_amount) VALUES (auth.uid(), 'paid', 'FAKE-1', 1, 1);
    RAISE EXCEPTION 'FAIL: user created a paid invoice';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: users cannot create billing invoices'; END;
  BEGIN
    INSERT INTO public.monetization_pathways (user_id, verification_id, pathway_type, status)
      VALUES (auth.uid(), '00000000-0000-4000-8000-00000000c002', 'green_loan', 'approved');
    RAISE EXCEPTION 'FAIL: pathway on another user''s verification';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: a request cannot point at another user''s verification'; END;
  INSERT INTO public.monetization_pathways (user_id, verification_id, pathway_type, status)
    VALUES (auth.uid(), '00000000-0000-4000-8000-00000000c001', 'green_loan', 'approved');
  IF (SELECT status FROM public.monetization_pathways WHERE verification_id = '00000000-0000-4000-8000-00000000c001') <> 'applied' THEN
    RAISE EXCEPTION 'FAIL: status not forced to applied'; END IF;
  RAISE NOTICE 'ok: the Monetize request on your own verification still works and starts as applied';
END $$;
ROLLBACK;

-- Teams: create_organization still works; direct member writes do not.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000a1"}', true);
DO $$
DECLARE org jsonb; oid uuid;
BEGIN
  org := to_jsonb(public.create_organization('Acme'));
  oid := (org->>'id')::uuid;
  IF oid IS NULL THEN RAISE EXCEPTION 'FAIL: create_organization %', org; END IF;
  RAISE NOTICE 'ok: creating a team still works';
  BEGIN
    INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (oid, '00000000-0000-4000-8000-0000000000a2', 'admin');
    RAISE EXCEPTION 'FAIL: direct member insert';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: members cannot be added past the invitation flow'; END;
  UPDATE public.organization_members SET role = 'owner' WHERE organization_id = oid AND user_id = auth.uid();
  IF FOUND THEN RAISE EXCEPTION 'FAIL: direct member update'; END IF;
  RAISE NOTICE 'ok: roles cannot be changed by writing the table directly';
  BEGIN
    INSERT INTO public.team_invitations (organization_id, email, role, token, invited_by) VALUES (oid, 'z@x.in', 'admin', 'chosen', auth.uid());
    RAISE EXCEPTION 'FAIL: direct invitation insert';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: invitations go through the invite function only'; END;
  BEGIN
    INSERT INTO public.marketplace_listings (organization_id, credits_available, verification_score, msme_hash) VALUES (oid, 1000000, 100, 'h');
    RAISE EXCEPTION 'FAIL: org admin posted a listing';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'ok: only platform admins publish credit listings'; END;
END $$;
ROLLBACK;
DO $$ BEGIN RAISE NOTICE 'ALL SECURITY HARDENING TESTS PASSED'; END $$;
