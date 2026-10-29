-- Owner-only, source-bound daily cost reviews and explicit zero results.
-- Original deals, projections, inventory and photos are never rewritten.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS public.market_financial_reviews (
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
 review_key text NOT NULL, mode text NOT NULL CHECK(mode IN('cost','zero-income','zero-fee','cleared')),
 amount numeric(12,2), observed jsonb NOT NULL, source_key text NOT NULL,
 revision integer NOT NULL CHECK(revision>0), mutation_id uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(owner_id,market_id,review_key)
);
CREATE TABLE IF NOT EXISTS public.market_financial_review_receipts (
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,mutation_id uuid NOT NULL,request jsonb NOT NULL,response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(owner_id,mutation_id)
);
ALTER TABLE public.market_financial_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_financial_review_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_financial_reviews,public.market_financial_review_receipts FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.financial_review_day(p_payload jsonb,p_time timestamptz) RETURNS date
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE d text:=COALESCE(p_payload->>'dealDate',p_payload->>'deal_date');
BEGIN
 IF d IS NULL THEN RETURN (p_time AT TIME ZONE 'Asia/Taipei')::date; END IF;
 IF d !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN NULL; END IF;
 RETURN d::date;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RETURN NULL;
END; $$;
CREATE OR REPLACE FUNCTION public.financial_review_number(p_value jsonb) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE n numeric;
BEGIN
 IF jsonb_typeof(p_value) IS DISTINCT FROM 'number' THEN RETURN NULL; END IF;
 n:=(p_value::text)::numeric;
 IF n<0 OR n>999999999.99 OR trunc(n,2)<>n THEN RETURN NULL; END IF;
 RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.financial_review_source(p_market_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE m public.markets%ROWTYPE; j jsonb; dates jsonb; fees jsonb; days jsonb; total numeric; rows jsonb; operation jsonb;
BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.subscription_effective_plan(auth.uid()),'free') NOT IN('pro','team')
  OR public.subscription_read_owner_paid(auth.uid()) IS NOT TRUE THEN RAISE EXCEPTION 'FINANCE_SCOPE' USING ERRCODE='42501'; END IF;
 SELECT * INTO m FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,false);
 IF NOT FOUND THEN RAISE EXCEPTION 'FINANCE_SCOPE' USING ERRCODE='42501'; END IF;
 j:=to_jsonb(m);
 SELECT e.payload->'updates' INTO operation FROM public.events e WHERE e.market_id=m.id AND e.type='market_updated'
  AND ((e.payload->'updates') ? 'operationPhase' OR (e.payload->'updates') ? 'operation_phase') ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
 SELECT CASE WHEN e.type='market_created' THEN e.payload->'dates' ELSE e.payload#>'{updates,dates}' END INTO dates
 FROM public.events e WHERE (e.market_id=m.id OR (e.market_id IS NULL AND COALESCE(e.payload->>'marketId',e.payload->>'market_id')=m.id::text))
 AND ((e.type='market_created' AND jsonb_typeof(e.payload->'dates')='array') OR (e.type='market_updated' AND jsonb_typeof(e.payload#>'{updates,dates}')='array'))
 ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
 IF jsonb_typeof(dates) IS DISTINCT FROM 'array' OR jsonb_array_length(dates)=0 THEN
  IF m.end_date-m.start_date>3659 THEN RAISE EXCEPTION 'FINANCE_LIMIT'; END IF;
  SELECT COALESCE(jsonb_agg(to_char(d,'YYYY-MM-DD') ORDER BY d),'[]') INTO dates
   FROM generate_series(m.start_date::timestamp,m.end_date::timestamp,interval '1 day') d;
 END IF;
 SELECT COALESCE(jsonb_agg(d ORDER BY d),'[]') INTO dates FROM (SELECT DISTINCT value AS d FROM jsonb_array_elements_text(dates)) x;
 IF jsonb_array_length(dates)>3660 THEN RAISE EXCEPTION 'FINANCE_LIMIT'; END IF;
 fees:=jsonb_build_array(m.id,dates,COALESCE(NULLIF(j->'booth_cost','null'),'0'),COALESCE(NULLIF(j->'registration_fee','null'),'0'),
  COALESCE(NULLIF(j->'table_rental','null'),'0'),COALESCE(NULLIF(j->'table_free','null'),'false'),
  COALESCE(NULLIF(j->'chair_rental','null'),'0'),COALESCE(NULLIF(j->'chair_free','null'),'false'),
  COALESCE(NULLIF(j->'umbrella_rental','null'),'0'),COALESCE(NULLIF(j->'umbrella_free','null'),'false'),
  COALESCE(NULLIF(j->'tablecloth_rental','null'),'0'),COALESCE(NULLIF(j->'tablecloth_free','null'),'false'),
  COALESCE(NULLIF(j->'commission_rate','null'),'0'));
 total:=CASE WHEN COALESCE((j->>'booth_cost')::numeric,0)<>0 THEN (j->>'booth_cost')::numeric ELSE COALESCE((j->>'registration_fee')::numeric,0) END
  +CASE WHEN COALESCE((j->>'table_free')::boolean,false) THEN 0 ELSE COALESCE((j->>'table_rental')::numeric,0) END
  +CASE WHEN COALESCE((j->>'chair_free')::boolean,false) THEN 0 ELSE COALESCE((j->>'chair_rental')::numeric,0) END
  +CASE WHEN COALESCE((j->>'umbrella_free')::boolean,false) THEN 0 ELSE COALESCE((j->>'umbrella_rental')::numeric,0) END
  +CASE WHEN COALESCE((j->>'tablecloth_free')::boolean,false) THEN 0 ELSE COALESCE((j->>'tablecloth_rental')::numeric,0) END;
 SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]') INTO rows FROM (
  SELECT id,type,payload,timestamp FROM public.events WHERE
   (market_id=m.id OR (market_id IS NULL AND COALESCE(payload->>'marketId',payload->>'market_id')=m.id::text))
   AND type IN('deal_closed','deal_deleted') ORDER BY id LIMIT 10001) e;
 IF jsonb_array_length(rows)>10000 THEN RAISE EXCEPTION 'FINANCE_LIMIT'; END IF;
 WITH raw AS (SELECT value AS e FROM jsonb_array_elements(rows)),
 sales AS (SELECT e,e->>'id' AS id,public.financial_review_day(e->'payload',(e->>'timestamp')::timestamptz) AS day FROM raw WHERE e->>'type'='deal_closed'),
 tombstones AS (SELECT e,COALESCE(e#>>'{payload,eventId}',e#>>'{payload,event_id}') AS target FROM raw WHERE e->>'type'='deal_deleted'),
 active AS (SELECT s.* FROM sales s WHERE NOT EXISTS(SELECT 1 FROM tombstones t WHERE t.target=s.id)),
 amounts AS (SELECT *,public.financial_review_number(COALESCE(e#>'{payload,manualRevenue}',e#>'{payload,manual_revenue}',e#>'{payload,totalAmount}',e#>'{payload,total_amount}')) AS revenue,
  public.financial_review_number(COALESCE(e#>'{payload,manualDealCount}',e#>'{payload,manual_deal_count}',e#>'{payload,dealCount}',e#>'{payload,deal_count}','1')) AS deals FROM active),
 history AS (SELECT day,e FROM sales UNION ALL SELECT s.day,t.e FROM tombstones t JOIN sales s ON t.target=s.id),
 all_dates AS (SELECT value AS day FROM jsonb_array_elements_text(dates))
 SELECT COALESCE(jsonb_object_agg(d.day,jsonb_build_object(
  'key',md5(COALESCE((SELECT jsonb_agg(h.e ORDER BY h.e->>'id') FROM history h WHERE h.day::text=d.day),'[]')::text),
  'revenue',COALESCE((SELECT sum(a.revenue) FROM amounts a WHERE a.day::text=d.day),0),
  'deals',COALESCE((SELECT sum(a.deals) FROM amounts a WHERE a.day::text=d.day),0),
  'count',(SELECT count(*) FROM active a WHERE a.day::text=d.day),
  'zeroAllowed',COALESCE(d.day::date<=(clock_timestamp() AT TIME ZONE 'Asia/Taipei')::date AND (d.day::date<(clock_timestamp() AT TIME ZONE 'Asia/Taipei')::date OR j->>'status'='completed'
   OR (COALESCE(operation->>'operationPhase',operation->>'operation_phase',j->>'operation_phase')='closing'
    AND COALESCE(operation->>'operationSessionDate',operation->>'operation_session_date',j->>'operation_session_date')=d.day)),false),
  'valid',NOT EXISTS(SELECT 1 FROM active WHERE day IS NULL)
    AND NOT EXISTS(SELECT 1 FROM tombstones WHERE target IS NULL OR target='')
    AND NOT EXISTS(SELECT 1 FROM amounts a WHERE a.day::text=d.day AND (a.revenue IS NULL OR a.deals IS NULL OR trunc(a.deals)<>a.deals OR a.deals<=0))
 )),'{}') INTO days FROM all_dates d;
 RETURN jsonb_build_object('ownerId',auth.uid(),'marketId',m.id,'dates',dates,'feeBasis',fees,'feeKey',md5(fees::text),'feeTotal',total,'days',days);
END; $$;

CREATE OR REPLACE FUNCTION public.read_market_financial_reviews(p_market_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE id uuid; source jsonb; reviews jsonb; result jsonb:='[]';
BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.subscription_effective_plan(auth.uid()),'free') NOT IN('pro','team') OR public.subscription_read_owner_paid(auth.uid()) IS NOT TRUE THEN RAISE EXCEPTION 'FINANCE_SCOPE' USING ERRCODE='42501'; END IF;
 IF p_market_ids IS NULL OR cardinality(p_market_ids)>100 THEN RAISE EXCEPTION 'FINANCE_LIMIT'; END IF;
 FOR id IN SELECT DISTINCT unnest(p_market_ids) LOOP
  source:=public.financial_review_source(id);
  SELECT COALESCE(jsonb_agg(to_jsonb(r)||jsonb_build_object('valid',COALESCE(r.source_key=CASE WHEN r.review_key='fees' THEN source->>'feeKey' ELSE source#>>ARRAY['days',r.review_key,'key'] END
   AND (r.mode<>'zero-income' OR source#>>ARRAY['days',r.review_key,'zeroAllowed']='true'),false)) ORDER BY r.review_key),'[]') INTO reviews
   FROM public.market_financial_reviews r WHERE r.owner_id=auth.uid() AND r.market_id=id;
  result:=result||jsonb_build_array(source||jsonb_build_object('reviews',reviews));
 END LOOP;
 RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.save_market_financial_review(p_market_id uuid,p_review_key text,p_mode text,p_amount numeric,p_observed jsonb,p_source_key text,p_expected_revision integer,p_mutation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE source jsonb; current_row public.market_financial_reviews%ROWTYPE; receipt public.market_financial_review_receipts%ROWTYPE;
 request jsonb; response jsonb; day_source jsonb; business_day date;
BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.subscription_effective_plan(auth.uid()),'free') NOT IN('pro','team') OR public.subscription_read_owner_paid(auth.uid()) IS NOT TRUE THEN RAISE EXCEPTION 'FINANCE_SCOPE' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,false) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FINANCE_SCOPE' USING ERRCODE='42501'; END IF;
 IF p_mutation_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0 OR p_review_key IS NULL OR p_source_key IS NULL OR p_mode IS NULL OR p_observed IS NULL THEN RAISE EXCEPTION 'FINANCE_INPUT' USING ERRCODE='22023'; END IF;
 request:=jsonb_build_array(p_market_id,p_review_key,p_mode,p_amount,p_observed,p_source_key,p_expected_revision);
 SELECT * INTO receipt FROM public.market_financial_review_receipts WHERE owner_id=auth.uid() AND mutation_id=p_mutation_id;
 IF FOUND THEN IF receipt.request=request THEN RETURN receipt.response; ELSE RAISE EXCEPTION 'FINANCE_RETRY_CONFLICT' USING ERRCODE='40001'; END IF; END IF;
 source:=public.financial_review_source(p_market_id);
 IF p_review_key='fees' THEN
  IF p_mode NOT IN('zero-fee','cleared') OR p_amount IS NOT NULL OR p_source_key<>source->>'feeKey' OR p_observed<>source->'feeBasis' THEN RAISE EXCEPTION 'FINANCE_SOURCE' USING ERRCODE='40001'; END IF;
  IF p_mode='zero-fee' AND ((source->>'feeTotal')::numeric<>0 OR EXISTS(
   SELECT 1 FROM jsonb_array_elements(source->'feeBasis') WITH ORDINALITY f(value,n)
   WHERE n IN(3,4,5,7,9,11,13) AND public.financial_review_number(value) IS NULL
  ) OR (source#>>'{feeBasis,12}')::numeric>100) THEN RAISE EXCEPTION 'FINANCE_INPUT' USING ERRCODE='22023'; END IF;
 ELSE
  business_day:=public.financial_review_day(jsonb_build_object('dealDate',p_review_key),NULL);
  day_source:=source#>ARRAY['days',p_review_key];
  IF business_day IS NULL OR business_day>(clock_timestamp() AT TIME ZONE 'Asia/Taipei')::date OR day_source IS NULL THEN RAISE EXCEPTION 'FINANCE_DATE' USING ERRCODE='22023'; END IF;
  IF p_mode NOT IN('cost','zero-income','cleared') OR p_source_key<>day_source->>'key' OR day_source->>'valid'<>'true' THEN RAISE EXCEPTION 'FINANCE_SOURCE' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(p_observed) IS DISTINCT FROM 'array' OR jsonb_array_length(p_observed)<>6 OR (p_observed->>0) IS DISTINCT FROM p_market_id::text OR (p_observed->>1) IS DISTINCT FROM p_review_key
   OR public.financial_review_number(p_observed->2) IS DISTINCT FROM (day_source->>'revenue')::numeric
   OR public.financial_review_number(p_observed->5) IS DISTINCT FROM (day_source->>'deals')::numeric
   OR jsonb_typeof(p_observed->3)<>'number' OR jsonb_typeof(p_observed->4)<>'number' THEN RAISE EXCEPTION 'FINANCE_SOURCE' USING ERRCODE='40001'; END IF;
  IF p_mode='cost' AND (p_amount IS NULL OR public.financial_review_number(to_jsonb(p_amount)) IS NULL OR (day_source->>'count')::integer=0) THEN RAISE EXCEPTION 'FINANCE_INPUT' USING ERRCODE='22023'; END IF;
  IF p_mode<>'cost' AND p_amount IS NOT NULL THEN RAISE EXCEPTION 'FINANCE_INPUT' USING ERRCODE='22023'; END IF;
  IF p_mode='zero-income' AND ((day_source->>'count')::integer<>0 OR day_source->>'zeroAllowed' IS DISTINCT FROM 'true' OR p_observed<>jsonb_build_array(p_market_id,p_review_key,0,0,0,0)) THEN RAISE EXCEPTION 'FINANCE_INPUT' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT * INTO current_row FROM public.market_financial_reviews WHERE owner_id=auth.uid() AND market_id=p_market_id AND review_key=p_review_key FOR UPDATE;
 IF COALESCE(current_row.revision,0)<>p_expected_revision THEN RAISE EXCEPTION 'FINANCE_CONFLICT' USING ERRCODE='40001'; END IF;
 INSERT INTO public.market_financial_reviews(owner_id,market_id,review_key,mode,amount,observed,source_key,revision,mutation_id)
 VALUES(auth.uid(),p_market_id,p_review_key,p_mode,p_amount,p_observed,p_source_key,p_expected_revision+1,p_mutation_id)
 ON CONFLICT(owner_id,market_id,review_key) DO UPDATE SET mode=EXCLUDED.mode,amount=EXCLUDED.amount,observed=EXCLUDED.observed,source_key=EXCLUDED.source_key,revision=EXCLUDED.revision,mutation_id=EXCLUDED.mutation_id,updated_at=clock_timestamp()
 RETURNING to_jsonb(market_financial_reviews.*) INTO response;
 INSERT INTO public.market_financial_review_receipts(owner_id,mutation_id,request,response) VALUES(auth.uid(),p_mutation_id,request,response);
 RETURN response;
END; $$;
REVOKE ALL ON FUNCTION public.financial_review_day(jsonb,timestamptz),public.financial_review_number(jsonb),public.financial_review_source(uuid),public.read_market_financial_reviews(uuid[]),public.save_market_financial_review(uuid,text,text,numeric,jsonb,text,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_market_financial_reviews(uuid[]),public.save_market_financial_review(uuid,text,text,numeric,jsonb,text,integer,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
