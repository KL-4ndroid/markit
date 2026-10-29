-- Read-only: exact deployed no-op entry guards, with original role checks intact.
DO $check$
DECLARE signature text; definition text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.save_market_cash_record(uuid,date,jsonb,integer,uuid)',
  'public.save_market_cash_record_v2(uuid,date,jsonb,integer,uuid)'] LOOP
  definition:=pg_get_functiondef(signature::regprocedure);
  IF position('FERIA_CASH_SAVE_READ_TIER_V1' IN definition)=0
   OR position('subscription_read_owner_paid(auth.uid())' IN definition)=0
   OR NOT has_function_privilege('authenticated',signature,'EXECUTE') THEN
   RAISE EXCEPTION 'Cash save retention guard missing: %',signature;
  END IF;
 END LOOP;
END;
$check$;
