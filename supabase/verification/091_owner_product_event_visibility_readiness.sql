DO $verify$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='events'
  AND policyname='owner_product_metadata_events_read' AND cmd='SELECT'
  AND qual LIKE '%owner_id = auth.uid()%') THEN
  RAISE EXCEPTION 'Owner product event scope missing';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.events'::regclass
  AND tgfoid='public.enforce_event_actor_authorization()'::regprocedure AND tgenabled='O') THEN
  RAISE EXCEPTION 'Event authorization must remain enabled';
 END IF;
END;
$verify$;
