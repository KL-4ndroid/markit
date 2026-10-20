-- SRA-A1 Method A postcheck: catalog metadata only; no business rows.
-- Run only after a separately approved Method A Production execution.

BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

WITH expected(function_name, body_hash, trigger_schema, trigger_table, trigger_name) AS (
  VALUES
    ('auto_add_staff_to_new_market', 'bff498382d61382bdd440f9a8e5d2807', 'public', 'markets', 'trigger_auto_add_staff_to_new_market'),
    ('handle_new_user', '42281ca83183d1a5e88bc75865cae1b7', 'auth', 'users', 'on_auth_user_created'),
    ('update_market_read_model', '3132d6bc9c4707d667001d080011cb8a', 'public', 'events', 'trigger_update_market_read_model'),
    ('update_product_read_model', 'ef21f08fc762225ffe4d026209211250', 'public', 'events', 'trigger_update_product_read_model')
), inspected AS (
  SELECT
    expected.function_name,
    pg_get_userbyid(p.proowner) = 'postgres' AS owner_ok,
    p.prosecdef IS TRUE AS security_definer_ok,
    p.proconfig = ARRAY['search_path=pg_catalog, public'] AS search_path_ok,
    md5(p.prosrc) = expected.body_hash AS body_ok,
    NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      AND NOT pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') AS execute_acl_ok,
    (
      SELECT count(*) = 2
        AND count(*) FILTER (
          WHERE acl.privilege_type <> 'EXECUTE'
            OR acl.is_grantable
            OR acl.grantor <> to_regrole('postgres')
            OR acl.grantee NOT IN (to_regrole('postgres'), to_regrole('service_role'))
        ) = 0
      FROM pg_catalog.aclexplode(
        COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
      ) acl
    ) AS exact_acl_ok,
    (
      SELECT count(*) = 1
        AND count(*) FILTER (
          WHERE trigger_row.tgenabled = 'O'
            AND relation_schema.nspname = expected.trigger_schema
            AND relation.relname = expected.trigger_table
            AND trigger_row.tgname = expected.trigger_name
        ) = 1
      FROM pg_catalog.pg_trigger trigger_row
      JOIN pg_catalog.pg_class relation ON relation.oid = trigger_row.tgrelid
      JOIN pg_catalog.pg_namespace relation_schema ON relation_schema.oid = relation.relnamespace
      WHERE trigger_row.tgfoid = p.oid
        AND NOT trigger_row.tgisinternal
    ) AS trigger_ok
  FROM expected
  LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_catalog.pg_proc p
    ON p.pronamespace = n.oid
    AND p.proname = expected.function_name
    AND p.pronargs = 0
), summary AS (
  SELECT
    count(*) = 4
      AND bool_and(owner_ok)
      AND bool_and(security_definer_ok)
      AND bool_and(search_path_ok)
      AND bool_and(body_ok)
      AND bool_and(execute_acl_ok)
      AND bool_and(exact_acl_ok)
      AND bool_and(trigger_ok) AS all_ok,
    jsonb_agg(to_jsonb(inspected) ORDER BY function_name) AS functions
  FROM inspected
)
SELECT
  jsonb_build_object(
    'ok', summary.all_ok
      AND current_user = 'postgres'
      AND current_setting('transaction_read_only') = 'on'
      AND current_setting('server_version_num')::integer / 10000 = 17
      AND to_regclass('supabase_migrations.schema_migrations') IS NULL,
    'transactionReadOnly', current_setting('transaction_read_only'),
    'migrationLedgerPresent', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
    'functions', summary.functions
  ) AS sra_a1_method_a_postcheck,
  1 / CASE WHEN summary.all_ok
      AND current_user = 'postgres'
      AND current_setting('transaction_read_only') = 'on'
      AND current_setting('server_version_num')::integer / 10000 = 17
      AND to_regclass('supabase_migrations.schema_migrations') IS NULL
    THEN 1 ELSE 0 END AS assertion_guard
FROM summary;

ROLLBACK;
