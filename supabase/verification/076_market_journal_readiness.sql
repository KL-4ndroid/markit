-- Read-only readiness checks; no journal text or business data is read.
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.market_journals'::regclass)
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='market_journals' AND policyname='market_journals_owner_read')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.markets'::regclass AND tgname='trigger_guard_journal_schedule_snapshot' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Journal RLS/policy/trigger missing';
  END IF;
  IF has_table_privilege('authenticated','public.market_journals','INSERT,UPDATE,DELETE')
    OR has_table_privilege('anon','public.market_journals','SELECT')
    OR has_function_privilege('anon','public.save_market_journal(UUID,UUID,DATE,TEXT,INTEGER,UUID,BOOLEAN)','EXECUTE')
    OR has_function_privilege('authenticated','public.guard_journal_schedule_snapshot()','EXECUTE') THEN
    RAISE EXCEPTION 'Journal client grants are unsafe';
  END IF;
  IF NOT has_function_privilege('authenticated','public.save_market_journal(UUID,UUID,DATE,TEXT,INTEGER,UUID,BOOLEAN)','EXECUTE') THEN
    RAISE EXCEPTION 'Journal writer grant missing';
  END IF;
END $$;
