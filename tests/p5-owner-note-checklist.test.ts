import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    failures.push(name);
    failed++;
  }
}

const ownerMarketDetailSource = readFileSync(
  join(process.cwd(), 'app/markets/[id]/page.tsx'),
  'utf-8'
);
const marketFieldOpsSectionSource = readFileSync(
  join(process.cwd(), 'components/markets/MarketFieldOpsSection.tsx'),
  'utf-8'
);

console.log('\n=== P5 owner note/checklist ===');

runTest('owner market detail imports shared note and checklist panels', () => {
  assert.match(ownerMarketDetailSource, /import \{ MarketFieldOpsSection \}/);
  assert.match(marketFieldOpsSectionSource, /import \{ FieldNotesPanel \}/);
  assert.match(marketFieldOpsSectionSource, /import \{ ChecklistPanel \}/);
});

runTest('owner panels render only after staff route returns', () => {
  const staffReturnIndex = ownerMarketDetailSource.indexOf('return <StaffMarketDetailView market={market} />');
  const fieldOpsIndex = ownerMarketDetailSource.indexOf('<MarketFieldOpsSection', staffReturnIndex);

  assert.ok(staffReturnIndex > 0, 'staff return must exist');
  assert.ok(fieldOpsIndex > staffReturnIndex, 'owner field ops section must be after staff return');
});

runTest('owner panels pass full management permissions', () => {
  assert.match(
    ownerMarketDetailSource,
    /<MarketFieldOpsSection[\s\S]*marketId=\{marketId\}[\s\S]*canManageFieldNotes=\{true\}[\s\S]*canManageChecklist=\{true\}[\s\S]*canToggleChecklistItem=\{true\}/
  );
  assert.match(marketFieldOpsSectionSource, /<FieldNotesPanel[\s\S]*canManage=\{canManageFieldNotes\}/);
  assert.match(
    marketFieldOpsSectionSource,
    /<ChecklistPanel[\s\S]*canManage=\{canManageChecklist\}[\s\S]*canToggle=\{canToggleChecklistItem\}/
  );
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
