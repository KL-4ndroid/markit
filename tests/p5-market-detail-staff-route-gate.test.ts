/**
 * P5 Market detail direct-route staff permission tests.
 *
 * /markets/[id] is a large owner page. Staff direct-route access must return
 * the dedicated StaffMarketDetailView before owner-only controls are rendered.
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
const marketDetailSource = readFileSync(
  join(projectRoot, 'app/markets/[id]/page.tsx'),
  'utf-8'
);
const staffMarketViewSource = readFileSync(
  join(projectRoot, 'components/markets/StaffMarketDetailView.tsx'),
  'utf-8'
);

runTest('MarketDetailPage initializes Dexie with staff scoped profile', () => {
  assert.match(
    marketDetailSource,
    /initializeDatabaseSafely\(\{\s*profile:\s*isStaff\s*\?\s*['"]staff_scoped['"]\s*:\s*['"]owner_full['"]\s*\}\)/
  );
  assert.match(marketDetailSource, /\},\s*\[isRoleLoading,\s*isStaff\]\)/);
});

runTest('MarketDetailPage routes staff to StaffMarketDetailView before owner UI', () => {
  const staffReturnIndex = marketDetailSource.indexOf('return <StaffMarketDetailView market={market} />');
  const ownerReturnIndex = marketDetailSource.indexOf('// ✅ 老闆模式', staffReturnIndex);
  const ownerEditFormIndex = marketDetailSource.indexOf('<EditMarketForm', staffReturnIndex);
  const ownerDeleteModalIndex = marketDetailSource.indexOf('{showDeleteConfirm && isMounted && createPortal', staffReturnIndex);

  assert.ok(staffReturnIndex > 0, 'staff return must exist');
  assert.ok(ownerReturnIndex > staffReturnIndex, 'owner view must be after staff return');
  assert.ok(ownerEditFormIndex > staffReturnIndex, 'owner edit form must be after staff return');
  assert.ok(ownerDeleteModalIndex > staffReturnIndex, 'owner delete modal must be after staff return');
});

runTest('StaffMarketDetailView keeps manager edits scoped to manager mode', () => {
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canEditMarketBasic['"]\)/);
  assert.match(staffMarketViewSource, /\{canEditMarketBasic\s*&&\s*\(/);
  assert.match(staffMarketViewSource, /<EditMarketForm[\s\S]*mode=["']manager["']/);
});

runTest('StaffMarketDetailView opens deal writes through capability and keeps profit hidden', () => {
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canRecordDeal['"]\)/);
  assert.match(staffMarketViewSource, /<DailyRevenueStats[\s\S]*hideProfit=\{true\}[\s\S]*canAddRevenue=\{canRecordDeal\}/);
  assert.match(staffMarketViewSource, /\{canRecordDeal\s*&&\s*\([\s\S]*?<QuickTransactionGrid/);
  assert.match(staffMarketViewSource, /<QuickInteractionButtons[\s\S]*hideProfit=\{true\}/);
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
