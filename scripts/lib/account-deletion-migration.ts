// Build tooling only. No credentials, environment loading, browser or DB connection.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { capturedAccessDefinitions, frozenPublicSurfaceDdl, fencedEventAuthorizerDdl, accessCatalogManifestDdl } from './account-deletion-access-fixture';
import { capturedDeletionCatalog, approvedOperationalColumnsDdl, quoteSql as q } from './account-deletion-catalog-fixture';

export const DELETION_MIGRATION_PROJECT = 'fgejncfsvvsayiequubm';
export const DELETION_MIGRATION_VERSION = '096-account-deletion-candidate-v1';
export const DELETION_MIGRATION_PATH = 'docs/subscription/candidate/096_account_deletion_candidate.sql';
const snapshotHashes: Record<string, string> = {
  get_latest_snapshot: '0683d4eb751ae5148c72624b63c0e7d8',
  cleanup_old_snapshots: '8acd35d91782110158bba12838f23b35',
};
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const read = (p: string) => readFileSync(p, 'utf8').replaceAll('\r\n', '\n');

// Include defaults, ACLs, owners and enabled trigger state in installed attestation.
// Row contents (including keys/holds/attempts) are deliberately not part of schema identity.
export function migrationCatalogSql() {
  return `SELECT md5(jsonb_build_object(
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
  )::text)`;
}

/** Preserve the old drafts. Compilation replaces only their explicit local-only
 * guards with a new installed runtime guard. This is NOT permission to deploy. */
function draft(name: string) {
  let s = read(`docs/subscription/drafts/ACCOUNT_DELETION_${name}.sql`);
  assert.match(s, /ROLLBACK;\s*$/);
  const begin = s.indexOf('\nBEGIN;'); assert.ok(begin >= 0);
  s = s.slice(begin + '\nBEGIN;'.length).replace(/ROLLBACK;\s*$/, '').trim();
  if (name !== 'REQUEST_WORKFLOW_2026_11_01') {
    const guard = /^DO \$\$[\s\S]*?END\s*\$\$;/;
    const m = s.match(guard); assert.ok(m && m[0].includes("current_database()") && m[0].includes('deletion_engine_test'), 'Draft install guard changed');
    s = s.slice(m[0].length);
  }
  s = s.replace(/current_database\(\)\s*<>\s*'deletion_engine_test'/g, 'NOT deletion_release_private.runtime_allowed()');
  assert.ok(!s.includes('current_database()'), 'Unreviewed database-dependent draft condition');
  return s;
}

function definition(source: string, name: string) {
  const escaped = name.replaceAll('.', '\\.');
  const m = source.match(new RegExp(`CREATE(?: OR REPLACE)? FUNCTION ${escaped}\\([\\s\\S]*?\\bAS (\\$[A-Za-z0-9_]*\\$)[\\s\\S]*?\\1;`));
  assert.ok(m, `Missing single function definition: ${name}`); return m[0];
}

function rewrites() {
  const raw: Record<string, string> = {};
  for (const r of capturedAccessDefinitions().routines) {
    let d = r.detail.definition;
    if (snapshotHashes[r.detail.name]) d = definition(read('supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql'), `public.${r.detail.name}`);
    if (['enforce_event_actor_authorization', 'enforce_subscription_event_write'].includes(r.detail.name)) {
      d = d.replace(/\bBEGIN\b/, `BEGIN
       IF TG_OP IN('UPDATE','DELETE')AND deletion_engine_private.authorize_event_change(to_jsonb(OLD),CASE WHEN TG_OP='UPDATE'THEN to_jsonb(NEW)ELSE NULL END,TG_OP)THEN
        IF TG_OP='DELETE'THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;`);
    }
    if (['reject_billing_customer_link_mutation', 'enforce_billing_transaction_write', 'prevent_f3b_billing_ledger_delete'].includes(r.detail.name)) {
      d = d.replace(/\bBEGIN\b/, `BEGIN
       IF TG_OP='DELETE'THEN IF deletion_billing_private.authorize_delete(TG_TABLE_NAME,to_jsonb(OLD))THEN RETURN OLD;END IF;END IF;`);
    }
    raw[`${r.detail.name}(${r.detail.argumentTypes})`] = d;
  }
  return frozenPublicSurfaceDdl(raw);
}

/** Exact known baseline + independently deployed 095. Unknown objects/ACLs stop install. */
function baselineAssertion() {
  const tableRows = capturedDeletionCatalog().map(r => {
    const relation=capturedAccessDefinitions().relations.find(a=>a.identity===r.identity)!;
    const detail={...r.detail,owner:relation.detail.owner,options:relation.detail.options,policies:relation.detail.policies.map(p=>({...p,roles:[...p.roles].sort()}))};
    return `(${q(r.identity)},${q(JSON.stringify(detail))}::jsonb)`;
  }).join(',\n');
  const routines = capturedAccessDefinitions().routines;
  const routineRows = routines.map(r => {
    const fixed = !!snapshotHashes[r.detail.name];
    const grants = r.detail.grants.filter(g => !fixed || !['PUBLIC', 'anon'].includes(g.role));
    return `(${q(`public.${r.detail.name}(${r.detail.argumentTypes})`)},${q(snapshotHashes[r.detail.name] ?? r.detail.definitionMd5)},${q(JSON.stringify(fixed ? ['search_path=""'] : r.detail.config))}::jsonb,${r.detail.securityDefiner},${q(r.detail.owner)},${fixed},${q(JSON.stringify(grants))}::jsonb)`;
  }).join(',\n');
  return `IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname LIKE 'deletion_%')THEN RAISE EXCEPTION 'deletion_migration_unreviewed_private_schema';END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'AND c.relkind IN('r','p','v','m','f'))<>${capturedDeletionCatalog().length}
   OR(SELECT count(*)FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'AND p.prokind IN('f','p'))<>${routines.length}
   THEN RAISE EXCEPTION 'deletion_migration_baseline_surface';END IF;
  IF EXISTS(WITH expected(identity,d)AS(VALUES ${tableRows})SELECT 1 FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.identity)
   WHERE c.oid IS NULL OR e.d->>'kind'IS DISTINCT FROM c.relkind::text OR(e.d->>'rls')::boolean IS DISTINCT FROM c.relrowsecurity OR(e.d->>'forceRls')::boolean IS DISTINCT FROM c.relforcerowsecurity OR e.d->>'owner'IS DISTINCT FROM c.relowner::regrole::text OR e.d->'options'IS DISTINCT FROM coalesce(to_jsonb(c.reloptions),'null')
   OR e.d->'columns'IS DISTINCT FROM(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull)ORDER BY a.attnum)FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)
   OR e.d->'constraints'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid,true))ORDER BY x.conname),'[]')FROM pg_constraint x WHERE x.conrelid=c.oid)
   OR e.d->'triggers'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,true))ORDER BY t.tgname),'[]')FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
   OR EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND t.tgenabled<>'O')
   OR e.d->'policies'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'roles',(SELECT jsonb_agg(name ORDER BY name)FROM(SELECT CASE WHEN v=0 THEN 'PUBLIC'ELSE pg_get_userbyid(v)END AS name FROM unnest(p.polroles)v)roles),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY p.polname),'[]')FROM pg_policy p WHERE p.polrelid=c.oid)
   OR e.d->'grants'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',g.grantee,'privilege',g.privilege_type)ORDER BY g.grantee,g.privilege_type),'[]')FROM information_schema.table_privileges g WHERE g.table_schema='public'AND g.table_name=c.relname)
   OR e.d->>'viewDefinition'IS DISTINCT FROM CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END)
   THEN RAISE EXCEPTION 'deletion_migration_baseline_relations';END IF;
  WITH expected(sig,h,config,definer,owner_name,normalize_095,grants)AS(VALUES ${routineRows})SELECT string_agg(e.sig,',')INTO schema_now FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.sig)
   WHERE p.oid IS NULL OR md5(CASE WHEN e.normalize_095 THEN replace(pg_get_functiondef(p.oid),chr(13),'')ELSE pg_get_functiondef(p.oid)END)IS DISTINCT FROM e.h OR coalesce(to_jsonb(p.proconfig),'null')IS DISTINCT FROM e.config OR p.prosecdef IS DISTINCT FROM e.definer OR p.proowner::regrole::text IS DISTINCT FROM e.owner_name
   OR(SELECT coalesce(jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC'ELSE pg_get_userbyid(a.grantee)END,'privilege',a.privilege_type,'grantable',a.is_grantable)ORDER BY a.grantee,a.privilege_type),'[]')FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner)))a)
     IS DISTINCT FROM(SELECT jsonb_agg(g ORDER BY CASE WHEN g->>'role'='PUBLIC'THEN 0 ELSE(g->>'role')::regrole::oid END,g->>'privilege')FROM jsonb_array_elements(e.grants)g);
  IF schema_now IS NOT NULL THEN RAISE EXCEPTION 'deletion_migration_baseline_routines: %',schema_now;END IF;`;
}

export function buildAccountDeletionMigration() {
  const chunks = [
    draft('REQUEST_WORKFLOW_2026_11_01'), draft('ENGINE_2026_11_02'), approvedOperationalColumnsDdl(),
    draft('OPERATIONAL_COVERAGE_2026_11_02'), draft('BILLING_RETENTION_2026_11_02'),
    draft('ACCESS_FENCE_2026_11_02'),
    fencedEventAuthorizerDdl(definition(draft('OPERATIONAL_COVERAGE_2026_11_02'), 'deletion_engine_private.authorize_event_change').replace(/^CREATE FUNCTION/,'CREATE OR REPLACE FUNCTION')),
    rewrites(), draft('UPLOAD_BARRIER_2026_11_02'), draft('UPLOAD_RECONCILIATION_2026_11_02'),
    draft('TERMINAL_PUT_2026_11_02'), draft('PHOTO_READBACK_2026_11_02'), accessCatalogManifestDdl(),
    'SELECT deletion_engine_private.assert_catalog();',
  ];
  const payload = chunks.join('\n'); const payloadSha = sha(payload);
  const catalog = `(${migrationCatalogSql()})`;
  // The CHECK cannot be switched on by data updates. Enabling needs a separately
  // reviewed DDL release, target binding and a new schema attestation.
  const releaseDdl = `CREATE SCHEMA deletion_release_private;
   REVOKE ALL ON SCHEMA deletion_release_private FROM PUBLIC,anon,authenticated,service_role;
   CREATE TABLE deletion_release_private.installation(version text PRIMARY KEY,project_ref text NOT NULL,payload_sha text NOT NULL,schema_hash text NOT NULL,installed_at timestamptz NOT NULL DEFAULT clock_timestamp());
   CREATE TABLE deletion_release_private.controls(slot boolean PRIMARY KEY CHECK(slot),runtime_enabled boolean NOT NULL DEFAULT false CONSTRAINT deletion_candidate_disabled CHECK(NOT runtime_enabled));
   INSERT INTO deletion_release_private.controls VALUES(true,false);
   REVOKE ALL ON ALL TABLES IN SCHEMA deletion_release_private FROM PUBLIC,anon,authenticated,service_role;
   CREATE FUNCTION deletion_release_private.runtime_allowed()RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''AS $$SELECT coalesce((SELECT runtime_enabled FROM deletion_release_private.controls WHERE slot),false)$$;
   REVOKE ALL ON FUNCTION deletion_release_private.runtime_allowed()FROM PUBLIC,anon,authenticated,service_role;`;
  const sql = `-- GENERATED candidate 096. NOT approved for remote execution; not in automatic migrations.
-- Requires 071 + deployed 095, exact catalog/ACL baseline, DBA target acknowledgement.
-- Installs no R2 target, billing key, worker route, schedule, or enabled runtime.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('feria:account-deletion:migration:096',0));
DO $candidate_migration$
DECLARE installed record;schema_now text;payload constant text:=${q(payload)};
BEGIN
 IF session_user<>'postgres' THEN RAISE EXCEPTION 'deletion_migration_dba_required';END IF;
 IF current_setting('deletion.install_project_ref',true)IS DISTINCT FROM ${q(DELETION_MIGRATION_PROJECT)}
  OR current_setting('deletion.install_payload_sha',true)IS DISTINCT FROM ${q(payloadSha)}
  THEN RAISE EXCEPTION 'deletion_migration_target_ack_required';END IF;
 IF current_setting('deletion.install_environment',true)='isolated' THEN
  IF current_database()<>'deletion_engine_test'THEN RAISE EXCEPTION 'deletion_migration_isolated_database';END IF;
 ELSIF current_setting('deletion.install_environment',true)='managed' THEN
  IF current_setting('app.settings.project_ref',true)IS DISTINCT FROM ${q(DELETION_MIGRATION_PROJECT)}
   OR current_setting('deletion.install_review_sha',true)IS DISTINCT FROM ${q(payloadSha)}
   THEN RAISE EXCEPTION 'deletion_migration_managed_target_unverified';END IF;
 ELSE RAISE EXCEPTION 'deletion_migration_environment_required';END IF;
 IF to_regclass('deletion_release_private.installation')IS NOT NULL THEN
  EXECUTE 'SELECT * FROM deletion_release_private.installation WHERE version=$1'INTO installed USING ${q(DELETION_MIGRATION_VERSION)};
  IF installed IS NULL OR installed.project_ref IS DISTINCT FROM ${q(DELETION_MIGRATION_PROJECT)} OR installed.payload_sha IS DISTINCT FROM ${q(payloadSha)}
   THEN RAISE EXCEPTION 'deletion_migration_version_conflict';END IF;
  SELECT ${catalog} INTO schema_now;
  IF schema_now IS DISTINCT FROM installed.schema_hash THEN RAISE EXCEPTION 'deletion_migration_installed_drift';END IF;
  RETURN; -- Verified rerun is read-only; never overwrite an installed drift.
 END IF;
 IF encode(extensions.digest(payload,'sha256'),'hex')IS DISTINCT FROM ${q(payloadSha)} THEN RAISE EXCEPTION 'deletion_migration_payload_changed';END IF;
 ${baselineAssertion()}
 EXECUTE ${q(releaseDdl)};
 EXECUTE payload;
 SELECT ${catalog} INTO schema_now;
 INSERT INTO deletion_release_private.installation(version,project_ref,payload_sha,schema_hash)
  VALUES(${q(DELETION_MIGRATION_VERSION)},${q(DELETION_MIGRATION_PROJECT)},${q(payloadSha)},schema_now);
END;
$candidate_migration$;
COMMIT;
`;
  return { sql, payloadSha, sqlSha: sha(sql), version: DELETION_MIGRATION_VERSION };
}
