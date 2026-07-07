import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const actionSource = readProjectFile('components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx');
const dialogSource = readProjectFile('components/markets/SalesPhotoEvidencePendingListDialog.tsx');
const ownerPageSource = readProjectFile('app/markets/[id]/page.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence local capture action UI ===');

runTest('local capture action is prop-driven and disabled by default', () => {
  assert.match(actionSource, /export function SalesPhotoEvidenceLocalCaptureAction/);
  assert.match(actionSource, /captureEnabled = false/);
  assert.match(actionSource, /const canCapture = captureEnabled && eligible && typeof onCapture === 'function' && !isCapturing/);
  assert.match(actionSource, /status === 'waiting_for_event_sync' \|\| status === 'failed_retryable'/);
  assert.match(actionSource, /disabled=\{!canCapture\}/);
});

runTest('local capture action does not import runtime adapter storage cloud or sync paths', () => {
  assert.doesNotMatch(actionSource, /photo-evidence-browser-adapter|captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.doesNotMatch(actionSource, /photo-evidence-pending-payload-storage|putPendingSalesPhotoEvidencePayload|db\.|supabase/i);
  assert.doesNotMatch(actionSource, /upload|getUserMedia|signedUrl|signed_url|\bR2\b|recordEvent|recordDeal|enqueue|drain/i);
  assert.doesNotMatch(actionSource, /localStorage|sessionStorage|fetch\(|XMLHttpRequest/);
});

runTest('pending list mounts the action shell with explicit capture props and no adapter import', () => {
  assert.match(dialogSource, /import \{ SalesPhotoEvidenceLocalCaptureAction \}/);
  assert.match(dialogSource, /captureEnabled\?: boolean/);
  assert.match(dialogSource, /capturingQueueId\?: string \| null/);
  assert.match(dialogSource, /isLocalCaptureAllowed\?: \(item: SalesPhotoEvidencePendingCreationListItem\) => boolean/);
  assert.match(dialogSource, /onCaptureLocal\?: \(item: SalesPhotoEvidencePendingCreationListItem\) => void \| Promise<void>/);
  assert.match(dialogSource, /captureEnabled = false/);
  assert.match(dialogSource, /<SalesPhotoEvidenceLocalCaptureAction[\s\S]*status=\{item\.status\}[\s\S]*captureEnabled=\{captureEnabled && \(isLocalCaptureAllowed\?\.\(item\) \?\? true\)\}/);
  assert.match(dialogSource, /isCapturing=\{capturingQueueId === item\.queueId\}/);
  assert.match(dialogSource, /onCapture=\{onCaptureLocal \? \(\) => void onCaptureLocal\(item\) : undefined\}/);
  assert.doesNotMatch(dialogSource, /photo-evidence-browser-adapter|captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.doesNotMatch(dialogSource, /putPendingSalesPhotoEvidencePayload|upload|getUserMedia|signedUrl|signed_url|\bR2\b/i);
});

runTest('staff detail enables only local capture while owner detail stays disabled', () => {
  assert.match(staffViewSource, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.match(staffViewSource, /captureEnabled=\{true\}/);
  assert.match(staffViewSource, /isLocalCaptureAllowed=\{isLocalSalesPhotoEvidenceCaptureAllowed\}/);
  assert.match(staffViewSource, /onCaptureLocal=\{handleCaptureLocalSalesPhotoEvidence\}/);
  assert.match(staffViewSource, /item\.capturedByStaffId === user\?\.id/);
  assert.match(staffViewSource, /照片已暫存在本機，尚未上傳雲端/);
  assert.doesNotMatch(staffViewSource, /upload|getUserMedia|signedUrl|signed_url|\bR2\b|drainSalesPhotoEvidencePendingCreations/i);

  assert.doesNotMatch(ownerPageSource, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.doesNotMatch(ownerPageSource, /captureEnabled=\{true\}/);
  assert.doesNotMatch(ownerPageSource, /onCaptureLocal=\{/);
});

runTest('execution plan and npm test include the local capture action guardrails', () => {
  assert.match(planSource, /Slice 6G Status/);
  assert.match(planSource, /disabled\/local-only capture button UI shell/);
  assert.match(planSource, /Slice 6H Status/);
  assert.match(planSource, /staff pending evidence dialog enables local-only capture/);
  assert.match(planSource, /Owner market detail remains disabled/);
  assert.match(planSource, /does not call the browser adapter, write local payloads, upload, request signed reads, call R2, write Supabase, drain queues, or enable runtime enqueue/);
  assert.match(planSource, /does not upload, request signed reads, call R2, write Supabase, drain queues, enable runtime enqueue/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-local-capture-action-ui\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence local capture action UI tests failed`);
  }
}

main();
