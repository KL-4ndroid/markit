/**
 * P5-5 Operator Interaction gate checks.
 *
 * Scope:
 * - Enable only the first staff write capability: canRecordInteraction.
 * - Keep deal/revenue/transaction write entry points closed in staff market detail.
 * - Ensure the actual interaction write still reaches the P5-4d role freshness gate.
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
const staffViewSource = readFileSync(
  join(projectRoot, 'components/markets/StaffMarketDetailView.tsx'),
  'utf-8'
);
const dailyRevenueStatsSource = readFileSync(
  join(projectRoot, 'components/markets/DailyRevenueStats.tsx'),
  'utf-8'
);
const interactionButtonsSource = readFileSync(
  join(projectRoot, 'components/sales/InteractionButtons.tsx'),
  'utf-8'
);
const roleFreshnessSource = readFileSync(
  join(projectRoot, 'lib/permissions/role-freshness.ts'),
  'utf-8'
);

runTest('StaffMarketDetailView consumes shared role context and role-capabilities', () => {
  assert.match(
    staffViewSource,
    /import\s*\{\s*useRoleContext\s*\}\s*from\s*['"]@\/lib\/role-context['"]/
  );
  assert.match(
    staffViewSource,
    /import\s*\{[^}]*deriveRoleCapabilities[^}]*hasCapability[^}]*\}\s*from\s*['"]@\/lib\/permissions\/role-capabilities['"]/
  );
  assert.match(staffViewSource, /const\s*\{\s*userRole,\s*isOwner,\s*isLoading:\s*isRoleLoading\s*\}\s*=\s*useRoleContext\(\)/);
});

runTest('staff interaction recorder is gated by canRecordInteraction', () => {
  assert.match(
    staffViewSource,
    /hasCapability\(roleCapabilities,\s*['"]canRecordInteraction['"]\)/
  );
  assert.match(
    staffViewSource,
    /const\s+canRecordInteraction\s*=\s*\n?\s*!isRoleLoading\s*&&\s*hasCapability/
  );
  assert.match(
    staffViewSource,
    /\{canRecordInteraction\s*&&\s*\([\s\S]*?<InteractionButtons/
  );
});

runTest('P5-5 opens staff deal/revenue/transaction writes through canRecordDeal', () => {
  assert.match(
    staffViewSource,
    /hasCapability\(roleCapabilities,\s*['"]canRecordDeal['"]\)/
  );
  assert.match(
    staffViewSource,
    /\{canRecordDeal\s*&&\s*\([\s\S]*?<TransactionWorkspace/
  );
  assert.match(staffViewSource, /<TransactionWorkspace[\s\S]*hideProfit/);
  assert.match(staffViewSource, /if\s*\(\s*!canRecordDeal\s*\)\s*return\s*;/);
  assert.match(staffViewSource, /canAddRevenue=\{canRecordDeal\}/);
  assert.match(staffViewSource, /hideProfit=\{true\}/);
});

runTest('DailyRevenueStats can hide AddRevenue write entry point', () => {
  assert.match(dailyRevenueStatsSource, /canAddRevenue\?:\s*boolean/);
  assert.match(
    dailyRevenueStatsSource,
    /canAddRevenue\s*=\s*true/
  );
  assert.match(
    dailyRevenueStatsSource,
    /\{!isFuture\s*&&\s*canAddRevenue\s*&&\s*\(/
  );
});

runTest('InteractionButtons writes interaction_recorded through recordInteraction', () => {
  assert.match(
    interactionButtonsSource,
    /import\s*\{\s*recordInteraction\s*\}\s*from\s*['"]@\/lib\/db\/hooks['"]/
  );
  assert.match(interactionButtonsSource, /await\s+recordInteraction\(marketId,\s*buttonId\)/);
});

runTest('role freshness gate covers interaction_recorded with canRecordInteraction', () => {
  assert.match(
    roleFreshnessSource,
    /interaction_recorded:\s*['"]canRecordInteraction['"]/
  );
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
