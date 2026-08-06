import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function section(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);

  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

const cardSource = readProjectFile('components/markets/SalesPhotoEvidenceOperatingCard.tsx');
const workspaceSource = readProjectFile('components/sales/TransactionWorkspace.tsx');
const ownerPageSource = readProjectFile('components/markets/MarketDetailScreen.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_CHECKOUT_PHOTO_EVIDENCE_UIUX_OPTIMIZATION_PLAN_2026_07_15.md');
const testManifestSource = readProjectFile('scripts/test-files.txt');

console.log('\n=== Sales photo evidence Slice 4 operating UI ===');

runTest('operating card is UI-only and has owner/staff modes', () => {
  assert.match(cardSource, /export function SalesPhotoEvidenceOperatingCard/);
  assert.match(cardSource, /mode: 'owner' \| 'staff'/);
  assert.match(cardSource, /pendingCount\?: number/);
  assert.match(cardSource, /onToggle\?: \(\) => void/);
  assert.match(cardSource, /onOpenPendingEvidence\?: \(\) => void/);
  assert.match(cardSource, /const canToggle = isOwner && typeof onToggle === 'function'/);
  assert.doesNotMatch(cardSource, /sale_photo_evidence|uploadEvidence|getUserMedia|signedUrl|signed_url|R2/i);
  assert.doesNotMatch(cardSource, /recordEvent|updateMarket|supabase|db\./);
});

runTest('owner operating screen shows compact photo status and keeps setting outside checkout', () => {
  assert.match(ownerPageSource, /import \{ TransactionWorkspace \}/);
  const operatingBlock = section(
    ownerPageSource,
    "{resolvedOwnerWorkspaceView === 'live' && isOperating && (",
    '/* 3. 營業狀態卡片'
  );
  assert.match(operatingBlock, /<TransactionWorkspace/);
  assert.match(operatingBlock, /salesPhotoEvidenceRequired=\{salesPhotoEvidenceRequired\}/);
  assert.match(operatingBlock, /pendingPhotoCount=\{salesPhotoEvidenceFlow\.pendingCount\}/);
  assert.match(operatingBlock, /onOpenPendingPhotos=\{handleOpenPendingSalesPhotoEvidence\}/);
  assert.doesNotMatch(operatingBlock, /onTogglePhotoRequirement|handleToggleSalesPhotoEvidence/);
  assert.doesNotMatch(operatingBlock, /sale_photo_evidence|uploadEvidence|getUserMedia|signedUrl|signed_url/i);

  const settingsBlock = section(ownerPageSource, '/* 7. 每日收入統計', '<DailyRevenueStats');
  assert.match(settingsBlock, /resolvedOwnerWorkspaceView === 'manage' && !isOperating/);
  assert.match(settingsBlock, /onClick=\{handleToggleSalesPhotoEvidence\}/);
  assert.match(workspaceSource, /本場需拍照/);
  assert.doesNotMatch(workspaceSource, /role="switch"|onTogglePhotoRequirement/);
});

runTest('staff operating screen shows read-only indicator and never receives a toggle handler', () => {
  assert.match(staffViewSource, /import \{ TransactionWorkspace \}/);
  assert.match(staffViewSource, /const salesPhotoEvidenceRequired = Boolean\(market\.salesPhotoEvidenceRequired\)/);
  const operatingBlock = section(
    staffViewSource,
    "{workspaceView === 'live' && isOperating && (",
    '當日流水帳 - 營業中或已結束時顯示'
  );
  assert.match(operatingBlock, /<TransactionWorkspace/);
  assert.match(operatingBlock, /salesPhotoEvidenceRequired=\{salesPhotoEvidenceRequired\}/);
  assert.match(operatingBlock, /pendingPhotoCount=\{salesPhotoEvidenceFlow\.pendingCount\}/);
  assert.match(operatingBlock, /onOpenPendingPhotos=\{handleOpenPendingSalesPhotoEvidence\}/);
  assert.doesNotMatch(operatingBlock, /onToggle=\{handleToggleSalesPhotoEvidence\}|updateMarket\(|recordEvent\(/);
});

runTest('plan and npm test include Slice 4 operating UI guardrails', () => {
  assert.match(planSource, /重新安排成交照片設定/);
  assert.match(planSource, /營業畫面只保留緊湊狀態/);
  assert.match(planSource, /員工不需要看到不能操作的設定卡/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-slice4-operating-ui\.test\.ts/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence Slice 4 tests failed`);
  }
}

main();
