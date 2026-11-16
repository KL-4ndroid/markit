-- READ ONLY; structural definitions only. Compare hashes with the inventory export.
SELECT 'routine' AS category,p.proname AS identity,pg_get_functiondef(p.oid) AS detail
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'market_payment_deadline_is_valid','market_region_code_is_valid',
  'enforce_event_actor_authorization','enforce_subscription_event_write',
  'reject_billing_customer_link_mutation','enforce_billing_subscription_snapshot_write',
  'enforce_billing_transaction_write','enforce_billing_event_inbox_write',
  'enforce_billing_reconciliation_run_write','enforce_subscription_price_assignment_write',
  'prevent_f3b_billing_ledger_delete','enforce_subscription_price_version_update',
  'enforce_billing_storefront_mapping_update'
)
UNION ALL
SELECT 'view_options',relname,coalesce(reloptions::text,'{}')
FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='v'
UNION ALL
SELECT 'enum',t.typname,string_agg(e.enumlabel,',' ORDER BY e.enumsortorder)
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' GROUP BY t.typname
ORDER BY category,identity;
