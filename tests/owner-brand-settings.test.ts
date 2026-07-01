import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  OWNER_BRAND_NAME_FALLBACK,
  OWNER_BRAND_NAME_MAX_LENGTH,
  getOwnerBrandNameDisplay,
  normalizeOwnerBrandName,
  readCachedOwnerBrandName,
} from '../lib/owner-brand';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const homePageSource = readFileSync(join(projectRoot, 'app/page.tsx'), 'utf8');
const settingsPageSource = readFileSync(join(projectRoot, 'app/settings/page.tsx'), 'utf8');
const brandCardSource = readFileSync(join(projectRoot, 'components/settings/OwnerBrandSettingsCard.tsx'), 'utf8');
const reportPageSource = readFileSync(join(projectRoot, 'app/reports/settlement/page.tsx'), 'utf8');
const reportModelSource = readFileSync(join(projectRoot, 'lib/reporting/settlement-report.ts'), 'utf8');
const previewModelSource = readFileSync(join(projectRoot, 'lib/reporting/settlement-report-preview.ts'), 'utf8');
const settingsServiceSource = readFileSync(join(projectRoot, 'lib/supabase/settings.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Owner brand settings ===');

runTest('brand name normalization is conservative and has a safe fallback', () => {
  assert.equal(OWNER_BRAND_NAME_FALLBACK, '我的品牌');
  assert.equal(normalizeOwnerBrandName('  小島週末製作所  '), '小島週末製作所');
  assert.equal(normalizeOwnerBrandName(''), null);
  assert.equal(normalizeOwnerBrandName('     '), null);
  assert.equal(normalizeOwnerBrandName(null), null);
  assert.equal(getOwnerBrandNameDisplay(''), OWNER_BRAND_NAME_FALLBACK);
  assert.equal(normalizeOwnerBrandName('a'.repeat(100))?.length, OWNER_BRAND_NAME_MAX_LENGTH);
  assert.equal(readCachedOwnerBrandName('owner-1'), null);
});

runTest('owner settings page exposes owner-only brand name editor', () => {
  assert.match(settingsServiceSource, /brand_name\?: string \| null/);
  assert.match(settingsPageSource, /import \{ OwnerBrandSettingsCard \}/);
  assert.match(settingsPageSource, /\{!isStaff && <OwnerBrandSettingsCard \/>}/);
  assert.match(brandCardSource, /saveOwnerBrandName/);
  assert.match(brandCardSource, /loadOwnerBrandName/);
  assert.match(brandCardSource, /品牌名稱/);
  assert.match(brandCardSource, /這個名稱會顯示在首頁與 owner 結算報告中/);
});

runTest('home page uses owner brand name without changing staff branch semantics', () => {
  assert.match(homePageSource, /const \[ownerBrandName, setOwnerBrandName\]/);
  assert.match(homePageSource, /if \(!user\?\.id \|\| isStaff\)/);
  assert.match(homePageSource, /loadOwnerBrandName\(user\.id\)/);
  assert.match(homePageSource, /OWNER_BRAND_NAME_UPDATED_EVENT/);
  assert.match(homePageSource, /\{ownerBrandName}/);
  assert.doesNotMatch(homePageSource, /<h1[^>]*>\s*出攤本 - BoothBook\s*<\/h1>/);
});

runTest('settlement report model and preview carry owner brand name', () => {
  assert.match(reportModelSource, /brandName\?: string/);
  assert.match(reportModelSource, /brandName: string/);
  assert.match(reportModelSource, /cover:[\s\S]*brandName: string/);
  assert.match(reportModelSource, /title: `\$\{input\.brandName} \$\{input\.period\.label} Settlement Report`/);
  assert.match(previewModelSource, /header:[\s\S]*brandName: string/);
  assert.match(previewModelSource, /brandName: report\.brandName/);
  assert.match(reportPageSource, /brandName,\s*markets,/);
  assert.match(reportPageSource, /preview\.header\.brandName/);
});

runTest('brand name wiring stays out of sync recovery and report file generation', () => {
  for (const source of [brandCardSource, reportPageSource]) {
    assert.doesNotMatch(source, /@\/lib\/sync|@\/lib\/db\/recovery|@\/lib\/db\/events/);
    assert.doesNotMatch(source, /PDF|Excel|CSV|download|下載|匯出/);
    assert.doesNotMatch(source, /db\.(events|markets|products|dailyStats)\.(add|put|update|delete|clear|bulkAdd|bulkPut|bulkDelete)/);
  }
  assert.doesNotMatch(homePageSource, /@\/lib\/db\/recovery|@\/lib\/db\/events/);
});

runTest('full test suite includes owner brand settings guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/owner-brand-settings\.test\.ts/);
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
    throw new Error(`${failed} owner brand settings tests failed`);
  }
}

main();
