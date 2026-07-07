import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const flagSource = readProjectFile('lib/sales/photo-evidence-runtime-flags.ts');
const wrapperSource = readProjectFile('lib/sales/photo-evidence-runtime-enqueue.ts');
const addRevenueDialogSource = readProjectFile('components/markets/AddRevenueDialog.tsx');
const ownerPageSource = readProjectFile('app/markets/[id]/page.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

console.log('\n=== Sales photo evidence runtime verification plan ===');

runTest('5C-3E records a plan-only runtime verification boundary', () => {
  assert.match(planSource, /Slice 5C-3E Status/);
  assert.match(planSource, /runtime enqueue verification plan only/i);
  assert.match(planSource, /No runtime flag change is made/);
  assert.match(planSource, /No local fixture, hidden UI, production enqueue, queue cleanup, or retry action is implemented/);
  assert.match(planSource, /Guarded by `tests\/sales-photo-evidence-runtime-verification-plan\.test\.ts`/);
});

runTest('recommended future verification remains local-only and explicitly approved', () => {
  assert.match(planSource, /Recommended future verification path/);
  assert.match(planSource, /local-only disposable fixture/i);
  assert.match(planSource, /injected dependencies/i);
  assert.match(planSource, /explicit approval/i);
  assert.match(planSource, /must not call Supabase, R2, signed URL, upload, drain, or queue cleanup/i);
});

runTest('runtime flag stays code-only disabled with no external control plane', () => {
  assert.match(flagSource, /Object\.freeze/);
  assert.match(flagSource, /false/);
  assert.doesNotMatch(flagSource, /setSalesPhotoEvidence|enableSalesPhotoEvidence|disableSalesPhotoEvidence|controlled|fixture/i);
  assert.doesNotMatch(flagSource, /NEXT_PUBLIC|process\.env|localStorage|sessionStorage|remoteConfig|fetch\(/);
});

runTest('runtime wrapper remains injectable but production callers do not force enablement', () => {
  assert.match(wrapperSource, /deps\?: Partial<SalesPhotoEvidenceRuntimeDeps>/);
  assert.match(wrapperSource, /isRuntimeEnqueueEnabled/);
  assert.match(wrapperSource, /enqueuePendingSalesPhotoEvidenceCreation/);

  for (const source of [addRevenueDialogSource, ownerPageSource, staffViewSource]) {
    assert.doesNotMatch(source, /isRuntimeEnqueueEnabled:\s*\(\)\s*=>\s*true/);
    assert.doesNotMatch(source, /createPendingEvidence:\s*async|enqueuePendingSalesPhotoEvidenceCreation/);
    assert.doesNotMatch(source, /enableSalesPhotoEvidence|disableSalesPhotoEvidence|controlledTest|testHarness/i);
  }
});

runTest('full test suite includes runtime verification plan guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-runtime-verification-plan\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence runtime verification plan tests failed`);
  }
}

main();
