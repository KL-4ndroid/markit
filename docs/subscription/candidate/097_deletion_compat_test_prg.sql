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
 IF current_setting('deletion.registration_project_ref',true) IS DISTINCT FROM 'tzhbirwchhqabkxhqjdl'
  OR current_setting('deletion.registration_payload_sha',true) IS DISTINCT FROM '4e267826eb84b971035142097da47e90073e376621138a4edec0a52b693d154a'
 THEN RAISE EXCEPTION 'registration_compat_target_ack_required'; END IF;
 IF current_setting('deletion.registration_environment',true)='isolated' THEN
  IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'registration_compat_isolated_database'; END IF;
 ELSIF current_setting('deletion.registration_environment',true)='managed' THEN
  IF current_database()<>'postgres'
   OR current_setting('deletion.registration_transport',true) IS DISTINCT FROM 'supabase-management-api'
   OR current_setting('deletion.registration_target_uri',true) IS DISTINCT FROM 'https://api.supabase.com/v1/projects/tzhbirwchhqabkxhqjdl/database/query'
   OR coalesce(current_setting('deletion.registration_nonce',true),'')!~'^[0-9a-f]{64}$'
  THEN RAISE EXCEPTION 'registration_compat_managed_target_unverified'; END IF;
 ELSE RAISE EXCEPTION 'registration_compat_environment_required'; END IF;
 IF to_regclass('deletion_release_private.installation') IS NULL THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 IF (SELECT count(*) FROM deletion_release_private.installation)<>1 THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 SELECT * INTO installed FROM deletion_release_private.installation FOR UPDATE;
 IF installed.version IS DISTINCT FROM '096-account-deletion-candidate-v2' OR installed.project_ref IS DISTINCT FROM 'tzhbirwchhqabkxhqjdl'
  OR installed.payload_sha IS DISTINCT FROM 'c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e'
 THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM deletion_release_private.controls WHERE slot AND NOT runtime_enabled)
  OR EXISTS(SELECT 1 FROM deletion_engine_private.frozen)
  OR EXISTS(SELECT 1 FROM public.account_deletion_requests WHERE status='processing')
  OR to_regclass('deletion_release_private.preview_grant') IS NOT NULL
 THEN RAISE EXCEPTION 'registration_compat_inactive_required'; END IF;
stamp := installed.target_ack->'registration097';
 IF stamp IS NOT NULL THEN
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
  THEN RAISE EXCEPTION 'registration_compat_installed_drift'; END IF;
  PERFORM deletion_engine_private.assert_catalog(); RETURN;
 END IF;
 -- test_prg may still be at 096: apply the unchanged 097 source atomically.
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.markets'::regclass AND attname='registration_conditions' AND NOT attisdropped) THEN
  IF to_regprocedure('public.project_market_registration_conditions()') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.events'::regclass AND tgname='zz_project_market_registration_conditions')
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
  THEN RAISE EXCEPTION 'registration_compat_unreviewed_drift'; END IF;
  EXECUTE 'ALTER TABLE public.markets ADD COLUMN registration_conditions jsonb;

CREATE FUNCTION public.project_market_registration_conditions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '''' AS $body$
DECLARE
  fields jsonb;
  conditions jsonb;
BEGIN
  IF NEW.type NOT IN (''market_created'', ''market_updated'') THEN RETURN NEW; END IF;
  fields := CASE WHEN NEW.type = ''market_updated'' THEN NEW.payload->''updates'' ELSE NEW.payload END;
  conditions := COALESCE(fields->''registration_conditions'', fields->''registrationConditions'');
  IF conditions IS NULL THEN RETURN NEW; END IF;

  IF jsonb_typeof(conditions) <> ''object'' THEN
    RAISE EXCEPTION ''Invalid registration conditions'' USING ERRCODE = ''22023'';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(conditions) AS entry(key, value)
    WHERE CASE
      WHEN key IN (''tableFree'', ''chairFree'', ''umbrellaFree'')
        THEN value NOT IN (''"unknown"'', ''"free"'', ''"rental"'', ''"self"'')
      ELSE true
    END
  ) THEN RAISE EXCEPTION ''Invalid registration conditions'' USING ERRCODE = ''22023'';
  END IF;

  UPDATE public.markets m
    SET registration_conditions = COALESCE(m.registration_conditions, ''{}''::jsonb) || conditions
  WHERE m.id = NEW.market_id AND m.owner_id = NEW.actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION ''Registration conditions require the market owner'' USING ERRCODE = ''42501'';
  END IF;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.project_market_registration_conditions() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER zz_project_market_registration_conditions
AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.project_market_registration_conditions();

-- Append the new column using the existing owner-only projection and financial mask.
CREATE OR REPLACE VIEW public.owner_accessible_markets WITH (security_barrier=true) AS
 SELECT (jsonb_populate_record(NULL::public.markets,
  CASE WHEN public.subscription_read_paid(m.owner_id) THEN to_jsonb(m)
   ELSE to_jsonb(m)||jsonb_build_object(''total_revenue'',NULL,''total_profit'',NULL,''total_interactions'',NULL,''total_deals'',NULL)
  END)).* FROM public.markets m WHERE m.owner_id=auth.uid();

NOTIFY pgrst, ''reload schema'';';
 END IF;
 -- Prove precisely the 097 function, trigger, column, and view before ignoring them in the old hash.
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.project_market_registration_conditions()')
   AND replace(p.prosrc,chr(13),'')='
DECLARE
  fields jsonb;
  conditions jsonb;
BEGIN
  IF NEW.type NOT IN (''market_created'', ''market_updated'') THEN RETURN NEW; END IF;
  fields := CASE WHEN NEW.type = ''market_updated'' THEN NEW.payload->''updates'' ELSE NEW.payload END;
  conditions := COALESCE(fields->''registration_conditions'', fields->''registrationConditions'');
  IF conditions IS NULL THEN RETURN NEW; END IF;

  IF jsonb_typeof(conditions) <> ''object'' THEN
    RAISE EXCEPTION ''Invalid registration conditions'' USING ERRCODE = ''22023'';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(conditions) AS entry(key, value)
    WHERE CASE
      WHEN key IN (''tableFree'', ''chairFree'', ''umbrellaFree'')
        THEN value NOT IN (''"unknown"'', ''"free"'', ''"rental"'', ''"self"'')
      ELSE true
    END
  ) THEN RAISE EXCEPTION ''Invalid registration conditions'' USING ERRCODE = ''22023'';
  END IF;

  UPDATE public.markets m
    SET registration_conditions = COALESCE(m.registration_conditions, ''{}''::jsonb) || conditions
  WHERE m.id = NEW.market_id AND m.owner_id = NEW.actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION ''Registration conditions require the market owner'' USING ERRCODE = ''42501'';
  END IF;
  RETURN NEW;
END;
' AND p.proowner='postgres'::regrole AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql')
   AND p.prokind='f' AND p.prorettype='trigger'::regtype AND p.pronargs=0 AND p.pronargdefaults=0
   AND p.prosecdef AND NOT p.proisstrict AND NOT p.proretset AND NOT p.proleakproof
   AND p.provolatile='v' AND p.proparallel='u' AND p.procost=100 AND p.prorows=0
   AND p.prosupport=0 AND p.proconfig=ARRAY['search_path=""'] AND p.proargnames IS NULL AND p.proargmodes IS NULL
   AND p.proallargtypes IS NULL AND p.probin IS NULL AND p.protrftypes IS NULL
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE a.grantee<>'postgres'::regrole OR a.privilege_type<>'EXECUTE'))
 THEN RAISE EXCEPTION 'registration_compat_097_routine'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid='public.events'::regclass AND t.tgname='zz_project_market_registration_conditions'
   AND t.tgfoid='public.project_market_registration_conditions()'::regprocedure AND t.tgtype=5 AND t.tgenabled='O'
   AND NOT t.tgisinternal AND t.tgconstraint=0 AND t.tgnargs=0 AND t.tgattr=''::int2vector AND t.tgqual IS NULL AND t.tgargs=''::bytea
   AND t.tgparentid=0 AND t.tgconstrrelid=0 AND NOT t.tgdeferrable AND NOT t.tginitdeferred AND t.tgoldtable IS NULL AND t.tgnewtable IS NULL)
 THEN RAISE EXCEPTION 'registration_compat_097_trigger'; END IF;
 IF (SELECT count(*) FROM pg_attribute a WHERE a.attrelid IN('public.markets'::regclass,'public.owner_accessible_markets'::regclass)
   AND a.attname='registration_conditions' AND NOT a.attisdropped AND a.atttypid='jsonb'::regtype
   AND NOT a.attnotnull AND NOT a.atthasdef AND a.attidentity='' AND a.attgenerated='' AND a.attacl IS NULL)<>2
 THEN RAISE EXCEPTION 'registration_compat_097_column'; END IF;
 CREATE TEMP VIEW deletion097_expected_view AS  SELECT (jsonb_populate_record(NULL::public.markets,
  CASE WHEN public.subscription_read_paid(m.owner_id) THEN to_jsonb(m)
   ELSE to_jsonb(m)||jsonb_build_object('total_revenue',NULL,'total_profit',NULL,'total_interactions',NULL,'total_deals',NULL)
  END)).* FROM public.markets m WHERE m.owner_id=auth.uid();
 IF pg_get_viewdef('public.owner_accessible_markets'::regclass,true) IS DISTINCT FROM pg_get_viewdef('pg_temp.deletion097_expected_view'::regclass,true)
 THEN RAISE EXCEPTION 'registration_compat_097_view'; END IF;
 DROP VIEW pg_temp.deletion097_expected_view;
 SELECT contract INTO STRICT before_access FROM deletion_engine_private.approved_access;
 SELECT r->>6 INTO STRICT old_view FROM jsonb_array_elements(before_access->'relations') r
  WHERE r->>0 IN('owner_accessible_markets','public.owner_accessible_markets');
 IF old_view IS NULL THEN RAISE EXCEPTION 'registration_compat_missing_old_view'; END IF;
 -- access_catalog() runs with an empty search_path and therefore stores fully
 -- qualified view SQL. Reparse that same query only in pg_temp so comparison
 -- uses the installation catalog's deparse context without touching public.
 EXECUTE 'CREATE TEMP VIEW deletion097_prior_view AS '||regexp_replace(old_view,';s*$','');
 old_view := pg_get_viewdef('pg_temp.deletion097_prior_view'::regclass,true);
 DROP VIEW pg_temp.deletion097_prior_view;
 original_hash := installed.schema_hash;live := (SELECT jsonb_build_object(
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
  ));source_hash := md5(live::text);
 before_routine := pg_get_functiondef('public.project_market_registration_conditions()'::regprocedure);
 normalized := live;
 normalized := jsonb_set(normalized,'{relations}',(SELECT jsonb_agg(
   CASE WHEN r->>0='public' AND r->>1 IN('markets','owner_accessible_markets') THEN
    jsonb_set(CASE WHEN r->>1='owner_accessible_markets' THEN jsonb_set(r,'{8}',to_jsonb(old_view)) ELSE r END,
     '{9}',(SELECT jsonb_agg(c ORDER BY n) FROM jsonb_array_elements(r->9) WITH ORDINALITY a(c,n) WHERE c->>0<>'registration_conditions'))
   ELSE r END ORDER BY ord)
   FROM jsonb_array_elements(live->'relations') WITH ORDINALITY a(r,ord)));
 normalized := jsonb_set(normalized,'{routines}',(SELECT jsonb_agg(r ORDER BY ord)
   FROM jsonb_array_elements(live->'routines') WITH ORDINALITY a(r,ord)
   WHERE NOT(r->>0='public' AND r->>1='project_market_registration_conditions()')));
 normalized := jsonb_set(normalized,'{triggers}',(SELECT jsonb_agg(t ORDER BY ord)
   FROM jsonb_array_elements(live->'triggers') WITH ORDINALITY a(t,ord)
   WHERE NOT(t->>0='public' AND t->>1='events' AND t->>2='zz_project_market_registration_conditions')));
 IF md5(normalized::text) IS DISTINCT FROM original_hash THEN RAISE EXCEPTION 'registration_compat_unreviewed_drift'; END IF;
 EXECUTE 'CREATE OR REPLACE FUNCTION public.project_market_registration_conditions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $body$
DECLARE
  fields jsonb;
  conditions jsonb;
BEGIN
  IF NEW.type IN (''market_created'', ''market_updated'')
    AND NOT deletion_engine_private.identity_allowed(NEW.actor_id, false)
  THEN RAISE EXCEPTION ''account_deletion_access_frozen'' USING ERRCODE=''42501''; END IF;
  IF NEW.type NOT IN (''market_created'', ''market_updated'') THEN RETURN NEW; END IF;
  fields := CASE WHEN NEW.type = ''market_updated'' THEN NEW.payload->''updates'' ELSE NEW.payload END;
  conditions := COALESCE(fields->''registration_conditions'', fields->''registrationConditions'');
  IF conditions IS NULL THEN RETURN NEW; END IF;

  IF jsonb_typeof(conditions) <> ''object'' THEN
    RAISE EXCEPTION ''Invalid registration conditions'' USING ERRCODE = ''22023'';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(conditions) AS entry(key, value)
    WHERE CASE
      WHEN key IN (''tableFree'', ''chairFree'', ''umbrellaFree'')
        THEN value NOT IN (''"unknown"'', ''"free"'', ''"rental"'', ''"self"'')
      ELSE true
    END
  ) THEN RAISE EXCEPTION ''Invalid registration conditions'' USING ERRCODE = ''22023'';
  END IF;

  UPDATE public.markets m
    SET registration_conditions = COALESCE(m.registration_conditions, ''{}''::jsonb) || conditions
  WHERE m.id = NEW.market_id AND m.owner_id = NEW.actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION ''Registration conditions require the market owner'' USING ERRCODE = ''42501'';
  END IF;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.project_market_registration_conditions() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE VIEW public.owner_accessible_markets WITH(security_barrier=true) AS
 SELECT visible.* FROM ( SELECT (jsonb_populate_record(NULL::public.markets,
  CASE WHEN public.subscription_read_paid(m.owner_id) THEN to_jsonb(m)
   ELSE to_jsonb(m)||jsonb_build_object(''total_revenue'',NULL,''total_profit'',NULL,''total_interactions'',NULL,''total_deals'',NULL)
  END)).* FROM public.markets m WHERE m.owner_id=auth.uid()) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));
INSERT INTO deletion_engine_private.approved_columns VALUES (''markets'',''registration_conditions'',''jsonb'',true);
UPDATE deletion_engine_private.approved_access SET contract=deletion_engine_private.access_catalog();
SELECT deletion_engine_private.assert_catalog();';
 -- Only the reviewed function/view changes and explicit column manifest are allowed.
 live := (SELECT jsonb_build_object(
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
  ));
 normalized := live;
 normalized := jsonb_set(normalized,'{relations}',(SELECT jsonb_agg(
   CASE WHEN r->>0='public' AND r->>1 IN('markets','owner_accessible_markets') THEN
    jsonb_set(CASE WHEN r->>1='owner_accessible_markets' THEN jsonb_set(r,'{8}',to_jsonb(old_view)) ELSE r END,
     '{9}',(SELECT jsonb_agg(c ORDER BY n) FROM jsonb_array_elements(r->9) WITH ORDINALITY a(c,n) WHERE c->>0<>'registration_conditions'))
   ELSE r END ORDER BY ord)
   FROM jsonb_array_elements(live->'relations') WITH ORDINALITY a(r,ord)));
 normalized := jsonb_set(normalized,'{routines}',(SELECT jsonb_agg(r ORDER BY ord)
   FROM jsonb_array_elements(live->'routines') WITH ORDINALITY a(r,ord)
   WHERE NOT(r->>0='public' AND r->>1='project_market_registration_conditions()')));
 normalized := jsonb_set(normalized,'{triggers}',(SELECT jsonb_agg(t ORDER BY ord)
   FROM jsonb_array_elements(live->'triggers') WITH ORDINALITY a(t,ord)
   WHERE NOT(t->>0='public' AND t->>1='events' AND t->>2='zz_project_market_registration_conditions')));
 IF md5(normalized::text) IS DISTINCT FROM original_hash THEN RAISE EXCEPTION 'registration_compat_unreviewed_drift'; END IF;
 UPDATE deletion_release_private.installation SET schema_hash=(SELECT md5(jsonb_build_object(
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
  )::text)),
  target_ack=target_ack||jsonb_build_object('registration097',jsonb_build_object(
   'version','097-account-deletion-registration-v1','payloadSha','4e267826eb84b971035142097da47e90073e376621138a4edec0a52b693d154a','source097Sha','62ab13ea038f0813d922f6da078c12b774f5e215c02c8df5dc7079f038bb7ae6',
   'originalSchemaHash',original_hash,'sourceSchemaHash',source_hash,'beforeAccess',before_access,
   'beforeRoutine',before_routine))
 WHERE version=installed.version;
END;
$registration_compat$;
NOTIFY pgrst, 'reload schema';
COMMIT;
