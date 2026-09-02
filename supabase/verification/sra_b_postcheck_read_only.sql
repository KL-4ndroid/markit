-- SRA-B same-target read-only postcheck. Metadata only; terminal rollback.

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
    current_setting('transaction_read_only') = 'on' AS read_only_ok,
    to_regclass('supabase_migrations.schema_migrations') IS NULL AS ledger_ok,
    (SELECT count(*) FROM policy_baseline WHERE table_name = 'markets') = 0 AS markets_ok,
    (SELECT count(*) FROM policy_baseline WHERE table_name = 'products') = 1 AS products_count_ok,
    NOT EXISTS (
      SELECT 1 FROM policy_baseline WHERE check_expression = 'true'
    ) AS no_always_true_ok,
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
    'ok', read_only_ok AND ledger_ok AND markets_ok AND products_count_ok
      AND no_always_true_ok AND product_owner_policy_ok,
    'transactionReadOnly', current_setting('transaction_read_only'),
    'migrationLedgerPresent', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
    'marketInsertPolicyCount', (SELECT count(*) FROM policy_baseline WHERE table_name = 'markets'),
    'productInsertPolicyCount', (SELECT count(*) FROM policy_baseline WHERE table_name = 'products'),
    'alwaysTrueInsertPolicyCount', (SELECT count(*) FROM policy_baseline WHERE check_expression = 'true'),
    'ownerProductPolicyExact', product_owner_policy_ok
  ) AS result,
  1 / (
    read_only_ok AND ledger_ok AND markets_ok AND products_count_ok
      AND no_always_true_ok AND product_owner_policy_ok
  )::integer AS assertion_guard
FROM summary;

ROLLBACK;
