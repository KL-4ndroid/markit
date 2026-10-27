-- Read-only diagnostic for a paid test owner rejected after migration 083.
-- Returns function definitions only: no owner rows, credentials or photo files.
BEGIN TRANSACTION READ ONLY;
SELECT p.proname AS function_name,
       p.oid::regprocedure::text AS signature,
       pg_get_function_result(p.oid) AS returns_type,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('claim_product_cover_photo_upload','finalize_product_cover_photo_upload')
  AND NOT ('p_require_entitlement'=ANY(COALESCE(p.proargnames,ARRAY[]::text[])))
ORDER BY p.proname;
COMMIT;
