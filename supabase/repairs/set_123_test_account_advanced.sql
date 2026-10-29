-- Explicit user request, 2026-10-29: stable Advanced baseline for 123@123.
-- Administrative test entitlement only; no payment, price or staff activation.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $assign$
DECLARE v_owner uuid; v_count integer;
BEGIN
 SELECT count(*),min(id::text)::uuid INTO v_count,v_owner FROM auth.users WHERE lower(email)='123@123';
 IF v_count<>1 THEN RAISE EXCEPTION 'Expected exactly one named test account'; END IF;
 IF EXISTS(SELECT 1 FROM public.subscription_accounts WHERE owner_id=v_owner AND plan_source NOT IN ('free','admin')) THEN
  RAISE EXCEPTION 'Refusing to replace a billing or promotion assignment';
 END IF;
 INSERT INTO public.subscription_accounts(owner_id,plan_code,plan_source,billing_status,entitlement_status,entitlement_ends_at)
 VALUES(v_owner,'team','admin','none','active',NULL)
 ON CONFLICT(owner_id) DO UPDATE SET plan_code='team',plan_source='admin',billing_status='none',entitlement_status='active',entitlement_ends_at=NULL;
 -- Clear any temporary test choice only after installing the stable baseline.
 -- Keep enrollment and the ability to test Free/Light later.
 IF EXISTS(SELECT 1 FROM public.subscription_write_guard_owners WHERE owner_id=v_owner AND enabled AND allow_test_switch) THEN
  PERFORM public.set_subscription_test_switch(v_owner,NULL,FALSE);
 END IF;
 IF public.subscription_effective_plan(v_owner)<>'team' THEN RAISE EXCEPTION 'Advanced baseline was not applied'; END IF;
END;
$assign$;
COMMIT;
SELECT u.email,sa.plan_code,sa.plan_source,sa.billing_status,sa.entitlement_status,sa.entitlement_ends_at,
 public.subscription_effective_plan(sa.owner_id) AS effective_plan
 FROM public.subscription_accounts sa JOIN auth.users u ON u.id=sa.owner_id WHERE lower(u.email)='123@123';
