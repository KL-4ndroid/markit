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

console.log('\n=== P5 owner note/checklist ===');

runTest('owner market detail imports shared note and checklist panels', () => {
  assert.match(ownerMarketDetailSource, /import \{ FieldNotesPanel \}/);
  assert.match(ownerMarketDetailSource, /import \{ ChecklistPanel \}/);
});

runTest('owner panels render only after staff route returns', () => {
  const staffReturnIndex = ownerMarketDetailSource.indexOf('return <StaffMarketDetailView market={market} />');
  const fieldNotesIndex = ownerMarketDetailSource.indexOf('<FieldNotesPanel', staffReturnIndex);
  const checklistIndex = ownerMarketDetailSource.indexOf('<ChecklistPanel', staffReturnIndex);

  assert.ok(staffReturnIndex > 0, 'staff return must exist');
  assert.ok(fieldNotesIndex > staffReturnIndex, 'owner field notes must be after staff return');
  assert.ok(checklistIndex > staffReturnIndex, 'owner checklist must be after staff return');
});

runTest('owner panels pass full management permissions', () => {
  assert.match(
    ownerMarketDetailSource,
    /<FieldNotesPanel[\s\S]*marketId=\{marketId\}[\s\S]*canManage=\{true\}/
  );
  assert.match(
    ownerMarketDetailSource,
    /<ChecklistPanel[\s\S]*marketId=\{marketId\}[\s\S]*canManage=\{true\}[\s\S]*canToggle=\{true\}/
  );
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
