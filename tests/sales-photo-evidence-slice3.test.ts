import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  normalizeSalesPhotoEvidenceRequired,
} from '../lib/sales/photo-evidence-settings';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function section(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);

  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

const settingsServiceSource = readProjectFile('lib/supabase/settings.ts');
const settingsHelperSource = readProjectFile('lib/sales/photo-evidence-settings.ts');
const settingsPageSource = readProjectFile('app/settings/page.tsx');
const settingsCardSource = readProjectFile('components/settings/SalesPhotoEvidenceSettingsCard.tsx');
const addMarketFormSource = readProjectFile('components/markets/AddMarketForm.tsx');
const marketDetailSource = readProjectFile('app/markets/[id]/page.tsx');
const dataMappersSource = readProjectFile('lib/data-mappers.ts');
const eventsSource = readProjectFile('lib/db/events.ts');
const typesSource = readProjectFile('types/db.ts');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

console.log('\n=== Sales photo evidence Slice 3 ===');

runTest('default setting helper stays owner settings only and normalizes fail-closed', () => {
  assert.equal(normalizeSalesPhotoEvidenceRequired(true), true);
  assert.equal(normalizeSalesPhotoEvidenceRequired(false), false);
  assert.equal(normalizeSalesPhotoEvidenceRequired('true'), false);
  assert.equal(normalizeSalesPhotoEvidenceRequired(1), false);

  assert.match(settingsServiceSource, /default_sales_photo_evidence_required\?: boolean \| null/);
  assert.match(settingsServiceSource, /default_sales_photo_evidence_required: false/);
  assert.match(settingsHelperSource, /getUserSettings/);
  assert.match(settingsHelperSource, /saveUserSettings/);
  assert.match(settingsHelperSource, /default_sales_photo_evidence_required/);
  assert.doesNotMatch(settingsHelperSource, /sale_photo_evidence|recordEvent|@\/lib\/db|R2|upload|signed/i);
});

runTest('settings page exposes owner-only sales photo evidence default card', () => {
  assert.match(settingsPageSource, /import \{ SalesPhotoEvidenceSettingsCard \}/);
  assert.match(settingsPageSource, /\{!isStaff && <SalesPhotoEvidenceSettingsCard \/>}/);
  assert.match(settingsCardSource, /loadDefaultSalesPhotoEvidenceRequired/);
  assert.match(settingsCardSource, /saveDefaultSalesPhotoEvidenceRequired/);
  assert.match(settingsCardSource, /新市集預設要求照片證明/);
  assert.match(settingsCardSource, /只影響之後新增的市集，不會修改既有市集/);
});

runTest('new markets inherit owner default through market_created payload', () => {
  assert.match(typesSource, /salesPhotoEvidenceRequired\?: boolean/);
  assert.match(addMarketFormSource, /loadDefaultSalesPhotoEvidenceRequired/);
  assert.match(addMarketFormSource, /salesPhotoEvidenceRequired: false/);
  assert.match(addMarketFormSource, /setFormData\(prev => \{[\s\S]*salesPhotoEvidenceRequired: required/);
  assert.match(eventsSource, /salesPhotoEvidenceRequired: payload\.salesPhotoEvidenceRequired \?\? false/);
});

runTest('market detail exposes owner-only market-level toggle through market_updated', () => {
  const staffReturnIndex = marketDetailSource.indexOf('return <StaffMarketDetailView market={market} />');
  const toggleIndex = marketDetailSource.indexOf('handleToggleSalesPhotoEvidence');
  const cardIndex = marketDetailSource.indexOf('銷售照片證明', staffReturnIndex);

  assert.ok(staffReturnIndex > 0, 'staff route must return before owner UI');
  assert.ok(toggleIndex > 0, 'toggle handler must exist');
  assert.ok(cardIndex > staffReturnIndex, 'owner toggle card must render after staff return');
  assert.match(marketDetailSource, /import \{ useMarket, updateMarket,/);
  assert.match(marketDetailSource, /await updateMarket\(marketId,[\s\S]*salesPhotoEvidenceRequired: nextRequired/);
  assert.match(marketDetailSource, /此市集要求成交照片證明/);
  assert.match(marketDetailSource, /既有待補項目不會因為關閉而自動刪除/);
});

runTest('cloud/local mappers preserve the new market flag without changing sync flow', () => {
  assert.match(dataMappersSource, /salesPhotoEvidenceRequired: 'sales_photo_evidence_required'/);
  assert.match(dataMappersSource, /sales_photo_evidence_required: payload\.salesPhotoEvidenceRequired \?\? payload\.sales_photo_evidence_required/);
  assert.match(dataMappersSource, /salesPhotoEvidenceRequired: row\.salesPhotoEvidenceRequired \?\? row\.sales_photo_evidence_required \?\? false/);
  assert.match(dataMappersSource, /marketUpdatesToSnake/);
  assert.match(dataMappersSource, /marketUpdatesToCamel/);
});

runTest('Slice 3 does not start capture, R2, or evidence row creation', () => {
  for (const [label, source] of [
    ['settings card', settingsCardSource],
    ['add market form', addMarketFormSource],
    ['market detail', marketDetailSource],
  ] as const) {
    assert.doesNotMatch(source, /sale_photo_evidence/i, label);
    assert.doesNotMatch(source, /r2_object_key|r2_thumbnail_key|signedUrl|signed URL|uploadEvidence|capturePhoto/i, label);
    assert.doesNotMatch(source, /navigator\.mediaDevices|getUserMedia|<input[^>]+type=["']file["']/i, label);
  }
});

runTest('plan records 055 execution and Slice 3 runtime boundary', () => {
  const slice3Block = section(planSource, '### Slice 3: Owner Settings and Market Detail Toggle', '### Slice 4: Active Operating Toggle and Indicator');
  assert.match(planSource, /055 has been manually executed/);
  assert.match(slice3Block, /Status:/);
  assert.match(slice3Block, /does not create `sale_photo_evidence` rows/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-slice3\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence Slice 3 tests failed`);
  }
}

main();
