-- Read-only verification for migration 066.
-- Run with an administrative SQL session after the migration is applied.

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

WITH expected_catalog (
  id,
  plan_code,
  cadence,
  currency,
  amount_minor,
  price_policy,
  offer_code,
  commercial_status,
  effective_at,
  retired_at
) AS (
  VALUES
    ('pro_monthly_twd_launch_v1', 'pro', 'monthly', 'TWD', 199::BIGINT, 'standard', NULL::TEXT, 'candidate', NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ),
    ('pro_annual_twd_launch_v1', 'pro', 'annual', 'TWD', 1990::BIGINT, 'standard', NULL::TEXT, 'candidate', NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ),
    ('pro_founder_annual_twd_launch_v1', 'pro', 'annual', 'TWD', 1290::BIGINT, 'founder_locked', 'pro_founder_annual_65', 'candidate', NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ),
    ('team_monthly_twd_launch_v1', 'team', 'monthly', 'TWD', 499::BIGINT, 'standard', NULL::TEXT, 'candidate', NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ),
    ('team_annual_twd_launch_v1', 'team', 'annual', 'TWD', 4990::BIGINT, 'standard', NULL::TEXT, 'candidate', NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ)
),
catalog_diff AS (
  (
    SELECT * FROM expected_catalog
    EXCEPT
    SELECT
      id,
      plan_code,
      cadence,
      currency,
      amount_minor,
      price_policy,
      offer_code,
      commercial_status,
      effective_at,
      retired_at
    FROM public.subscription_price_versions
  )
  UNION ALL
  (
    SELECT
      id,
      plan_code,
      cadence,
      currency,
      amount_minor,
      price_policy,
      offer_code,
      commercial_status,
      effective_at,
      retired_at
    FROM public.subscription_price_versions
    EXCEPT
    SELECT * FROM expected_catalog
  )
),
checks AS (
  SELECT
    'tables_exist'::TEXT AS check_name,
    pg_catalog.to_regclass('public.subscription_price_versions') IS NOT NULL
      AND pg_catalog.to_regclass('public.billing_storefront_price_mappings') IS NOT NULL
      AND pg_catalog.to_regclass('public.subscription_price_assignments') IS NOT NULL AS passed,
    'three F3A tables'::TEXT AS detail

  UNION ALL

  SELECT
    'candidate_catalog_exact',
    NOT EXISTS (SELECT 1 FROM catalog_diff),
    'five exact candidate prices and no active price'

  UNION ALL

  SELECT
    'no_active_catalog',
    NOT EXISTS (
      SELECT 1
      FROM public.subscription_price_versions
      WHERE commercial_status <> 'candidate'
        OR effective_at IS NOT NULL
        OR retired_at IS NOT NULL
    ),
    'all prices remain non-billable candidates'

  UNION ALL

  SELECT
    'no_storefront_mapping',
    NOT EXISTS (SELECT 1 FROM public.billing_storefront_price_mappings),
    'merchant/provider activation has not occurred'

  UNION ALL

  SELECT
    'no_price_assignment',
    NOT EXISTS (SELECT 1 FROM public.subscription_price_assignments),
    'no owner received a commercial assignment'

  UNION ALL

  SELECT
    'rls_enabled',
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'subscription_price_versions',
          'billing_storefront_price_mappings',
          'subscription_price_assignments'
        )
        AND NOT c.relrowsecurity
    ),
    'RLS enabled on every F3A table'

  UNION ALL

  SELECT
    'no_direct_table_privileges',
    NOT EXISTS (
      SELECT 1
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND table_name IN (
          'subscription_price_versions',
          'billing_storefront_price_mappings',
          'subscription_price_assignments'
        )
        AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
    ),
    'no direct PUBLIC/anon/authenticated/service_role table grant'

  UNION ALL

  SELECT
    'no_rls_policies',
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename IN (
          'subscription_price_versions',
          'billing_storefront_price_mappings',
          'subscription_price_assignments'
        )
    ),
    'no direct row policy was added'

  UNION ALL

  SELECT
    'trigger_functions_private',
    NOT EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE specific_schema = 'public'
        AND routine_name IN (
          'enforce_subscription_price_version_update',
          'enforce_billing_storefront_mapping_update',
          'enforce_subscription_price_assignment_write'
        )
        AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
    ),
    'trigger functions have no direct execute grant'

  UNION ALL

  SELECT
    'required_triggers_exist',
    (
      SELECT pg_catalog.count(*) = 3
      FROM pg_catalog.pg_trigger AS t
      JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
        AND t.tgname IN (
          'enforce_subscription_price_version_update',
          'enforce_billing_storefront_mapping_update',
          'enforce_subscription_price_assignment_write'
        )
    ),
    'immutability and assignment guards installed'

  UNION ALL

  SELECT
    'required_partial_uniqueness_exists',
    (
      SELECT pg_catalog.count(*) = 2
      FROM pg_catalog.pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'idx_subscription_price_assignments_founder_once',
          'idx_subscription_price_assignments_current'
        )
    ),
    'Founder once and one current commercial assignment indexes installed'

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
    'billing details were not added to subscription_accounts'
)
SELECT check_name, passed, detail
FROM checks
ORDER BY check_name;

ROLLBACK;
