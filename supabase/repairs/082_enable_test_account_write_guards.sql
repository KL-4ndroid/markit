-- Explicitly enroll ONLY the existing test account. No operational rows/account ledger are rewritten.
-- Requires SQL Editor/admin. Client roles cannot enroll themselves or grant test plans.
BEGIN;
DO $$
DECLARE v_owner UUID; v_count INTEGER;
BEGIN
  SELECT count(*),min(u.id::TEXT)::UUID INTO v_count,v_owner
  FROM auth.users u JOIN public.profiles p ON p.id=u.id WHERE lower(u.email)='123@123';
  IF v_count<>1 THEN RAISE EXCEPTION 'Expected exactly one existing test owner 123@123 with profile; no account enrolled'; END IF;
  IF EXISTS(SELECT 1 FROM public.staff_relationships WHERE staff_id=v_owner AND status='active') THEN
    RAISE EXCEPTION 'Test account has an active employee relationship; confirm owner identity before enrollment';
  END IF;
  INSERT INTO public.subscription_write_guard_owners(owner_id,enabled,allow_test_switch)
  VALUES(v_owner,TRUE,TRUE)
  ON CONFLICT(owner_id) DO UPDATE SET enabled=TRUE,allow_test_switch=TRUE,updated_at=clock_timestamp();
END; $$;
COMMIT;

-- To turn this pilot off later, run separately as admin (keeps audit/history):
-- UPDATE public.subscription_write_guard_owners SET enabled=FALSE,allow_test_switch=FALSE,
--   test_plan_code=NULL,test_expires_at=NULL,updated_at=clock_timestamp()
-- WHERE owner_id IN (SELECT id FROM auth.users WHERE lower(email)='123@123');
