import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSalesPhotoEvidenceRuntimeGateStatus } from '../lib/sales/photo-evidence-runtime-flags';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_REVISED_EXECUTION_PLAN_2026_07_14.md');
const flagSource = readProjectFile('lib/sales/photo-evidence-runtime-flags.ts');
const runtimeSource = readProjectFile('lib/sales/photo-evidence-runtime-enqueue.ts');
const addRevenueDialogSource = readProjectFile('components/markets/AddRevenueDialog.tsx');
const pendingWriteReportSource = readProjectFile('lib/sync/local-pending-write-report.ts');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence runtime readiness checklist ===');

runTest('readiness checklist records all prerequisites before production enqueue', () => {
  assert.match(planSource, /Production runtime enqueue requires all three public production values/);
  assert.match(planSource, /SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION=1/);
  assert.match(planSource, /SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION=1/);
  assert.match(planSource, /SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION=1/);
  assert.match(planSource, /Rollback Plan/);
});

runTest('readiness checklist keeps production behind independent client and server gates', () => {
  assert.match(planSource, /NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ALLOW_PRODUCTION=1/);
  assert.match(planSource, /Production test page remains unavailable/);
  assert.match(planSource, /Turn off runtime enqueue/);
  assert.match(planSource, /Keep existing local pending rows and binary payloads intact/);
});

runTest('runtime gate defaults production off and requires explicit dual opt-in', () => {
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'production',
    explicitSetting: '1',
  }).enabled, false);
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'production',
    explicitSetting: '1',
    allowProductionSetting: '1',
  }).enabled, true);
  assert.match(flagSource, /production_locked/);
  assert.match(flagSource, /production_enabled/);
  assert.doesNotMatch(flagSource, /localStorage|sessionStorage|remoteConfig|fetch\(|supabase/i);
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
  assert.match(pendingWriteReportSource, /pendingSalesPhotoEvidencePayloadCount/);
  assert.match(pendingWriteReportSource, /salesPhotoEvidencePendingPayloads/);
});

runTest('readiness checklist is test-covered without adding runtime mutation wiring', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-runtime-readiness-checklist\.test\.ts/);
  assert.doesNotMatch(runtimeSource, /isRuntimeEnqueueEnabled:\s*\(\)\s*=>\s*true/);
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
