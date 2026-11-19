// Build tooling only: deterministic SQL, no credentials or connections.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { quoteSql as q } from './account-deletion-catalog-fixture';
import { buildAccountDeletionMigration, migrationCatalogSql, type AccountDeletionMigrationTarget } from './account-deletion-migration';

export const REGISTRATION_COMPAT_VERSION = '097-account-deletion-registration-v1';
export const REGISTRATION_SOURCE = 'supabase/migrations/097_add_market_registration_conditions.sql';
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const read = () => readFileSync(REGISTRATION_SOURCE, 'utf8').replaceAll('\r\n', '\n');

function registrationSource() {
  const source = read();
  const body = source.match(/AS \$body\$([\s\S]*?)\$body\$;/)?.[1];
  const view = source.match(/CREATE OR REPLACE VIEW public\.owner_accessible_markets WITH \(security_barrier=true\) AS\n([\s\S]*?);/)?.[1];
  assert.ok(body && view, '097 source shape needs review');
  const ddl = source.slice(source.indexOf('ALTER TABLE')).replace(/\nCOMMIT;\s*$/, '');
  assert.ok(ddl.endsWith("NOTIFY pgrst, 'reload schema';"));
  return { source, body, view, ddl };
}

/** Keep the installed 096 SQL byte-for-byte unchanged. Reuse its exact catalog
 * document format; stripping only reviewed 097 fields must reproduce its hash. */
export function registrationCatalogDocumentSql() {
  const sql = migrationCatalogSql();
  assert.ok(sql.startsWith('SELECT md5(jsonb_build_object(') && sql.endsWith(')::text)'));
  return sql.replace(/^SELECT md5\(/, 'SELECT ').slice(0, -'::text)'.length);
}

export function registrationFenceDdl() {
  const { body, view } = registrationSource();
  const guardedBody = body.replace('BEGIN\n', `BEGIN
  IF NEW.type IN ('market_created', 'market_updated')
    AND NOT deletion_engine_private.identity_allowed(NEW.actor_id, false)
  THEN RAISE EXCEPTION 'account_deletion_access_frozen' USING ERRCODE='42501'; END IF;
`);
  assert.notEqual(guardedBody, body);
  return `CREATE OR REPLACE FUNCTION public.project_market_registration_conditions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$${guardedBody}$body$;
REVOKE ALL ON FUNCTION public.project_market_registration_conditions() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE VIEW public.owner_accessible_markets WITH(security_barrier=true) AS
 SELECT visible.* FROM (${view}) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));
INSERT INTO deletion_engine_private.approved_columns VALUES ('markets','registration_conditions','jsonb',true);
UPDATE deletion_engine_private.approved_access SET contract=deletion_engine_private.access_catalog();
SELECT deletion_engine_private.assert_catalog();`;
}

// Retain every non-097 object/ACL/default/policy in the normalized comparison.
// old_view comes from the pre-097 approved contract, and must reproduce the
// already installed 096 schema hash. It is not a caller-supplied replacement.
function normalizeCatalog() {
  return `normalized := live;
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
 IF md5(normalized::text) IS DISTINCT FROM original_hash THEN RAISE EXCEPTION 'registration_compat_unreviewed_drift'; END IF;`;
}

export function buildRegistrationCompatibility(target: AccountDeletionMigrationTarget = 'production') {
  const original = buildAccountDeletionMigration(target);
  const { source, body, view, ddl } = registrationSource();
  const fence = registrationFenceDdl();
  const payloadSha = sha([REGISTRATION_COMPAT_VERSION, sha(source), original.payloadSha, fence].join('\n'));
  const catalog = `(${migrationCatalogSql()})`;
  const document = `(${registrationCatalogDocumentSql()})`;
  const ack = `SET deletion.registration_project_ref=${q(original.projectRef)};SET deletion.registration_payload_sha=${q(payloadSha)};`;
  const targetGuard = `IF session_user<>'postgres' THEN RAISE EXCEPTION 'registration_compat_dba_required'; END IF;
 IF current_setting('deletion.registration_project_ref',true) IS DISTINCT FROM ${q(original.projectRef)}
  OR current_setting('deletion.registration_payload_sha',true) IS DISTINCT FROM ${q(payloadSha)}
 THEN RAISE EXCEPTION 'registration_compat_target_ack_required'; END IF;
 IF current_setting('deletion.registration_environment',true)='isolated' THEN
  IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'registration_compat_isolated_database'; END IF;
 ELSIF current_setting('deletion.registration_environment',true)='managed' THEN
  IF current_database()<>'postgres'
   OR current_setting('deletion.registration_transport',true) IS DISTINCT FROM 'supabase-management-api'
   OR current_setting('deletion.registration_target_uri',true) IS DISTINCT FROM ${q(original.controlPlaneUrl)}
   OR coalesce(current_setting('deletion.registration_nonce',true),'')!~'^[0-9a-f]{64}$'
  THEN RAISE EXCEPTION 'registration_compat_managed_target_unverified'; END IF;
 ELSE RAISE EXCEPTION 'registration_compat_environment_required'; END IF;
 IF to_regclass('deletion_release_private.installation') IS NULL THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 IF (SELECT count(*) FROM deletion_release_private.installation)<>1 THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 SELECT * INTO installed FROM deletion_release_private.installation FOR UPDATE;
 IF installed.version IS DISTINCT FROM ${q(original.version)} OR installed.project_ref IS DISTINCT FROM ${q(original.projectRef)}
  OR installed.payload_sha IS DISTINCT FROM ${q(original.payloadSha)}
 THEN RAISE EXCEPTION 'registration_compat_096_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM deletion_release_private.controls WHERE slot AND NOT runtime_enabled)
  OR EXISTS(SELECT 1 FROM deletion_engine_private.frozen)
  OR EXISTS(SELECT 1 FROM public.account_deletion_requests WHERE status='processing')
  OR to_regclass('deletion_release_private.preview_grant') IS NOT NULL
 THEN RAISE EXCEPTION 'registration_compat_inactive_required'; END IF;`;
  const header = `-- GENERATED ${REGISTRATION_COMPAT_VERSION}. Review candidate, not an automatic migration.
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
${targetGuard}
`;
  const footer = `END;
$registration_compat$;
NOTIFY pgrst, 'reload schema';
COMMIT;
`;
  const sql = header + `stamp := installed.target_ack->'registration097';
 IF stamp IS NOT NULL THEN
  IF stamp->>'version' IS DISTINCT FROM ${q(REGISTRATION_COMPAT_VERSION)} OR stamp->>'payloadSha' IS DISTINCT FROM ${q(payloadSha)}
   OR installed.schema_hash IS DISTINCT FROM ${catalog}
  THEN RAISE EXCEPTION 'registration_compat_installed_drift'; END IF;
  PERFORM deletion_engine_private.assert_catalog(); RETURN;
 END IF;
 -- test_prg may still be at 096: apply the unchanged 097 source atomically.
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.markets'::regclass AND attname='registration_conditions' AND NOT attisdropped) THEN
  IF to_regprocedure('public.project_market_registration_conditions()') IS NOT NULL
    OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.events'::regclass AND tgname='zz_project_market_registration_conditions')
    OR installed.schema_hash IS DISTINCT FROM ${catalog}
  THEN RAISE EXCEPTION 'registration_compat_unreviewed_drift'; END IF;
  EXECUTE ${q(ddl)};
 END IF;
 -- Prove precisely the 097 function, trigger, column, and view before ignoring them in the old hash.
 IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.project_market_registration_conditions()')
   AND replace(p.prosrc,chr(13),'')=${q(body)} AND p.proowner='postgres'::regrole AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql')
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
 CREATE TEMP VIEW deletion097_expected_view AS ${view};
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
 EXECUTE 'CREATE TEMP VIEW deletion097_prior_view AS '||regexp_replace(old_view,';\s*$','');
 old_view := pg_get_viewdef('pg_temp.deletion097_prior_view'::regclass,true);
 DROP VIEW pg_temp.deletion097_prior_view;
 original_hash := installed.schema_hash;live := ${document};source_hash := md5(live::text);
 before_routine := pg_get_functiondef('public.project_market_registration_conditions()'::regprocedure);
 ${normalizeCatalog()}
 EXECUTE ${q(fence)};
 -- Only the reviewed function/view changes and explicit column manifest are allowed.
 live := ${document};
 ${normalizeCatalog()}
 UPDATE deletion_release_private.installation SET schema_hash=${catalog},
  target_ack=target_ack||jsonb_build_object('registration097',jsonb_build_object(
   'version',${q(REGISTRATION_COMPAT_VERSION)},'payloadSha',${q(payloadSha)},'source097Sha',${q(sha(source))},
   'originalSchemaHash',original_hash,'sourceSchemaHash',source_hash,'beforeAccess',before_access,
   'beforeRoutine',before_routine))
 WHERE version=installed.version;
` + footer;
  const rollbackSql = header + `stamp := installed.target_ack->'registration097';
 IF stamp->>'version' IS DISTINCT FROM ${q(REGISTRATION_COMPAT_VERSION)} OR stamp->>'payloadSha' IS DISTINCT FROM ${q(payloadSha)}
  OR installed.schema_hash IS DISTINCT FROM ${catalog}
 THEN RAISE EXCEPTION 'registration_compat_rollback_drift'; END IF;
 PERFORM deletion_engine_private.assert_catalog();
 EXECUTE stamp->>'beforeRoutine';
 EXECUTE ${q(`REVOKE ALL ON FUNCTION public.project_market_registration_conditions() FROM PUBLIC,anon,authenticated,service_role;
 CREATE OR REPLACE VIEW public.owner_accessible_markets WITH(security_barrier=true) AS ${view};`)};
 DELETE FROM deletion_engine_private.approved_columns WHERE table_name='markets' AND column_name='registration_conditions';
 UPDATE deletion_engine_private.approved_access SET contract=stamp->'beforeAccess';
 IF ${catalog} IS DISTINCT FROM stamp->>'sourceSchemaHash' THEN RAISE EXCEPTION 'registration_compat_rollback_drift'; END IF;
 UPDATE deletion_release_private.installation SET schema_hash=stamp->>'originalSchemaHash',target_ack=target_ack-'registration097';
 -- The 097 application data remains intact. Engine is blocked by the old catalog again.
` + footer;
  return { sql, rollbackSql, payloadSha, sqlSha: sha(sql), rollbackSha: sha(rollbackSql), ack,
    version: REGISTRATION_COMPAT_VERSION, projectRef: original.projectRef, source097Sha: sha(source), original096SqlSha: original.sqlSha };
}
