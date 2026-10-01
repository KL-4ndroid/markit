import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const decisionPath = 'docs/subscription/BILLING_PROVIDER_DECISION.md';
const lifecyclePath = 'docs/subscription/BILLING_LIFECYCLE_STATE_MACHINE.md';
const matrixPath = 'docs/subscription/BILLING_TEST_MATRIX.md';

for (const path of [decisionPath, lifecyclePath, matrixPath]) {
  assert.ok(existsSync(join(root, path)), `${path} must exist for S8`);
}

const decision = read(decisionPath);
const lifecycle = read(lifecyclePath);
const matrix = read(matrixPath);
const implementationPlan = read('docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md');
const productPlan = read('docs/SUBSCRIPTION_TIER_PLAN_2026_07_24.md');
const featureMatrix = read(
  'docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md',
);
const executionPack = read(
  'docs/subscription/execution-pack/08_PLATFORM_RESERVE_AND_BILLING_S7_S9.md',
);
const packageJson = read('package.json');
const testManifest = read('scripts/test-files.txt');

for (const boundary of [
  'S8 planning-only complete',
  'Apple In-App Purchase',
  'Google Play Billing',
  'Féria 帳號，不綁裝置',
  'ECPay recurring payment',
  'deferred_web_phase',
  'NewebPay 不再是選定供應商',
  'not_selected',
  '官方支援貨幣清單目前沒有 `TWD`',
  'RevenueCat 僅是未來可選的 native store adapter / aggregator',
  'Supabase owner UUID',
  '一個 active paid billing origin',
  'Founder acquisition 是否在 Apple / Google 首發開放',
  'server_signed_quote',
  'support_required',
  'S9 仍是 `NOT APPROVED`',
]) {
  assert.ok(decision.includes(boundary), `missing provider decision boundary: ${boundary}`);
}

for (const source of [
  'https://www.newebpay.com/website/Page/content/download_api',
  'https://developers.ecpay.com.tw/2868/',
  'https://developer.paddle.com/concepts/sell/supported-currencies/',
  'https://stripe.com/global',
  'https://developer.apple.com/app-store/review/guidelines/',
  'https://support.google.com/googleplay/android-developer/answer/9858738',
]) {
  assert.ok(decision.includes(source), `official provider source missing: ${source}`);
}

for (const lifecycleRule of [
  "type BillingStatus =",
  "type EntitlementStatus = 'active' | 'grace' | 'inactive' | 'unknown'",
  "type PriceLockStatus = 'active' | 'grace' | 'dormant' | 'forfeited'",
  'logical records，不是已核准的 physical tables',
  'Provider event 只觸發 reconcile',
  '舊事件不得覆寫新狀態',
  'durably insert event',
  'server_signed_quote',
  'currency minor units',
  'single-use',
  'customer liability',
  'protected paid writes fail closed',
]) {
  assert.ok(lifecycle.includes(lifecycleRule), `missing lifecycle rule: ${lifecycleRule}`);
}

for (const testBoundary of [
  'Local subscription simulator',
  'W01',
  'W20',
  'U08',
  'S13',
  'N10',
  'actual Team state-transition smoke',
  'Production canary',
  'Stop conditions',
  'F3C-F3E、S9、provider implementations 與 F4 仍需各自明確核准',
]) {
  assert.ok(matrix.includes(testBoundary), `missing billing test boundary: ${testBoundary}`);
}

assert.ok(
  implementationPlan.includes('Status: completed as planning-only on 2026-07-30'),
  'implementation plan must mark S8 planning complete',
);
assert.ok(
  implementationPlan.includes('S9 remains not approved'),
  'implementation plan must keep S9 unapproved',
);
assert.ok(
  executionPack.includes('S7、S8 planning-only 已完成；Apple/Google native-first groundwork 已核准；S9 money/entitlement runtime 未核准'),
  'execution pack must record the same S8/S9 boundary',
);
assert.ok(productPlan.includes('### S8 Billing Provider Direction'));
assert.ok(productPlan.includes('native paid acquisition launches first'));
assert.ok(productPlan.includes('ECPay recurring payment is the selected later Web route'));
assert.ok(featureMatrix.includes('approved server-signed quote'));
assert.ok(
  testManifest.includes('tsx tests/subscription-billing-provider-decision.test.ts'),
  'S8 guardrail must be part of the complete test manifest',
);

const packageData = JSON.parse(packageJson) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const dependencyNames = Object.keys({
  ...packageData.dependencies,
  ...packageData.devDependencies,
});

for (const forbiddenDependency of [
  '@revenuecat/purchases-js',
  '@revenuecat/purchases-capacitor',
  '@stripe/stripe-js',
  'stripe',
  '@paddle/paddle-js',
  'ecpay_aio_nodejs',
]) {
  assert.equal(
    dependencyNames.includes(forbiddenDependency),
    false,
    `${forbiddenDependency} is outside S8 planning scope`,
  );
}

for (const forbiddenRuntimePath of [
  'app/api/billing',
  'app/api/checkout',
  'app/api/webhooks/newebpay',
  'app/api/webhooks/ecpay',
  'app/api/webhooks/revenuecat',
  'lib/billing/providers/newebpay.ts',
  'lib/billing/providers/ecpay.ts',
]) {
  assert.equal(
    existsSync(join(root, forbiddenRuntimePath)),
    false,
    `${forbiddenRuntimePath} is outside S8 planning scope`,
  );
}

const billingMigrations = readdirSync(join(root, 'supabase', 'migrations')).filter((name) =>
  /billing|subscription_price|checkout|payment_provider|price_assignment/i.test(name),
);
assert.deepEqual(
  billingMigrations,
  [
    '066_add_subscription_price_catalog_foundation.sql',
    '067_add_billing_event_transaction_ledger.sql',
  ],
  'post-S8 repository may contain only the separately guarded F3A and F3B non-billable migrations',
);

console.log('PASS S8 provider decision, lifecycle, launch gates, and planning-only boundaries');
