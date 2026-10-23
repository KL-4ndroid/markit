-- Included inside the generated BEGIN/ROLLBACK bundle. Never run standalone.
CREATE FUNCTION pg_temp.bw10_assert(expected NUMERIC[], product_a UUID, product_b UUID, label TEXT)
RETURNS VOID LANGUAGE plpgsql AS $body$
DECLARE actual NUMERIC[];
BEGIN
  SELECT ARRAY[m.total_revenue, m.total_profit, m.total_deals, a.stock, a.total_sold, b.stock, b.total_sold]
    INTO actual FROM public.markets m, public.products a, public.products b
    WHERE m.id = 'f69d8d90-667c-4af0-ad00-4c52e60aafa8' AND a.id = product_a AND b.id = product_b;
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION '%: actual %, expected %', label, actual, expected; END IF;
END;
$body$;

DO $test$
DECLARE
  fixture public.markets%ROWTYPE;
  a UUID := gen_random_uuid(); b UUID := gen_random_uuid(); other_market UUID := gen_random_uuid();
  normal UUID := gen_random_uuid(); manual UUID := gen_random_uuid(); backfill UUID := gen_random_uuid();
  legacy UUID := gen_random_uuid(); late UUID := gen_random_uuid();
  base NUMERIC[];
  r NUMERIC; p NUMERIC; n NUMERIC;
  sample RECORD;
BEGIN
  SELECT * INTO STRICT fixture FROM public.markets WHERE id = 'f69d8d90-667c-4af0-ad00-4c52e60aafa8' FOR UPDATE;
  IF fixture.name <> '[驗收1022-BW10] 手機營業與離線測試' OR fixture.owner_id <> '35c253c0-540f-436f-abb5-c1b116e1f3df' THEN
    RAISE EXCEPTION 'Wrong disposable fixture';
  END IF;
  r := fixture.total_revenue; p := fixture.total_profit; n := fixture.total_deals;
  base := ARRAY[r,p,n,20,0,20,0];
  INSERT INTO public.products(id, owner_id, market_id, name, category, price, cost, stock, unlimited_stock)
    VALUES (a,fixture.owner_id,fixture.id,'[BW10-073-rollback-only] A','other',100,999,20,FALSE),
           (b,fixture.owner_id,fixture.id,'[BW10-073-rollback-only] B','other',50,888,20,FALSE);
  INSERT INTO public.markets(id,owner_id,name,location,start_date,end_date)
    VALUES(other_market,fixture.owner_id,'[BW10-073-rollback-only] scope','test',CURRENT_DATE,CURRENT_DATE);

  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (normal,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',650,'isBackfill',FALSE,'items',jsonb_build_array(
      jsonb_build_object('productId',a,'quantity',2,'price',100,'cost_at_time_of_sale',10),
      jsonb_build_object('productId',a,'quantity',3,'price',100,'costAtTimeOfSale',10),
      jsonb_build_object('product_id',b,'quantity',3,'price',50,'cost_at_time_of_sale',20))),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+650,p+540,n+1,15,5,17,3],a,b,'normal snapshot costs and repeated product');
  -- Even a same-owner tombstone cannot affect a deal in a different market.
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,other_market,jsonb_build_object('eventId',normal,'totalAmount',999999),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+650,p+540,n+1,15,5,17,3],a,b,'cross-market tombstone ignored');

  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (manual,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('manual_revenue',150,'manual_cost',30,'manual_deal_count',2,
      'totalAmount',150,'is_manual_entry',TRUE,'items',jsonb_build_array(jsonb_build_object('productId',a,'quantity',99))),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+800,p+660,n+3,15,5,17,3],a,b,'manual count and no stock or sales mutation');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (backfill,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',400,'is_backfill',TRUE,'items',jsonb_build_array(
      jsonb_build_object('productId',a,'quantity',4,'price',100,'cost_at_time_of_sale',10))),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+1200,p+1020,n+4,15,9,17,3],a,b,'full backfill sold count without stock deduction');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('event_id',backfill),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+800,p+660,n+3,15,5,17,3],a,b,'backfill delete leaves stock unchanged');

  -- Delete payload totals are deliberately false; use original immutable data.
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',normal,'totalAmount',999999,'totalCost',0,'dealCount',999),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+150,p+120,n+2,20,0,20,0],a,b,'normal delete restores stock once');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',normal),'{"verification":"BW10-073-rollback-only"}'),
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',manual),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(base,a,b,'duplicate delete ignored and manual deletion compensated');

  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',late),'{"verification":"BW10-073-rollback-only"}');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (late,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',100,'isBackfill',FALSE,'items',jsonb_build_array(jsonb_build_object('productId',a,'quantity',1,'price',100))),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(base,a,b,'delete-before-original remains inactive');

  late := gen_random_uuid();
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (late,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',100,'isBackfill',FALSE,'items',jsonb_build_array(jsonb_build_object('productId',a,'quantity',1,'price',100))),'{"verification":"BW10-073-rollback-only"}'),
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',late),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(base,a,b,'original and tombstone in same batch cancel');

  late := gen_random_uuid();
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',late),'{"verification":"BW10-073-rollback-only"}'),
    (late,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',100,'isBackfill',FALSE,'items',jsonb_build_array(jsonb_build_object('productId',a,'quantity',1,'price',100))),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(base,a,b,'tombstone then original in same batch cancel');

  late := gen_random_uuid();
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (late,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',100,'isBackfill',FALSE,'items',jsonb_build_array(jsonb_build_object('productId',a,'quantity',1,'price',100))),'{"verification":"BW10-073-rollback-only"}');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',late),'{"verification":"BW10-073-rollback-only"}'),
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',late),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(base,a,b,'duplicate tombstones in one batch compensate once');

  UPDATE public.products SET unlimited_stock = TRUE WHERE id = b;
  late := gen_random_uuid();
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (late,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',100,'isBackfill',FALSE,'items',jsonb_build_array(jsonb_build_object('productId',b,'quantity',2,'price',50,'cost_at_time_of_sale',20))),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+100,p+60,n+1,20,0,20,2],a,b,'unlimited stock sales count only');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',late),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(base,a,b,'unlimited stock deletion leaves stock unchanged');

  late := gen_random_uuid();
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (late,'deal_closed',fixture.owner_id,fixture.id,'{"totalAmount":80,"items":[]}', '{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r+80,p+80,n+1,20,0,20,0],a,b,'quick receipt without items');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',late),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(base,a,b,'quick receipt deletion');

  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (legacy,'deal_closed',fixture.owner_id,fixture.id,jsonb_build_object('totalAmount',100,'items',jsonb_build_array(jsonb_build_object('productId',a,'quantity',1,'price',100))),'{"verification":"BW10-073-rollback-only"}');
  INSERT INTO public.events(id,type,actor_id,market_id,payload,metadata) VALUES
    (gen_random_uuid(),'deal_deleted',fixture.owner_id,fixture.id,jsonb_build_object('eventId',legacy),'{"verification":"BW10-073-rollback-only"}');
  PERFORM pg_temp.bw10_assert(ARRAY[r,p,n,19,0,20,0],a,b,'unknown legacy mode cannot increase stock');

  -- The market time patch and all non-deal branches must remain in place.
  IF position('NULLIF(BTRIM(v_updates->>''check_in_time''), '''')::TIME' IN pg_get_functiondef('public.update_market_read_model()'::regprocedure)) = 0
    OR has_function_privilege('anon','public.deal_projection_delta(uuid,uuid,text,jsonb)','EXECUTE')
    OR has_function_privilege('authenticated','public.deal_projection_delta(uuid,uuid,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Time patch or private helper boundary changed';
  END IF;
END;
$test$;
