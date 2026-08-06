import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  BILLING_ORIGINS,
  PROVIDER_OPERATION_ERROR_CODES,
  isBillingOrigin,
  isProviderOperationErrorCode,
} from '../lib/subscription/billing-provider-contract';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const dataDesignPath = 'docs/subscription/BILLING_DATA_SECURITY_DESIGN.md';
const adapterDesignPath = 'docs/subscription/BILLING_PROVIDER_ADAPTER_CONTRACT.md';
const contractPath = 'lib/subscription/billing-provider-contract.ts';

for (const path of [dataDesignPath, adapterDesignPath, contractPath]) {
  assert.ok(existsSync(join(root, path)), `${path} must exist for F3-design`);
}

const dataDesign = read(dataDesignPath);
const adapterDesign = read(adapterDesignPath);
const contractSource = read(contractPath);
const lifecycle = read('docs/subscription/BILLING_LIFECYCLE_STATE_MACHINE.md');
const implementationPlan = read('docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md');
const executionPack = read(
  'docs/subscription/execution-pack/08_PLATFORM_RESERVE_AND_BILLING_S7_S9.md',
);
const testManifest = read('scripts/test-files.txt');

for (const logicalRecord of [
  'billing_customer_links',
  'billing_subscriptions',
  'billing_transactions',
  'subscription_price_versions',
  'billing_storefront_price_mappings',
  'subscription_price_assignments',
  'billing_plan_change_quotes',
  'billing_event_inbox',
  'billing_reconciliation_runs',
  'billing_adjustment_obligations',
  'billing_support_actions',
]) {
  assert.ok(dataDesign.includes(logicalRecord), `${logicalRecord} must be designed`);
}

for (const dataBoundary of [
  'F3A 與 F3B 已在選定 sandbox 完成 external verification',
  'F3A 的三個 foundation records 與 F3B',
  '`subscription_accounts` 保持一個 owner 一列的有效方案 projection',
  'Founder acquisition 每 owner 最多一次',
  'single-use',
  'event processing at-least-once',
  'business effect idempotent',
  'SET search_path = \'\'',
  'REVOKE ALL',
  'service secret 只存在 server',
  'Compare-and-swap projection version',
  '不在 database transaction 內等待 provider network',
  'Provider call 前建立 durable intent',
  '固定 lock order',
  'adjustment obligation',
  'second approver',
  '不是台灣稅務或法律保存期限的最終判定',
  'F3B 的 sandbox schema 不提供 runtime authority',
  'F3C-F3E、writer、callback route、provider SDK、checkout、refund 與 entitlement mutation 仍未核准',
]) {
  assert.ok(dataDesign.includes(dataBoundary), `missing F3 data boundary: ${dataBoundary}`);
}

for (const threat of [
  'forged callback',
  'replayed callback',
  'out-of-order notification',
  'callback body flood',
  'cross-owner provider ref',
  'sandbox / production mix',
  'duplicate active origins',
  'charge success / projection failure',
  'refund failure after Team charge',
  'service key leak',
  'support misuse',
  'simulator abuse',
]) {
  assert.ok(dataDesign.includes(threat), `missing billing threat: ${threat}`);
}

for (const slice of ['F3A', 'F3B', 'F3C', 'F3D', 'F3E']) {
  assert.ok(dataDesign.includes(slice), `${slice} must remain a separately approved slice`);
}

for (const adapterBoundary of [
  'read / reconciliation contract',
  'checkout session creation',
  'charge、capture、refund、credit',
  'Mutation methods',
  'durable `billing_customer_links`',
  'raw bytes',
  'identity_mismatch',
  'authoritativeSubscriptionQuery',
  'exactProrationQuote',
  'invalid time 不以 current time 補值',
  'query snapshot 優先於 notification arrival order',
  'no UI、Dexie、browser、Capacitor or entitlement mutation import',
]) {
  assert.ok(adapterDesign.includes(adapterBoundary), `missing adapter boundary: ${adapterBoundary}`);
}

assert.deepEqual(BILLING_ORIGINS, [
  'newebpay_web',
  'ecpay_web',
  'apple_app_store',
  'google_play',
  'revenuecat_aggregate',
]);
assert.equal(isBillingOrigin('newebpay_web'), true);
assert.equal(isBillingOrigin('stripe'), false);
assert.equal(isBillingOrigin(''), false);

assert.ok(PROVIDER_OPERATION_ERROR_CODES.includes('verification_failed'));
assert.ok(PROVIDER_OPERATION_ERROR_CODES.includes('identity_mismatch'));
assert.ok(PROVIDER_OPERATION_ERROR_CODES.includes('provider_unavailable'));
assert.equal(isProviderOperationErrorCode('timeout'), true);
assert.equal(isProviderOperationErrorCode('raw_upstream_error'), false);

for (const contractMarker of [
  'export interface BillingProviderReconciliationAdapter',
  'verifyNotification(',
  'queryCustomer(',
  'querySubscription(',
  'queryTransaction(',
  "verification: 'verified'",
  'rawBody: Uint8Array',
  'providerSequence: string | null',
  'amountMinor: number',
  'correlationId: string | null',
]) {
  assert.ok(contractSource.includes(contractMarker), `missing contract marker: ${contractMarker}`);
}

assert.doesNotMatch(
  contractSource,
  /react|next\/|supabase|dexie|window|localStorage|sessionStorage|document\.|fetch\(|process\.env|@capacitor/i,
);
assert.doesNotMatch(
  contractSource,
  /createCheckout|createPurchase|createCharge|issueRefund|cancelSubscription|modifySubscription|executePlanChange/,
  'F3 read contract must not expose provider mutation methods',
);
assert.doesNotMatch(contractSource, /class\s+\w+Adapter|new\s+URL\(|Authorization/i);

for (const canonicalRecord of [
  'billing_customer_links',
  'billing_subscriptions',
  'billing_transactions',
  'subscription_price_assignments',
  'billing_plan_change_quotes',
  'billing_reconciliation_runs',
  'billing_adjustment_obligations',
  'billing_support_actions',
  'subscription_accounts',
]) {
  assert.ok(lifecycle.includes(canonicalRecord), `${canonicalRecord} must match F3 naming`);
}
assert.ok(
  lifecycle.includes('`manual_migration` 是 audited support action / reconciliation trigger'),
);
assert.ok(lifecycle.includes('不是 payment\norigin'));

assert.ok(
  implementationPlan.includes(
    'Status: data/security design completed on 2026-07-30',
  ),
);
assert.ok(
  /F3C-F3E,[\s\S]*runtime mutation remain not approved/.test(implementationPlan),
);
assert.ok(implementationPlan.includes('selected-sandbox external verification completed on 2026-08-05'));
assert.ok(implementationPlan.includes('selected-sandbox external verification completed on 2026-08-04'));
assert.ok(
  implementationPlan.includes(
    'A server-signed quote must use provider-confirmed transaction inputs',
  ),
);
assert.ok(executionPack.includes('F3-design canonical contracts'));
assert.ok(
  testManifest.includes('tsx tests/subscription-billing-data-security-design.test.ts'),
  'F3-design guardrail must be in the complete manifest',
);

const billingMigrations = readdirSync(join(root, 'supabase', 'migrations')).filter((name) =>
  /billing|subscription_price|checkout|payment_provider|price_assignment/i.test(name),
);
assert.deepEqual(
  billingMigrations,
  [
    '066_add_subscription_price_catalog_foundation.sql',
    '067_add_billing_event_transaction_ledger.sql',
  ],
  'only the separately guarded F3A and F3B non-billable foundation migrations may exist',
);

for (const forbiddenRuntimePath of [
  'app/api/billing',
  'app/api/checkout',
  'app/api/webhooks/newebpay',
  'app/api/webhooks/ecpay',
  'lib/subscription/billing-reconciliation.server.ts',
  'lib/subscription/billing-writer.server.ts',
]) {
  assert.equal(
    existsSync(join(root, forbiddenRuntimePath)),
    false,
    `${forbiddenRuntimePath} is outside F3-design`,
  );
}

function listSourceFiles(directory: string): string[] {
  const absoluteDirectory = join(root, directory);
  if (!existsSync(absoluteDirectory)) return [];

  const files: string[] = [];
  for (const name of readdirSync(absoluteDirectory)) {
    const absolutePath = join(absoluteDirectory, name);
    if (statSync(absolutePath).isDirectory()) {
      files.push(...listSourceFiles(relative(root, absolutePath)));
    } else if (/\.(?:ts|tsx)$/.test(name)) {
      files.push(relative(root, absolutePath));
    }
  }
  return files;
}

for (const path of [...listSourceFiles('app'), ...listSourceFiles('components')]) {
  assert.doesNotMatch(
    read(path),
    /billing-provider-contract/,
    `${path} must not import the server reconciliation contract during F3-design`,
  );
}

console.log('PASS F3 billing data security and provider read-contract guardrails');
