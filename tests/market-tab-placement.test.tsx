import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MarketTodayTimeline } from '../components/markets/MarketTodayTimeline';
import { MarketOperatingSessionControl } from '../components/markets/MarketOperatingSessionControl';
import { resolveMarketOperatingSession } from '../lib/markets/market-operating-session';
import type { Market } from '../types/db';

const times = { earlyEntryEnabled: true, earlyEntryTime: '09:00:00', checkInTime: '09:30:00', operatingStartTime: '10:00:00', operatingEndTime: '18:00:00' };
const write = () => { throw new Error('rendering navigation must not change operating records'); };
const html = renderToStaticMarkup(<MarketTodayTimeline market={times} onEdit={write} countdown="距離開始 30 分鐘" />);
for (const text of ['提前進場', '報到', '開始營業', '結束營業', '09:00', '09:30', '10:00', '18:00', '修改時間']) assert.ok(html.includes(text), text);
assert.match(html, /aria-expanded="true"/);
assert.match(html, /aria-controls="owner-market-timeline-panel"/);
assert.match(html, /查看營業時段規則/);
assert.doesNotMatch(html, /30m|23h|右上角/);
const compact = renderToStaticMarkup(<MarketTodayTimeline market={times} defaultExpanded={false} />);
assert.match(compact, /aria-expanded="false"/);
assert.match(compact, /id="owner-market-timeline-panel" hidden=""/);
assert.doesNotMatch(compact, /修改時間/);
const empty = renderToStaticMarkup(<MarketTodayTimeline market={{}} onEdit={write} />);
assert.match(empty, /尚未設定時間資訊/);
assert.match(empty, />設定時間<\/button>/);

const market = { id: 'fixture', status: 'paid', dates: ['2026-10-26'], startDate: '2026-10-26', endDate: '2026-10-26', ...times } as Market;
for (const [hour, canClose] of [[8, false], [12, true], [22, false]] as const) {
  const session = resolveMarketOperatingSession(market, new Date(2026, 9, 26, hour));
  const control = renderToStaticMarkup(<MarketOperatingSessionControl session={session} canManage showCloseAction onStartEarly={write} onCloseToday={write} />);
  assert.equal(control.includes('提前結束今日營業'), canClose, 'moving the control must preserve session eligibility');
  const readOnly = renderToStaticMarkup(<MarketOperatingSessionControl session={session} canManage={false} showCloseAction onStartEarly={write} onCloseToday={write} />);
  assert.doesNotMatch(readOnly, /提前結束今日營業<\/button>/);
}

const owner = readFileSync(join(__dirname, '../components/markets/MarketDetailScreen.tsx'), 'utf8').replace(/\r\n/g, '\n');
assert.match(owner, /resolvedOwnerWorkspaceView === 'live' && \(\s*<MarketLiveLayout/);
assert.match(owner, /<MarketTodayTimeline[\s\S]*defaultExpanded=\{liveStage === 'preparing'\}/);
assert.match(owner, /<MarketWorkspaceSummary[\s\S]*<MarketLiveSummaryActions[\s\S]*onCloseToday=\{handleCloseTodayOperation\}/);
assert.doesNotMatch(owner, /<MarketOperatingSessionControl/);
assert.match(owner, /cash=\{<MarketCashPanel/);
assert.equal((owner.match(/<MarketTodayTimeline\s/g) ?? []).length, 1);
assert.doesNotMatch(owner, /今日現場模式|isTimelineCollapsed|<MarketReferenceNotePanel/);
assert.match(owner, /resolvedOwnerWorkspaceView === 'manage' && !isOperating[\s\S]*<MarketRegistrationPanel/);
assert.match(owner, /resolvedOwnerWorkspaceView === 'manage' && <MarketPaymentDeadlineNotice/);
assert.match(owner, /ownerOverviewDetail === 'cash'/);
assert.match(owner, /ownerOverviewDetail === 'journal'/);
console.log('PASS live timeline, operating controls, preserved phase permissions, compact presentation and management/review boundaries');
