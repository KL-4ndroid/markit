import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const scriptSource = readFileSync(
  join(root, 'scripts/smoke-subscription-read-model.mjs'),
  'utf8',
);
const packageSource = readFileSync(join(root, 'package.json'), 'utf8');
const manifestSource = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

assert.match(scriptSource, /read_subscription_account_for_actor/);
assert.match(scriptSource, /anonymous table read/);
assert.match(scriptSource, /active staff RPC/);
assert.match(scriptSource, /inactive staff RPC/);
assert.match(scriptSource, /foreign actor RPC/);
assert.match(scriptSource, /subscription state coverage/);
assert.doesNotMatch(scriptSource, /\.(?:insert|upsert|update|delete)\s*\(/);
assert.doesNotMatch(scriptSource, /console\.(?:log|table)\([^)]*(?:SECRET|ACCESS_KEY|ANON_KEY)/i);
assert.match(packageSource, /"smoke:subscription:read-model": "node scripts\/smoke-subscription-read-model\.mjs"/);
assert.match(manifestSource, /tsx tests\/subscription-read-model-smoke-script\.test\.ts/);

console.log('PASS subscription read-model smoke script remains read-only');
