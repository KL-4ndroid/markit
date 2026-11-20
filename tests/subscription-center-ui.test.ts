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
assert.match(summary, /useSubscriptionExperience/);
assert.match(summary, /buildSubscriptionCenterView/);
for (const label of ['目前方案', '功能狀態', '付款狀態', '有效期限', '購買來源']) {
  assert.ok(summary.includes(label), `subscription summary missing ${label}`);
}
assert.match(summary, /canManageSubscription=\{view\.canDisplayBillingControls\}/);
assert.match(actions, /getApplePurchaseRuntime/);
assert.match(actions, /if \(!runtime\?\.configuration.enabled \|\| !ownerId \|\| !accessToken\) return null/);
assert.match(actions, /session.current\?\.dispose/);
const purchaseView = readFileSync(join(root, 'components/subscription/ApplePurchaseView.tsx'), 'utf8');
assert.match(purchaseView, /恢復購買/);
assert.match(purchaseView, /管理訂閱/);
assert.match(purchaseView, /disabled=\{busy \|\| !online \|\| !authorized\}/);
assert.match(purchaseView, /前往 App Store 確認/);
assert.doesNotMatch(actions, /grant|subscription_accounts|entitlementStatus|fetch\(/i);

console.log('PASS subscription center is read-only and native actions fail closed');
