import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const executionPlan = read('docs/APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md');
const baseline = read('docs/APP_WIDE_UIUX_BASELINE_2026_08_12.md');
const appChrome = read('components/AppChrome.tsx');
const operatingContract = read('tests/operating-market-workbench.test.ts');
const photoField = read('components/products/ProductCoverPhotoField.tsx');
const subscriptionPage = read('app/subscription/page.tsx');
const syncPresentation = read('lib/sync/sync-presentation.ts');
const joinPage = read('app/join/page.tsx');

for (const viewport of [
  '360x800',
  '375x812',
  '390x844',
  '430x932',
  '768x1024',
  '1024x768',
  '1440x900',
  '1920x1080',
]) {
  assert.ok(executionPlan.includes(viewport), `execution plan missing ${viewport}`);
  assert.ok(baseline.includes(viewport), `baseline missing ${viewport}`);
}

assert.equal(appChrome.match(/<BottomNavigation \/>/g)?.length, 1);
assert.match(operatingContract, /interaction controls before compact transaction actions|OperatingInteractionPanel/);
assert.match(operatingContract, /field notes|MarketFieldOpsSection|現場工作/);

assert.match(photoField, /capabilityStatus === 'loading'/);
assert.match(photoField, /正在確認商品照片功能/);
assert.match(photoField, /重新確認/);
assert.doesNotMatch(photoField, /商品照片目前無法使用/);

assert.match(subscriptionPage, /isInternalTestSurfaceAvailable\(\)/);
assert.match(subscriptionPage, /showInternalTestTools &&/);
assert.match(syncPresentation, /正在確認同步狀態/);
assert.doesNotMatch(syncPresentation, /尚未完成同步檢查/);
assert.match(joinPage, /邀請資訊不完整/);
assert.doesNotMatch(joinPage, /缺少邀請 Token/);

for (const remainingSlice of ['UX-R2', 'UX-R3', 'UX-R5', 'UX-R6', 'UX-R7', 'UX-R8', 'UX-R9']) {
  assert.ok(baseline.includes(remainingSlice), `baseline must keep ${remainingSlice} open`);
}

console.log('PASS app-wide UIUX baseline and truthful-state presentation contracts');
