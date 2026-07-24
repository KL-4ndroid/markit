import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const ownerMarketDetailSource = readProjectFile('components/markets/MarketDetailScreen.tsx');
const staffMarketDetailSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const marketFieldOpsSectionSource = readProjectFile('components/markets/MarketFieldOpsSection.tsx');

const detailSources = [
  ['owner market detail', ownerMarketDetailSource],
  ['staff market detail', staffMarketDetailSource],
] as const;

console.log('\n=== P5 field ops route boundary ===');

runTest('owner and staff details compose Field Ops through the shared section only', () => {
  for (const [label, source] of detailSources) {
    assert.match(source, /import \{ MarketFieldOpsSection \}/, label);
    assert.match(source, /<MarketFieldOpsSection/, label);
    assert.doesNotMatch(source, /import \{ FieldNotesPanel \}/, label);
    assert.doesNotMatch(source, /import \{ ChecklistPanel \}/, label);
    assert.doesNotMatch(source, /<FieldNotesPanel|<ChecklistPanel/, label);
  }
});

runTest('market detail routes do not call field ops write or read services directly', () => {
  for (const [label, source] of detailSources) {
    assert.doesNotMatch(source, /createFieldNote|updateFieldNote|deleteFieldNote/, label);
    assert.doesNotMatch(source, /createChecklistItem|updateChecklistItem|toggleChecklistItem|deleteChecklistItem/, label);
    assert.doesNotMatch(source, /getActiveFieldNotesForMarket|getActiveChecklistItemsForMarket/, label);
    assert.doesNotMatch(source, /@\/lib\/markets\/field-notes|@\/lib\/markets\/checklist/, label);
  }
});

runTest('shared section is the only component that owns field notes and checklist panel composition', () => {
  assert.match(marketFieldOpsSectionSource, /import \{ MarketReferenceNotePanel \}/);
  assert.match(marketFieldOpsSectionSource, /import \{ FieldNotesPanel \}/);
  assert.match(marketFieldOpsSectionSource, /import \{ ChecklistPanel \}/);
  assert.match(marketFieldOpsSectionSource, /<FieldNotesPanel[\s\S]*marketId=\{marketId\}[\s\S]*canManage=\{canManageFieldNotes\}/);
  assert.match(marketFieldOpsSectionSource, /<MarketReferenceNotePanel note=\{referenceNote\}/);
  assert.match(
    marketFieldOpsSectionSource,
    /<ChecklistPanel[\s\S]*marketId=\{marketId\}[\s\S]*canManage=\{canManageChecklist\}[\s\S]*canToggle=\{canToggleChecklistItem\}/
  );
});

runTest('owner and staff route permissions stay explicit at the section boundary', () => {
  assert.match(
    ownerMarketDetailSource,
    /<MarketFieldOpsSection[\s\S]*marketId=\{marketId\}[\s\S]*referenceNote=\{market\.notes\}[\s\S]*canManageFieldNotes=\{true\}[\s\S]*canManageChecklist=\{true\}[\s\S]*canToggleChecklistItem=\{true\}/
  );
  assert.match(
    staffMarketDetailSource,
    /<MarketFieldOpsSection[\s\S]*marketId=\{marketId\}[\s\S]*referenceNote=\{market\.notes\}[\s\S]*canManageFieldNotes=\{canManageFieldNotes\}[\s\S]*canManageChecklist=\{canManageChecklist\}[\s\S]*canToggleChecklistItem=\{canToggleChecklistItem\}/
  );
});

runTest('market detail routes do not import Gate D models for field ops', () => {
  for (const [label, source] of detailSources) {
    assert.doesNotMatch(source, /pending-operation-model|cache-replacement-preview|sync-gate-d-flags/, label);
    assert.doesNotMatch(source, /pending_operations/, label);
  }
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
    throw new Error(`${failed} field ops route boundary tests failed`);
  }
}

main();
