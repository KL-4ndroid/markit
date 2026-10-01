import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const script = readFileSync(
  join(root, 'scripts/smoke-team-subscription-transition.mjs'),
  'utf8',
);
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');

assert.match(packageJson, /"smoke:subscription:team-transition"/);
assert.match(script, /EXECUTION_CONFIRMATION = 'isolated-fixture-only'/);
assert.match(script, /--project-ref/);
assert.match(script, /requestedProjectRef !== actualProjectRef/);
assert.match(script, /--cleanup-leftover/);
assert.match(script, /boothbook-team-transition-smoke-/);
assert.match(script, /mode: 0o600/);

assert.match(script, /auth\.admin\.createUser/);
assert.match(script, /auth\.admin\.deleteUser/);
assert.match(script, /boothbook_test_fixture: true/);
assert.match(script, /try \{/);
assert.match(script, /finally \{/);
assert.match(script, /isolated fixture cleanup/);

for (const expected of [
  "setPlan('free', 'free')",
  "setPlan('pro', 'admin')",
  "setPlan('team', 'admin')",
  'authenticated relationship insert denied',
  'authenticated invitation delete denied',
  'Team email invitation succeeds',
  'Team role viewer to operator succeeds',
  'Team role operator to manager succeeds',
  'Team to Pro suspends relationship',
  'Pro to Free preserves suspension',
  'Team re-upgrade does not auto-restore',
  'explicit owner restore succeeds',
  'explicit restore recreates staff membership',
]) {
  assert.ok(script.includes(expected), `transition smoke must include: ${expected}`);
}

assert.doesNotMatch(script, /subscription-simulation|simulation_enabled/);
assert.doesNotMatch(script, /sb_secret_|service_role/);
assert.doesNotMatch(script, /console\.(?:log|table)\([^\n]*(?:password|access_token|ownerEmail|staffEmail)/);
assert.doesNotMatch(script, /listUsers|delete.*profiles|delete.*markets/);

console.log('PASS isolated Team subscription live-transition smoke contract');
