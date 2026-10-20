-- SRA-B exact-target read-only preflight. Metadata only; terminal rollback.

BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

WITH policy_baseline AS (
  SELECT
    policy.polrelid,
    table_name.relname AS table_name,
    policy.polname,
    policy.polcmd,
    policy.polpermissive,
    policy.polroles,
    pg_get_expr(policy.polqual, policy.polrelid, true) AS using_expression,
    pg_get_expr(policy.polwithcheck, policy.polrelid, true) AS check_expression
  FROM pg_catalog.pg_policy policy
  JOIN pg_catalog.pg_class table_name ON table_name.oid = policy.polrelid
  JOIN pg_catalog.pg_namespace namespace_name ON namespace_name.oid = table_name.relnamespace
  WHERE namespace_name.nspname = 'public'
    AND table_name.relname IN ('markets', 'products')
    AND policy.polcmd = 'a'
),
summary AS (
  SELECT
    current_setting('server_version_num')::integer / 10000 = 17 AS server_ok,
    current_setting('transaction_read_only') = 'on' AS read_only_ok,
    to_regclass('supabase_migrations.schema_migrations') IS NULL AS ledger_ok,
    (SELECT count(*) FROM policy_baseline) = 4 AS count_ok,
    EXISTS (
      SELECT 1 FROM policy_baseline
      WHERE table_name = 'markets'
        AND polname = 'authenticated_can_insert_markets'
        AND polcmd = 'a' AND polpermissive
        AND polroles = ARRAY[(SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')]
        AND using_expression IS NULL AND check_expression = 'true'
    ) AS market_policy_one_ok,
    EXISTS (
      SELECT 1 FROM policy_baseline
      WHERE table_name = 'markets'
        AND polname = '允許 authenticated 插入市集'
        AND polcmd = 'a' AND polpermissive
        AND polroles = ARRAY[(SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')]
        AND using_expression IS NULL AND check_expression = 'true'
    ) AS market_policy_two_ok,
    EXISTS (
      SELECT 1 FROM policy_baseline
      WHERE table_name = 'products'
        AND polname = '允許 authenticated 插入商品'
        AND polcmd = 'a' AND polpermissive
        AND polroles = ARRAY[(SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')]
        AND using_expression IS NULL AND check_expression = 'true'
    ) AS product_unsafe_policy_ok,
    EXISTS (
      SELECT 1 FROM policy_baseline
      WHERE table_name = 'products'
        AND polname = 'Users can insert own products'
        AND polcmd = 'a' AND polpermissive
        AND polroles = ARRAY[0::oid]
        AND using_expression IS NULL AND check_expression = 'owner_id = auth.uid()'
    ) AS product_owner_policy_ok
)
SELECT
  jsonb_build_object(
    'ok', server_ok AND read_only_ok AND ledger_ok AND count_ok
      AND market_policy_one_ok AND market_policy_two_ok
      AND product_unsafe_policy_ok AND product_owner_policy_ok,
    'serverMajor', current_setting('server_version_num')::integer / 10000,
    'transactionReadOnly', current_setting('transaction_read_only'),
    'migrationLedgerPresent', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
    'insertPolicyCount', (SELECT count(*) FROM policy_baseline),
    'exactBaselineMatched', count_ok AND market_policy_one_ok AND market_policy_two_ok
      AND product_unsafe_policy_ok AND product_owner_policy_ok
  ) AS result,
  1 / (
    server_ok AND read_only_ok AND ledger_ok AND count_ok
      AND market_policy_one_ok AND market_policy_two_ok
      AND product_unsafe_policy_ok AND product_owner_policy_ok
  )::integer AS assertion_guard
FROM summary;

ROLLBACK;
