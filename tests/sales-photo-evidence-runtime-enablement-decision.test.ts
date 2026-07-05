import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planSource = readFileSync(join(projectRoot, 'docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md'), 'utf8');
const flagSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-runtime-flags.ts'), 'utf8');
const wrapperSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-runtime-enqueue.ts'), 'utf8');
const runtimeTestSource = readFileSync(join(projectRoot, 'tests/sales-photo-evidence-runtime-enqueue.test.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence runtime enablement decision ===');

runTest('5C-3B-5 records dependency injection as the only approved test enablement path', () => {
  assert.match(planSource, /Slice 5C-3B-5 Status/);
  assert.match(planSource, /No global test-only flag setter is added/);
  assert.match(planSource, /Existing dependency injection remains the only approved controlled enablement path/);
  assert.match(planSource, /Production flag remains code-only and default off/);
});

runTest('runtime flag module stays immutable and free of external control planes', () => {
  assert.match(flagSource, /Object\.freeze/);
  assert.match(flagSource, /false/);
  assert.doesNotMatch(flagSource, /setSalesPhotoEvidence|enableSalesPhotoEvidence|disableSalesPhotoEvidence|controlled/i);
  assert.doesNotMatch(flagSource, /NEXT_PUBLIC|process\.env|localStorage|sessionStorage|remoteConfig|fetch\(/);
});

runTest('wrapper exposes dependency injection without reading a mutable test harness', () => {
  assert.match(wrapperSource, /deps\?: Partial<SalesPhotoEvidenceRuntimeDeps>/);
  assert.match(wrapperSource, /isRuntimeEnqueueEnabled/);
  assert.doesNotMatch(wrapperSource, /setSalesPhotoEvidence|controlledTest|testHarness|localStorage|sessionStorage/);
});

runTest('runtime tests exercise enabled behavior through injected dependencies only', () => {
  assert.match(runtimeTestSource, /makeDeps\(\{ enabled: true/);
  assert.match(runtimeTestSource, /makeDeps\(\{ enabled: false/);
  assert.doesNotMatch(runtimeTestSource, /setSalesPhotoEvidence|controlledTest|testHarness/);
});

runTest('full test suite includes runtime enablement decision guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-runtime-enablement-decision\.test\.ts/);
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
