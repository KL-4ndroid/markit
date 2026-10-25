-- Read-only verification after migration 075; no business data changes.
DO $$
DECLARE routine TEXT; client_role TEXT;
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN ('markets','staff_accessible_markets') AND column_name='payment_deadline') <> 2 THEN
    RAISE EXCEPTION 'Payment deadline columns not ready';
  END IF;
  IF public.market_payment_deadline_is_valid('{"date":"2026-10-24","timeZone":"Asia/Taipei","reminderEnabled":true}') IS NOT TRUE
    OR public.market_payment_deadline_is_valid('{"date":"2026-02-30","timeZone":"Asia/Taipei"}') IS NOT FALSE
    OR public.market_payment_deadline_is_valid(NULL) IS NOT TRUE THEN
    RAISE EXCEPTION 'Payment deadline validator mismatch';
  END IF;
  FOREACH routine IN ARRAY ARRAY['public.project_market_payment_deadline_event()','public.guard_market_payment_deadline_change()'] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF has_function_privilege(client_role,routine,'EXECUTE') THEN
        RAISE EXCEPTION 'Unexpected EXECUTE grant for % on %',client_role,routine;
      END IF;
    END LOOP;
  END LOOP;
  IF has_function_privilege('anon','public.market_payment_deadline_is_valid(JSONB)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous deadline validator execution must be denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.events'::regclass
    AND tgname='zz_project_market_payment_deadline_event' AND NOT tgisinternal AND tgenabled <> 'D')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.markets'::regclass
      AND tgname='guard_market_payment_deadline_change' AND NOT tgisinternal AND tgenabled <> 'D')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.markets'::regclass
      AND conname='markets_payment_deadline_check' AND convalidated) THEN
    RAISE EXCEPTION 'Payment deadline trigger or constraint not ready';
  END IF;
  RAISE NOTICE '075 payment deadline schema, validator, triggers and explicit grants passed';
END;
$$;
