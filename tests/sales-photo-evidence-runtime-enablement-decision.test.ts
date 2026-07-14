import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSalesPhotoEvidenceRuntimeGateStatus } from '../lib/sales/photo-evidence-runtime-flags';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planSource = readFileSync(join(projectRoot, 'docs/SALES_PHOTO_EVIDENCE_REVISED_EXECUTION_PLAN_2026_07_14.md'), 'utf8');
const flagSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-runtime-flags.ts'), 'utf8');
const wrapperSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-runtime-enqueue.ts'), 'utf8');
const runtimeTestSource = readFileSync(join(projectRoot, 'tests/sales-photo-evidence-runtime-enqueue.test.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence runtime enablement decision ===');

runTest('revised plan records local staging and production runtime boundaries', () => {
  assert.match(planSource, /NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ENABLED=1/);
  assert.match(planSource, /NEXT_PUBLIC_APP_ENV=staging/);
  assert.match(planSource, /Production remains locked off/);
  assert.match(planSource, /debug\/sales-photo-evidence/);
});

runTest('runtime gate is deterministic and free of mutable control planes', () => {
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({ nodeEnv: 'development' }).enabled, true);
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'staging',
    explicitSetting: '1',
  }).enabled, true);
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'production',
    explicitSetting: '1',
  }).enabled, false);
  assert.doesNotMatch(flagSource, /setSalesPhotoEvidence|enableSalesPhotoEvidence|disableSalesPhotoEvidence|controlled/i);
  assert.doesNotMatch(flagSource, /localStorage|sessionStorage|remoteConfig|fetch\(/);
});

runTest('wrapper exposes dependency injection without reading a mutable test harness', () => {
  assert.match(wrapperSource, /deps\?: Partial<SalesPhotoEvidenceRuntimeDeps>/);
  assert.match(wrapperSource, /isRuntimeEnqueueEnabled/);
  assert.doesNotMatch(wrapperSource, /setSalesPhotoEvidence|controlledTest|testHarness|localStorage|sessionStorage/);
});

runTest('runtime tests cover injected behavior and environment policy', () => {
  assert.match(runtimeTestSource, /makeDeps\(\{ enabled: true/);
  assert.match(runtimeTestSource, /makeDeps\(\{ enabled: false/);
  assert.match(runtimeTestSource, /production_locked/);
  assert.match(runtimeTestSource, /publicAppEnv: 'staging'/);
  assert.doesNotMatch(runtimeTestSource, /setSalesPhotoEvidence|controlledTest|testHarness/);
});

runTest('full test suite includes runtime enablement decision guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-runtime-enablement-decision\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence runtime enablement decision tests failed`);
  }
}

main();
