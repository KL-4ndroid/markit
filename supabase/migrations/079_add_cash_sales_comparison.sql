-- Optional cash comparison. Requires 078. No event, sales, inventory or profit writes.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_market_cash_record_v2(
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
  IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR p_data-'opening'-'closing'-'note'-'otherCash'-'salesBasis'<>'{}'::JSONB
    OR jsonb_typeof(p_data->'note') IS DISTINCT FROM 'string' OR char_length(p_data->>'note')>1000 THEN
    RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
  IF p_data ? 'otherCash' AND NOT (
    p_data->'otherCash'='{"mode":"none"}'::JSONB OR (
      jsonb_typeof(p_data->'otherCash')='object' AND p_data#>>'{otherCash,mode}'='net'
      AND jsonb_typeof(p_data#>'{otherCash,amount}')='string'
      AND p_data#>>'{otherCash,amount}' ~ '^-?(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$'
      AND jsonb_typeof(p_data#>'{otherCash,note}')='string' AND char_length(p_data#>>'{otherCash,note}')<=1000
      AND (p_data->'otherCash')-'mode'-'amount'-'note'='{}'::JSONB
    )
  ) IS TRUE THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
  IF p_data ? 'salesBasis' AND p_data->'salesBasis'<>'null'::JSONB AND NOT (
    jsonb_typeof(p_data->'salesBasis')='object'
    AND p_data#>>'{salesBasis,salesKey}' ~ '^[a-f0-9]{32}$'
    AND jsonb_typeof(p_data#>'{salesBasis,cashKey}')='string' AND char_length(p_data#>>'{salesBasis,cashKey}')<=16000
    AND jsonb_typeof(p_data#>'{salesBasis,capturedAt}')='string'
    AND p_data#>>'{salesBasis,capturedAt}' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
    AND (p_data->'salesBasis')-'salesKey'-'cashKey'-'capturedAt'='{}'::JSONB
  ) IS TRUE THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
  IF p_data->'salesBasis' IS NOT NULL AND p_data->'salesBasis'<>'null'::JSONB THEN
    PERFORM (p_data#>>'{salesBasis,capturedAt}')::TIMESTAMPTZ;
  END IF;
  v_open:=public.market_cash_point_cents(p_data->'opening');v_close:=public.market_cash_point_cents(p_data->'closing');
  IF v_row.market_id IS NULL THEN
    IF v_open IS NULL AND v_close IS NULL AND btrim(p_data->>'note')='' AND COALESCE(p_data#>>'{otherCash,mode}','none')<>'net' THEN RAISE EXCEPTION 'CASH_INPUT' USING ERRCODE='22023'; END IF;
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
-- Older clients cannot silently remove comparison fields written by v2.
CREATE OR REPLACE FUNCTION public.save_market_cash_record(
  p_market_id UUID,p_business_date DATE,p_data JSONB,p_expected_revision INTEGER,p_mutation_id UUID
) RETURNS public.market_cash_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM 1 FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,FALSE) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CASH_SCOPE' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.market_cash_records WHERE market_id=p_market_id AND business_date=p_business_date
    AND (data ? 'otherCash' OR data ? 'salesBasis')) THEN RAISE EXCEPTION 'CASH_CLIENT_UPGRADE'; END IF;
  IF p_data ? 'otherCash' OR p_data ? 'salesBasis' THEN RAISE EXCEPTION 'CASH_CLIENT_UPGRADE'; END IF;
  RETURN public.save_market_cash_record_v2(p_market_id,p_business_date,p_data,p_expected_revision,p_mutation_id);
END;
$$;
-- One statement snapshots the full market sale/tombstone stream, including staff sales.
-- Client computes shared rules; no day/timezone inference or projection mutation here.
CREATE OR REPLACE FUNCTION public.read_market_cash_sales(p_market_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE rows JSONB;
BEGIN
  PERFORM 1 FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,FALSE) FOR SHARE;
  IF auth.uid() IS NULL OR NOT FOUND THEN RAISE EXCEPTION 'CASH_SCOPE' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',e.id,'type',e.type,'payload',e.payload,'timestamp',e.timestamp) ORDER BY e.id),'[]'::JSONB)
    INTO rows FROM (SELECT id,type,payload,timestamp FROM public.events
      WHERE market_id=p_market_id AND type IN('deal_closed','deal_deleted') ORDER BY id LIMIT 10001) e;
  IF jsonb_array_length(rows)>10000 THEN RAISE EXCEPTION 'CASH_SALES_LIMIT'; END IF;
  RETURN jsonb_build_object('marketId',p_market_id,'key',md5(rows::TEXT),'capturedAt',clock_timestamp(),'events',rows);
END;
$$;
REVOKE ALL ON FUNCTION public.save_market_cash_record_v2(UUID,DATE,JSONB,INTEGER,UUID),
  public.save_market_cash_record(UUID,DATE,JSONB,INTEGER,UUID),public.read_market_cash_sales(UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_market_cash_record_v2(UUID,DATE,JSONB,INTEGER,UUID),
  public.save_market_cash_record(UUID,DATE,JSONB,INTEGER,UUID),public.read_market_cash_sales(UUID) TO authenticated;
DO $$ BEGIN
  IF has_function_privilege('anon','public.read_market_cash_sales(UUID)','EXECUTE')
    OR has_function_privilege('anon','public.save_market_cash_record_v2(UUID,DATE,JSONB,INTEGER,UUID)','EXECUTE')
    OR has_function_privilege('authenticated','public.market_cash_point_cents(JSONB)','EXECUTE')
    OR has_table_privilege('authenticated','public.market_cash_records','INSERT,UPDATE,DELETE')
    OR NOT has_function_privilege('authenticated','public.read_market_cash_sales(UUID)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.save_market_cash_record_v2(UUID,DATE,JSONB,INTEGER,UUID)','EXECUTE')
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.market_cash_records'::regclass) THEN
    RAISE EXCEPTION 'Cash comparison grants unsafe'; END IF;
END $$;
COMMIT;
