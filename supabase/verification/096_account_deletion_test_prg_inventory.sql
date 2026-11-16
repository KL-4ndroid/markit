-- Run in the test_prg SQL Editor (project tzhbirwchhqabkxhqjdl).
-- Reads catalog metadata only. Verify the project in the Dashboard URL first.
-- This inventory does not establish readiness for 096. Use the full preflight
-- for columns, constraints, routine definitions, grants, and other metadata.
WITH expected_tables(name) AS (VALUES
  ('account_deletion_cleanup_steps'), ('account_deletion_requests'),
  ('account_deletion_transition_audit'), ('account_entitlements'),
  ('billing_customer_links'), ('billing_event_inbox'), ('billing_reconciliation_runs'),
  ('billing_storefront_price_mappings'), ('billing_subscriptions'), ('billing_transactions'),
  ('events'), ('events_archive'), ('market_cash_records'), ('market_financial_review_receipts'),
  ('market_financial_reviews'), ('market_invitations'), ('market_journals'), ('market_members'),
  ('markets'), ('operation_schedules'), ('owner_workflow_receipts'), ('pending_operations'),
  ('preparation_template_applications'), ('preparation_templates'), ('product_cover_photos'),
  ('products'), ('profiles'), ('sale_photo_evidence'), ('snapshots'), ('staff_invitations'),
  ('staff_relationships'), ('subscription_accounts'), ('subscription_price_assignments'),
  ('subscription_price_versions'), ('subscription_read_guard_settings'),
  ('subscription_test_switch_audit'), ('subscription_write_guard_owners'),
  ('subscription_write_guard_settings'), ('user_settings'), ('venues')
), expected_views(name) AS (VALUES
  ('owner_accessible_events'), ('owner_accessible_markets'), ('staff_accessible_events'),
  ('staff_accessible_markets'), ('staff_accessible_products')
), expected AS (
  SELECT name, 'r' AS kind FROM expected_tables
  UNION ALL
  SELECT name, 'v' AS kind FROM expected_views
), actual AS (
  SELECT c.relname::text AS name, c.relkind::text AS kind
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
), compared AS (
  SELECT coalesce(e.name, a.name) AS name, e.kind AS expected_kind, a.kind AS actual_kind
  FROM expected e FULL JOIN actual a USING (name)
)
SELECT current_database() AS database_name,
  count(expected_kind) FILTER (WHERE expected_kind = 'r') AS expected_tables,
  count(actual_kind) FILTER (WHERE actual_kind IN ('r', 'p')) AS actual_tables,
  count(*) FILTER (WHERE expected_kind = actual_kind) AS matching_names_and_types,
  coalesce(array_agg(name ORDER BY name) FILTER (WHERE actual_kind IS NULL), '{}') AS missing,
  coalesce(array_agg(name ORDER BY name) FILTER (WHERE expected_kind IS NULL), '{}') AS extra,
  coalesce(array_agg(name ORDER BY name) FILTER (
    WHERE expected_kind <> actual_kind
  ), '{}') AS wrong_type,
  to_regclass('deletion_release_private.installation') IS NOT NULL AS installation_record_present,
  to_regnamespace('deletion_upload_private') IS NOT NULL AS upload_schema_present
FROM compared;
