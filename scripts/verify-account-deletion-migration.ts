// Focused install/replay/drift verification. Existing photo/Auth matrices are reused.
// Network none, synthetic users only, no dotenv/remote DB/R2 access.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { capturedOperationalFixtureDdl, capturedDeletionCatalog, quoteIdentifier as qi, quoteSql as q } from './lib/account-deletion-catalog-fixture';
import { capturedRuntimeDefinitionsDdl, capturedRuntimeSecurityDdl, capturedRuntimeTriggersDdl } from './lib/account-deletion-access-fixture';
import { buildAccountDeletionMigration, DELETION_MIGRATION_PATH, DELETION_MIGRATION_PROJECT, DELETION_MANAGED_QUERY_URL,
  DELETION_TEST_PRG_PROJECT, DELETION_TEST_PRG_QUERY_URL, migrationCatalogSql } from './lib/account-deletion-migration';
import { buildTestPrgPreviewScope } from './lib/account-deletion-test-prg-preview';
import { verifyCapturedAccess } from './lib/account-deletion-access-checks';
import { managedMigrationSql } from './lib/account-deletion-managed-target';
import { verifyRegistrationCompatibility } from './lib/account-deletion-registration-compat-checks';
import { restoreTestPrgRoutineLineEndings } from './lib/account-deletion-test-prg-upgrade';

async function main() {
  const registrationOnly = process.argv[2] === '--registration-isolated';
  assert.deepEqual(process.argv.slice(2), [registrationOnly ? '--registration-isolated' : '--isolated']);
  assert.ok(!process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT && !process.env.VERCEL && !process.env.VERCEL_ENV);
  const candidate = buildAccountDeletionMigration();
  assert.equal(readFileSync(DELETION_MIGRATION_PATH, 'utf8').replaceAll('\r\n', '\n'), candidate.sql, 'Regenerate candidate first');
  const docker = (args: string[], input?: string) => execFileSync('docker', ['--context', 'desktop-linux', ...args], {
    input, encoding: 'utf8', timeout: 90000, maxBuffer: 6 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  assert.equal(docker(['context', 'inspect', 'desktop-linux', '--format', '{{.Endpoints.docker.Host}}']), 'npipe:////./pipe/dockerDesktopLinuxEngine');
  const db = 'deletion-migration-' + randomUUID(), purpose = 'account-deletion-migration-isolated';
  const sql = (s: string, database = 'deletion_engine_test') => docker(['exec', '-i', db, 'psql', '-h', '127.0.0.1', '-XqAt', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], s);
  const checks: string[] = [], pass = (s: string) => { checks.push(s); console.log('PASS ' + s); };
  const reject = (s: string, code: string, database?:string) => {
    try { sql(s,database); assert.fail('SQL must reject'); }
    catch (e) { const stderr = String((e as { stderr?: string }).stderr ?? ''); assert.ok(stderr.includes(code), stderr.slice(0, 500) || String(e)); }
  };
  const ack = `SET deletion.install_environment='isolated';SET deletion.install_project_ref='${DELETION_MIGRATION_PROJECT}';SET deletion.install_payload_sha='${candidate.payloadSha}';`;
  const inTransaction = candidate.sql.replace(/\nBEGIN;\n/, '\n').replace(/COMMIT;\s*$/, '');
  const drift = (change: string, error: string) => reject(`BEGIN;${change}${ack}${inTransaction}ROLLBACK;`, error);
    const tables = capturedDeletionCatalog().filter(r => r.detail.kind === 'r');
    const insert = (name: string, data: Record<string, unknown>, prefix='') => {
      const cols = tables.find(t => t.identity === 'public.' + name)!.detail.columns, row = { ...data };
      for (const c of cols) if (!c.nullable && row[c.name] === undefined) {
        if (c.type === 'uuid') row[c.name] = randomUUID(); else if (c.type === 'timestamp with time zone') row[c.name] = new Date().toISOString();
        else if (c.type === 'boolean') row[c.name] = false; else if (/^(integer|bigint|numeric)/.test(c.type)) row[c.name] = 1;
        else if (c.type === 'jsonb') row[c.name] = {}; else throw Error('Explicit synthetic field needed: ' + name + '.' + c.name);
      }
      sql(`${prefix}INSERT INTO public.${qi(name)}(${Object.keys(row).map(qi).join(',')})VALUES(${Object.entries(row).map(([k,v])=>v===null?'NULL':cols.find(c=>c.name===k)!.type==='jsonb'?q(JSON.stringify(v))+'::jsonb':q(String(v))).join(',')});`);
    };

  let started = false;
  try {
    docker(['run', '--rm', '-d', '--network', 'none', '--name', db, '--label', `feria-purpose=${purpose}`, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=deletion_engine_test', 'postgres:17-alpine']); started = true;
    for (let i = 0; i < 60; i++) { try { sql('SELECT 1'); break; } catch { if (i === 59) throw Error('Fixture DB unavailable'); await new Promise(r => setTimeout(r, 100)); } }
    sql(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
      CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id));
      CREATE FUNCTION auth.uid()RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.role()RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
    sql(capturedOperationalFixtureDdl());
    sql("CREATE FUNCTION delete_current_user_app_data()RETURNS void LANGUAGE sql AS 'SELECT';");
    sql(readFileSync('supabase/migrations/071_add_account_deletion_request_foundation.sql', 'utf8'));
    sql('DROP FUNCTION delete_current_user_app_data();');
    sql(capturedRuntimeDefinitionsDdl()); sql(capturedRuntimeSecurityDdl()); sql(capturedRuntimeTriggersDdl());
    reject(candidate.sql, 'deletion_migration_target_ack_required');
    reject(ack + candidate.sql, 'deletion_migration_baseline_routines');
    sql(readFileSync('supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql', 'utf8'));
    pass('missing target acknowledgement and unapplied 095 reject before installing private schema');
    if (registrationOnly) {
      sql(ack + candidate.sql);
      const owner = randomUUID(), other = randomUUID(), market = randomUUID(), otherMarket = randomUUID();
      for (const id of [owner, other]) {
        sql(`INSERT INTO auth.users(id)VALUES('${id}');`);
        insert('profiles', { id, email: id+'@example.test', display_name:'Synthetic registration compatibility' });
        insert('subscription_accounts', { owner_id:id, plan_code:'team', plan_source:'admin', billing_status:'none', entitlement_status:'active' });
      }
      for (const [id, who] of [[market, owner], [otherMarket, other]]) insert('markets', { id, owner_id:who, name:'Synthetic conditions', location:'Synthetic', start_date:'2026-11-20', end_date:'2026-11-20', status:'registered' });
      verifyRegistrationCompatibility({ sql: s => sql(s), reject: (s, code) => reject(s, code), pass, insert, owner, other, market, otherMarket });
      mkdirSync('.codex-artifacts', {recursive:true});
      writeFileSync('.codex-artifacts/account-deletion-registration-migration.json',JSON.stringify({date:'2026-11-20',checks,scope:'actual generated 096 + 097 compatibility in network-none PostgreSQL 17; no hosted changes',productionEnabled:false},null,2));
      return;
    }

    reject(ack + "SET deletion.install_project_ref='wrong-project';" + candidate.sql, 'deletion_migration_target_ack_required');
    reject(ack + "SET deletion.install_environment='managed';" + candidate.sql, 'deletion_migration_managed_target_unverified');
    reject(ack + 'SET SESSION AUTHORIZATION service_role;' + candidate.sql, 'deletion_migration_dba_required');
    pass('wrong project, unverified managed target and application service session cannot install');
    // Model the managed DB name in network-none Docker. These acknowledgements
    // test SQL compatibility only; they do NOT prove any real control-plane identity.
    sql('DROP DATABASE postgres;CREATE DATABASE postgres TEMPLATE deletion_engine_test;');
    const managed = managedMigrationSql(candidate, '1'.repeat(64));
    reject(ack + "SET deletion.install_environment='managed';SET app.settings.project_ref='fgejncfsvvsayiequubm';" + candidate.sql,
      'deletion_migration_managed_target_unverified', 'postgres');
    for (const changed of [
      managed.replace('api.supabase.com/v1/projects/fgejncfsvvsayiequubm', 'api.supabase.com/v1/projects/wrong-project'),
      managed.replace("install_nonce='" + '1'.repeat(64) + "'", "install_nonce=''"),
      managed.replace("install_review_sha='" + candidate.payloadSha + "'", "install_review_sha='wrong'"),
    ]) reject(changed, 'deletion_migration_managed_target_unverified', 'postgres');
    pass('managed guard rejects fabricated provider setting, wrong control-plane route, nonce and review acknowledgement');
    const modeled = managed.replace(/COMMIT;\s*$/, `SELECT (target_ack->>'transport')||':'||(target_ack->>'database') FROM deletion_release_private.installation;ROLLBACK;`);
    assert.equal(sql(modeled, 'postgres'), 'supabase-management-api:postgres');
    assert.equal(sql("SELECT count(*)FROM pg_namespace WHERE nspname LIKE 'deletion_%';", 'postgres'), '0');
    pass('managed SQL installs with absent provider GUC in modeled postgres DB and transaction-local acknowledgements roll back; no remote identity claim');
    const testCandidate = buildAccountDeletionMigration('test_prg');
    const testManaged = managedMigrationSql(testCandidate, '2'.repeat(64));
    reject(testManaged.replace(`install_project_ref='${DELETION_TEST_PRG_PROJECT}'`, `install_project_ref='${DELETION_MIGRATION_PROJECT}'`),
      'deletion_migration_target_ack_required', 'postgres');
    reject(testManaged.replace(`install_target_uri='${DELETION_TEST_PRG_QUERY_URL}'`, `install_target_uri='${DELETION_MANAGED_QUERY_URL}'`),
      'deletion_migration_managed_target_unverified', 'postgres');
    const testModeled = testManaged.replace(/COMMIT;\s*$/, `SELECT i.project_ref||':'||c.runtime_enabled::text
      FROM deletion_release_private.installation i CROSS JOIN deletion_release_private.controls c;ROLLBACK;`);
    assert.equal(sql(testModeled, 'postgres'), `${DELETION_TEST_PRG_PROJECT}:false`);
    assert.equal(sql("SELECT count(*)FROM pg_namespace WHERE nspname LIKE 'deletion_%';", 'postgres'), '0');
    pass('test_prg SQL rejects production acknowledgements, installs disabled in the modeled database and rolls back');
    const cashRoutine = "'public.read_market_cash_sales(uuid)'::regprocedure";
    const readCashDefinition = `pg_get_functiondef(${cashRoutine})`;
    const cashHash = (database: string) => sql(`SELECT md5(${readCashDefinition});`, database);
    const exactCashHash = cashHash('postgres');
    sql(`DO $$BEGIN EXECUTE replace(${readCashDefinition},chr(13),'');END$$;`, 'postgres');
    assert.notEqual(cashHash('postgres'), exactCashHash);
    sql(restoreTestPrgRoutineLineEndings(), 'postgres');
    assert.equal(cashHash('postgres'), exactCashHash);
    sql(`DO $$BEGIN EXECUTE replace(${readCashDefinition},'CASH_SCOPE','CASH_SCOPE_CHANGED');END$$;`, 'postgres');
    const changedCashHash = cashHash('postgres');
    assert.notEqual(changedCashHash, exactCashHash);
    sql(restoreTestPrgRoutineLineEndings(), 'postgres');
    assert.equal(cashHash('postgres'), changedCashHash);
    sql(`DO $$BEGIN EXECUTE replace(${readCashDefinition},'CASH_SCOPE_CHANGED','CASH_SCOPE');END$$;`, 'postgres');
    assert.equal(cashHash('postgres'), exactCashHash);
    pass('test_prg replay restores mixed LF/CRLF definitions exactly and leaves meaningful differences for the baseline check');
    // The hosted legacy upgrade was rehearsed separately. Here use the exact
    // 095 fixture and the real preservation checks to exercise the later commit boundary.
    const [preserveBefore, preserveAfter] = readFileSync('supabase/verification/096_test_prg_baseline_data_preservation.sql', 'utf8')
      .replaceAll('\r\n', '\n').split('\n-- BASELINE UPDATES RUN HERE\n');
    const ownerId = randomUUID();
    sql(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('${ownerId}','retained@example.test','{}');`, 'postgres');
    const retainedCatalog = sql(migrationCatalogSql(), 'postgres');
    const staged = testManaged.replace('\nDO $candidate_migration$', () => `
      ALTER TABLE public.products ADD COLUMN sync_status text NOT NULL DEFAULT 'synced';
      ${preserveBefore}
      ALTER TABLE public.products DROP COLUMN sync_status;
      DO $candidate_migration$`);
    const atomic = staged.replace(/\nCOMMIT;\n$/, () => `\nSET CONSTRAINTS ALL IMMEDIATE;\n${preserveAfter}\nCOMMIT;\n`);
    reject(atomic.replace('DO $preserve_after$', `UPDATE auth.users SET email='changed@example.test' WHERE id='${ownerId}';
      DO $preserve_after$`), 'Existing records changed in auth.users', 'postgres');
    assert.equal(sql(migrationCatalogSql(), 'postgres'), retainedCatalog);
    assert.equal(sql(`SELECT email FROM auth.users WHERE id='${ownerId}';`, 'postgres'), 'retained@example.test');
    sql(atomic, 'postgres');
    assert.equal(sql(`SELECT i.project_ref||':'||c.runtime_enabled::text||':'||(i.schema_hash=(${migrationCatalogSql()}))::text
      FROM deletion_release_private.installation i CROSS JOIN deletion_release_private.controls c;`, 'postgres'),
      `${DELETION_TEST_PRG_PROJECT}:false:true`);
    assert.equal(sql(`SELECT email FROM auth.users WHERE id='${ownerId}';`, 'postgres'), 'retained@example.test');
    pass('retained-row verification after dormant 096 rolls back both stages on mutation and commits when unchanged');
    const previewScope = readFileSync('docs/subscription/drafts/ACCOUNT_DELETION_TEST_PRG_SCOPE.sql', 'utf8').replaceAll('\r\n', '\n');
    assert.match(previewScope, /\nROLLBACK;\s*$/);
    const scopedActor = randomUUID(), unrelatedActor = randomUUID(), targetHash = 'a'.repeat(64);
    const scopedRehearsal = previewScope.replace(/\nROLLBACK;\s*$/, () => `
      ALTER TABLE auth.users ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp();
      INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
        ('${scopedActor}','candidate-cleanup-123456789abc@example.test','{}'),
        ('${unrelatedActor}','existing@example.test','{}');
      INSERT INTO public.profiles(id,email) VALUES
        ('${scopedActor}','candidate-cleanup-123456789abc@example.test'),
        ('${unrelatedActor}','existing@example.test') ON CONFLICT (id) DO NOTHING;
      INSERT INTO deletion_upload_private.transport_target VALUES(true,'${targetHash}');
      DO $exercise$
      DECLARE request_id uuid; unrelated_request uuid; token text;
      BEGIN
        SELECT r.request_id INTO request_id FROM public.bff_create_account_deletion_request('${scopedActor}',repeat('1',64),repeat('2',64),'2026-08-17','clean') r;
        SELECT r.request_id INTO unrelated_request FROM public.bff_create_account_deletion_request('${unrelatedActor}',repeat('3',64),repeat('4',64),'2026-08-17','clean') r;
        PERFORM public.bff_confirm_account_deletion_request('${scopedActor}',request_id,'requested');
        PERFORM public.bff_confirm_account_deletion_request('${unrelatedActor}',unrelated_request,'requested');
        BEGIN
          PERFORM deletion_release_private.register_preview_grant(unrelated_request,'${unrelatedActor}','${targetHash}',clock_timestamp()+interval '5 minutes');
          RAISE EXCEPTION 'existing fixture registered';
        EXCEPTION WHEN SQLSTATE '55000' THEN IF SQLERRM <> 'preview_deletion_invalid_grant' THEN RAISE; END IF; END;
        PERFORM deletion_release_private.register_preview_grant(request_id,'${scopedActor}','${targetHash}',clock_timestamp()+interval '5 minutes');
        token := public.bff_claim_account_deletion_lease(request_id,'preview-test',clock_timestamp(),60)->>'leaseToken';
        SET LOCAL ROLE service_role;
        BEGIN
          PERFORM deletion_release_private.register_preview_grant(request_id,'${scopedActor}','${targetHash}',clock_timestamp()+interval '5 minutes');
          RAISE EXCEPTION 'service role may not register';
        EXCEPTION WHEN insufficient_privilege THEN NULL; END;
        BEGIN
          PERFORM public.bff_claim_account_deletion_lease(unrelated_request,'preview-test',clock_timestamp(),60);
          RAISE EXCEPTION 'unrelated lease allowed';
        EXCEPTION WHEN SQLSTATE '55000' THEN IF SQLERRM <> 'preview_deletion_scope' THEN RAISE; END IF; END;
        BEGIN
          PERFORM public.bff_account_deletion_engine(unrelated_request,NULL,'access_frozen','owner','execute',NULL);
          RAISE EXCEPTION 'other fixture allowed';
        EXCEPTION WHEN SQLSTATE '55000' THEN IF SQLERRM <> 'preview_deletion_scope' THEN RAISE; END IF; END;
        IF public.bff_account_deletion_engine(request_id,token,'access_frozen','owner','context',NULL)->>'actorId' IS DISTINCT FROM '${scopedActor}'
        THEN RAISE EXCEPTION 'wrong approved actor'; END IF;
        IF public.bff_account_deletion_engine(request_id,token,'access_frozen','owner','context',NULL)->>'previewTargetHash' IS DISTINCT FROM '${targetHash}'
        THEN RAISE EXCEPTION 'wrong approved object target'; END IF;
        PERFORM public.bff_account_deletion_engine(request_id,token,'access_frozen','owner','execute',NULL);
        RESET ROLE;
        IF (SELECT count(*) FROM deletion_engine_private.frozen) <> 1
          OR NOT deletion_engine_private.actor_enabled('${unrelatedActor}')
          OR deletion_engine_private.actor_enabled('${scopedActor}') THEN RAISE EXCEPTION 'unexpected freeze'; END IF;
        UPDATE deletion_upload_private.transport_target SET target_hash=repeat('b',64);
        BEGIN
          PERFORM public.bff_account_deletion_engine(request_id,token,'access_frozen','owner','context',NULL);
          RAISE EXCEPTION 'changed target allowed';
        EXCEPTION WHEN SQLSTATE '55000' THEN IF SQLERRM <> 'preview_deletion_scope' THEN RAISE; END IF; END;
        UPDATE deletion_upload_private.transport_target SET target_hash='${targetHash}';
        UPDATE deletion_release_private.preview_grant SET expires_at=clock_timestamp();
        BEGIN
          PERFORM public.bff_account_deletion_engine(request_id,token,'access_frozen','owner','execute',NULL);
          RAISE EXCEPTION 'expired fixture allowed';
        EXCEPTION WHEN SQLSTATE '55000' THEN IF SQLERRM <> 'preview_deletion_scope' THEN RAISE; END IF; END;
        IF deletion_release_private.runtime_allowed() THEN RAISE EXCEPTION 'unexpected global enablement'; END IF;
      END;
      $exercise$;
      ROLLBACK;`);
    const preScope = sql(migrationCatalogSql(), 'postgres');
    sql(scopedRehearsal, 'postgres');
    assert.equal(sql(migrationCatalogSql(), 'postgres'), preScope);
    assert.equal(sql("SELECT to_regclass('deletion_release_private.preview_grant') IS NULL;", 'postgres'), 't');
    pass('test_prg grant admits only the new synthetic owner, denies unrelated and expired requests, and rolls back');
    const previewCandidate = buildTestPrgPreviewScope();
    reject(previewCandidate.sql.replace('DO $verify$', 'CREATE TABLE public.preview_drift(id uuid); DO $verify$'), 'preview_deletion_installation_drift', 'postgres');
    assert.equal(sql(migrationCatalogSql(), 'postgres'), preScope);
    sql(previewCandidate.sql, 'postgres');
    assert.equal(sql(previewCandidate.readbackSql, 'postgres'), DELETION_TEST_PRG_PROJECT + '|t|t|t|0');
    pass('reviewed Preview SQL installs without grants, rejects catalog drift and stamps committed schema');
    reject(ack+candidate.sql,'deletion_migration_isolated_database','postgres');
    reject(ack+candidate.sql.replace("payload constant text:='","payload constant text:='-- synthetic altered payload\n"),'deletion_migration_payload_changed');
    pass('wrong physical test database and modified SQL payload reject before DDL');
    const before = sql(migrationCatalogSql());
    drift('CREATE TABLE public.unreviewed_data(id uuid);', 'deletion_migration_baseline_surface');
    drift('ALTER TABLE public.products ADD COLUMN unreviewed text;', 'deletion_migration_baseline_relations');
    drift('ALTER VIEW public.staff_accessible_products SET(security_invoker=true);','deletion_migration_baseline_relations');
    drift('ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;', 'deletion_migration_baseline_relations');
    drift('REVOKE SELECT ON public.products FROM anon;', 'deletion_migration_baseline_relations');
    drift("ALTER FUNCTION public.get_latest_snapshot(uuid)SET statement_timeout='1s';", 'deletion_migration_baseline_routines');
    assert.equal(sql(migrationCatalogSql()), before);
    pass('baseline table/column/view-option/RLS/ACL/function drift stops install and preserves original catalog');
    reject(ack + candidate.sql.replace('EXECUTE payload;', "EXECUTE payload;RAISE EXCEPTION 'synthetic_late_failure';"), 'synthetic_late_failure');
    assert.equal(sql(migrationCatalogSql()), before);
    assert.equal(sql("SELECT count(*)FROM pg_namespace WHERE nspname LIKE 'deletion_%';"), '0');
    pass('late failure rolls back every installed schema, function, grant and actor-column alteration');
    sql(ack + candidate.sql);
    assert.equal(sql('SELECT runtime_enabled FROM deletion_release_private.controls;'), 'f');
    assert.equal(sql('SELECT count(*)FROM deletion_upload_private.transport_target;'), '0');
    assert.equal(sql('SELECT count(*)FROM deletion_billing_private.keys;'), '0');
    reject("UPDATE deletion_release_private.controls SET runtime_enabled=true;", 'deletion_candidate_disabled');
    reject("SET ROLE service_role;SELECT bff_account_deletion_engine(NULL,NULL,'access_frozen','owner','execute',NULL);", 'engine_local_only');
    reject('SET ROLE authenticated;SELECT * FROM deletion_release_private.installation;', 'permission denied');
    pass('complete candidate installs atomically; runtime is CHECK-disabled, with no R2 target or billing secret');
    const installed = sql(migrationCatalogSql());
    const stamp = sql('SELECT schema_hash||payload_sha||installed_at::text FROM deletion_release_private.installation;');
    sql(ack + candidate.sql); sql(ack + candidate.sql);
    assert.equal(sql(migrationCatalogSql()), installed);
    assert.equal(sql('SELECT schema_hash||payload_sha||installed_at::text FROM deletion_release_private.installation;'), stamp);
    pass('verified reruns preserve all schema fingerprints and original installation receipt');
    drift('CREATE TABLE public.unreviewed_after_install(id uuid);', 'deletion_migration_installed_drift');
    drift('ALTER TABLE public.products ADD COLUMN unreviewed text;', 'deletion_migration_installed_drift');
    drift('REVOKE SELECT ON public.products FROM anon;', 'deletion_migration_installed_drift');
    drift("ALTER FUNCTION public.get_latest_snapshot(uuid)SET statement_timeout='1s';", 'deletion_migration_installed_drift');
    drift("UPDATE deletion_release_private.installation SET payload_sha=repeat('0',64);", 'deletion_migration_version_conflict');
    assert.equal(sql(migrationCatalogSql()), installed);
    pass('installed schema/ACL/function/version drift rejects rerun rather than overwriting evidence');
    const owner = randomUUID(), other = randomUUID(), staff = randomUUID(), market = randomUUID(), otherMarket = randomUUID(), product = randomUUID(), otherProduct = randomUUID(), event = randomUUID();
    for (const id of [owner, other, staff]) { sql(`INSERT INTO auth.users(id)VALUES('${id}');`); insert('profiles', {id,email:id+'@example.test',display_name:'Synthetic migration'}); }
    insert('subscription_accounts',{owner_id:owner,plan_code:'team',plan_source:'admin',billing_status:'none',entitlement_status:'active'});
    for(const [id,who]of[[market,owner],[otherMarket,other]])insert('markets',{id,owner_id:who,name:'Synthetic',location:'Synthetic',start_date:'2026-11-02',end_date:'2026-11-02',status:'registered'});
    for(const [id,who,m]of[[product,owner,market],[otherProduct,other,otherMarket]])insert('products',{id,owner_id:who,market_id:m,name:'Synthetic',category:'other',price:99,cost:23,stock:10,is_active:true});
    insert('staff_relationships',{owner_id:other,staff_id:staff,staff_email:'staff@example.test',role:'operator',status:'active',permissions:{can_view:true,can_edit:true,infoLevel:2}});
    // Synthetic pre-existing history is seeded through the service claim in the same connection.
    insert('events',{id:event,actor_id:staff,market_id:otherMarket,type:'deal_closed',payload:{totalAmount:10},timestamp:new Date().toISOString()},"SET request.jwt.claim.role='service_role';");
    verifyCapturedAccess({sql,insert,pass,owner,other,staff,market,otherMarket,product,otherProduct,event});
    const dataHashSql="SELECT md5(jsonb_build_array((SELECT jsonb_agg(to_jsonb(t)ORDER BY id)FROM profiles t),(SELECT jsonb_agg(to_jsonb(t)ORDER BY id)FROM markets t),(SELECT jsonb_agg(to_jsonb(t)ORDER BY id)FROM products t),(SELECT jsonb_agg(to_jsonb(t)ORDER BY id)FROM events t))::text);";
    const dataHash=sql(dataHashSql);
    sql(ack + candidate.sql);
    assert.equal(sql(dataHashSql),dataHash,'Verified replay must not mutate synthetic operational records');
    assert.equal(sql(migrationCatalogSql()), installed);
    pass('rerun after synthetic normal operations preserves records and accepts only the unchanged installed contract');
    verifyRegistrationCompatibility({ sql: s => sql(s), reject: (s, code) => reject(s, code), pass, insert, owner, other, market, otherMarket });
    mkdirSync('.codex-artifacts', {recursive:true});
    writeFileSync('.codex-artifacts/account-deletion-migration.json',JSON.stringify({at:new Date().toISOString(),version:candidate.version,sqlSha:candidate.sqlSha,payloadSha:candidate.payloadSha,checks,
      scope:'PostgreSQL 17 captured catalog+095, generated SQL install/replay/drift/ACL; synthetic data; no managed cloud/Auth/R2 validation',productionEnabled:false},null,2));
  } finally {
    if(started){const info=JSON.parse(docker(['inspect',db]))[0];assert.equal(info.Config.Labels['feria-purpose'],purpose);assert.equal(info.HostConfig.NetworkMode,'none');assert.equal(info.Mounts.filter((m:{Type:string})=>m.Type==='bind').length,0);docker(['rm','-fv',db]);console.log('PASS disposable migration DB removed');}
  }
}
void main().catch(e=>{const stderr=String((e as{stderr?:string}).stderr??'');console.error(stderr?stderr.slice(0,1200):e instanceof Error?e.stack:'Migration verification failed');process.exitCode=1;});
