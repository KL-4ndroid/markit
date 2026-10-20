import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const page = readFileSync(join(root, 'app/subscription/page.tsx'), 'utf8');
const summary = readFileSync(
  join(root, 'components/subscription/SubscriptionAccountSummary.tsx'),
  'utf8',
);
const actions = readFileSync(
  join(root, 'components/subscription/NativeSubscriptionActions.tsx'),
  'utf8',
);

assert.match(page, /<SubscriptionAccountSummary \/>/);
assert.match(summary, /useAccountCapabilities/);
assert.match(summary, /buildSubscriptionCenterView/);
for (const label of ['目前方案', '功能狀態', '付款狀態', '有效期限', '購買來源']) {
  assert.ok(summary.includes(label), `subscription summary missing ${label}`);
}
assert.match(summary, /canManageSubscription=\{view\.canDisplayBillingControls\}/);
assert.match(actions, /verificationRuntimeAvailable = false/);
assert.match(actions, /disabled=\{!operationReady \|\| isBusy\}/);
assert.match(actions, /恢復購買/);
assert.match(actions, /管理訂閱/);
assert.doesNotMatch(actions, /grant|subscription_accounts|entitlementStatus|fetch\(/i);

console.log('PASS subscription center is read-only and native actions fail closed');
