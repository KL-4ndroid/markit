import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const script = readFileSync(join(root, 'scripts/smoke-sync-incident-intake.mjs'), 'utf8');
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const runbook = readFileSync(join(root, 'docs/WEB_OPERATIONAL_OBSERVABILITY.md'), 'utf8');

function assertBefore(earlier: string, later: string): void {
  const earlierIndex = script.indexOf(earlier);
  const laterIndex = script.indexOf(later);
  assert.ok(earlierIndex >= 0, `missing ${earlier}`);
  assert.ok(laterIndex >= 0, `missing ${later}`);
  assert.ok(earlierIndex < laterIndex, `${earlier} must appear before ${later}`);
}

assert.match(packageJson, /"smoke:sync:incident-intake"/);
assert.ok(manifest.includes('tsx tests/sync-incident-live-smoke.test.ts'));
assert.match(runbook, /smoke:sync:incident-intake/);

assert.match(script, /ISOLATED_FIXTURE_CONFIRMATION = 'isolated-fixture-only'/);
assert.match(script, /EXISTING_TEST_ACCOUNT_CONFIRMATION = 'existing-test-account-only'/);
assert.match(script, /--project-ref/);
assert.match(script, /--base-url/);
assert.match(script, /--expected-commit/);
assert.match(script, /requestedProjectRef !== actualProjectRef/);
assert.match(script, /parsed\.protocol !== 'https:'/);
assert.match(script, /--cleanup-leftover/);
assert.match(script, /boothbook-sync-incident-smoke-/);
assert.match(script, /mode: 0o600/);

assertBefore('const healthResponse = await fetch', 'const accessToken = await authenticateForSmoke()');
assert.match(script, /health\?\.release\?\.commitSha === expectedCommit\.slice\(0, 7\)/);
assert.match(script, /auth\.admin\.createUser/);
assert.match(script, /auth\.admin\.deleteUser/);
assert.match(script, /boothbook_test_fixture: true/);
assert.match(script, /finally \{/);
assert.match(script, /session and isolated fixture cleanup/);

assert.match(script, /SYNC_INCIDENT_SMOKE_USER_EMAIL/);
assert.match(script, /SYNC_INCIDENT_SMOKE_USER_PASSWORD/);
assert.match(script, /discoverProductionPublicAuthConfig/);
assert.match(script, /MAX_SCRIPT_COUNT = 40/);
assert.match(script, /MAX_BUNDLE_BYTES = 12 \* 1024 \* 1024/);
assert.match(script, /urls\.size !== 1 \|\| keys\.size !== 1/);
assert.match(script, /test account session cleanup/);
assert.match(script, /target auth project matches isolated fixture project/);
assertBefore(
  'const productionConfig = await discoverProductionPublicAuthConfig();',
  'service.auth.admin.createUser',
);

assert.match(script, /kind: 'unexpected_failure'/);
assert.match(script, /pendingCount: 0/);
assert.match(script, /malformedResponse\.status === 400/);
assert.match(script, /acceptedResponse\.status === 202/);
assert.doesNotMatch(script, /kind:\s*readOption|pendingCount:\s*readOption/);
assert.doesNotMatch(script, /console\.(?:log|table)\([^\n]*(?:password|accessToken|email|userId)/);
assert.doesNotMatch(script, /SYNC_INCIDENT_SMOKE_USER_(?:EMAIL|PASSWORD)\s*=\s*['"]/);
assert.doesNotMatch(script, /subscription_accounts|staff_relationships|market_members/);

console.log('PASS guarded authenticated sync incident live-smoke contract');
