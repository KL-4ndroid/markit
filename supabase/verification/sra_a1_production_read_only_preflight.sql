-- SRA-A1 authorized Production metadata-only preflight.
-- Match the SRA-000 project fingerprint before execution.
-- No application rows, auth users, migration statements, credentials, or writes.
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

WITH targets AS (
  SELECT p.oid, p.proname, p.pronargs, p.prorettype, p.proowner,
    p.prosecdef, p.proconfig, p.proacl, p.prosrc
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND p.proname IN ('auto_add_staff_to_new_market', 'handle_new_user',
      'update_market_read_model', 'update_product_read_model')
), rows AS (
  SELECT 'environment' AS section, 'metadata' AS identity,
    jsonb_build_object(
      'server_version_num', current_setting('server_version_num'),
      'transaction_read_only', current_setting('transaction_read_only'),
      'migration_ledger_present', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
      'function_count', (SELECT count(*) FROM targets)
    ) AS details
  UNION ALL
  SELECT 'function', t.proname,
    jsonb_build_object(
      'arguments', pg_get_function_identity_arguments(t.oid),
      'return_type', format_type(t.prorettype, NULL),
      'owner', pg_get_userbyid(t.proowner), 'security_definer', t.prosecdef,
      'config', t.proconfig, 'acl', t.proacl,
      'definition_md5', md5(pg_get_functiondef(t.oid)), 'body_md5', md5(t.prosrc),
      'anon_execute', has_function_privilege('anon', t.oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', t.oid, 'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role', t.oid, 'EXECUTE')
    )
  FROM targets t
  UNION ALL
  SELECT 'trigger', t.proname || ':' || tr.tgname,
    jsonb_build_object('schema', n.nspname, 'table', c.relname,
      'enabled', tr.tgenabled, 'definition_md5', md5(pg_get_triggerdef(tr.oid)))
  FROM targets t
  JOIN pg_catalog.pg_trigger tr ON tr.tgfoid = t.oid AND NOT tr.tgisinternal
  JOIN pg_catalog.pg_class c ON c.oid = tr.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  UNION ALL
  SELECT 'migration_column', a.attname,
    jsonb_build_object('type', format_type(a.atttypid, a.atttypmod))
  FROM pg_catalog.pg_attribute a
  WHERE a.attrelid = to_regclass('supabase_migrations.schema_migrations')
    AND a.attnum > 0 AND NOT a.attisdropped
)
SELECT section, identity, details FROM rows ORDER BY section, identity;
ROLLBACK;
