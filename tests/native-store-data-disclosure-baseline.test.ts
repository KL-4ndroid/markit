import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const document = read('docs/subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.md');
const baselineSource = read('docs/subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.json');
const baseline = JSON.parse(baselineSource) as {
  status: string;
  storeComplianceGateStatus: string;
  globalAnswers: Record<string, string>;
  records: Array<{
    id: string;
    runtimeState: string;
    launchDisposition: string;
    codeEvidence: string[];
    tracking: boolean;
  }>;
  negativeClaims: Array<{ id: string; mustRecheckAfterNativePackages: boolean }>;
  blockingReviews: string[];
};
const gatesSource = read('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json');
const gates = JSON.parse(gatesSource) as {
  overallStatus: string;
  gates: Array<{ id: string; status: string }>;
};
const executionPlan = read('docs/subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md');
const manualActions = read('docs/WEB_LAUNCH_MANUAL_ACTIONS_2026_08_01.md');
const privacyPage = read('app/privacy/page.tsx');
const supportPage = read('app/support/page.tsx');
const purchaseContract = read('lib/platform/contracts/in-app-purchase.ts');
const verificationContract = read('lib/subscription/native-store-verification-contract.ts');
const packageJson = JSON.parse(read('package.json')) as { dependencies: Record<string, string> };
const manifest = read('scripts/test-files.txt');

assert.equal(baseline.status, 'draft_requires_manual_and_provider_review');
assert.equal(baseline.storeComplianceGateStatus, 'pending_manual');
assert.equal(baseline.globalAnswers.accountDeletion, 'missing_compliant_in_app_flow');
assert.equal(baseline.globalAnswers.tracking, 'no_by_design');
assert.equal(baseline.globalAnswers.advertising, 'none');
assert.equal(baseline.globalAnswers.dataSale, 'no_by_design');
assert.ok(baseline.blockingReviews.length >= 7);

const requiredRows = [
  'account_email',
  'account_and_workspace_identifier',
  'brand_and_market_operational_content',
  'business_financial_records',
  'product_and_sales_photos',
  'bounded_sync_diagnostics',
  'support_correspondence',
  'native_subscription_purchase_history',
  'native_store_account_binding',
];
assert.deepEqual(baseline.records.map(record => record.id), requiredRows);
assert.ok(baseline.records.every(record => record.tracking === false));

for (const record of baseline.records) {
  assert.ok(record.codeEvidence.length > 0, `${record.id} must retain code evidence`);
  for (const evidencePath of record.codeEvidence) {
    assert.doesNotThrow(() => read(evidencePath), `${record.id} evidence must exist: ${evidencePath}`);
  }
}

assert.equal(
  baseline.records.find(record => record.id === 'native_subscription_purchase_history')?.runtimeState,
  'contract_only',
);
assert.equal(
  baseline.records.find(record => record.id === 'product_and_sales_photos')?.launchDisposition,
  'declare_if_enabled_in_release',
);
assert.ok(baseline.negativeClaims.every(claim => claim.mustRecheckAfterNativePackages));

for (const forbiddenDependency of [
  '@capacitor/core',
  '@capacitor/ios',
  '@capacitor/android',
  'cordova-plugin-purchase',
  '@revenuecat/purchases-capacitor',
  '@sentry/nextjs',
  'posthog-js',
  'firebase',
]) {
  assert.equal(
    packageJson.dependencies[forbiddenDependency],
    undefined,
    `baseline assumptions changed because ${forbiddenDependency} is installed`,
  );
}

assert.match(privacyPage, /電子郵件、使用者 ID、登入與權限狀態/);
assert.match(privacyPage, /商品封面/);
assert.match(supportPage, /刪除帳號/);
assert.match(purchaseContract, /opaqueVerificationPayload/);
assert.match(verificationContract, /providerTransactionRef/);

assert.equal(gates.overallStatus, 'not_ready');
assert.equal(gates.gates.find(gate => gate.id === 'STORE-COMPLIANCE')?.status, 'pending_manual');
assert.equal(gates.gates.find(gate => gate.id === 'ACCOUNT-DELETION')?.status, 'pending_approval');
assert.match(executionPlan, /NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06\.md/);
assert.match(executionPlan, /ACCOUNT-DELETION/);
assert.match(manualActions, /NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06\.md/);
assert.match(manualActions, /ACCOUNT-DELETION/);
assert.ok(manifest.includes('tsx tests/native-store-data-disclosure-baseline.test.ts'));

assert.doesNotMatch(baselineSource, /sb_secret_|AKIA[0-9A-Z]{16}/);
assert.doesNotMatch(
  baselineSource,
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
);

console.log('PASS native store disclosure baseline stays conservative and gates remain open');
