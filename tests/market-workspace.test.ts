import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getDefaultOwnerMarketWorkspaceView,
  getDefaultStaffMarketWorkspaceView,
  getMarketWorkspacePhaseLabel,
  resolveMarketWorkspacePhase,
} from '../lib/markets/market-workspace';

assert.equal(getDefaultOwnerMarketWorkspaceView('not-started'), 'manage');
assert.equal(getDefaultOwnerMarketWorkspaceView('operating'), 'live');
assert.equal(getDefaultOwnerMarketWorkspaceView('ended'), 'overview');

assert.equal(getDefaultStaffMarketWorkspaceView('not-started'), 'tasks');
assert.equal(getDefaultStaffMarketWorkspaceView('operating'), 'live');
assert.equal(getDefaultStaffMarketWorkspaceView('ended'), 'records');

assert.equal(getMarketWorkspacePhaseLabel('not-started'), '準備中');
assert.equal(getMarketWorkspacePhaseLabel('operating'), '營業中');
assert.equal(getMarketWorkspacePhaseLabel('ended'), '已結束');

assert.equal(resolveMarketWorkspacePhase({
  operatingPhase: 'operating',
  startDate: '2026-07-15',
  endDate: '2026-07-15',
  today: '2026-07-15',
}), 'operating');
assert.equal(resolveMarketWorkspacePhase({
  operatingPhase: 'not-started',
  dates: ['2026-07-12', '2026-07-13'],
  today: '2026-07-15',
}), 'ended');
assert.equal(resolveMarketWorkspacePhase({
  operatingPhase: 'not-started',
  dates: ['2026-07-12', '2026-07-18'],
  today: '2026-07-15',
}), 'not-started');
assert.equal(resolveMarketWorkspacePhase({
  operatingPhase: 'not-started',
  startDate: '2026-07-18',
  endDate: '2026-07-18',
  today: '2026-07-15',
}), 'not-started');
assert.equal(resolveMarketWorkspacePhase({
  operatingPhase: 'not-started',
  marketStatus: 'completed',
  startDate: '2026-07-18',
  endDate: '2026-07-18',
  today: '2026-07-15',
}), 'ended');

const projectRoot = join(__dirname, '..');
const ownerPageSource = readFileSync(join(projectRoot, 'app/markets/[id]/page.tsx'), 'utf8');
const staffPageSource = readFileSync(join(projectRoot, 'components/markets/StaffMarketDetailView.tsx'), 'utf8');
const revenueStatsSource = readFileSync(join(projectRoot, 'components/markets/DailyRevenueStats.tsx'), 'utf8');

for (const source of [ownerPageSource, staffPageSource]) {
  assert.match(source, /<MarketWorkspaceNavigation/);
  assert.match(source, /<MarketWorkspaceSummary/);
  assert.match(source, /<TransactionWorkspace/);
  assert.match(source, /<SalesPhotoEvidenceFlowDialog/);
}

assert.match(ownerPageSource, /resolvedOwnerWorkspaceView === 'live' && isOperating/);
assert.match(ownerPageSource, /ownerOverviewDetail === 'photos'/);
assert.match(ownerPageSource, /ownerOverviewDetail === 'interactions'/);
assert.match(ownerPageSource, /ownerOverviewDetail === 'costs'/);
assert.match(staffPageSource, /workspaceView === 'live' && isOperating/);
assert.match(staffPageSource, /workspaceView === 'records'/);
assert.match(staffPageSource, /workspaceView === 'tasks'/);
assert.match(revenueStatsSource, /showTotals = true/);
assert.match(revenueStatsSource, /showInteractions = false/);

console.log('market workspace tests passed');
