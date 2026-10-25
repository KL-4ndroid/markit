-- Optional owner-only cash counts. No sales, inventory or profit projection changes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.market_cash_records (
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  revision INTEGER NOT NULL CHECK(revision>0),
  mutation_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(market_id,business_date)
);
CREATE INDEX IF NOT EXISTS market_cash_owner ON public.market_cash_records(owner_id,market_id);
ALTER TABLE public.market_cash_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_cash_records FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.market_cash_records TO authenticated,service_role;
DROP POLICY IF EXISTS market_cash_owner_read ON public.market_cash_records;
CREATE POLICY market_cash_owner_read ON public.market_cash_records FOR SELECT TO authenticated
  USING(owner_id=auth.uid() AND EXISTS(SELECT 1 FROM public.markets m
    WHERE m.id=market_id AND m.owner_id=auth.uid() AND NOT COALESCE(m.is_deleted,FALSE)));

CREATE OR REPLACE FUNCTION public.market_cash_point_cents(p JSONB)
RETURNS BIGINT LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public AS $$
DECLARE mode TEXT; amount TEXT; entry RECORD; total BIGINT:=0; entered BOOLEAN:=FALSE;
BEGIN
  IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
  mode:=p->>'mode';
  IF mode='none' AND p='{"mode":"none"}'::JSONB THEN RETURN NULL; END IF;
  IF mode='total' AND jsonb_typeof(p->'amount')='string' AND p-'mode'-'amount'='{}'::JSONB THEN
    amount:=btrim(p->>'amount');
    IF amount !~ '^(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$' THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
    RETURN (amount::NUMERIC*100)::BIGINT;
  END IF;
  IF mode<>'denominations' OR mode IS NULL OR jsonb_typeof(p->'counts') IS DISTINCT FROM 'object'
    OR p-'mode'-'counts'<>'{}'::JSONB THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
  FOR entry IN SELECT key,value FROM jsonb_each(p->'counts') LOOP
    IF entry.key NOT IN('1000','500','100','50','10','5','1') OR jsonb_typeof(entry.value)<>'string' THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
    amount:=btrim(entry.value#>>'{}');
    IF amount='' THEN CONTINUE; END IF;
    IF amount !~ '^(0|[1-9][0-9]{0,5})$' THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
    entered:=TRUE; total:=total+entry.key::BIGINT*amount::BIGINT*100;
  END LOOP;
  IF NOT entered OR total>99999999999 THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_market_cash_record(
  p_market_id UUID,p_business_date DATE,p_data JSONB,p_expected_revision INTEGER,p_mutation_id UUID
) RETURNS public.market_cash_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_user UUID:=auth.uid(); v_market public.markets%ROWTYPE; v_row public.market_cash_records%ROWTYPE;
  v_dates JSONB; v_open BIGINT; v_close BIGINT;
BEGIN
  IF v_user IS NULL OR p_market_id IS NULL OR p_business_date IS NULL OR p_mutation_id IS NULL
    OR p_expected_revision IS NULL OR p_expected_revision<0 THEN RAISE EXCEPTION 'CASH_SCOPE' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_market FROM public.markets WHERE id=p_market_id FOR UPDATE;
  IF NOT FOUND OR v_market.owner_id IS DISTINCT FROM v_user OR COALESCE(v_market.is_deleted,FALSE) THEN
    RAISE EXCEPTION 'CASH_SCOPE' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.market_cash_records WHERE market_id=p_market_id AND business_date=p_business_date FOR UPDATE;
  IF FOUND THEN
    IF v_row.owner_id<>v_user THEN RAISE EXCEPTION 'CASH_SCOPE' USING ERRCODE='42501'; END IF;
    IF v_row.mutation_id=p_mutation_id AND v_row.data=p_data THEN RETURN v_row; END IF;
    IF v_row.revision<>p_expected_revision OR v_row.mutation_id=p_mutation_id THEN RAISE EXCEPTION 'CASH_CONFLICT'; END IF;
  ELSIF p_expected_revision<>0 THEN RAISE EXCEPTION 'CASH_CONFLICT'; END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR p_data-'opening'-'closing'-'note'<>'{}'::JSONB
    OR jsonb_typeof(p_data->'note') IS DISTINCT FROM 'string' OR char_length(p_data->>'note')>1000 THEN
    RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
  v_open:=public.market_cash_point_cents(p_data->'opening');v_close:=public.market_cash_point_cents(p_data->'closing');
  IF v_row.market_id IS NULL THEN
    IF v_open IS NULL AND v_close IS NULL AND btrim(p_data->>'note')='' THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
    SELECT CASE WHEN e.type='market_created' THEN e.payload->'dates' ELSE e.payload#>'{updates,dates}' END INTO v_dates
      FROM public.events e WHERE e.market_id=p_market_id AND e.actor_id=v_user
        AND ((e.type='market_created' AND jsonb_typeof(e.payload->'dates')='array')
          OR (e.type='market_updated' AND jsonb_typeof(e.payload#>'{updates,dates}')='array'))
      ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
    IF (jsonb_typeof(v_dates)='array' AND jsonb_array_length(v_dates)>0 AND NOT v_dates ? p_business_date::TEXT)
      OR p_business_date<v_market.start_date OR p_business_date>v_market.end_date THEN RAISE EXCEPTION 'CASH_DATE' USING ERRCODE='22023'; END IF;
    INSERT INTO public.market_cash_records(market_id,business_date,owner_id,data,revision,mutation_id)
      VALUES(p_market_id,p_business_date,v_user,p_data,1,p_mutation_id) RETURNING * INTO v_row;
  ELSE
    UPDATE public.market_cash_records SET data=p_data,revision=revision+1,mutation_id=p_mutation_id,updated_at=clock_timestamp()
      WHERE market_id=p_market_id AND business_date=p_business_date RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;
CREATE OR REPLACE FUNCTION public.guard_cash_schedule_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF OLD.session_origin='schedule' AND (NEW.schedule_revision IS DISTINCT FROM OLD.schedule_revision
    OR NEW.schedule_occurrence_state IS DISTINCT FROM OLD.schedule_occurrence_state)
    AND EXISTS(SELECT 1 FROM public.market_cash_records c WHERE c.market_id=OLD.id) THEN
    RAISE EXCEPTION 'CASH_SCHEDULE_PROTECTED' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_guard_cash_schedule_snapshot ON public.markets;
CREATE TRIGGER trigger_guard_cash_schedule_snapshot BEFORE UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.guard_cash_schedule_snapshot();
REVOKE ALL ON FUNCTION public.market_cash_point_cents(JSONB),public.guard_cash_schedule_snapshot(),
  public.save_market_cash_record(UUID,DATE,JSONB,INTEGER,UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_market_cash_record(UUID,DATE,JSONB,INTEGER,UUID) TO authenticated;
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.market_cash_records'::regclass)
    OR has_table_privilege('authenticated','public.market_cash_records','INSERT,UPDATE,DELETE')
    OR has_table_privilege('anon','public.market_cash_records','SELECT')
    OR has_function_privilege('authenticated','public.market_cash_point_cents(JSONB)','EXECUTE')
    OR has_function_privilege('authenticated','public.guard_cash_schedule_snapshot()','EXECUTE')
    OR has_function_privilege('anon','public.save_market_cash_record(UUID,DATE,JSONB,INTEGER,UUID)','EXECUTE') THEN
    RAISE EXCEPTION 'Cash RLS or grants unsafe'; END IF;
  IF NOT has_function_privilege('authenticated','public.save_market_cash_record(UUID,DATE,JSONB,INTEGER,UUID)','EXECUTE')
    OR NOT has_table_privilege('authenticated','public.market_cash_records','SELECT')
    OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='market_cash_records' AND policyname='market_cash_owner_read')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.markets'::regclass AND tgname='trigger_guard_cash_schedule_snapshot' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Cash reader/writer/policy/trigger missing'; END IF;
END $$;
COMMIT;
