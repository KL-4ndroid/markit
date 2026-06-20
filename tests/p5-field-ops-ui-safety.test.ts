import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const fieldNotesPanelSource = readProjectFile('components/markets/FieldNotesPanel.tsx');
const checklistPanelSource = readProjectFile('components/markets/ChecklistPanel.tsx');
const marketFieldOpsSectionSource = readProjectFile('components/markets/MarketFieldOpsSection.tsx');
const staffMarketDetailSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const ownerMarketDetailSource = readProjectFile('app/markets/[id]/page.tsx');

const forbiddenPanelPatterns = [
  /useUserRole/,
  /useAuth/,
  /@\/lib\/supabase/,
  /@\/lib\/sync/,
  /pending-operation-model/,
  /cache-replacement-preview/,
  /role-capabilities/,
  /staffRole/,
  /isOwner/,
];

function assertNoForbiddenPanelImports(source: string, label: string): void {
  for (const pattern of forbiddenPanelPatterns) {
    assert.doesNotMatch(source, pattern, `${label} must remain prop-driven and low-risk`);
  }
}

runTest('Field Ops panels remain prop-driven and avoid sensitive layers', () => {
  assertNoForbiddenPanelImports(fieldNotesPanelSource, 'FieldNotesPanel');
  assertNoForbiddenPanelImports(checklistPanelSource, 'ChecklistPanel');

  assert.match(fieldNotesPanelSource, /interface FieldNotesPanelProps[\s\S]*canManage:\s*boolean/);
  assert.match(checklistPanelSource, /interface ChecklistPanelProps[\s\S]*canManage:\s*boolean/);
  assert.match(checklistPanelSource, /interface ChecklistPanelProps[\s\S]*canToggle:\s*boolean/);
});

runTest('MarketFieldOpsSection only passes capability props to child panels', () => {
  assert.match(marketFieldOpsSectionSource, /canManageFieldNotes:\s*boolean/);
  assert.match(marketFieldOpsSectionSource, /canManageChecklist:\s*boolean/);
  assert.match(marketFieldOpsSectionSource, /canToggleChecklistItem:\s*boolean/);
  assert.match(marketFieldOpsSectionSource, /<FieldNotesPanel[\s\S]*canManage=\{canManageFieldNotes\}/);
  assert.match(
    marketFieldOpsSectionSource,
    /<ChecklistPanel[\s\S]*canManage=\{canManageChecklist\}[\s\S]*canToggle=\{canToggleChecklistItem\}/
  );
  assert.doesNotMatch(marketFieldOpsSectionSource, /useUserRole|useAuth|staffRole|isOwner/);
});

runTest('Staff and owner market detail keep Field Ops permission wiring explicit', () => {
  assert.match(staffMarketDetailSource, /canManageFieldNotes=\{canManageFieldNotes\}/);
  assert.match(staffMarketDetailSource, /canManageChecklist=\{canManageChecklist\}/);
  assert.match(staffMarketDetailSource, /canToggleChecklistItem=\{canToggleChecklistItem\}/);

  assert.match(ownerMarketDetailSource, /canManageFieldNotes=\{true\}/);
  assert.match(ownerMarketDetailSource, /canManageChecklist=\{true\}/);
  assert.match(ownerMarketDetailSource, /canToggleChecklistItem=\{true\}/);
});

runTest('Field Ops UI guardrail avoids Gate D production wiring', () => {
  const combinedSource = [
    fieldNotesPanelSource,
    checklistPanelSource,
    marketFieldOpsSectionSource,
    staffMarketDetailSource,
    ownerMarketDetailSource,
  ].join('\n');

  assert.doesNotMatch(combinedSource, /pending-operation-model|cache-replacement-preview/);
  assert.doesNotMatch(combinedSource, /pending_operations/);
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
    throw new Error(`${failed} Field Ops UI safety tests failed`);
  }
}

main();
