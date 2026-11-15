-- Run read-only before and after the test_prg routine rehearsal.
WITH expected(signature) AS (VALUES
  ('public.auto_add_staff_to_new_market()'),
  ('public.cleanup_expired_invitations()'),
  ('public.drain_checklist_toggle_pending_operation(text)'),
  ('public.enforce_event_actor_authorization()'),
  ('public.enqueue_checklist_toggle_pending_operation(text,uuid,text,boolean,text)'),
  ('public.get_my_staff()'),
  ('public.handle_new_user()'),
  ('public.list_owner_pending_operation_diagnostics(uuid)'),
  ('public.restore_staff_relationship(uuid)'),
  ('public.staff_team_access_from_source_rows(jsonb,jsonb,timestamp with time zone)'),
  ('public.sync_team_plan_staff_suspension()'),
  ('public.update_market_read_model()'),
  ('public.update_product_read_model()')
), routines AS (
  SELECT e.signature, p.oid, md5(pg_get_functiondef(p.oid)) AS definition,
    p.proowner::regrole::text AS owner, p.proconfig AS settings, p.proacl::text AS acl
  FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
)
SELECT current_database() AS database_name,
  (SELECT count(oid) FROM routines) AS existing_routines,
  (SELECT md5(jsonb_agg(to_jsonb(r) - 'oid' ORDER BY signature)::text) FROM routines r) AS routine_fingerprint,
  (SELECT count(*) FROM auth.users) AS auth_accounts,
  (SELECT count(*) FROM public.products) AS products,
  (SELECT count(*) FROM public.market_members) AS market_members,
  (SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY p.id)::text) FROM public.products p) AS products_fingerprint,
  (SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY m.market_id,m.user_id)::text) FROM public.market_members m) AS members_fingerprint,
  (SELECT array_agg(a.attname::text ORDER BY a.attnum) FROM pg_attribute a
    WHERE a.attrelid='public.market_members'::regclass AND a.attnum>0 AND NOT a.attisdropped) AS member_column_order,
  to_regclass('public.idx_products_sync_status') IS NOT NULL AS legacy_product_index_present,
  to_regclass('public.idx_market_members_role') IS NOT NULL AS member_role_index_present,
  to_regclass('public.market_cash_records') IS NOT NULL AS upgrade_table_present,
  to_regnamespace('deletion_release_private') IS NOT NULL AS deletion_schema_present;
