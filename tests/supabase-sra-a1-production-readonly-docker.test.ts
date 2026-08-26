import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const queryPaths = [
  'supabase/verification/sra_a1_production_read_only_preflight.sql',
  'supabase/verification/sra_a1_function_definition_read_only.sql',
  'supabase/verification/sra_a1_trigger_binding_read_only.sql',
  'supabase/verification/sra_a1_migration_ledger_read_only.sql',
] as const;
const targets = [
  'auto_add_staff_to_new_market',
  'handle_new_user',
  'update_market_read_model',
  'update_product_read_model',
] as const;

for (const path of queryPaths) {
  assert.ok(existsSync(join(root, path)), `missing SRA-A1 read-only query: ${path}`);
  const source = read(path);
  const executable = source.replace(/--[^\n]*/gu, '');
  assert.match(executable, /BEGIN;\s*SET TRANSACTION READ ONLY;/u);
  assert.match(executable, /SET LOCAL statement_timeout = '15s';/u);
  assert.match(executable, /SET LOCAL lock_timeout = '3s';/u);
  assert.match(executable, /ROLLBACK;\s*$/u);
  assert.doesNotMatch(
    executable,
    /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE|TRUNCATE|CALL|COPY|DO|COMMIT)\b/iu,
  );
  assert.doesNotMatch(executable, /\b(?:FROM|JOIN)\s+(?:public|auth)\./iu);
}

const preflight = read(queryPaths[0]);
const definitions = read(queryPaths[1]);
const triggers = read(queryPaths[2]);
const ledger = read(queryPaths[3]);
for (const target of targets) {
  assert.ok(preflight.includes(`'${target}'`));
  assert.ok(definitions.includes(`'${target}'`));
  assert.ok(triggers.includes(`'${target}'`));
}
assert.match(preflight, /pg_get_function_identity_arguments/u);
assert.match(preflight, /has_function_privilege\('anon'/u);
assert.match(preflight, /has_function_privilege\('authenticated'/u);
assert.match(preflight, /to_regclass\('supabase_migrations\.schema_migrations'\)/u);
assert.doesNotMatch(preflight, /schema_migrations\s+(?:m|AS)/iu);
assert.match(definitions, /pg_get_functiondef/u);
assert.match(triggers, /pg_get_triggerdef/u);
assert.match(ledger, /SELECT version, name FROM supabase_migrations\.schema_migrations/u);
assert.doesNotMatch(ledger.replace(/--[^\n]*/gu, ''), /statements|content|query/iu);

const oldDraftPath = 'docs/security/drafts/SRA_A1_LOCAL_REVIEW_MIGRATION.sql';
const observedDraftPath = 'docs/security/drafts/SRA_A1_OBSERVED_BASELINE_LOCAL_REVIEW.sql';
const oldDraft = read(oldDraftPath);
const observedDraft = read(observedDraftPath);
assert.equal(
  sha256(oldDraft),
  '137fd0b100cf9cafe9436622f8a6ab01242136d04e366727b70e9865db13926e',
  'historical local draft must remain immutable',
);
assert.equal((observedDraft.match(/ALTER FUNCTION public\./gu) ?? []).length, 4);
assert.equal((observedDraft.match(/REVOKE EXECUTE ON FUNCTION public\./gu) ?? []).length, 4);
assert.doesNotMatch(observedDraft, /CREATE OR REPLACE FUNCTION/iu);
assert.doesNotMatch(observedDraft, /\b(?:TABLE|VIEW|POLICY|TRIGGER)\b.*\b(?:CREATE|ALTER|DROP)\b/iu);
assert.match(observedDraft, /02f806361aaf8574f884d1f4843d1f1f/u);
assert.match(observedDraft, /3132d6bc9c4707d667001d080011cb8a/u);
assert.match(observedDraft, /anon=X\/postgres,authenticated=X\/postgres/u);
assert.match(observedDraft, /Prohibited: remote\/Production execution/u);

const runner = read('scripts/verify-sra-a1-observed-baseline-local.mjs');
for (const marker of [
  '--confirm-disposable-sra-a1-20260826',
  '--catalog-file',
  'npipe:////./pipe/dockerDesktopLinuxEngine',
  'supabase_db_sra-a1-20260826',
  "HostPort, '55322'",
  'catalog must stay outside Git',
  'SRA_A1_LOCAL_REVIEW_MIGRATION.sql',
  'SRA_A1_OBSERVED_BASELINE_LOCAL_REVIEW.sql',
  'sra_a1_local.sql',
  'CRLF/LF only',
  'old draft must persist no changes',
  'repeat rejection must persist no changes',
]) {
  assert.ok(runner.includes(marker), `missing local rehearsal runner marker: ${marker}`);
}
assert.doesNotMatch(runner, /--linked|--db-url|SUPABASE_URL|\.env\.local/u);
assert.doesNotMatch(runner, /https?:\/\//u);

const resultPath = 'docs/security/SRA_A1_DOCKER_REHEARSAL_2026_08_26.json';
const result = JSON.parse(read(resultPath)) as Record<string, unknown>;
assert.equal(result.ok, true);
assert.equal(result.scope, 'new-disposable-local-only');
assert.equal(result.remoteWrites, 0);
assert.equal(result.exactFunctionBaselineCount, 4);
assert.equal(result.identicalTriggerCount, 4);
assert.equal(result.oldDraftRejectedWithoutChanges, true);
assert.equal(result.repeatRejectedWithoutChanges, true);
assert.deepEqual(result.syntheticRowsAfterRollback, { authUsers: 0, markets: 0, products: 0 });

const evidencePath =
  'docs/security/SUPABASE_SRA_A1_PRODUCTION_READ_ONLY_DOCKER_EVIDENCE_2026_08_26.md';
const evidence = read(evidencePath);
for (const marker of [
  'transaction_read_only=on',
  'migration_ledger_present=false',
  'was NOT executed',
  'CRLF/LF',
  'No previous local database was reset or reused',
  'New local stack stopped with `--no-backup`',
  '`SEC-REMEDIATION` remains `pending_approval`',
]) {
  assert.ok(evidence.includes(marker), `missing execution evidence marker: ${marker}`);
}

const migrations = readdirSync(join(root, 'supabase', 'migrations'));
assert.equal(migrations.some(name => /sra[_-]?a1/iu.test(name)), false);
const manifest = read('scripts/test-files.txt');
assert.ok(manifest.includes('tsx tests/supabase-sra-a1-production-readonly-docker.test.ts'));

console.log('PASS SRA-A1 Production reads and Docker rehearsal stay exact-scope and fail closed');
