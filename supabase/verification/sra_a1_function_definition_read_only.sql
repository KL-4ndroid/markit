-- Authorized four-function metadata only; raw definitions remain private.
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.pronargs = 0
  AND p.proname IN ('auto_add_staff_to_new_market', 'handle_new_user',
    'update_market_read_model', 'update_product_read_model')
ORDER BY p.proname;
ROLLBACK;
