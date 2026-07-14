import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const captureActionSource = readProjectFile('components/markets/SalesPhotoEvidenceLocalCaptureAction.tsx');
const uploadActionSource = readProjectFile('components/markets/SalesPhotoEvidenceManualUploadAction.tsx');
const dialogSource = readProjectFile('components/markets/SalesPhotoEvidencePendingListDialog.tsx');
const ownerPageSource = readProjectFile('app/markets/[id]/page.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence local capture and manual upload action UI ===');

runTest('local capture action remains prop-driven and disabled by default', () => {
  assert.match(captureActionSource, /export function SalesPhotoEvidenceLocalCaptureAction/);
  assert.match(captureActionSource, /captureEnabled = false/);
  assert.match(captureActionSource, /const canCapture = captureEnabled && eligible && typeof onCapture === 'function' && !isCapturing/);
  assert.match(captureActionSource, /status === 'waiting_for_event_sync' \|\| status === 'failed_retryable'/);
  assert.match(captureActionSource, /disabled=\{!canCapture\}/);
  assert.match(captureActionSource, /拍攝\/選擇照片/);
});

runTest('manual upload action is prop-driven and does not own upload side effects', () => {
  assert.match(uploadActionSource, /export function SalesPhotoEvidenceManualUploadAction/);
  assert.match(uploadActionSource, /uploadEnabled = false/);
  assert.match(uploadActionSource, /const canUpload = uploadEnabled && eligible && typeof onUpload === 'function' && !isUploading/);
  assert.match(uploadActionSource, /status === 'waiting_for_event_sync' \|\| status === 'failed_retryable'/);
  assert.doesNotMatch(uploadActionSource, /photo-evidence-manual-upload-client|fetch\(|supabase|db\.|@aws-sdk|R2_BUCKET|service_role/i);
});

runTest('pending list delegates capture and upload by props without importing runtime adapters', () => {
  assert.match(dialogSource, /import \{ SalesPhotoEvidenceLocalCaptureAction \}/);
  assert.match(dialogSource, /import \{ SalesPhotoEvidenceManualUploadAction \}/);
  assert.match(dialogSource, /captureEnabled\?: boolean/);
  assert.match(dialogSource, /uploadEnabled\?: boolean/);
  assert.match(dialogSource, /capturingQueueId\?: string \| null/);
  assert.match(dialogSource, /uploadingQueueId\?: string \| null/);
  assert.match(dialogSource, /onCaptureLocal\?: \(item: SalesPhotoEvidencePendingCreationListItem\) => void \| Promise<void>/);
  assert.match(dialogSource, /onUploadManual\?: \(item: SalesPhotoEvidencePendingCreationListItem\) => void \| Promise<void>/);
  assert.match(dialogSource, /captureEnabled = false/);
  assert.match(dialogSource, /uploadEnabled = false/);
  assert.doesNotMatch(dialogSource, /photo-evidence-browser-adapter|photo-evidence-manual-upload-client|fetch\(|supabase|db\.|@aws-sdk|R2_BUCKET|service_role/i);
  assert.match(dialogSource, /成交紀錄已保留/);
  assert.doesNotMatch(dialogSource, /銷售事件：\{item\.saleEventId\}|錯誤：\{item\.lastErrorMessage\}/);
});

runTest('owner and staff details both contain scoped local capture and manual upload', () => {
  for (const source of [ownerPageSource, staffViewSource]) {
    assert.match(source, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
    assert.match(source, /uploadPendingSalesPhotoEvidenceManually/);
    assert.match(source, /captureEnabled=\{true\}/);
    assert.match(source, /uploadEnabled=\{true\}/);
    assert.match(source, /isLocalCaptureAllowed=\{isLocalSalesPhotoEvidenceCaptureAllowed\}/);
    assert.match(source, /onCaptureLocal=\{handleCaptureLocalSalesPhotoEvidence\}/);
    assert.match(source, /onUploadManual=\{handleUploadManualSalesPhotoEvidence\}/);
    assert.doesNotMatch(source, /getUserMedia|signedUrl|signed_url|\bR2\b|drainSalesPhotoEvidencePendingCreations/i);
  }

  assert.match(staffViewSource, /item\.capturedByStaffId === user\?\.id/);
  assert.match(ownerPageSource, /item\.ownerId === ownerSalesPhotoEvidenceActorId/);
  assert.match(ownerPageSource, /item\.marketId === marketId/);
  assert.match(ownerPageSource, /SalesPhotoEvidencePostSalePrompt/);
});

runTest('execution plan and npm test include the local capture guardrails', () => {
  assert.match(planSource, /Slice 6G Status/);
  assert.match(planSource, /Slice 6H Status/);
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
