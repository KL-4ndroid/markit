-- Read-only baseline for the specifically named BW-10 disposable fixture.
WITH rows AS (
  SELECT 'market' AS kind, to_jsonb(m) AS value FROM public.markets m WHERE id = 'f69d8d90-667c-4af0-ad00-4c52e60aafa8'
  UNION ALL SELECT 'event', to_jsonb(e) FROM public.events e WHERE market_id = 'f69d8d90-667c-4af0-ad00-4c52e60aafa8'
  UNION ALL SELECT 'product', to_jsonb(p) FROM public.products p WHERE id = 'ffbdbf76-0b85-4206-8519-a81d09bce12c'
)
SELECT jsonb_build_object(
  'data', (SELECT md5(string_agg(value::TEXT, '' ORDER BY kind, value::TEXT)) FROM rows),
  'market', md5(pg_get_functiondef('public.update_market_read_model()'::regprocedure)),
  'product', md5(pg_get_functiondef('public.update_product_read_model()'::regprocedure)),
  'helpers', (SELECT md5(COALESCE(string_agg(pg_get_functiondef(p.oid), '' ORDER BY p.proname),''))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    AND p.proname IN ('deal_projection_number','deal_projection_totals','deal_projection_delta'))
) AS baseline;
