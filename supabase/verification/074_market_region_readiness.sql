-- Read-only catalog verification after migration 074. No test-account writes.
-- Execute in the same Supabase project's SQL editor after the migration succeeds.
DO $$
DECLARE target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['markets', 'venues', 'staff_accessible_markets'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=target_table AND c.column_name='region_code') THEN
      RAISE EXCEPTION 'Missing %.region_code', target_table;
    END IF;
  END LOOP;
  IF public.market_region_code_is_valid('tw-tainan-city') IS NOT TRUE
    OR public.market_region_code_is_valid('台南市') IS NOT FALSE
    OR public.market_region_code_is_valid(NULL) IS NOT TRUE THEN
    RAISE EXCEPTION 'Region catalog validation mismatch';
  END IF;
  IF (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid='public.events'::regclass AND NOT tgisinternal
    AND tgenabled <> 'D' AND tgname IN ('trigger_update_market_read_model',
      'trigger_update_recurring_operations_read_model','zz_project_market_region_event')) <> 3 THEN
    RAISE EXCEPTION 'Market region projection trigger is not ready';
  END IF;
  IF (SELECT COUNT(*) FROM pg_constraint WHERE conname IN ('markets_region_code_check','venues_region_code_check')
    AND convalidated AND conrelid IN ('public.markets'::regclass,'public.venues'::regclass)) <> 2 THEN
    RAISE EXCEPTION 'Region column constraints are not ready';
  END IF;
  IF has_function_privilege('anon','public.project_market_region_event()','EXECUTE')
    OR has_function_privilege('authenticated','public.project_market_region_event()','EXECUTE')
    OR has_function_privilege('anon','public.guard_market_region_change()','EXECUTE')
    OR has_function_privilege('authenticated','public.guard_market_region_change()','EXECUTE')
    OR has_function_privilege('anon','public.market_region_code_is_valid(TEXT)','EXECUTE') THEN
    RAISE EXCEPTION 'Region projector must not be callable by clients';
  END IF;
  RAISE NOTICE '074 region schema, catalog, trigger and privilege checks passed';
END;
$$;
