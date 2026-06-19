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

runTest('role freshness maps checklist events to canManageChecklist', () => {
  assert.match(roleFreshnessSource, /checklist_item_created:\s*['"]canManageChecklist['"]/);
  assert.match(roleFreshnessSource, /checklist_item_updated:\s*['"]canManageChecklist['"]/);
  assert.match(roleFreshnessSource, /checklist_item_deleted:\s*['"]canManageChecklist['"]/);
});

runTest('staff sync preflight treats checklist events as market-scoped', () => {
  assert.match(staffPreflightSource, /checklist_item_created/);
  assert.match(staffPreflightSource, /checklist_item_updated/);
  assert.match(staffPreflightSource, /checklist_item_deleted/);
});

runTest('staff market detail renders ChecklistPanel with manager gate', () => {
  assert.match(staffMarketDetailSource, /import \{ ChecklistPanel \}/);
  assert.match(staffMarketDetailSource, /canManageChecklist/);
  assert.match(staffMarketDetailSource, /<ChecklistPanel/);
  assert.match(staffMarketDetailSource, /canManage=\{canManageChecklist\}/);
});

runTest('checklist panel calls create/update/delete service functions', () => {
  assert.match(checklistPanelSource, /createChecklistItem/);
  assert.match(checklistPanelSource, /updateChecklistItem/);
  assert.match(checklistPanelSource, /deleteChecklistItem/);
  assert.match(checklistPanelSource, /canManage/);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
