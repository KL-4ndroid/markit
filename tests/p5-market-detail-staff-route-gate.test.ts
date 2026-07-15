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
  const ownerEditFormIndex = marketDetailSource.indexOf('<EditMarketForm', staffReturnIndex);
  const ownerDeleteModalIndex = marketDetailSource.indexOf('{showDeleteConfirm && isMounted && createPortal', staffReturnIndex);
  const ownerFieldOpsIndex = marketDetailSource.indexOf('<MarketFieldOpsSection', staffReturnIndex);

  assert.ok(staffReturnIndex > 0, 'staff return must exist');
  assert.ok(ownerEditFormIndex > staffReturnIndex, 'owner edit form must be after staff return');
  assert.ok(ownerDeleteModalIndex > staffReturnIndex, 'owner delete modal must be after staff return');
  assert.ok(ownerFieldOpsIndex > staffReturnIndex, 'owner field ops must be after staff return');
});

runTest('StaffMarketDetailView keeps manager edits scoped to manager mode', () => {
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canEditMarketBasic['"]\)/);
  assert.match(staffMarketViewSource, /\{canEditMarketBasic\s*&&\s*\(/);
  assert.match(staffMarketViewSource, /<EditMarketForm[\s\S]*mode=["']manager["']/);
});

runTest('StaffMarketDetailView opens deal writes through capability and keeps profit hidden', () => {
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canRecordDeal['"]\)/);
  assert.match(staffMarketViewSource, /<DailyRevenueStats[\s\S]*hideProfit=\{true\}[\s\S]*canAddRevenue=\{canRecordDeal\}/);
  assert.match(staffMarketViewSource, /\{canRecordDeal\s*&&\s*\([\s\S]*?<TransactionWorkspace/);
  assert.match(staffMarketViewSource, /<TransactionWorkspace[\s\S]*hideProfit/);
  assert.match(staffMarketViewSource, /salesPhotoEvidenceContext=\{addRevenueSalesPhotoEvidenceContext\}/);
});

runTest('StaffMarketDetailView passes Field Ops permissions from capabilities only', () => {
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canManageFieldNotes['"]\)/);
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canManageChecklist['"]\)/);
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canToggleChecklistItem['"]\)/);
  assert.match(
    staffMarketViewSource,
    /<MarketFieldOpsSection[\s\S]*canManageFieldNotes=\{canManageFieldNotes\}[\s\S]*canManageChecklist=\{canManageChecklist\}[\s\S]*canToggleChecklistItem=\{canToggleChecklistItem\}/
  );
  assert.doesNotMatch(
    staffMarketViewSource,
    /<MarketFieldOpsSection[\s\S]*canManageFieldNotes=\{true\}|<MarketFieldOpsSection[\s\S]*canManageChecklist=\{true\}/
  );
});

runTest('StaffMarketDetailView scopes same-day deletion by role', () => {
  assert.match(staffMarketViewSource, /const isManagerRole = userRole\.staffRole === ['"]manager['"]/);
  assert.match(
    staffMarketViewSource,
    /const deleteActorId = canDeleteOwnRecord && !isManagerRole \? user\?\.id : undefined/
  );
  assert.match(staffMarketViewSource, /allowDelete=\{canDeleteOwnRecord\}/);
  assert.match(staffMarketViewSource, /deleteActorId=\{deleteActorId\}/);
  assert.match(staffMarketViewSource, /deleteSameDayOnly=\{canDeleteOwnRecord\}/);
});

runTest('StaffMarketDetailView stays clear of owner-only market lifecycle and analytics controls', () => {
  assert.doesNotMatch(staffMarketViewSource, /handleDeleteMarket|deleteMarket\(/);
  assert.doesNotMatch(staffMarketViewSource, /updateMarketStatus|startMarket|endMarket/);
  assert.doesNotMatch(staffMarketViewSource, /showDeleteConfirm|showCancelConfirm|showStatusChangeConfirm/);
  assert.doesNotMatch(staffMarketViewSource, /^import .*CartDrawer/m);
  assert.doesNotMatch(staffMarketViewSource, /^import .*DealDetailModal/m);
  assert.doesNotMatch(staffMarketViewSource, /^import .*InteractionDetailModal/m);
  assert.doesNotMatch(staffMarketViewSource, /^import .*BehaviorInsightCard/m);
  assert.doesNotMatch(staffMarketViewSource, /^import .*InteractionPreferenceChart/m);
  assert.doesNotMatch(staffMarketViewSource, /^import .*InteractionTimeHeatmap/m);
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
