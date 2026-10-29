-- No-op retries return a retained cash row before row-write triggers run.
-- Check current read access at entry, preserving valid paid retries and all ACLs.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $patch$
DECLARE signature text; definition text;
BEGIN
 IF to_regprocedure('public.subscription_read_owner_paid(uuid)') IS NULL THEN RAISE EXCEPTION '092 required'; END IF;
 FOREACH signature IN ARRAY ARRAY['public.save_market_cash_record(uuid,date,jsonb,integer,uuid)',
  'public.save_market_cash_record_v2(uuid,date,jsonb,integer,uuid)'] LOOP
  IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'Missing deployed cash RPC: %',signature; END IF;
  definition:=pg_get_functiondef(signature::regprocedure);
  IF position('FERIA_CASH_SAVE_READ_TIER_V1' IN definition)=0 THEN
   IF position('BEGIN' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected cash RPC shape: %',signature; END IF;
   definition:=regexp_replace(definition,'BEGIN',E'BEGIN\n -- FERIA_CASH_SAVE_READ_TIER_V1\n IF NOT public.subscription_read_owner_paid(auth.uid()) THEN RAISE EXCEPTION ''SUBSCRIPTION_READ_REQUIRED'' USING ERRCODE=''42501''; END IF;');
   EXECUTE definition;
  END IF;
 END LOOP;
END;
$patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
