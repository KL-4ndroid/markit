-- Read-only verification for migration 067.
-- Run with an administrative SQL session after the migration is applied.

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

WITH expected_tables(table_name) AS (
  VALUES
    ('billing_customer_links'),
    ('billing_subscriptions'),
    ('billing_transactions'),
    ('billing_event_inbox'),
    ('billing_reconciliation_runs')
),
expected_columns(table_name, column_name) AS (
  VALUES
    ('billing_customer_links', 'owner_id'),
    ('billing_customer_links', 'provider_customer_ref'),
    ('billing_subscriptions', 'billing_customer_link_id'),
    ('billing_subscriptions', 'provider_subscription_ref'),
    ('billing_subscriptions', 'normalized_billing_status'),
    ('billing_subscriptions', 'snapshot_hash'),
    ('billing_transactions', 'provider_transaction_ref'),
    ('billing_transactions', 'transaction_kind'),
    ('billing_transactions', 'amount_minor'),
    ('billing_event_inbox', 'provider_event_ref'),
    ('billing_event_inbox', 'payload_hash'),
    ('billing_event_inbox', 'processing_status'),
    ('billing_event_inbox', 'raw_payload_ciphertext_ref'),
    ('billing_reconciliation_runs', 'trigger_event_inbox_id'),
    ('billing_reconciliation_runs', 'decision_code'),
    ('billing_reconciliation_runs', 'safe_error_code')
),
checks AS (
  SELECT
    'tables_exist'::TEXT AS check_name,
    NOT EXISTS (
      SELECT 1
      FROM expected_tables AS expected
      WHERE pg_catalog.to_regclass('public.' || expected.table_name) IS NULL
    ) AS passed,
    'five F3B private ledger tables'::TEXT AS detail

  UNION ALL

  SELECT
    'required_columns_exist',
    NOT EXISTS (
      SELECT 1
      FROM expected_columns AS expected
      LEFT JOIN information_schema.columns AS actual
        ON actual.table_schema = 'public'
        AND actual.table_name = expected.table_name
        AND actual.column_name = expected.column_name
      WHERE actual.column_name IS NULL
    ),
    'bounded customer, subscription, transaction, event, and reconciliation columns'

  UNION ALL

  SELECT
    'ledger_starts_empty',
    NOT EXISTS (SELECT 1 FROM public.billing_customer_links)
      AND NOT EXISTS (SELECT 1 FROM public.billing_subscriptions)
      AND NOT EXISTS (SELECT 1 FROM public.billing_transactions)
      AND NOT EXISTS (SELECT 1 FROM public.billing_event_inbox)
      AND NOT EXISTS (SELECT 1 FROM public.billing_reconciliation_runs),
    'migration 067 seeds no billing identity, money, event, or reconciliation data'

  UNION ALL

  SELECT
    'rls_enabled',
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      JOIN expected_tables AS expected ON expected.table_name = c.relname
      WHERE n.nspname = 'public'
        AND NOT c.relrowsecurity
    ),
    'RLS enabled on every F3B table'

  UNION ALL

  SELECT
    'no_direct_table_privileges',
    NOT EXISTS (
      SELECT 1
      FROM information_schema.table_privileges AS privilege
      JOIN expected_tables AS expected ON expected.table_name = privilege.table_name
      WHERE privilege.table_schema = 'public'
        AND privilege.grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
    ),
    'no direct PUBLIC/anon/authenticated/service_role table grant'

  UNION ALL

  SELECT
    'no_rls_policies',
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies AS policy
      JOIN expected_tables AS expected ON expected.table_name = policy.tablename
      WHERE policy.schemaname = 'public'
    ),
    'no direct row policy was added'

  UNION ALL

  SELECT
    'guard_functions_private',
    NOT EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE specific_schema = 'public'
        AND routine_name IN (
          'reject_billing_customer_link_mutation',
          'enforce_billing_subscription_snapshot_write',
          'prevent_f3b_billing_ledger_delete',
          'enforce_billing_transaction_write',
          'enforce_billing_event_inbox_write',
          'enforce_billing_reconciliation_run_write'
        )
        AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
    ),
    'trigger functions have no direct execute grant'

  UNION ALL

  SELECT
    'guard_functions_not_security_definer',
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS procedure
      JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = procedure.pronamespace
      WHERE namespace.nspname = 'public'
        AND procedure.proname IN (
          'reject_billing_customer_link_mutation',
          'enforce_billing_subscription_snapshot_write',
          'prevent_f3b_billing_ledger_delete',
          'enforce_billing_transaction_write',
          'enforce_billing_event_inbox_write',
          'enforce_billing_reconciliation_run_write'
        )
        AND procedure.prosecdef
    ),
    'F3B adds no SECURITY DEFINER writer'

  UNION ALL

  SELECT
    'required_triggers_exist',
    (
      SELECT pg_catalog.count(*) = 8
      FROM pg_catalog.pg_trigger AS trigger
      JOIN pg_catalog.pg_class AS relation ON relation.oid = trigger.tgrelid
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND NOT trigger.tgisinternal
        AND trigger.tgname IN (
          'reject_billing_customer_link_mutation',
          'enforce_billing_subscription_snapshot_write',
          'prevent_billing_subscription_delete',
          'enforce_billing_transaction_write',
          'enforce_billing_event_inbox_write',
          'prevent_billing_event_inbox_delete',
          'enforce_billing_reconciliation_run_write',
          'prevent_billing_reconciliation_run_delete'
        )
    ),
    'identity, append-only, transition, and delete guards installed'

  UNION ALL

  SELECT
    'foreign_keys_restrict_delete',
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint AS constraint_row
      JOIN pg_catalog.pg_class AS relation ON relation.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      JOIN expected_tables AS expected ON expected.table_name = relation.relname
      WHERE namespace.nspname = 'public'
        AND constraint_row.contype = 'f'
        AND constraint_row.confdeltype <> 'r'
    ),
    'all F3B references use ON DELETE RESTRICT'

  UNION ALL

  SELECT
    'provider_identity_uniqueness_exists',
    (
      SELECT pg_catalog.count(*) = 5
      FROM pg_catalog.pg_constraint AS constraint_row
      JOIN pg_catalog.pg_class AS relation ON relation.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND constraint_row.contype = 'u'
        AND constraint_row.conname IN (
          'billing_customer_links_owner_origin_environment_key',
          'billing_customer_links_provider_identity_key',
          'billing_subscriptions_provider_identity_key',
          'billing_transactions_provider_kind_key',
          'billing_event_inbox_provider_event_key'
        )
    ),
    'owner and provider identities have bounded idempotency keys'

  UNION ALL

  SELECT
    'subscription_projection_unchanged',
    NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'subscription_accounts'
        AND column_name IN (
          'provider_customer_ref',
          'provider_subscription_ref',
          'provider_transaction_ref',
          'assigned_amount_minor',
          'raw_payload'
        )
    ),
    'migration 067 does not expand the entitlement projection'
)
SELECT check_name, passed, detail
FROM checks
ORDER BY check_name;

ROLLBACK;
