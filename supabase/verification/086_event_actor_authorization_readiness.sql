-- Read-only deployment structure/ACL verification; never inserts an event.
DO $verify$
DECLARE definition TEXT;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.events'::regclass
      AND tgname='a00_event_actor_authorization' AND tgenabled='O' AND tgtype=31
      AND tgfoid='public.enforce_event_actor_authorization()'::regprocedure) THEN
    RAISE EXCEPTION '086 event authorization trigger missing or disabled';
  END IF;
  IF has_function_privilege('anon','public.enforce_event_actor_authorization()','EXECUTE') OR
     has_function_privilege('authenticated','public.enforce_event_actor_authorization()','EXECUTE') THEN
    RAISE EXCEPTION '086 trigger function must not be client-callable';
  END IF;
  SELECT pg_get_functiondef('public.enforce_event_actor_authorization()'::regprocedure) INTO definition;
  IF position('EVENT_AUTH_MARKET_ALIAS' IN definition)=0 OR
     position('EVENT_AUTH_PRODUCT_SCOPE' IN definition)=0 OR
     position('EVENT_AUTH_OWN_TODAY' IN definition)=0 THEN
    RAISE EXCEPTION '086 authorization definition incomplete';
  END IF;
END;
$verify$;
