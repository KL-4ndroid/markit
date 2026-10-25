-- Owner-confirmed private-journal followups and venue classification. Requires 074, 076, 078.
BEGIN;
CREATE TABLE IF NOT EXISTS public.owner_workflow_receipts (
  id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN('journal_tasks','venue_regions')),
  request JSONB NOT NULL, result JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.owner_workflow_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owner_workflow_receipts FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.apply_journal_checklist(
  p_request_id UUID,p_journal_id UUID,p_revision INTEGER,p_market_id UUID,p_texts JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor UUID:=auth.uid(); journal public.market_journals%ROWTYPE; target public.markets%ROWTYPE;
  receipt public.owner_workflow_receipts%ROWTYPE; request JSONB; result JSONB; line JSONB; text_value TEXT;
  keys TEXT[]:='{}'; existing TEXT[]; item_id UUID; saved public.events%ROWTYPE; added JSONB:='[]'; skipped INTEGER:=0; idx INTEGER:=0;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_journal_id IS NULL OR p_market_id IS NULL OR p_revision IS NULL OR p_revision<1
    OR jsonb_typeof(p_texts) IS DISTINCT FROM 'array' OR jsonb_array_length(p_texts) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'FOLLOWUP_INPUT' USING ERRCODE='22023'; END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(p_texts) LOOP
    text_value:=line#>>'{}';
    IF jsonb_typeof(line)<>'string' OR char_length(text_value) NOT BETWEEN 1 AND 200 OR text_value ~ E'[\\r\\n]'
      OR text_value !~ '[^[:space:]]' THEN RAISE EXCEPTION 'FOLLOWUP_INPUT' USING ERRCODE='22023'; END IF;
    text_value:=btrim(regexp_replace(text_value,E'[ \\t]+',' ','g'));
    IF text_value=ANY(keys) THEN RAISE EXCEPTION 'FOLLOWUP_INPUT' USING ERRCODE='22023'; END IF;
    keys:=array_append(keys,text_value);
  END LOOP;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::TEXT,81));
  SELECT * INTO journal FROM public.market_journals WHERE id=p_journal_id;
  IF NOT FOUND OR journal.owner_id<>actor OR journal.author_id<>actor OR journal.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  PERFORM id FROM public.markets WHERE id IN(journal.market_id,p_market_id) ORDER BY id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.markets WHERE id=journal.market_id AND owner_id=actor AND NOT COALESCE(is_deleted,FALSE)) THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  SELECT * INTO target FROM public.markets WHERE id=p_market_id AND owner_id=actor AND NOT COALESCE(is_deleted,FALSE);
  IF NOT FOUND OR target.id=journal.market_id THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  request:=jsonb_build_object('journalId',p_journal_id,'revision',p_revision,'marketId',p_market_id,'texts',p_texts);
  SELECT * INTO receipt FROM public.owner_workflow_receipts WHERE id=p_request_id;
  IF FOUND THEN
    IF receipt.owner_id<>actor OR receipt.kind<>'journal_tasks' OR receipt.request<>request THEN RAISE EXCEPTION 'FOLLOWUP_CONFLICT'; END IF;
    RETURN receipt.result;
  END IF;
  SELECT * INTO journal FROM public.market_journals WHERE id=p_journal_id FOR SHARE;
  IF NOT FOUND OR journal.owner_id<>actor OR journal.author_id<>actor OR journal.deleted_at IS NOT NULL OR journal.revision<>p_revision THEN RAISE EXCEPTION 'FOLLOWUP_CONFLICT'; END IF;
  IF target.end_date < (clock_timestamp() AT TIME ZONE 'Asia/Taipei')::DATE
    OR target.status IN('completed','cancelled','postponed')
    OR COALESCE(target.schedule_occurrence_state,'scheduled')<>'scheduled' THEN RAISE EXCEPTION 'FOLLOWUP_TARGET'; END IF;
  WITH checklist AS (
    SELECT * FROM public.events WHERE (market_id=p_market_id OR (market_id IS NULL AND COALESCE(payload->>'market_id',payload->>'marketId')=p_market_id::TEXT)) AND type IN('checklist_item_created','checklist_item_updated','checklist_item_deleted') AND payload->>'itemId' IS NOT NULL
  ), last_kind AS (
    SELECT DISTINCT ON(payload->>'itemId') payload->>'itemId' item_id,type FROM checklist ORDER BY payload->>'itemId',timestamp DESC,id DESC
  ), last_text AS (
    SELECT DISTINCT ON(payload->>'itemId') payload->>'itemId' item_id,payload->>'text' text FROM checklist WHERE jsonb_typeof(payload->'text')='string' ORDER BY payload->>'itemId',timestamp DESC,id DESC
  ) SELECT COALESCE(array_agg(btrim(regexp_replace(t.text,E'[ \\t\\r\\n]+',' ','g'))),'{}') INTO existing
    FROM last_kind k JOIN last_text t USING(item_id) WHERE k.type<>'checklist_item_deleted';
  FOREACH text_value IN ARRAY keys LOOP
    idx:=idx+1;
    IF text_value=ANY(existing) THEN skipped:=skipped+1; CONTINUE; END IF;
    item_id:=md5(p_request_id::TEXT||':item:'||idx)::UUID;
    -- Only confirmed task text enters shared events: no journal text, ID or body snapshot in metadata.
    INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp) VALUES(
      md5(p_request_id::TEXT||':event:'||idx)::UUID,'checklist_item_created',
      jsonb_build_object('market_id',p_market_id,'itemId',item_id,'text',text_value,'completed',FALSE),actor,p_market_id,clock_timestamp()
    ) RETURNING * INTO saved;
    added:=added||jsonb_build_array(to_jsonb(saved)); existing:=array_append(existing,text_value);
  END LOOP;
  result:=jsonb_build_object('appliedCount',jsonb_array_length(added),'skippedCount',skipped,'events',added);
  INSERT INTO public.owner_workflow_receipts(id,owner_id,kind,request,result) VALUES(p_request_id,actor,'journal_tasks',request,result);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_venue_region_change(p_venue_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor UUID:=auth.uid(); venue public.venues%ROWTYPE; schedules JSONB; markets JSONB;
  today DATE:=(now() AT TIME ZONE 'Asia/Taipei')::DATE;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  SELECT * INTO venue FROM public.venues WHERE id=p_venue_id AND owner_id=actor AND status='active' AND NOT COALESCE(is_deleted,FALSE);
  IF NOT FOUND THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'revision',revision,'status',status,'updatedAt',updated_at) ORDER BY id),'[]') INTO schedules
    FROM public.operation_schedules WHERE venue_id=p_venue_id AND owner_id=actor AND status IN('active','paused');
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'day',m.start_date,'regionCode',m.region_code,'updatedAt',m.updated_at,
    'eligible',m.status IN('registered','accepted','paid') AND NOT COALESCE(m.is_schedule_override,FALSE)
      AND COALESCE(m.schedule_occurrence_state,'scheduled')='scheduled'
      AND NOT EXISTS(SELECT 1 FROM public.events e WHERE (e.market_id=m.id OR (e.market_id IS NULL AND COALESCE(e.payload->>'market_id',e.payload->>'marketId')=m.id::TEXT)) AND e.type IN('market_started','market_ended','interaction_recorded','deal_closed','field_note_created','field_note_updated','field_note_deleted','checklist_item_created','checklist_item_updated','checklist_item_deleted'))
      AND NOT EXISTS(SELECT 1 FROM public.market_journals j WHERE j.market_id=m.id)
      AND NOT EXISTS(SELECT 1 FROM public.market_cash_records c WHERE c.market_id=m.id)
      AND COALESCE(m.total_revenue,0)=0 AND COALESCE(m.total_deals,0)=0 AND COALESCE(m.total_interactions,0)=0
    ) ORDER BY m.id),'[]') INTO markets FROM public.markets m
    WHERE m.owner_id=actor AND m.venue_id=p_venue_id AND m.session_origin='schedule'
      AND m.start_date>=today AND NOT COALESCE(m.is_deleted,FALSE)
      AND EXISTS(SELECT 1 FROM public.operation_schedules s WHERE s.id=m.schedule_id AND s.venue_id=p_venue_id AND s.owner_id=actor AND s.status IN('active','paused'));
  IF jsonb_array_length(markets)>250 OR jsonb_array_length(schedules)>100 THEN RAISE EXCEPTION 'FOLLOWUP_LIMIT'; END IF;
  RETURN jsonb_build_object('day',today,'venueId',venue.id,'name',venue.name,'regionCode',venue.region_code,'updatedAt',venue.updated_at,'schedules',schedules,'markets',markets);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_venue_region_change(p_request_id UUID,p_preview JSONB,p_region_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor UUID:=auth.uid(); v_venue_id UUID; current_preview JSONB; request JSONB; receipt public.owner_workflow_receipts%ROWTYPE;
  row JSONB; saved public.events%ROWTYPE; added JSONB:='[]'; updated_count INTEGER:=0; protected_count INTEGER:=0; result JSONB;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_preview) IS DISTINCT FROM 'object'
    OR NOT public.market_region_code_is_valid(p_region_code) THEN RAISE EXCEPTION 'FOLLOWUP_INPUT' USING ERRCODE='22023'; END IF;
  v_venue_id:=(p_preview->>'venueId')::UUID;
  PERFORM 1 FROM public.venues v WHERE v.id=v_venue_id AND v.owner_id=actor AND v.status='active' AND NOT COALESCE(v.is_deleted,FALSE) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FOLLOWUP_SCOPE' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::TEXT,81));
  request:=jsonb_build_object('preview',p_preview,'regionCode',p_region_code);
  SELECT * INTO receipt FROM public.owner_workflow_receipts WHERE id=p_request_id;
  IF FOUND THEN
    IF receipt.owner_id<>actor OR receipt.kind<>'venue_regions' OR receipt.request<>request THEN RAISE EXCEPTION 'FOLLOWUP_CONFLICT'; END IF;
    RETURN receipt.result;
  END IF;
  PERFORM s.id FROM public.operation_schedules s WHERE s.venue_id=v_venue_id AND s.owner_id=actor ORDER BY s.id FOR UPDATE;
  PERFORM m.id FROM public.markets m WHERE m.venue_id=v_venue_id AND m.owner_id=actor ORDER BY m.id FOR UPDATE;
  current_preview:=public.preview_venue_region_change(v_venue_id);
  IF current_preview IS DISTINCT FROM p_preview THEN RAISE EXCEPTION 'FOLLOWUP_CONFLICT'; END IF;
  IF (current_preview->>'regionCode') IS DISTINCT FROM p_region_code THEN
    INSERT INTO public.events(id,type,payload,actor_id,timestamp) VALUES(md5(p_request_id::TEXT||':venue')::UUID,'venue_updated',
      jsonb_build_object('venueId',v_venue_id,'updates',jsonb_build_object('regionCode',p_region_code)),actor,clock_timestamp()) RETURNING * INTO saved;
    added:=added||jsonb_build_array(to_jsonb(saved));
  END IF;
  FOR row IN SELECT value FROM jsonb_array_elements(current_preview->'markets') LOOP
    IF NOT (row->>'eligible')::BOOLEAN THEN protected_count:=protected_count+1; CONTINUE; END IF;
    IF (row->>'regionCode') IS NOT DISTINCT FROM p_region_code THEN CONTINUE; END IF;
    INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp) VALUES(md5(p_request_id::TEXT||':'||(row->>'id'))::UUID,'market_updated',
      jsonb_build_object('market_id',row->>'id','updates',jsonb_build_object('regionCode',p_region_code)),actor,(row->>'id')::UUID,clock_timestamp()) RETURNING * INTO saved;
    added:=added||jsonb_build_array(to_jsonb(saved)); updated_count:=updated_count+1;
  END LOOP;
  result:=jsonb_build_object('updatedCount',updated_count,'protectedCount',protected_count,'events',added);
  INSERT INTO public.owner_workflow_receipts(id,owner_id,kind,request,result) VALUES(p_request_id,actor,'venue_regions',request,result);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_journal_checklist(UUID,UUID,INTEGER,UUID,JSONB), public.preview_venue_region_change(UUID), public.apply_venue_region_change(UUID,JSONB,TEXT) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.apply_journal_checklist(UUID,UUID,INTEGER,UUID,JSONB), public.preview_venue_region_change(UUID), public.apply_venue_region_change(UUID,JSONB,TEXT) TO authenticated;
DO $$ DECLARE fn TEXT; BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.owner_workflow_receipts'::regclass)
    OR has_table_privilege('authenticated','public.owner_workflow_receipts','SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('anon','public.owner_workflow_receipts','SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Owner workflow receipt privileges unsafe'; END IF;
  FOREACH fn IN ARRAY ARRAY['public.apply_journal_checklist(UUID,UUID,INTEGER,UUID,JSONB)','public.preview_venue_region_change(UUID)','public.apply_venue_region_change(UUID,JSONB,TEXT)'] LOOP
    IF NOT has_function_privilege('authenticated',fn,'EXECUTE') OR has_function_privilege('anon',fn,'EXECUTE') OR has_function_privilege('service_role',fn,'EXECUTE') THEN RAISE EXCEPTION 'Owner workflow RPC privileges unsafe'; END IF;
  END LOOP;
END $$;
COMMIT;
