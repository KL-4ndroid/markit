// Rehearse the repository upgrade in an ephemeral, network-disabled local database.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { managedMigrationSql } from './lib/account-deletion-managed-target';
import { buildTestPrgUpgradeAndInstall } from './lib/account-deletion-test-prg-upgrade';

const args = process.argv.slice(2);
const rollbackBaselineUpgrade = args[1] === '--rollback-baseline-upgrade';
const rollbackColumnBaseline = args[1] === '--rollback-column-baseline';
const rollbackRoutineBaseline = rollbackBaselineUpgrade || rollbackColumnBaseline || args[1] === '--rollback-routine-baseline';
assert.deepEqual(args, rollbackRoutineBaseline ? ['--isolated', args[1]] : ['--isolated']);
assert.ok(!process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT);

const container = `deletion-upgrade-${randomUUID()}`;
const docker = (args: string[], input?: string) => execFileSync('docker', ['--context', 'desktop-linux', ...args], {
  input, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
assert.equal(docker(['context', 'inspect', 'desktop-linux', '--format', '{{.Endpoints.docker.Host}}']),
  'npipe:////./pipe/dockerDesktopLinuxEngine');

const sql = (input: string) => docker(['exec', '-i', container, 'psql', '-h', '127.0.0.1', '-XqAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], input);
const read = (path: string) => readFileSync(path, 'utf8');
const migrations = readdirSync('supabase/migrations').sort();
const apply = (number: number) => {
  const prefix = `${String(number).padStart(3, '0')}_`;
  const files = migrations.filter(file => file.startsWith(prefix));
  assert.equal(files.length, 1, `Expected one migration for ${prefix}`);
  try { sql(read(`supabase/migrations/${files[0]}`)); }
  catch (error) { throw new Error(`${files[0]} failed: ${String((error as { stderr?: string }).stderr ?? error).trim().slice(-2000)}`); }
};

async function main() {
  docker(['run', '--rm', '-d', '--network', 'none', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']);
  try {
    for (let i = 0; ; i++) {
      try { sql('SELECT 1;'); break; }
      catch (error) { if (i >= 40) throw error; await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA extensions;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE TABLE auth.sessions(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id));
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;`);
    for (const phase of [
      '1_core_001_020', '2_staff_foundation_021_035',
      '3_staff_hardening_037_046_v6', '4_field_ops_pending_047_052',
    ]) sql(read(`supabase/bootstrap/quick_test_database_phase_${phase}.sql`));
    for (let version = 53; version <= 71; version++) apply(version);
    const inventory = () => JSON.parse(sql(`SELECT row_to_json(inventory) FROM (${read('supabase/verification/096_account_deletion_test_prg_inventory.sql').trim().replace(/;$/, '')}) inventory;`));
    const before = inventory();
    console.log('LOCAL 071 inventory:', JSON.stringify(before));

    const owner = randomUUID();
    sql(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('${owner}','upgrade-fixture@example.test','{}');`);
    const retained = () => sql(`SELECT json_build_array((SELECT to_jsonb(u) FROM auth.users u WHERE id='${owner}'),
      (SELECT to_jsonb(p) FROM public.profiles p WHERE id='${owner}'));`);
    const original = retained();
    assert.ok(JSON.parse(original).every(Boolean), 'Synthetic account and profile must exist');
    if (rollbackRoutineBaseline) {
      // Model the hosted grants needed by the rollback access fixtures.
      sql(`GRANT SELECT ON public.staff_relationships TO authenticated;
        GRANT UPDATE ON public.events TO authenticated;`);
      if (rollbackColumnBaseline) sql('GRANT DELETE ON public.market_members TO authenticated;');
      const legacyStaffListing = read('supabase/bootstrap/quick_test_database_phase_2_staff_foundation_021_035.sql')
        .match(/CREATE OR REPLACE FUNCTION get_my_staff\(\)[\s\S]+?\$\$;/)?.[0];
      assert.ok(legacyStaffListing, 'Original staff-listing fixture is missing');
      sql(`DROP FUNCTION public.get_my_staff() RESTRICT;\n${legacyStaffListing}`);
      if (rollbackBaselineUpgrade) {
        const market = randomUUID();
        sql(`INSERT INTO public.markets (id,owner_id,name,location,start_date,end_date)
          VALUES ('${market}','${owner}','Retained market','Retained location',current_date,current_date);
        INSERT INTO public.market_members (market_id,user_id,role) VALUES ('${market}','${owner}','owner') ON CONFLICT DO NOTHING;
        INSERT INTO public.products (id,owner_id,market_id,name,category,price,stock)
          VALUES ('${randomUUID()}','${owner}','${market}','Retained product','other',50,3);
        INSERT INTO auth.sessions (id,user_id) VALUES ('${randomUUID()}','${owner}');`);
      }
      const inventoryQuery = read('supabase/verification/096_test_prg_routine_baseline_inventory.sql');
      const rollbackState = () => sql(inventoryQuery);
      const beforeRehearsal = rollbackState();
      const generated = JSON.parse(execFileSync(process.execPath, ['scripts/prepare-account-deletion-test-prg-rollback.mjs',
        rollbackBaselineUpgrade ? '--verify-baseline-upgrade' : rollbackColumnBaseline ? '--verify-column-baseline' : '--verify-routine-baseline'], { encoding: 'utf8' }));
      const rehearsalSql = read(generated.path);
      let report: string | undefined;
      try { sql(rehearsalSql); }
      catch (error) {
        const stderr = String((error as { stderr?: string }).stderr ?? error);
        report = stderr.match(/(?:REHEARSAL_COMPLETE_ROLLED_BACK|BASELINE_UPGRADE_REHEARSAL_ROLLED_BACK) (\{[^\r\n]+\})/)?.[1];
        if (!report) throw new Error(stderr.trim().slice(-3000));
      }
      assert.ok(report, 'The rollback rehearsal must terminate with its controlled exception');
      const result = JSON.parse(report);
      assert.equal(rollbackState(), beforeRehearsal, 'Rollback changed the original catalog or fixture counts');
      assert.equal(retained(), original, 'Rollback changed the original synthetic account');
      if (rollbackBaselineUpgrade) {
        assert.equal(result.existingRowsPreserved, true);
        assert.ok(result.tablesChecked >= 31 && result.rowsChecked >= 5);
        const changedSql = rehearsalSql.replace('DO $preserve_after$',
          "UPDATE public.products SET stock=999;\nDO $preserve_after$");
        assert.notEqual(changedSql, rehearsalSql);
        assert.throws(() => sql(changedSql), (error: unknown) =>
          String((error as { stderr?: string }).stderr).includes('Existing records changed in public.products'));
        assert.equal(rollbackState(), beforeRehearsal, 'Failed preservation check must roll back');
        console.log('PASS local no-fixture upgrade, retained records, mutation rejection and rollback:', JSON.stringify(result));
        const atomic = managedMigrationSql(buildTestPrgUpgradeAndInstall(), '3'.repeat(64));
        const rehearsal = atomic.replace(/\nCOMMIT;\n$/, "\nDO $$BEGIN RAISE EXCEPTION 'synthetic_atomic_rollback'; END$$;\nCOMMIT;\n");
        const expectedFailure = result.installerPreflightPassed ? 'synthetic_atomic_rollback' : result.installerPreflightFailure;
        assert.ok(expectedFailure);
        assert.throws(() => sql(rehearsal), (error: unknown) =>
          String((error as { stderr?: string }).stderr).includes(expectedFailure));
        assert.equal(rollbackState(), beforeRehearsal, 'Combined transaction failure must preserve the legacy catalog');
        assert.equal(retained(), original, 'Combined transaction failure must preserve the original synthetic account');
        console.log('PASS combined transaction rejected and reverted in the local legacy fixture:', expectedFailure);
        return;
      }
      assert.equal(result.preflight.reviewedRoutineBaselinePassed, true);
      if (rollbackColumnBaseline) {
        assert.equal(result.preflight.reviewedColumnBaselinePassed, true);
        assert.equal(typeof result.preflight.installerPreflightPassed, 'boolean');
      }
      console.log('PASS local rehearsal and independent rollback verification:', JSON.stringify({
        reviewedRoutineBaselinePassed: true,
        matchingRelations: result.inventory.matching_names_and_types,
        policyDifferences: result.preflight.policies.length,
        productStatus: result.preflight.legacyProductSyncStatus,
        reviewedColumnBaselinePassed: result.preflight.reviewedColumnBaselinePassed,
        installerPreflightPassed: result.preflight.installerPreflightPassed,
        installerPreflightFailure: result.preflight.installerPreflightFailure,
      }));
      return;
    }
    for (let version = 72; version <= 95; version++) {
      if (version === 85) {
        const compatibility = read('supabase/repairs/085_test_prg_boolean_photo_rpc_compatibility.sql');
        sql(compatibility);
        sql(compatibility);
        sql(read('supabase/tests/085_test_prg_boolean_photo_rpc_compatibility.sql'));
      } else apply(version);
      assert.equal(retained(), original, `Migration ${version} changed the synthetic account or profile`);
      console.log(`PASS local migration ${version}`);
    }

    const after = inventory();
    console.log('LOCAL 095 inventory:', JSON.stringify(after));
    assert.equal(after.matching_names_and_types, 45);
    assert.deepEqual(after.missing, []);
    assert.deepEqual(after.extra, []);
    assert.deepEqual(after.wrong_type, []);
    assert.equal(after.installation_record_present, false);
    assert.equal(after.upload_schema_present, false);
    const results = sql(read('docs/subscription/candidate/PREFLIGHT.sql')).split('\n');
    const failed = results.filter(row => row.split('|').includes('f'));
    console.log('096 preflight:', JSON.stringify({ checks: results.length, failed }));
    assert.equal(failed.length, 0, 'Repository bootstrap differs from the reviewed 096 baseline');
  } finally {
    docker(['stop', container]);
  }
}

void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
