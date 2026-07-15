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
const dialogSource = readProjectFile('components/markets/SalesPhotoEvidenceFlowDialog.tsx');
const pendingTaskSource = readProjectFile('components/markets/SalesPhotoEvidencePendingTaskCard.tsx');
const flowHookSource = readProjectFile('hooks/useSalesPhotoEvidenceFlow.ts');
const ownerPageSource = readProjectFile('app/markets/[id]/page.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_CHECKOUT_PHOTO_EVIDENCE_UIUX_OPTIMIZATION_PLAN_2026_07_15.md');
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

runTest('single flow dialog delegates capture and upload without owning runtime adapters', () => {
  assert.match(dialogSource, /export function SalesPhotoEvidenceFlowDialog/);
  assert.match(dialogSource, /onCapture: \(/);
  assert.match(dialogSource, /onUpload: \(/);
  assert.match(dialogSource, /onPreview: \(/);
  assert.match(dialogSource, /SalesPhotoEvidencePendingTaskCard/);
  assert.doesNotMatch(dialogSource, /photo-evidence-browser-adapter|photo-evidence-manual-upload-client|fetch\(|supabase|db\.|@aws-sdk|R2_BUCKET|service_role/i);
  assert.doesNotMatch(dialogSource, /SalesPhotoEvidencePendingListDialog|SalesPhotoEvidenceCapturePreviewDialog|SalesPhotoEvidencePostSalePrompt/);
});

runTest('capture flow stays in one centered accessible dialog with preview and retry actions', () => {
  assert.match(dialogSource, /import \{ Dialog, DialogPanel, DialogTitle \} from '@headlessui\/react'/);
  assert.match(dialogSource, /fixed inset-0 flex justify-center p-4/);
  assert.match(dialogSource, /self-center/);
  assert.match(dialogSource, /URL\.createObjectURL\(payload\.image\.blob\)/);
  assert.match(dialogSource, /拍照/);
  assert.match(dialogSource, /從相簿選擇/);
  assert.match(dialogSource, /使用這張照片/);
  assert.match(dialogSource, /重新上傳/);
  assert.match(dialogSource, /safe-area-inset-bottom/);
  assert.doesNotMatch(dialogSource, /items-end/);
});

runTest('owner and staff share one scoped photo flow controller', () => {
  for (const source of [ownerPageSource, staffViewSource]) {
    assert.match(source, /useSalesPhotoEvidenceFlow/);
    assert.match(source, /SalesPhotoEvidenceFlowDialog/);
    assert.match(source, /state=\{salesPhotoEvidenceFlow\.state\}/);
    assert.match(source, /onCapture=\{\(item, source\) => void salesPhotoEvidenceFlow\.capture\(item, source\)\}/);
    assert.match(source, /onUpload=\{\(item, payload\) => void salesPhotoEvidenceFlow\.upload\(item, payload\)\}/);
    assert.doesNotMatch(source, /captureAndStoreSalesPhotoEvidenceWithFileInput|uploadPendingSalesPhotoEvidenceManually/);
    assert.doesNotMatch(source, /SalesPhotoEvidencePendingListDialog|SalesPhotoEvidenceCapturePreviewDialog|SalesPhotoEvidencePostSalePrompt/);
  }

  assert.match(flowHookSource, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.match(flowHookSource, /uploadPendingSalesPhotoEvidenceManually/);
  assert.match(flowHookSource, /reduceSaleCompletionFlow/);
  assert.match(staffViewSource, /item\.capturedByStaffId === user\?\.id/);
  assert.match(ownerPageSource, /item\.ownerId === ownerSalesPhotoEvidenceActorId/);
  assert.match(ownerPageSource, /item\.marketId === marketId/);
});

runTest('execution plan and npm test include the local capture guardrails', () => {
  assert.match(planSource, /單一成交完成視窗/);
  assert.match(planSource, /Headless UI Dialog/);
  assert.match(pendingTaskSource, /getPendingSalesPhotoEvidencePayload\(item\.queueId\)/);
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
