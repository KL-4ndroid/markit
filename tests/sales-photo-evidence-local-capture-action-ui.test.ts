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
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

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

runTest('pending list mounts the action shell but keeps production capture disabled', () => {
  assert.match(dialogSource, /import \{ SalesPhotoEvidenceLocalCaptureAction \}/);
  assert.match(dialogSource, /<SalesPhotoEvidenceLocalCaptureAction[\s\S]*status=\{item\.status\}[\s\S]*captureEnabled=\{false\}/);
  assert.doesNotMatch(dialogSource, /photo-evidence-browser-adapter|captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.doesNotMatch(dialogSource, /putPendingSalesPhotoEvidencePayload|upload|getUserMedia|signedUrl|signed_url|\bR2\b/i);
});

runTest('execution plan and npm test include the local capture action guardrail', () => {
  assert.match(planSource, /Slice 6G Status/);
  assert.match(planSource, /disabled\/local-only capture button UI shell/);
  assert.match(planSource, /captureEnabled=\{false\}/);
  assert.match(planSource, /does not call the browser adapter, write local payloads, upload, request signed reads, call R2, write Supabase, drain queues, or enable runtime enqueue/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-local-capture-action-ui\.test\.ts/);
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
