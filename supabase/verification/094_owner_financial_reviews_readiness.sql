-- Read-only readiness checks. Does not read or modify business records.
DO $$
DECLARE signature text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.market_financial_reviews'::regclass AND relrowsecurity)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.market_financial_review_receipts'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'Financial review RLS missing'; END IF;
 IF has_table_privilege('authenticated','public.market_financial_reviews','SELECT,INSERT,UPDATE,DELETE')
  OR has_table_privilege('authenticated','public.market_financial_review_receipts','SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Financial review tables must be RPC-only'; END IF;
 FOREACH signature IN ARRAY ARRAY['public.financial_review_day(jsonb,timestamptz)','public.financial_review_number(jsonb)','public.financial_review_source(uuid)'] LOOP
  IF to_regprocedure(signature) IS NULL OR has_function_privilege('authenticated',signature,'EXECUTE') OR has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('service_role',signature,'EXECUTE') THEN RAISE EXCEPTION 'Private financial helper ACL: %',signature; END IF;
 END LOOP;
 FOREACH signature IN ARRAY ARRAY['public.read_market_financial_reviews(uuid[])','public.save_market_financial_review(uuid,text,text,numeric,jsonb,text,integer,uuid)'] LOOP
  IF to_regprocedure(signature) IS NULL OR NOT has_function_privilege('authenticated',signature,'EXECUTE') OR has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('service_role',signature,'EXECUTE') THEN RAISE EXCEPTION 'Financial RPC ACL: %',signature; END IF;
 END LOOP;
END; $$;
SELECT '094 owner financial reviews ready' AS result;
