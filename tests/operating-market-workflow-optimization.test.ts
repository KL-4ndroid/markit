import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const owner = read('components/markets/MarketDetailScreen.tsx');
const staff = read('components/markets/StaffMarketDetailView.tsx');
const summary = read('components/markets/MarketWorkspaceSummary.tsx');
const interactions = read('components/sales/InteractionButtons.tsx');
const transaction = read('components/sales/TransactionWorkspace.tsx');
const dailyLog = read('components/markets/DailyTransactionLog.tsx');
const hooks = read('lib/db/hooks.ts');
const globals = read('app/globals.css');

function operatingSection(source: string): string {
  const start = source.indexOf('營業中時的操作區');
  assert.ok(start > 0, 'operating section marker must exist');
  return source.slice(start, start + 5000);
}

for (const source of [owner, staff]) {
  const section = operatingSection(source);
  assert.ok(
    section.indexOf('<TransactionWorkspace') < section.indexOf('<InteractionButtons'),
    'mobile DOM order must put transactions before interactions'
  );
  assert.match(source, /compactOnMobile=\{[^}]*'operating'[^}]*'live'/);
  assert.match(section, /compactEmpty/);
}

assert.match(owner, /OwnerLiveMobileView = 'sales' \| 'field-ops'/);
assert.match(owner, /aria-label="現場操作模式"/);
assert.match(owner, />\s*收款與互動\s*</);
assert.match(owner, />\s*現場工作\s*\{ownerPendingChecklistCount/);
assert.match(owner, /ownerPendingChecklistCount/);
assert.match(owner, /onChecklistRemainingChange=\{setOwnerPendingChecklistCount\}/);
assert.match(owner, /ownerLiveMobileView !== 'field-ops'[\s\S]*hidden lg:block/);
assert.match(owner, /isOperating \? 'hidden sm:block' : ''/);

assert.match(summary, /compactOnMobile\?: boolean/);
assert.match(summary, /grid-cols-\[minmax\(0,1\.15fr\)_minmax\(0,1fr\)\]/);

assert.match(interactions, /deleteInteractionEventById/);
assert.match(interactions, /const eventId = await recordInteraction/);
assert.match(interactions, /action:\s*\{[\s\S]*label: '復原'/);
assert.match(interactions, /sameDayOnly: true/);
assert.match(interactions, /lastRecordedInteraction/);
assert.match(interactions, />\s*復原\s*</);
assert.match(interactions, /min-h-16[\s\S]*sm:min-h-24/);
assert.match(hooks, /recordInteraction\([\s\S]*\): Promise<string>[\s\S]*return recordEvent\('interaction_recorded'/);
assert.match(operatingSection(owner), /compactEmpty\s+allowDelete/);

assert.match(transaction, /pendingPhotoCount > 0 \? \(/);
assert.match(transaction, /aria-label="成交照片已齊"/);
assert.match(transaction, />\s*照片已齊\s*</);

assert.match(dailyLog, /compactEmpty\?: boolean/);
assert.match(dailyLog, /完成第一筆收款或互動後會顯示在這裡/);
assert.match(globals, /overflow-x: clip/);

console.log('PASS operating market workflow optimization contracts');
