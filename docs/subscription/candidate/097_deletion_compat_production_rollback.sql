-- GENERATED 097-account-deletion-registration-v1. Review candidate, not an automatic migration.
-- No remote operation approved. Fixed HTTPS transport must independently verify target.
-- Keeps runtime disabled. Never deletes/recreates the registration_conditions column.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path=public,pg_catalog;
SELECT pg_advisory_xact_lock(hashtextextended('feria:account-deletion:migration:096',0));
LOCK TABLE public.markets,public.events IN ACCESS EXCLUSIVE MODE;
DO $registration_compat$
DECLARE installed record;stamp jsonb;live jsonb;normalized jsonb;old_view text;original_hash text;before_access jsonb;source_hash text;before_routine text;
BEGIN
IF session_user<>'postgres' THEN RAISE EXCEPTION 'registration_compat_dba_required'; END IF;
 IF current_setting('deletion.registration_project_ref',true) IS DISTINCT FROM 'fgejncfsvvsayiequubm'
  OR current_setting('deletion.registration_payload_sha',true) IS DISTINCT FROM '4e267826eb84b971035142097da47e90073e376621138a4edec0a52b693d154a'
 THEN RAISE EXCEPTION 'registration_compat_target_ack_required'; END IF;
 IF current_setting('deletion.registration_environment',true)='isolated' THEN
  IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'registration_compat_isolated_database'; END IF;
 ELSIF current_setting('deletion.registration_environment',true)='managed' THEN
  IF current_database()<>'postgres'
   OR current_setting('deletion.registration_transport',true) IS DISTINCT FROM 'supabase-management-api'
   OR current_setting('deletion.registration_target_uri',true) IS DISTINCT FROM 'https://api.supabase.com/v1/projects/fgejncfsvvsayiequubm/database/query'
   OR coalesce(current_setting('deletion.registration_nonce',true),'')!~'^[0-9a-f]{64}$'
  THEN RAISE EXCEPTION 'registration_compat_managed_target_unverified'; END IF;
 ELSE RAISE EXCEPTION 'registration_compat_environment_required'; END IF;
 IF to_regclass('deletion_release_private.installation') IS NULL THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 IF (SELECT count(*) FROM deletion_release_private.installation)<>1 THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 SELECT * INTO installed FROM deletion_release_private.installation FOR UPDATE;
 IF installed.version IS DISTINCT FROM '096-account-deletion-candidate-v2' OR installed.project_ref IS DISTINCT FROM 'fgejncfsvvsayiequubm'
  OR installed.payload_sha IS DISTINCT FROM 'c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e'
 THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM deletion_release_private.controls WHERE slot AND NOT runtime_enabled)
  OR EXISTS(SELECT 1 FROM deletion_engine_private.frozen)
  OR EXISTS(SELECT 1 FROM public.account_deletion_requests WHERE status='processing')
  OR to_regclass('deletion_release_private.preview_grant') IS NOT NULL
 THEN RAISE EXCEPTION 'registration_compat_inactive_required'; END IF;
stamp := installed.target_ack->'registration097';
 IF stamp->>'version' IS DISTINCT FROM '097-account-deletion-registration-v1' OR stamp->>'payloadSha' IS DISTINCT FROM '4e267826eb84b971035142097da47e90073e376621138a4edec0a52b693d154a'
  OR installed.schema_hash IS DISTINCT FROM (SELECT md5(jsonb_build_object(
   'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relowner::regrole::text,c.relacl,c.reloptions,c.relrowsecurity,c.relforcerowsecurity,
     CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END,
     (SELECT jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated)ORDER BY a.attnum)
       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
     (SELECT jsonb_agg(jsonb_build_array(x.conname,pg_get_constraintdef(x.oid,true),x.convalidated)ORDER BY x.conname)FROM pg_constraint x WHERE x.conrelid=c.oid),
     (SELECT jsonb_agg(pg_get_indexdef(x.indexrelid)ORDER BY x.indexrelid)FROM pg_index x WHERE x.indrelid=c.oid))ORDER BY n.nspname,c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND c.relkind IN('r','p','v','m','f','S')),
   'routines',(SELECT jsonb_agg(jsonb_build_array(n.nspname,p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)),p.proowner::regrole::text,p.proacl)ORDER BY n.nspname,p.oid::regprocedure::text)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND p.prokind IN('f','p')),
   'triggers',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid,true),t.tgenabled)ORDER BY n.nspname,c.relname,t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND(n.nspname='public' OR n.nspname LIKE 'deletion_%')),
   'policies',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,p.polname,p.polpermissive,p.polcmd,p.polroles,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY n.nspname,c.relname,p.polname)
     FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' OR n.nspname LIKE 'deletion_%'),
   'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner::regrole::text,nspacl)ORDER BY nspname)FROM pg_namespace WHERE nspname='public' OR nspname LIKE 'deletion_%')
  )::text))
 THEN RAISE EXCEPTION 'registration_compat_rollback_drift'; END IF;
 PERFORM deletion_engine_private.assert_catalog();
 EXECUTE stamp->>'beforeRoutine';
 EXECUTE 'REVOKE ALL ON FUNCTION public.project_market_registration_conditions() FROM PUBLIC,anon,authenticated,service_role;
 CREATE OR REPLACE VIEW public.owner_accessible_markets WITH(security_barrier=true) AS  SELECT (jsonb_populate_record(NULL::public.markets,
  CASE WHEN public.subscription_read_paid(m.owner_id) THEN to_jsonb(m)
   ELSE to_jsonb(m)||jsonb_build_object(''total_revenue'',NULL,''total_profit'',NULL,''total_interactions'',NULL,''total_deals'',NULL)
  END)).* FROM public.markets m WHERE m.owner_id=auth.uid();';
 DELETE FROM deletion_engine_private.approved_columns WHERE table_name='markets' AND column_name='registration_conditions';
 UPDATE deletion_engine_private.approved_access SET contract=stamp->'beforeAccess';
 IF (SELECT md5(jsonb_build_object(
   'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relowner::regrole::text,c.relacl,c.reloptions,c.relrowsecurity,c.relforcerowsecurity,
     CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END,
     (SELECT jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated)ORDER BY a.attnum)
       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
     (SELECT jsonb_agg(jsonb_build_array(x.conname,pg_get_constraintdef(x.oid,true),x.convalidated)ORDER BY x.conname)FROM pg_constraint x WHERE x.conrelid=c.oid),
     (SELECT jsonb_agg(pg_get_indexdef(x.indexrelid)ORDER BY x.indexrelid)FROM pg_index x WHERE x.indrelid=c.oid))ORDER BY n.nspname,c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND c.relkind IN('r','p','v','m','f','S')),
   'routines',(SELECT jsonb_agg(jsonb_build_array(n.nspname,p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)),p.proowner::regrole::text,p.proacl)ORDER BY n.nspname,p.oid::regprocedure::text)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND p.prokind IN('f','p')),
   'triggers',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid,true),t.tgenabled)ORDER BY n.nspname,c.relname,t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND(n.nspname='public' OR n.nspname LIKE 'deletion_%')),
   'policies',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,p.polname,p.polpermissive,p.polcmd,p.polroles,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY n.nspname,c.relname,p.polname)
     FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' OR n.nspname LIKE 'deletion_%'),
   'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner::regrole::text,nspacl)ORDER BY nspname)FROM pg_namespace WHERE nspname='public' OR nspname LIKE 'deletion_%')
  )::text)) IS DISTINCT FROM stamp->>'sourceSchemaHash' THEN RAISE EXCEPTION 'registration_compat_rollback_drift'; END IF;
 UPDATE deletion_release_private.installation SET schema_hash=stamp->>'originalSchemaHash',target_ack=target_ack-'registration097';
 -- The 097 application data remains intact. Engine is blocked by the old catalog again.
END;
$registration_compat$;
NOTIFY pgrst, 'reload schema';
COMMIT;
