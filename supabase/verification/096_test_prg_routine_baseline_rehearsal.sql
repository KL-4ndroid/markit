-- Runs after the guarded rollback fixtures exercise account, market, product and pending-operation writes.
DO $accounts$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE id IN (
    'a9610000-0000-4000-8000-000000000001',
    'a9610000-0000-4000-8000-000000000002',
    'a9610000-0000-4000-8000-000000000003'
  )) <> 3 THEN
    RAISE EXCEPTION 'Account creation did not project all three rehearsal profiles';
  END IF;
END;
$accounts$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
DO $staff$
DECLARE
  fixture record;
  fixture_staff constant uuid := 'a9610000-0000-4000-8000-000000000002';
BEGIN
  FOR fixture IN SELECT * FROM (VALUES
    ('a9610000-0000-4000-8000-000000000001', true),
    ('a9610000-0000-4000-8000-000000000002', false),
    ('a9610000-0000-4000-8000-000000000003', false)
  ) AS cases(actor, staff_visible) LOOP
    PERFORM set_config('request.jwt.claim.sub', fixture.actor, true);
    IF EXISTS (SELECT 1 FROM public.get_my_staff() WHERE staff_id=fixture_staff AND role='operator')
      IS DISTINCT FROM fixture.staff_visible THEN
      RAISE EXCEPTION 'Staff listing did not match rehearsal owner scope';
    END IF;
  END LOOP;
END;
$staff$;
RESET ROLE;
