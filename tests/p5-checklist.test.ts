import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

const checklistSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/markets/checklist.ts',
  'utf-8'
);
const checklistPanelSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/markets/ChecklistPanel.tsx',
  'utf-8'
);
const marketFieldOpsSectionSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/markets/MarketFieldOpsSection.tsx',
  'utf-8'
);
const staffMarketDetailSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/markets/StaffMarketDetailView.tsx',
  'utf-8'
);
const roleFreshnessSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/permissions/role-freshness.ts',
  'utf-8'
);
const staffPreflightSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/sync/staff-event-preflight.ts',
  'utf-8'
);

console.log('\n=== P5 checklist ===');

runTest('checklist service records event-sourced create/update/delete events', () => {
  assert.match(checklistSource, /CHECKLIST_ITEM_CREATED\s*=\s*['"]checklist_item_created['"]/);
  assert.match(checklistSource, /CHECKLIST_ITEM_UPDATED\s*=\s*['"]checklist_item_updated['"]/);
  assert.match(checklistSource, /CHECKLIST_ITEM_DELETED\s*=\s*['"]checklist_item_deleted['"]/);
  assert.match(checklistSource, /recordEvent\(CHECKLIST_ITEM_CREATED/);
  assert.match(checklistSource, /recordEvent\(CHECKLIST_ITEM_UPDATED/);
  assert.match(checklistSource, /recordEvent\(CHECKLIST_ITEM_DELETED/);
});

runTest('role freshness maps checklist management and toggle capabilities', () => {
  assert.match(roleFreshnessSource, /checklist_item_created:\s*['"]canManageChecklist['"]/);
  assert.match(roleFreshnessSource, /checklist_item_updated:\s*['"]canManageChecklist['"]/);
  assert.match(roleFreshnessSource, /checklist_item_deleted:\s*['"]canManageChecklist['"]/);
  assert.match(roleFreshnessSource, /canToggleChecklistItem/);
  assert.match(roleFreshnessSource, /isChecklistCompletedOnlyUpdate/);
});

runTest('staff sync preflight treats checklist events as market-scoped', () => {
  assert.match(staffPreflightSource, /checklist_item_created/);
  assert.match(staffPreflightSource, /checklist_item_updated/);
  assert.match(staffPreflightSource, /checklist_item_deleted/);
});

runTest('staff market detail renders ChecklistPanel with manager gate', () => {
  assert.match(staffMarketDetailSource, /import \{ MarketFieldOpsSection \}/);
  assert.match(staffMarketDetailSource, /canManageChecklist/);
  assert.match(staffMarketDetailSource, /canToggleChecklistItem/);
  assert.match(staffMarketDetailSource, /<MarketFieldOpsSection/);
  assert.match(staffMarketDetailSource, /canManageChecklist=\{canManageChecklist\}/);
  assert.match(staffMarketDetailSource, /canToggleChecklistItem=\{canToggleChecklistItem\}/);
  assert.match(marketFieldOpsSectionSource, /import \{ ChecklistPanel \}/);
  assert.match(marketFieldOpsSectionSource, /<ChecklistPanel[\s\S]*canManage=\{canManageChecklist\}[\s\S]*canToggle=\{canToggleChecklistItem\}/);
  assert.doesNotMatch(staffMarketDetailSource, /canManageChecklist\s*\|\|\s*canToggleChecklistItem/);
});

runTest('checklist service separates toggle from text management', () => {
  assert.match(checklistSource, /toggleChecklistItem/);
  assert.match(checklistSource, /assertChecklistItemExists/);
  assert.match(checklistSource, /completed,\s*\n\s*\}/);
});

runTest('checklist panel calls create/toggle/update/delete service functions', () => {
  assert.match(checklistPanelSource, /createChecklistItem/);
  assert.match(checklistPanelSource, /toggleChecklistItem/);
  assert.match(checklistPanelSource, /updateChecklistItem/);
  assert.match(checklistPanelSource, /deleteChecklistItem/);
  assert.match(checklistPanelSource, /canManage/);
  assert.match(checklistPanelSource, /canToggle/);
  assert.match(checklistPanelSource, /canToggleItems/);
  assert.match(checklistPanelSource, /const visibleItems = items \?\? \[\]/);
  assert.match(checklistPanelSource, /const isLoading = items === undefined/);
  assert.match(checklistPanelSource, /aria-busy=\{isSaving\}/);
  assert.match(checklistPanelSource, /const trimmedText = text\.trim\(\)/);
  assert.match(checklistPanelSource, /const trimmedText = editingText\.trim\(\)/);
  assert.match(checklistPanelSource, /resetEditing/);
  assert.match(checklistPanelSource, /載入 checklist 中/);
  assert.match(checklistPanelSource, /尚無 checklist/);
  assert.match(checklistPanelSource, /<Check className="h-3\.5 w-3\.5" \/>/);
  assert.doesNotMatch(checklistPanelSource, /if \(!canManage && items\.length === 0\) return null/);
  assert.doesNotMatch(checklistPanelSource, /staffRole|isOwner|useUserRole/);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
