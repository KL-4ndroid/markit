-- Owner-confirmed, atomic metadata-only backfill. Requires 074. No history guesses.
BEGIN;
CREATE OR REPLACE FUNCTION public.backfill_market_regions(p_batch_id UUID,p_items JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor UUID:=auth.uid(); item JSONB; target public.markets%ROWTYPE; event_id UUID;
  body JSONB; saved public.events%ROWTYPE; matched INTEGER:=0; ids UUID[]; result JSONB;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION 'REGION_SCOPE' USING ERRCODE='42501'; END IF;
  IF p_batch_id IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'REGION_INPUT' USING ERRCODE='22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(item)<>'object' OR item-'id'-'regionCode'-'expectedUpdatedAt'<>'{}'::JSONB
      OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item->'regionCode') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item->'expectedUpdatedAt') IS DISTINCT FROM 'string'
      OR NOT public.market_region_code_is_valid(item->>'regionCode') THEN RAISE EXCEPTION 'REGION_INPUT' USING ERRCODE='22023'; END IF;
    ids:=array_append(ids,(item->>'id')::UUID);
    PERFORM (item->>'expectedUpdatedAt')::TIMESTAMPTZ;
  END LOOP;
  IF cardinality(ids)<>(SELECT count(DISTINCT id) FROM unnest(ids) id) THEN RAISE EXCEPTION 'REGION_INPUT' USING ERRCODE='22023'; END IF;
  -- Same lock order across batches. Ordinary event projection takes these market locks too.
  PERFORM id FROM public.markets WHERE id=ANY(ids) ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.markets WHERE id=ANY(ids) AND owner_id=actor AND NOT COALESCE(is_deleted,FALSE))<>cardinality(ids) THEN RAISE EXCEPTION 'REGION_SCOPE' USING ERRCODE='42501'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO target FROM public.markets WHERE id=(item->>'id')::UUID;
    event_id:=md5(p_batch_id::TEXT||':'||target.id::TEXT)::UUID;
    body:=jsonb_build_object('market_id',target.id,'updates',jsonb_build_object('regionCode',item->>'regionCode'),
      'regionBackfill',jsonb_build_object('batchId',p_batch_id,'previousRegionCode',NULL,'expectedUpdatedAt',item->>'expectedUpdatedAt'));
    -- A single scheduled occurrence becomes an override, never a Venue/default rewrite.
    IF target.session_origin='schedule' THEN body:=jsonb_set(body,'{updates,isScheduleOverride}','true'::JSONB); END IF;
    SELECT * INTO saved FROM public.events WHERE id=event_id;
    IF FOUND THEN
      IF saved.actor_id IS DISTINCT FROM actor OR saved.type<>'market_updated' OR saved.market_id IS DISTINCT FROM target.id OR saved.payload IS DISTINCT FROM body THEN RAISE EXCEPTION 'REGION_BATCH_CONFLICT'; END IF;
      matched:=matched+1;
    ELSIF target.region_code IS NOT NULL OR target.updated_at IS DISTINCT FROM (item->>'expectedUpdatedAt')::TIMESTAMPTZ THEN RAISE EXCEPTION 'REGION_CONFLICT'; END IF;
  END LOOP;
  IF matched NOT IN(0,cardinality(ids)) THEN RAISE EXCEPTION 'REGION_BATCH_CONFLICT'; END IF;
  IF matched=0 THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'id' LOOP
      SELECT * INTO target FROM public.markets WHERE id=(item->>'id')::UUID;
      event_id:=md5(p_batch_id::TEXT||':'||target.id::TEXT)::UUID;
      body:=jsonb_build_object('market_id',target.id,'updates',jsonb_build_object('regionCode',item->>'regionCode'),
        'regionBackfill',jsonb_build_object('batchId',p_batch_id,'previousRegionCode',NULL,'expectedUpdatedAt',item->>'expectedUpdatedAt'));
      IF target.session_origin='schedule' THEN body:=jsonb_set(body,'{updates,isScheduleOverride}','true'::JSONB); END IF;
      INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp) VALUES(event_id,'market_updated',body,actor,target.id,clock_timestamp());
    END LOOP;
  END IF;
  SELECT jsonb_agg(jsonb_build_object('id',id,'ownerId',owner_id,'regionCode',region_code,'updatedAt',updated_at,'isScheduleOverride',is_schedule_override) ORDER BY id)
    INTO result FROM public.markets WHERE id=ANY(ids) AND owner_id=actor;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.backfill_market_regions(UUID,JSONB) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.backfill_market_regions(UUID,JSONB) TO authenticated;
DO $$ BEGIN
  IF has_function_privilege('anon','public.backfill_market_regions(UUID,JSONB)','EXECUTE')
    OR has_function_privilege('authenticated','public.project_market_region_event()','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.backfill_market_regions(UUID,JSONB)','EXECUTE') THEN RAISE EXCEPTION 'Region backfill grants unsafe'; END IF;
END $$;
COMMIT;
