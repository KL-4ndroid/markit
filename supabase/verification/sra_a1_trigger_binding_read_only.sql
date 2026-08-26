-- Authorized trigger metadata for the same four functions, no table rows.
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SELECT p.proname AS function_name,
  jsonb_build_object('name', t.tgname, 'enabled', t.tgenabled,
    'schema', rn.nspname, 'table', c.relname,
    'definition', pg_get_triggerdef(t.oid)) AS trigger_metadata
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_trigger t ON t.tgfoid = p.oid AND NOT t.tgisinternal
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace rn ON rn.oid = c.relnamespace
WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.pronargs = 0
  AND p.proname IN ('auto_add_staff_to_new_market', 'handle_new_user',
    'update_market_read_model', 'update_product_read_model')
ORDER BY p.proname, t.tgname;
ROLLBACK;
