-- 086: Shared event authorization, before every SECURITY DEFINER projection.
-- Does not replay events, rewrite accounts, or enroll subscription pilot users.
BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_event_actor_authorization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $body$
DECLARE
  actor UUID := auth.uid();
  target_market UUID;
  alias_market UUID;
  target_product UUID;
  alias_product UUID;
  target_owner UUID;
  market_owner UUID;
  staff_role TEXT;
  key TEXT;
  updates JSONB;
  source_event public.events%ROWTYPE;
  reference_id UUID;
  item JSONB;
BEGIN
  -- Trusted backend maintenance retains its existing authority. Ordinary
  -- SECURITY DEFINER RPC callers still have their real authenticated JWT role.
  IF auth.role() = 'service_role' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF actor IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'EVENT_AUTH_IDENTITY' USING ERRCODE='42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'EVENT_AUTH_IMMUTABLE' USING ERRCODE='42501';
  END IF;
  IF NEW.actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'EVENT_AUTH_ACTOR' USING ERRCODE='42501';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Sync acknowledgements may only change metadata and sync_status. Keep all
    -- domain fields, IDs, timestamps and future columns immutable after insert.
    IF OLD.actor_id IS DISTINCT FROM actor OR
       (to_jsonb(NEW) - 'metadata' - 'sync_status') IS DISTINCT FROM
       (to_jsonb(OLD) - 'metadata' - 'sync_status') THEN
      RAISE EXCEPTION 'EVENT_AUTH_IMMUTABLE' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'EVENT_AUTH_PAYLOAD' USING ERRCODE='22023';
  END IF;

  target_market := NEW.market_id;
  FOREACH key IN ARRAY ARRAY['market_id','marketId'] LOOP
    alias_market := NULLIF(NEW.payload->>key,'')::UUID;
    IF alias_market IS NOT NULL THEN
      IF target_market IS NOT NULL AND alias_market <> target_market THEN
        RAISE EXCEPTION 'EVENT_AUTH_MARKET_ALIAS' USING ERRCODE='42501';
      END IF;
      target_market := alias_market;
    END IF;
  END LOOP;
  IF target_market IS NOT NULL THEN
    SELECT owner_id INTO market_owner FROM public.markets WHERE id=target_market;
  END IF;

  IF NEW.type IN ('venue_created','venue_updated','venue_archived',
      'operation_schedule_created','operation_schedule_updated',
      'operation_schedule_paused','operation_schedule_resumed','operation_schedule_archived',
      'settings_updated') THEN
    IF NOT public.can_manage_recurring_operations() OR
       (target_market IS NOT NULL AND market_owner IS DISTINCT FROM actor) THEN
      RAISE EXCEPTION 'EVENT_AUTH_OWNER_ONLY' USING ERRCODE='42501';
    END IF;
    RETURN NEW; -- Recurring projections separately validate venue/schedule owner.
  END IF;

  IF NEW.type = 'market_created' THEN
    IF NOT public.can_manage_recurring_operations() OR NEW.market_id IS NULL OR
       (market_owner IS NOT NULL AND market_owner <> actor) THEN
      RAISE EXCEPTION 'EVENT_AUTH_OWNER_ONLY' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.type IN ('product_created','product_updated','product_deleted') THEN
    target_product := NULLIF(NEW.payload->>'productId','')::UUID;
    alias_product := NULLIF(NEW.payload->>'product_id','')::UUID;
    IF target_product IS NULL OR (alias_product IS NOT NULL AND alias_product <> target_product) THEN
      RAISE EXCEPTION 'EVENT_AUTH_PRODUCT_ALIAS' USING ERRCODE='42501';
    END IF;
    SELECT owner_id INTO target_owner FROM public.products WHERE id=target_product;
    IF NEW.type='product_created' THEN
      IF NOT public.can_manage_recurring_operations() OR
         (target_owner IS NOT NULL AND target_owner <> actor) OR
         (target_market IS NOT NULL AND market_owner IS DISTINCT FROM actor) THEN
        RAISE EXCEPTION 'EVENT_AUTH_OWNER_ONLY' USING ERRCODE='42501';
      END IF;
      RETURN NEW;
    END IF;
    IF target_owner IS NULL OR (target_market IS NOT NULL AND market_owner IS DISTINCT FROM target_owner) THEN
      RAISE EXCEPTION 'EVENT_AUTH_SCOPE' USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.type NOT IN ('market_updated','market_status_changed','market_started','market_ended','market_deleted',
       'deal_closed','deal_deleted','interaction_recorded','interaction_deleted',
       'field_note_created','field_note_updated','field_note_deleted',
       'checklist_item_created','checklist_item_updated','checklist_item_deleted') THEN
      RAISE EXCEPTION 'EVENT_AUTH_UNSUPPORTED' USING ERRCODE='42501';
    END IF;
    target_owner := market_owner;
    IF target_market IS NULL OR target_owner IS NULL THEN
      RAISE EXCEPTION 'EVENT_AUTH_SCOPE' USING ERRCODE='42501';
    END IF;
    -- These deployed projections use the envelope ID directly.
    IF NEW.type IN ('market_status_changed','market_started','market_ended',
       'deal_closed','deal_deleted','interaction_recorded') AND NEW.market_id IS NULL THEN
      RAISE EXCEPTION 'EVENT_AUTH_SCOPE' USING ERRCODE='42501';
    END IF;
  END IF;

  -- Validate product references even for owners; no cross-brand sale items.
  IF NEW.type='deal_closed' AND NEW.payload ? 'items' THEN
    IF jsonb_typeof(NEW.payload->'items') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'EVENT_AUTH_ITEMS' USING ERRCODE='22023';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.payload->'items') LOOP
      target_product := NULLIF(COALESCE(item->>'productId',item->>'product_id'),'')::UUID;
      alias_product := NULLIF(item->>'product_id','')::UUID;
      IF target_product IS NULL OR (alias_product IS NOT NULL AND alias_product<>target_product) OR
         NOT EXISTS(SELECT 1 FROM public.products WHERE id=target_product AND owner_id=target_owner) THEN
        RAISE EXCEPTION 'EVENT_AUTH_PRODUCT_SCOPE' USING ERRCODE='42501';
      END IF;
    END LOOP;
  END IF;

  IF NEW.type IN ('deal_deleted','interaction_deleted') THEN
    reference_id := NULLIF(COALESCE(NEW.payload->>'eventId',NEW.payload->>'event_id'),'')::UUID;
    IF reference_id IS NULL OR (NEW.payload ? 'event_id' AND
        NULLIF(NEW.payload->>'event_id','')::UUID IS DISTINCT FROM reference_id) THEN
      RAISE EXCEPTION 'EVENT_AUTH_REFERENCE' USING ERRCODE='42501';
    END IF;
    SELECT * INTO source_event FROM public.events WHERE id=reference_id;
    IF FOUND AND (source_event.market_id IS DISTINCT FROM target_market OR
        source_event.type IS DISTINCT FROM CASE NEW.type WHEN 'deal_deleted' THEN 'deal_closed' ELSE 'interaction_recorded' END) THEN
      RAISE EXCEPTION 'EVENT_AUTH_REFERENCE' USING ERRCODE='42501';
    END IF;
  END IF;

  IF target_owner=actor THEN RETURN NEW; END IF;
  SELECT role INTO staff_role FROM public.staff_relationships
    WHERE owner_id=target_owner AND staff_id=actor AND status='active' FOR SHARE;
  IF staff_role IS NULL OR staff_role NOT IN ('operator','manager') OR
     NOT public.has_authoritative_team_entitlement(target_owner) THEN
    RAISE EXCEPTION 'EVENT_AUTH_ROLE' USING ERRCODE='42501';
  END IF;

  CASE NEW.type
    WHEN 'deal_closed' THEN NULL;
    WHEN 'interaction_recorded' THEN
      IF 'field_note'=ANY(ARRAY[NEW.payload->>'type',NEW.payload->>'interactionType',NEW.payload->>'interaction_type']) AND staff_role<>'manager' THEN
        RAISE EXCEPTION 'EVENT_AUTH_ROLE' USING ERRCODE='42501';
      END IF;
    WHEN 'deal_deleted','interaction_deleted' THEN
      IF source_event.id IS NULL OR source_event.actor_id IS DISTINCT FROM actor OR
         (staff_role<>'manager' AND 'field_note'=ANY(ARRAY[source_event.payload->>'type',source_event.payload->>'interactionType',source_event.payload->>'interaction_type'])) OR
         (source_event.timestamp AT TIME ZONE 'Asia/Taipei')::DATE IS DISTINCT FROM (now() AT TIME ZONE 'Asia/Taipei')::DATE OR
         (source_event.created_at AT TIME ZONE 'Asia/Taipei')::DATE IS DISTINCT FROM (now() AT TIME ZONE 'Asia/Taipei')::DATE THEN
        RAISE EXCEPTION 'EVENT_AUTH_OWN_TODAY' USING ERRCODE='42501';
      END IF;
    WHEN 'market_updated','product_updated' THEN
      updates := NEW.payload->'updates';
      IF staff_role<>'manager' OR jsonb_typeof(updates) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'EVENT_AUTH_ROLE' USING ERRCODE='42501';
      END IF;
      FOR key IN SELECT jsonb_object_keys(updates) LOOP
        IF (NEW.type='market_updated' AND key NOT IN ('dates','startDate','endDate','start_date','end_date',
            'earlyEntryEnabled','early_entry_enabled','earlyEntryTime','early_entry_time',
            'checkInTime','check_in_time','operatingStartTime','operating_start_time',
            'operatingEndTime','operating_end_time','notes')) OR
           (NEW.type='product_updated' AND key NOT IN ('price','stock','unlimitedStock','unlimited_stock','description','isActive','is_active')) THEN
          RAISE EXCEPTION 'EVENT_AUTH_FIELD' USING ERRCODE='42501';
        END IF;
      END LOOP;
    WHEN 'checklist_item_updated' THEN
      IF staff_role='operator' AND (jsonb_typeof(NEW.payload->'completed') IS DISTINCT FROM 'boolean' OR
          (NEW.payload - ARRAY['market_id','marketId','itemId','completed']) <> '{}'::JSONB) THEN
        RAISE EXCEPTION 'EVENT_AUTH_FIELD' USING ERRCODE='42501';
      END IF;
    WHEN 'checklist_item_created','checklist_item_deleted','field_note_created','field_note_updated','field_note_deleted' THEN
      IF staff_role<>'manager' THEN RAISE EXCEPTION 'EVENT_AUTH_ROLE' USING ERRCODE='42501'; END IF;
    ELSE RAISE EXCEPTION 'EVENT_AUTH_OWNER_ONLY' USING ERRCODE='42501';
  END CASE;
  RETURN NEW;
END;
$body$;

REVOKE ALL ON FUNCTION public.enforce_event_actor_authorization() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER a00_event_actor_authorization
BEFORE INSERT OR UPDATE OR DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.enforce_event_actor_authorization();

COMMENT ON FUNCTION public.enforce_event_actor_authorization() IS
'086: authoritative actor, brand, role, field and reference checks before event projections; no privilege grants or history rewrite.';
COMMIT;
