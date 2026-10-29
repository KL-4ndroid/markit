-- Read-only catalog inventory; excludes customer rows and secrets.
SELECT jsonb_build_object(
 'policies',(SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p WHERE schemaname='public'
  AND tablename IN ('markets','products','events','daily_stats','market_cash_records','product_cover_photos','sale_photo_evidence')),
 'views',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'definition',pg_get_viewdef(c.oid,true),'options',c.reloptions))
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
  AND c.relname IN ('staff_accessible_markets','staff_accessible_products','staff_accessible_events')),
 'functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',p.proacl))
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
  AND p.proname IN ('subscription_effective_plan','subscription_write_guard_active','has_authoritative_team_entitlement','read_subscription_account_for_actor',
  'is_staff','get_staff_owner_id','get_my_staff','get_accessible_markets','get_accessible_products','get_accessible_events','read_market_cash_records',
  'read_market_cash_sales','list_owner_sale_photo_evidence','sanitize_staff_event_payload')),
 'columns',(SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',udt_name,'nullable',is_nullable))
  FROM information_schema.columns WHERE table_schema='public' AND table_name IN
  ('markets','products','events','daily_stats','market_cash_records','product_cover_photos','sale_photo_evidence'))
)::text AS retention_inventory;
