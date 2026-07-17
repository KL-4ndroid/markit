/**
 * P5 Product detail direct-route staff permission tests.
 *
 * The product list page already gates manager edits. This keeps /products/detail/?id=...
 * from becoming a direct-URL bypass for staff roles.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const productDetailSource = readFileSync(
  join(projectRoot, 'components/products/ProductDetailScreen.tsx'),
  'utf-8'
);

function matchCount(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

runTest('ProductDetailPage derives staff product edit capability', () => {
  assert.match(
    productDetailSource,
    /import\s*\{\s*useUserRole\s*\}\s*from\s*['"]@\/hooks\/useUserRole['"]/
  );
  assert.match(productDetailSource, /deriveRoleCapabilities/);
  assert.match(productDetailSource, /hasCapability\(roleCapabilities,\s*['"]canEditProductBasic['"]\)/);
  assert.match(productDetailSource, /const\s+canEditProductActions\s*=\s*isOwner\s*\|\|\s*canEditProductBasic/);
  assert.match(productDetailSource, /const\s+canDeleteProductAction\s*=\s*isOwner/);
});

runTest('ProductDetailPage initializes Dexie with staff scoped profile', () => {
  assert.match(productDetailSource, /if\s*\(isRoleLoading\)\s*return/);
  assert.match(
    productDetailSource,
    /initializeDatabaseSafely\(\{\s*profile:\s*isStaff\s*\?\s*['"]staff_scoped['"]\s*:\s*['"]owner_full['"]\s*\}\)/
  );
  assert.match(productDetailSource, /\},\s*\[isRoleLoading,\s*isStaff\]\)/);
});

runTest('ProductDetailPage blocks direct-route staff writes in handlers', () => {
  assert.ok(
    matchCount(
      productDetailSource,
      /if\s*\(!product\s*\|\|\s*dbStatus\?\.ok\s*===\s*false\s*\|\|\s*!canEditProductActions\)\s*return/g
    ) >= 1,
    'toggle handler must require canEditProductActions'
  );
  assert.match(
    productDetailSource,
    /if\s*\(!product\s*\|\|\s*dbStatus\?\.ok\s*===\s*false\s*\|\|\s*!canDeleteProductAction\)\s*return/
  );
  assert.match(
    productDetailSource,
    /if\s*\(dbStatus\?\.ok\s*===\s*false\s*\|\|\s*!canEditProductActions\)\s*return/
  );
});

runTest('ProductDetailPage hides owner-sensitive product finance from staff', () => {
  assert.match(productDetailSource, /const\s+canShowSensitiveProductData\s*=\s*!isRoleLoading\s*&&\s*canViewSensitiveData/);
  assert.match(productDetailSource, /const\s+profitMargin\s*=\s*canShowSensitiveProductData\s*&&\s*product\.cost/);
  assert.match(productDetailSource, /\{canShowSensitiveProductData\s*&&\s*\([\s\S]*?formatCurrency\(product\.cost\)/);
});

runTest('ProductDetailPage gates buttons and modal by role capability', () => {
  assert.match(productDetailSource, /\{canEditProductActions\s*&&\s*\(/);
  assert.match(productDetailSource, /\{canDeleteProductAction\s*&&\s*\(/);
  assert.match(productDetailSource, /\{canDeleteProductAction\s*&&\s*showDeleteConfirm\s*&&\s*\(/);
  assert.match(productDetailSource, /mode=\{isStaff\s*\?\s*['"]manager['"]\s*:\s*['"]owner['"]\}/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`ok - ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();
