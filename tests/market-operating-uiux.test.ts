import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildMarketInteractionSummary } from '../lib/markets/market-interaction-summary';

const summary = buildMarketInteractionSummary([
  'interest',
  'engage',
  'interest',
  null,
  'convert',
  undefined,
]);

assert.equal(summary.totalCount, 4);
assert.deepEqual(summary.countByType, {
  interest: 2,
  engage: 1,
  convert: 1,
});
assert.equal(
  Object.values(summary.countByType).reduce((total, count) => total + count, 0),
  summary.totalCount
);

const projectRoot = join(__dirname, '..');
const ownerPageSource = readFileSync(join(projectRoot, 'components/markets/MarketDetailScreen.tsx'), 'utf8');
const workspaceNavigationSource = readFileSync(join(projectRoot, 'components/markets/MarketWorkspaceNavigation.tsx'), 'utf8');
const detailTabsSource = readFileSync(join(projectRoot, 'components/markets/MarketWorkspaceDetailTabs.tsx'), 'utf8');
const interactionButtonsSource = readFileSync(join(projectRoot, 'components/sales/InteractionButtons.tsx'), 'utf8');
const albumSource = readFileSync(join(projectRoot, 'components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx'), 'utf8');
const checklistSource = readFileSync(join(projectRoot, 'components/markets/ChecklistPanel.tsx'), 'utf8');

assert.match(ownerPageSource, /interactionSummary\.totalCount/);
assert.doesNotMatch(ownerPageSource, /stats\?\.totalInteractions \?\? interactionEvents\.length/);
assert.match(ownerPageSource, /系統會依設定的營業時間自動開啟與收起今日現場工具/);
assert.match(ownerPageSource, /aria-expanded={!isTimelineCollapsed}/);
assert.match(ownerPageSource, /aria-controls="owner-market-timeline-panel"/);
assert.doesNotMatch(ownerPageSource, /<main className="mx-auto max-w-5xl/);

for (const source of [workspaceNavigationSource, detailTabsSource]) {
  assert.match(source, /event\.key === 'ArrowRight'/);
  assert.match(source, /event\.key === 'ArrowLeft'/);
  assert.match(source, /event\.key === 'Home'/);
  assert.match(source, /aria-controls={panelId}/);
  assert.match(source, /tabIndex={isActive \? 0 : -1}/);
}
assert.match(detailTabsSource, /grid grid-cols-4/);

assert.match(interactionButtonsSource, /InteractionRoleIcon/);
assert.doesNotMatch(interactionButtonsSource, /button\.emoji/);
assert.match(albumSource, /useState<AlbumFilter>\('current'\)/);
assert.match(albumSource, /此篩選沒有照片紀錄/);
assert.doesNotMatch(albumSource, /成交 {item\.saleId/);
assert.match(checklistSource, />現場待辦</);

console.log('market operating UIUX tests passed');
