-- Read-only: verifies installation; does not activate the global rollout.
DO $check$
DECLARE t text;
BEGIN
 IF to_regprocedure('public.read_subscription_data_scope()') IS NULL THEN RAISE EXCEPTION 'Read scope RPC missing'; END IF;
 IF NOT has_function_privilege('authenticated','public.read_subscription_data_scope()','EXECUTE')
  OR has_function_privilege('anon','public.read_subscription_data_scope()','EXECUTE') THEN RAISE EXCEPTION 'Read scope ACL mismatch'; END IF;
 IF has_function_privilege('authenticated','public.check_subscription_read_for_actor(uuid,uuid,text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.check_subscription_read_for_actor(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Server-only read check ACL mismatch'; END IF;
 IF has_table_privilege('authenticated','public.subscription_read_guard_settings','SELECT') THEN RAISE EXCEPTION 'Private rollout settings exposed'; END IF;
 FOREACH t IN ARRAY ARRAY['owner_accessible_markets','owner_accessible_events','staff_accessible_markets','staff_accessible_products','staff_accessible_events'] LOOP
  IF to_regclass('public.'||t) IS NULL OR NOT has_table_privilege('authenticated','public.'||t,'SELECT')
   OR has_table_privilege('anon','public.'||t,'SELECT') THEN RAISE EXCEPTION 'View ACL mismatch: %',t; END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['markets','products','events','market_cash_records','daily_stats','product_cover_photos','sale_photo_evidence'] LOOP
  IF t='daily_stats' AND to_regclass('public.daily_stats') IS NULL THEN CONTINUE; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=('public.'||t)::regclass AND polname='subscription_retained_paid_read' AND NOT polpermissive AND polcmd='r') THEN
   RAISE EXCEPTION 'Restrictive read policy missing: %',t;
  END IF;
 END LOOP;
 IF position('FERIA_CASH_READ_TIER_V1' IN pg_get_functiondef('public.read_market_cash_sales(uuid)'::regprocedure))=0 THEN RAISE EXCEPTION 'Cash read tier guard missing'; END IF;
END;
$check$;
SELECT enforce_all AS global_read_enforcement FROM public.subscription_read_guard_settings WHERE singleton;
