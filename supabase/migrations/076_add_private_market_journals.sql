-- Owner-private journals. Never publish their text through markets, events or staff views.
BEGIN;

CREATE TABLE IF NOT EXISTS public.market_journals (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_date DATE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000 AND body ~ '[^[:space:]]'),
  revision INTEGER NOT NULL CHECK (revision > 0),
  mutation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (author_id = owner_id)
);
CREATE INDEX IF NOT EXISTS market_journals_owner_market ON public.market_journals(owner_id, market_id);
ALTER TABLE public.market_journals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.market_journals FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.market_journals TO authenticated, service_role;
DROP POLICY IF EXISTS market_journals_owner_read ON public.market_journals;
CREATE POLICY market_journals_owner_read ON public.market_journals FOR SELECT TO authenticated
USING (owner_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.owner_id = auth.uid()
    AND NOT COALESCE(m.is_deleted, FALSE)
));

CREATE OR REPLACE FUNCTION public.save_market_journal(
  p_id UUID, p_market_id UUID, p_business_date DATE, p_body TEXT,
  p_expected_revision INTEGER, p_mutation_id UUID, p_deleted BOOLEAN DEFAULT FALSE
) RETURNS public.market_journals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_market public.markets%ROWTYPE;
  v_row public.market_journals%ROWTYPE;
  v_dates JSONB;
  v_body TEXT := btrim(replace(p_body, E'\r\n', E'\n'), E' \t\r\n');
BEGIN
  IF v_user IS NULL OR p_id IS NULL OR p_market_id IS NULL OR p_mutation_id IS NULL
    OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_deleted IS NULL THEN
    RAISE EXCEPTION 'JOURNAL_SCOPE' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_market FROM public.markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND OR v_market.owner_id IS DISTINCT FROM v_user OR COALESCE(v_market.is_deleted, FALSE) THEN
    RAISE EXCEPTION 'JOURNAL_SCOPE' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.market_journals WHERE id = p_id FOR UPDATE;
  IF FOUND THEN
    IF v_row.owner_id <> v_user OR v_row.market_id <> p_market_id THEN
      RAISE EXCEPTION 'JOURNAL_SCOPE' USING ERRCODE = '42501';
    END IF;
    -- Lost acknowledgements can safely repeat the exact mutation.
    IF v_row.mutation_id = p_mutation_id AND v_row.body = v_body
      AND v_row.business_date IS NOT DISTINCT FROM p_business_date
      AND (v_row.deleted_at IS NOT NULL) = p_deleted THEN RETURN v_row; END IF;
    IF v_row.revision <> p_expected_revision OR v_row.mutation_id = p_mutation_id THEN
      RAISE EXCEPTION 'JOURNAL_CONFLICT' USING ERRCODE = '40001';
    END IF;
  ELSIF p_expected_revision <> 0 OR p_deleted THEN
    RAISE EXCEPTION 'JOURNAL_CONFLICT' USING ERRCODE = '40001';
  END IF;
  IF v_body IS NULL OR char_length(v_body) NOT BETWEEN 1 AND 5000 OR v_body !~ '[^[:space:]]' THEN
    RAISE EXCEPTION 'JOURNAL_BODY' USING ERRCODE = '22023';
  END IF;
  -- Existing historical days may be preserved when editing text, even after a market date correction.
  IF p_business_date IS NOT NULL AND (v_row.id IS NULL OR p_business_date IS DISTINCT FROM v_row.business_date) THEN
    -- The existing read model stores only the range; the event stream retains explicit days.
    SELECT CASE WHEN e.type='market_created' THEN e.payload->'dates' ELSE e.payload#>'{updates,dates}' END INTO v_dates
    FROM public.events e WHERE e.market_id=p_market_id AND e.actor_id=v_user
      AND ((e.type='market_created' AND jsonb_typeof(e.payload->'dates')='array')
        OR (e.type='market_updated' AND jsonb_typeof(e.payload#>'{updates,dates}')='array'))
    ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
    IF (jsonb_typeof(v_dates)='array' AND jsonb_array_length(v_dates)>0 AND NOT v_dates ? p_business_date::TEXT)
      OR (p_business_date < v_market.start_date OR p_business_date > v_market.end_date) THEN
      RAISE EXCEPTION 'JOURNAL_DATE' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF v_row.id IS NULL THEN
    INSERT INTO public.market_journals(id,owner_id,market_id,author_id,business_date,body,revision,mutation_id)
    VALUES(p_id,v_user,p_market_id,v_user,p_business_date,v_body,1,p_mutation_id) RETURNING * INTO v_row;
  ELSE
    UPDATE public.market_journals SET business_date=p_business_date, body=v_body, revision=revision+1,
      mutation_id=p_mutation_id, updated_at=clock_timestamp(),
      deleted_at=CASE WHEN p_deleted THEN COALESCE(deleted_at,clock_timestamp()) ELSE NULL END
    WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;

-- Journals (including removed entries) are user activity. Protect generated schedule snapshots.
CREATE OR REPLACE FUNCTION public.guard_journal_schedule_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.session_origin = 'schedule'
    AND (NEW.schedule_revision IS DISTINCT FROM OLD.schedule_revision
      OR NEW.schedule_occurrence_state IS DISTINCT FROM OLD.schedule_occurrence_state)
    AND EXISTS (SELECT 1 FROM public.market_journals j WHERE j.market_id=OLD.id) THEN
    RAISE EXCEPTION 'JOURNAL_SCHEDULE_PROTECTED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_guard_journal_schedule_snapshot ON public.markets;
CREATE TRIGGER trigger_guard_journal_schedule_snapshot BEFORE UPDATE ON public.markets
FOR EACH ROW EXECUTE FUNCTION public.guard_journal_schedule_snapshot();

REVOKE ALL ON FUNCTION public.save_market_journal(UUID,UUID,DATE,TEXT,INTEGER,UUID,BOOLEAN) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_market_journal(UUID,UUID,DATE,TEXT,INTEGER,UUID,BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_journal_schedule_snapshot() FROM PUBLIC,anon,authenticated,service_role;

-- Embedded readiness check: one complete execution, no temporary connection state.
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
COMMIT;
