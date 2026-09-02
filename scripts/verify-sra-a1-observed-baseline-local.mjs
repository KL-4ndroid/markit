// Manual, one-time disposable Docker rehearsal; never imported by app or npm test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const confirmation = '--confirm-disposable-sra-a1-20260826';
const args = process.argv.slice(2);
assert.equal(args.length, 3, 'exact local-only confirmation and private catalog path required');
assert.equal(args[0], confirmation, 'exact local-only confirmation required');
assert.equal(args[1], '--catalog-file');
const catalogPath = resolve(args[2]);
assert.ok(!catalogPath.toLowerCase().startsWith(root.toLowerCase() + '/'), 'catalog must stay outside Git');
assert.ok(!catalogPath.toLowerCase().startsWith(root.toLowerCase() + '\\'), 'catalog must stay outside Git');
assert.ok(!process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT, 'Docker overrides prohibited');
const container = 'supabase_db_sra-a1-20260826';
function docker(args, input) {
  const result = spawnSync('docker', ['--context', 'desktop-linux', ...args], {
    input, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024,
  });
  assert.ok(!result.error, 'local Docker invocation failed');
  return result;
}
const endpoint = docker(['context', 'inspect', 'desktop-linux', '--format', '{{.Endpoints.docker.Host}}']);
assert.equal(endpoint.status, 0);
assert.equal(endpoint.stdout.trim(), 'npipe:////./pipe/dockerDesktopLinuxEngine');
const inspected = docker(['inspect', container]);
assert.equal(inspected.status, 0);
const info = JSON.parse(inspected.stdout)[0];
assert.equal(info.Name, '/' + container);
assert.equal(info.HostConfig.PortBindings['5432/tcp'][0].HostPort, '55322');

const read = path => readFileSync(resolve(root, path), 'utf8');
const md5 = value => createHash('md5').update(value).digest('hex');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
assert.equal(catalog.targetFingerprint,
  '9b9284e718b0815ac6c6ed7385938480da0efff3260e0eba4527867b0ad3998c');
const expected = {
  auto_add_staff_to_new_market: 'e0f49fbb9d20b3f7e5c63477f647cba6',
  handle_new_user: '6d14aa3115a3deb38c605316d026f8a6',
  update_market_read_model: '02f806361aaf8574f884d1f4843d1f1f',
  update_product_read_model: '1455caf09593c37bb51965944e0e88ff',
};
assert.deepEqual(Object.keys(catalog.definitions).sort(), Object.keys(expected).sort());
for (const [name, definition] of Object.entries(catalog.definitions)) {
  assert.equal(md5(definition), expected[name], 'private definition integrity mismatch');
  assert.ok(definition.startsWith('CREATE OR REPLACE FUNCTION public.' + name + '()'));
}
const liveMarketBody = catalog.definitions.update_market_read_model.match(/AS \$function\$([\s\S]*?)\$function\$/)[1];
const repoMarketBody = read('supabase/migrations/056_wire_sales_photo_evidence_market_projection.sql')
  .match(/AS \$\$([\s\S]*?)\$\$/)[1];
assert.equal(liveMarketBody.replace(/\r\n/g, '\n'), repoMarketBody.replace(/\r\n/g, '\n'));

function sql(input, allowedFailure = false) {
  const result = docker(['exec', '-i', container, 'psql', '-X', '-U', 'postgres',
    '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A'], input);
  if (!allowedFailure) assert.equal(result.status, 0, 'local SQL failed; raw output withheld');
  return result;
}
const catalogSql = read('supabase/verification/sra_a1_production_read_only_preflight.sql');
const parseRows = raw => raw.trim().split('\n').filter(Boolean).map(line => {
  const [section, identity, details] = line.split('|');
  return { section, identity, details: JSON.parse(details) };
});
// Only this new local fixture receives captured code. No remote connection exists.
sql('BEGIN;\n' + Object.entries(catalog.definitions).map(([name, def]) => def + ';\n' +
  'REVOKE ALL ON FUNCTION public.' + name + '() FROM PUBLIC, postgres, anon, authenticated, service_role;\n' +
  'GRANT EXECUTE ON FUNCTION public.' + name + '() TO PUBLIC, postgres, anon, authenticated, service_role;'
).join('\n') + '\nCOMMIT;');
const before = sql(catalogSql).stdout;
const beforeRows = parseRows(before);
assert.equal(beforeRows.find(r => r.section === 'environment').details.server_version_num, '170006');
const functions = beforeRows.filter(r => r.section === 'function');
assert.equal(functions.length, 4);
for (const { identity, details } of functions) {
  assert.equal(details.definition_md5, expected[identity]);
  assert.equal(details.owner, 'postgres');
  assert.equal(details.config, null);
  assert.equal(details.security_definer, true);
  assert.equal(details.anon_execute, true);
  assert.equal(details.authenticated_execute, true);
  assert.deepEqual(details.acl, ['=X/postgres', 'postgres=X/postgres', 'anon=X/postgres',
    'authenticated=X/postgres', 'service_role=X/postgres']);
}
const beforeTriggers = beforeRows.filter(r => r.section === 'trigger');
assert.equal(beforeTriggers.length, 4);
assert.ok(beforeTriggers.every(r => r.details.enabled === 'O'));
const original = read('docs/security/drafts/SRA_A1_LOCAL_REVIEW_MIGRATION.sql');
const rejected = sql(original, true);
assert.notEqual(rejected.status, 0);
assert.match(rejected.stderr, /sra_a1_preflight_function_drift/);
assert.equal(sql(catalogSql).stdout, before, 'old draft must persist no changes');

const reviewed = read('docs/security/drafts/SRA_A1_OBSERVED_BASELINE_LOCAL_REVIEW.sql');
sql(reviewed);
const fixture = sql(read('supabase/tests/sra_a1_local.sql')).stdout;
const fixtureSummary = JSON.parse(fixture.split('\n').find(line => line.startsWith('{')));
assert.equal(fixtureSummary.ok, true);
assert.equal(fixtureSummary.transactionOutcome, 'rolled_back');
const after = sql(catalogSql).stdout;
const afterRows = parseRows(after);
for (const { identity, details } of afterRows.filter(r => r.section === 'function')) {
  assert.equal(details.body_md5, functions.find(r => r.identity === identity).details.body_md5);
  assert.deepEqual(details.config, ['search_path=pg_catalog, public']);
  assert.equal(details.anon_execute, false);
  assert.equal(details.authenticated_execute, false);
  assert.equal(details.service_role_execute, true);
  assert.ok(details.acl.every(entry => !entry.startsWith('=X/')));
}
assert.deepEqual(afterRows.filter(r => r.section === 'trigger'), beforeTriggers);
const repeated = sql(reviewed, true);
assert.notEqual(repeated.status, 0);
assert.match(repeated.stderr, /sra_a1_preflight_function_drift/);
assert.equal(sql(catalogSql).stdout, after, 'repeat rejection must persist no changes');
const counts = sql('BEGIN; SET TRANSACTION READ ONLY; SELECT json_build_object(' +
  "'authUsers',(SELECT count(*) FROM auth.users),'markets',(SELECT count(*) FROM public.markets)," +
  "'products',(SELECT count(*) FROM public.products)); ROLLBACK;").stdout.trim();
assert.deepEqual(JSON.parse(counts), { authUsers: 0, markets: 0, products: 0 });
console.log(JSON.stringify({
  ok: true, scope: 'new-disposable-local-only', databaseVersion: '170006',
  exactFunctionBaselineCount: 4, identicalTriggerCount: 4,
  marketBodyDiff: 'CRLF/LF only', oldDraftRejectedWithoutChanges: true,
  repeatRejectedWithoutChanges: true, syntheticRowsAfterRollback: JSON.parse(counts),
  fixture: fixtureSummary, beforeSha256: sha256(before), afterSha256: sha256(after),
  observedDraftSha256: sha256(reviewed), remoteWrites: 0,
}));
