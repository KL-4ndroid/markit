import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const flagSource = readProjectFile('lib/sales/photo-evidence-runtime-flags.ts');
const runtimeSource = readProjectFile('lib/sales/photo-evidence-runtime-enqueue.ts');
const addRevenueDialogSource = readProjectFile('components/markets/AddRevenueDialog.tsx');
const pendingWriteReportSource = readProjectFile('lib/sync/local-pending-write-report.ts');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence runtime readiness checklist ===');

runTest('readiness checklist records all prerequisites before production enqueue', () => {
  assert.match(planSource, /Slice 5C-3I Status/);
  assert.match(planSource, /production enqueue readiness checklist/i);
  assert.match(planSource, /runtime flag remains code-only and default off/i);
  assert.match(planSource, /pending-write guards include local pending sales photo evidence/i);
  assert.match(planSource, /local-only fake-indexeddb runtime fixture has passed/i);
  assert.match(planSource, /recovery\/cleanup semantics and diagnostics display are available/i);
  assert.match(planSource, /manual verification scope must be explicitly approved/i);
});

runTest('readiness checklist keeps production enablement blocked', () => {
  assert.match(planSource, /Production runtime enqueue remains blocked/);
  assert.match(planSource, /Do not enable the runtime flag/);
  assert.match(planSource, /Do not add a queue recovery\/cleanup executor/);
  assert.match(planSource, /Do not create Supabase evidence rows from production runtime/);
  assert.match(planSource, /Next Phase Boundary After Slice 6B\/7A\/9A\/9B\/9C/);
  assert.match(planSource, /Recommended next step requiring product confirmation: decide whether to mount the empty\/read-only owner album section/);
  assert.match(planSource, /browser camera\/canvas adapter/);
});

runTest('runtime flag still defaults off and has no external control plane', () => {
  assert.match(flagSource, /\[SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_FLAG\]:\s*false/);
  assert.doesNotMatch(flagSource, /process\.env|NEXT_PUBLIC|localStorage|sessionStorage|remote|supabase/i);
});

runTest('production sale UI still does not force runtime enqueue enablement', () => {
  assert.match(runtimeSource, /isSalesPhotoEvidenceRuntimeEnqueueEnabled/);
  assert.doesNotMatch(addRevenueDialogSource, /isRuntimeEnqueueEnabled:\s*\(\)\s*=>\s*true/);
  assert.doesNotMatch(addRevenueDialogSource, /enqueuePendingSalesPhotoEvidenceCreation\(/);
});

runTest('pending-write guard still blocks unfinished local evidence work', () => {
  assert.match(pendingWriteReportSource, /local_pending_sales_photo_evidence/);
  assert.match(pendingWriteReportSource, /pendingSalesPhotoEvidenceCreationCount/);
  assert.match(pendingWriteReportSource, /salesPhotoEvidencePendingCreations/);
});

runTest('readiness checklist is test-covered without adding runtime mutation wiring', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-runtime-readiness-checklist\.test\.ts/);
  assert.doesNotMatch(planSource, /runtime enqueue enabled in production/i);
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
    throw new Error(`${failed} sales photo evidence runtime readiness checklist tests failed`);
  }
}

main();
