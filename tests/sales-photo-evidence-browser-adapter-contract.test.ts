import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifySalesPhotoEvidenceBrowserAdapterReadiness,
  classifySalesPhotoEvidenceBrowserCaptureFailure,
  createSalesPhotoEvidenceBrowserAdapterPlan,
  SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT,
  SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT_VERSION,
} from '../lib/sales/photo-evidence-browser-adapter-contract';
import { planSalesPhotoEvidenceCaptureCompression } from '../lib/sales/photo-evidence-capture-compression';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const adapterContractSource = readProjectFile('lib/sales/photo-evidence-browser-adapter-contract.ts');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence browser adapter contract ===');

runTest('browser adapter contract is explicit and non-mutating', () => {
  assert.equal(SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT_VERSION, 'slice-6b-browser-adapter-spec-only');
  assert.deepEqual(SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT, {
    version: 'slice-6b-browser-adapter-spec-only',
    requiresSecureContext: true,
    requiresMediaCapture: true,
    requiresImageProcessing: true,
    outputMustBePolicyChecked: true,
    failureMustKeepEvidencePending: true,
    mustNotWriteCloudMetadata: true,
    mustNotUploadObject: true,
  });
});

runTest('readiness classifier fails closed on missing browser capabilities', () => {
  assert.deepEqual(
    classifySalesPhotoEvidenceBrowserAdapterReadiness({
      secureContext: false,
      mediaCaptureAvailable: true,
      imageProcessingAvailable: true,
    }),
    {
      ready: false,
      reason: 'insecure_context',
      message: 'Photo evidence capture requires a secure browser context.',
    }
  );

  assert.equal(
    classifySalesPhotoEvidenceBrowserAdapterReadiness({
      secureContext: true,
      mediaCaptureAvailable: false,
      imageProcessingAvailable: true,
    }).reason,
    'media_capture_unavailable'
  );

  assert.equal(
    classifySalesPhotoEvidenceBrowserAdapterReadiness({
      secureContext: true,
      mediaCaptureAvailable: true,
      imageProcessingAvailable: false,
    }).reason,
    'image_processing_unavailable'
  );
});

runTest('readiness classifier allows the future adapter only when all capabilities are present', () => {
  assert.deepEqual(
    classifySalesPhotoEvidenceBrowserAdapterReadiness({
      secureContext: true,
      mediaCaptureAvailable: true,
      imageProcessingAvailable: true,
    }),
    {
      ready: true,
      reason: 'browser_adapter_supported',
    }
  );
});

runTest('adapter plan uses existing capture compression precheck and rejects failed prechecks', () => {
  const supportedCapture = planSalesPhotoEvidenceCaptureCompression({
    mimeType: 'image/jpeg',
    fileSizeBytes: 2_000_000,
    width: 4032,
    height: 3024,
  });

  const planDecision = createSalesPhotoEvidenceBrowserAdapterPlan({
    captureDecision: supportedCapture,
  });

  assert.equal(planDecision.action, 'prepare_browser_adapter');
  assert.equal(planDecision.reason, 'compression_plan_ready');

  const rejectedCapture = planSalesPhotoEvidenceCaptureCompression({
    mimeType: 'image/gif',
    fileSizeBytes: 100_000,
    width: 640,
    height: 480,
  });

  assert.deepEqual(createSalesPhotoEvidenceBrowserAdapterPlan({ captureDecision: rejectedCapture }), {
    action: 'reject_browser_adapter',
    reason: 'capture_precheck_failed',
    message: 'Captured image type is not supported for sales photo evidence.',
  });
});

runTest('capture failure classification keeps evidence pending and prevents upload side effects', () => {
  assert.deepEqual(classifySalesPhotoEvidenceBrowserCaptureFailure('permission_denied'), {
    reason: 'permission_denied',
    severity: 'user_actionable',
    shouldKeepEvidencePending: true,
    shouldWriteCloudMetadata: false,
    shouldUploadObject: false,
  });

  assert.equal(classifySalesPhotoEvidenceBrowserCaptureFailure('adapter_unavailable').severity, 'blocked');
  assert.equal(classifySalesPhotoEvidenceBrowserCaptureFailure('compression_failed').severity, 'retryable');
  assert.equal(classifySalesPhotoEvidenceBrowserCaptureFailure('output_policy_rejected').shouldKeepEvidencePending, true);
});

runTest('browser adapter contract source does not call browser cloud db or storage APIs', () => {
  assert.doesNotMatch(adapterContractSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(adapterContractSource, /@\/lib\/supabase|supabase|from\(/i);
  assert.doesNotMatch(
    adapterContractSource,
    /fetch\(|XMLHttpRequest|navigator\.(mediaDevices|onLine)|window\.(document|navigator|localStorage|sessionStorage|indexedDB)|document\.(createElement|querySelector|body)|canvas|getUserMedia/i
  );
  assert.doesNotMatch(adapterContractSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/);
  assert.doesNotMatch(adapterContractSource, /\.(insert|update|delete|put|bulkPut|clear)\s*\(/);
  assert.doesNotMatch(adapterContractSource, /S3Client|PutObjectCommand|GetObjectCommand|createPresignedPost|getSignedUrl|\bR2\b/i);
});

runTest('execution plan records Slice 6B as browser adapter spec only', () => {
  assert.match(planSource, /Slice 6B Status/);
  assert.match(planSource, /browser adapter contract\/spec only/);
  assert.match(planSource, /does not call browser media APIs, canvas APIs, IndexedDB, Supabase, R2, upload, signed URLs, or production runtime enqueue/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-browser-adapter-contract\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence browser adapter contract tests failed`);
  }
}

main();
