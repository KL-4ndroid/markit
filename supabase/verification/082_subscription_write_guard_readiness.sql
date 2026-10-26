-- Read-only structural/privilege verification. Does not switch plans or create business data.
DO $$
DECLARE v_name TEXT; v_role TEXT;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['subscription_write_guard_settings','subscription_write_guard_owners','subscription_test_switch_audit'] LOOP
    IF to_regclass('public.'||v_name) IS NULL THEN RAISE EXCEPTION 'Missing subscription guard table: %',v_name; END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.'||v_name)) THEN RAISE EXCEPTION 'RLS required: %',v_name; END IF;
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF has_table_privilege(v_role,'public.'||v_name,'INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Direct writes must be revoked: % %',v_name,v_role; END IF;
    END LOOP;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['subscription_effective_plan(uuid)','subscription_write_guard_active(uuid)',
    'subscription_require_tier(uuid,integer)','check_subscription_write_for_actor(uuid,uuid,text)',
    'read_subscription_test_switch(uuid)','set_subscription_test_switch(uuid,text,boolean)',
    'read_subscription_account_for_actor(uuid,uuid)','has_authoritative_team_entitlement(uuid)'] LOOP
    IF to_regprocedure('public.'||v_name) IS NULL THEN RAISE EXCEPTION 'Missing function: %',v_name; END IF;
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(v_role,'public.'||v_name,'EXECUTE') THEN RAISE EXCEPTION 'Private function callable by client: % %',v_name,v_role; END IF;
    END LOOP;
  END LOOP;
  IF NOT has_function_privilege('authenticated','public.check_subscription_write_access(uuid,text)','EXECUTE')
    OR has_function_privilege('anon','public.check_subscription_write_access(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Preflight ACL mismatch'; END IF;
  FOREACH v_name IN ARRAY ARRAY['events','markets','products','market_cash_records','product_cover_photos','sale_photo_evidence'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.'||v_name)
      AND tgname IN ('subscription_event_write','subscription_market_summary','subscription_row_write') AND tgenabled='O' AND NOT tgisinternal) THEN
      RAISE EXCEPTION 'Missing active write trigger: %',v_name;
    END IF;
  END LOOP;
  IF COALESCE((SELECT enforce_all FROM public.subscription_write_guard_settings WHERE singleton),TRUE) THEN
    RAISE EXCEPTION 'Pilot verification requires enforce_all=false';
  END IF;
  IF (SELECT count(*) FROM public.subscription_write_guard_owners g JOIN auth.users u ON u.id=g.owner_id
      WHERE lower(u.email)='123@123' AND g.enabled AND g.allow_test_switch)<>1 THEN
    RAISE EXCEPTION 'Test owner 123@123 must be enrolled by the separate setup SQL first';
  END IF;
  RAISE NOTICE '082 subscription write guard structure and client permissions passed';
END; $$;

SELECT u.email,g.enabled,g.allow_test_switch,g.test_plan_code,g.test_expires_at,
  public.subscription_effective_plan(g.owner_id) AS effective_plan
FROM public.subscription_write_guard_owners g JOIN auth.users u ON u.id=g.owner_id
WHERE lower(u.email)='123@123';
SELECT enforce_all FROM public.subscription_write_guard_settings WHERE singleton;
