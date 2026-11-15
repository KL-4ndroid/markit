-- Included only in the guarded test_prg rollback bundle after 095.
DO $scope$
BEGIN
  IF current_setting('feria.test_prg_legacy_rehearsal', true) IS DISTINCT FROM 'on'
    OR NOT EXISTS (
      SELECT 1 FROM pg_proc p
      WHERE p.oid = to_regprocedure('public.user_market_ids(uuid)')
        AND p.proowner = 'postgres'::regrole AND p.prosecdef
        AND p.proconfig = ARRAY['search_path=public']
        AND btrim(p.prosrc, E' \t\r\n') = 'SELECT market_id FROM market_members WHERE user_id = p_user_id;'
    ) THEN
    RAISE EXCEPTION 'Unexpected legacy market helper or rehearsal context';
  END IF;
END;
$scope$;

DROP FUNCTION public.user_market_ids(uuid) RESTRICT;

-- REHEARSAL FIXTURES BEGIN
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a9610000-0000-4000-8000-000000000001', '096-market-owner@example.test', '{}'),
  ('a9610000-0000-4000-8000-000000000002', '096-market-staff@example.test', '{}'),
  ('a9610000-0000-4000-8000-000000000003', '096-market-outsider@example.test', '{}');

INSERT INTO public.subscription_accounts (owner_id, plan_code, plan_source)
VALUES ('a9610000-0000-4000-8000-000000000001', 'team', 'admin');

INSERT INTO public.staff_relationships (owner_id, staff_id, staff_email, accepted_at, status, role, permissions)
VALUES ('a9610000-0000-4000-8000-000000000001', 'a9610000-0000-4000-8000-000000000002',
  '096-market-staff@example.test', now(), 'active', 'viewer', '{"can_view":true,"can_edit":false,"infoLevel":0}');

INSERT INTO public.markets (id, owner_id, name, location, start_date, end_date)
VALUES ('a9610000-0000-4000-8000-000000000004', 'a9610000-0000-4000-8000-000000000001',
  '096 disposable market', 'test fixture', current_date, current_date);

INSERT INTO public.market_members (market_id, user_id, role)
VALUES ('a9610000-0000-4000-8000-000000000004', 'a9610000-0000-4000-8000-000000000001', 'owner'),
  ('a9610000-0000-4000-8000-000000000004', 'a9610000-0000-4000-8000-000000000002', 'staff')
ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
DO $access$
DECLARE
  fixture_market constant uuid := 'a9610000-0000-4000-8000-000000000004';
  fixture record;
BEGIN
  FOR fixture IN SELECT * FROM (VALUES
    ('a9610000-0000-4000-8000-000000000001', 'owner', true, true),
    ('a9610000-0000-4000-8000-000000000002', 'staff', false, true),
    ('a9610000-0000-4000-8000-000000000003', NULL, false, false)
  ) AS cases(user_id, access_type, owner_visible, member_visible) LOOP
    PERFORM set_config('request.jwt.claim.sub', fixture.user_id, true);
    IF (EXISTS (SELECT 1 FROM public.owner_accessible_markets WHERE id = fixture_market))
        IS DISTINCT FROM fixture.owner_visible
      OR (SELECT access_type FROM public.staff_accessible_markets WHERE id = fixture_market)
        IS DISTINCT FROM fixture.access_type
      OR (EXISTS (SELECT 1 FROM public.current_user_market_ids() WHERE market_id = fixture_market))
        IS DISTINCT FROM fixture.member_visible THEN
      RAISE EXCEPTION 'Market access regression for synthetic %', coalesce(fixture.access_type, 'outsider');
    END IF;
  END LOOP;
END;
$access$;
RESET ROLE;
