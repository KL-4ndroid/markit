import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planSource = readFileSync(join(projectRoot, 'docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md'), 'utf8');
const postSaleSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-post-sale.ts'), 'utf8');
const storageSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-pending-creation-storage.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

const productionSaleEntryFiles = [
  'components/sales/QuickTransactionGrid.tsx',
  'components/sales/QuickInteractionButtons.tsx',
  'components/sales/QuickDealModal.tsx',
  'components/sales/CartDrawer.tsx',
];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence runtime enqueue plan ===');

runTest('5C-3B-2 records runtime enqueue as a high-risk boundary before implementation', () => {
  assert.match(planSource, /Slice 5C-3B-2 Status/);
  assert.match(planSource, /Runtime enqueue remains blocked/);
  assert.match(planSource, /high-risk/);
  assert.match(planSource, /feature flag must default off/i);
  assert.match(planSource, /Sale persistence remains the first committed operation/);
  assert.match(planSource, /enqueue failure must not throw/);
  assert.match(planSource, /No drain worker, Supabase evidence insert, camera capture, upload, signed URL, or UI capture prompt is approved/);
});

runTest('recommended runtime path is one wrapper after recordDeal and before any drain behavior', () => {
  assert.match(planSource, /recordDealWithPhotoEvidenceRequirement/);
  assert.match(planSource, /createDexieSalesPhotoEvidencePendingCreationStorage/);
  assert.match(planSource, /`queueId` remains the sale event id/);
  assert.match(planSource, /normal event push may run independently/);
  assert.match(planSource, /evidence drain must wait for the source `deal_closed` event to become synced/);
});

runTest('post-sale wrapper remains dependency-injected and cloud-free', () => {
  assert.match(postSaleSource, /recordDealWithPhotoEvidenceRequirement/);
  assert.match(postSaleSource, /createPendingEvidence\?: CreatePendingSalesPhotoEvidence/);
  assert.doesNotMatch(postSaleSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(postSaleSource, /createDexieSalesPhotoEvidencePendingCreationStorage/);
  assert.doesNotMatch(postSaleSource, /getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
});

runTest('Dexie queue storage remains available while broad production sale entries stay unwired', () => {
  assert.match(storageSource, /createDexieSalesPhotoEvidencePendingCreationStorage/);
  assert.doesNotMatch(storageSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(storageSource, /getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);

  const wiredFiles = productionSaleEntryFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /recordDealWithPhotoEvidenceRequirement|createDexieSalesPhotoEvidencePendingCreationStorage|enqueuePendingSalesPhotoEvidenceCreation/.test(source);
  });

  assert.deepEqual(wiredFiles, []);
});

runTest('only AddRevenueDialog is approved for the disabled runtime wrapper pilot', () => {
  const addRevenueDialogSource = readFileSync(join(projectRoot, 'components/markets/AddRevenueDialog.tsx'), 'utf8');

  assert.match(addRevenueDialogSource, /recordDealWithOptionalSalesPhotoEvidence/);
  assert.match(addRevenueDialogSource, /evidenceContext:\s*createSalesPhotoEvidenceRuntimeContext\(\)/);
});

runTest('full test suite includes runtime enqueue boundary guardrails', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-runtime-enqueue-plan\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence runtime enqueue plan tests failed`);
  }
}

main();
