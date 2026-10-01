import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const script = readFileSync(
  join(root, 'scripts/smoke-subscription-price-foundation.mjs'),
  'utf8',
);
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const runbook = readFileSync(
  join(root, 'docs/subscription/F3A_PRICE_CATALOG_MIGRATION_RUNBOOK.md'),
  'utf8',
);

for (const table of [
  'subscription_price_versions',
  'billing_storefront_price_mappings',
  'subscription_price_assignments',
]) {
  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.ok(script.includes(`${operation} ${table}`), `missing ${operation} probe for ${table}`);
  }
}

for (const functionName of [
  'enforce_subscription_price_version_update',
  'enforce_billing_storefront_mapping_update',
  'enforce_subscription_price_assignment_write',
]) {
  assert.ok(script.includes(functionName), `missing trigger function probe: ${functionName}`);
}

assert.match(script, /errorCode === '42501'/);
assert.match(script, /'PGRST202'/);
assert.match(script, /--require-authenticated/);
assert.match(script, /SUBSCRIPTION_SMOKE_USER_EMAIL/);
assert.match(script, /SUBSCRIPTION_SMOKE_USER_PASSWORD/);
assert.match(script, /pro_monthly_twd_launch_v1/);
assert.match(script, /__denial_smoke_missing__/);
assert.match(script, /00000000-0000-0000-0000-000000000000/);
assert.doesNotMatch(script, /console\.(?:log|table)\([^\n]*(?:access_token|bearerToken|apiKey)/);
assert.doesNotMatch(script, /123@123|1234/);

assert.match(
  packageJson,
  /"smoke:subscription:price-foundation": "node scripts\/smoke-subscription-price-foundation\.mjs"/,
);
assert.ok(
  manifest.includes('tsx tests/subscription-price-foundation-live-smoke.test.ts'),
  'live F3A smoke guardrail must be in the complete test manifest',
);
assert.match(runbook, /smoke:subscription:price-foundation/);

console.log('PASS F3A live denial smoke safety contract');
