-- Read-only. No test data writes.
DO $verify$
DECLARE v_definition text;
BEGIN
  v_definition := pg_get_functiondef('public.update_product_read_model()'::regprocedure);
  IF position('FERIA_PRODUCT_DESCRIPTION_V1' IN v_definition) = 0
     OR position('FERIA_PRODUCT_STOCK_MODE_V1' IN v_definition) = 0 THEN
    RAISE EXCEPTION '089 description or existing 084 stock-mode projection is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.events'::regclass
      AND tgfoid = 'public.enforce_event_actor_authorization()'::regprocedure AND tgenabled = 'O') THEN
    RAISE EXCEPTION 'Existing event authorization trigger must remain enabled';
  END IF;
END;
$verify$;
