import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketLiveLayout } from '../components/markets/MarketLiveLayout';
import { MarketLiveSummaryActions } from '../components/markets/MarketLiveSummaryActions';
import { MarketWorkspaceSummary } from '../components/markets/MarketWorkspaceSummary';
import { getMarketLiveBackfillDate, getMarketLiveStage } from '../lib/markets/market-live-presentation';
import { resolveMarketOperatingSession } from '../lib/markets/market-operating-session';
import type { Market } from '../types/db';

const market = {
  id: 'fixture', status: 'paid', dates: ['2026-10-26', '2026-10-28'],
  startDate: '2026-10-26', endDate: '2026-10-28', operatingStartTime: '10:00', operatingEndTime: '18:00',
} as Market;
const write = () => { throw new Error('rendering a layout must never change operational data'); };

for (const [hour, stage] of [[8, 'preparing'], [12, 'operating'], [22, 'preparing']] as const) {
  const session = resolveMarketOperatingSession(market, new Date(2026, 9, 26, hour));
  assert.equal(getMarketLiveStage(session.phase, session.workspacePhase), stage);
}
const closed = resolveMarketOperatingSession({ ...market, operationPhase: 'closing', operationSessionDate: '2026-10-26' }, new Date(2026, 9, 26, 12));
assert.equal(closed.workspacePhase, 'not-started', 'future dates still exist');
assert.equal(getMarketLiveStage(closed.phase, closed.workspacePhase), 'closed', 'today remains closed despite a future session');
assert.equal(getMarketLiveStage('ended', 'ended'), 'closed');
assert.equal(getMarketLiveStage('unavailable', 'not-started'), 'preparing');

assert.equal(getMarketLiveBackfillDate(market, '2026-10-28', '2026-10-26'), '2026-10-26');
assert.equal(getMarketLiveBackfillDate(market, '2026-10-26', '2026-10-29'), '2026-10-26');
assert.equal(getMarketLiveBackfillDate(market, null, '2026-10-29'), '2026-10-28');
assert.equal(getMarketLiveBackfillDate(market, null, '2026-10-25'), null);
assert.equal(getMarketLiveBackfillDate({ dates: [], startDate: 'bad', endDate: 'bad' }, null, '2026-10-26'), null);

for (const [stage, expected] of [
  ['preparing', ['timeline', 'fieldwork', 'cash']],
  ['operating', ['activity', 'fieldwork', 'cash', 'timeline']],
  ['closed', ['cash', 'fieldwork', 'timeline']],
] as const) {
  const html = renderToStaticMarkup(<MarketLiveLayout stage={stage}
    activity={<section aria-label="activity" />} timeline={<section aria-label="timeline" />}
    fieldwork={<section aria-label="fieldwork" />} cash={<section aria-label="cash" />} />);
  const actual = [...html.matchAll(/aria-label="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(actual, expected, 'visual, DOM and keyboard order must agree');
}

const actions = { canManage: true, isUpdating: false, onStartEarly: write, onCloseToday: write, onManage: write, onReview: write };
const summary = renderToStaticMarkup(<MarketWorkspaceSummary phase={closed.workspacePhase} phaseLabel={closed.label}
  description={closed.message} compactOnMobile items={[]}>
  <MarketLiveSummaryActions {...actions} stage="closed" session={closed} onBackfill={write} />
</MarketWorkspaceSummary>);
assert.equal(summary.split(closed.label).length - 1, 1, 'closed title appears only once');
assert.equal(summary.split(closed.message).length - 1, 1, 'closed explanation appears only once');
assert.match(summary, /補登收入/);
assert.match(summary, /查看回顧/);
assert.doesNotMatch(summary, /今日營業狀態|<dl/);
const readOnly = renderToStaticMarkup(<MarketLiveSummaryActions {...actions} stage="closed" session={closed} canManage={false} onBackfill={write} />);
assert.doesNotMatch(readOnly, /補登收入/);
assert.match(readOnly, /查看回顧/);
const noDate = renderToStaticMarkup(<MarketLiveSummaryActions {...actions} stage="closed" session={closed} />);
assert.doesNotMatch(noDate, /補登收入/);

const active = resolveMarketOperatingSession(market, new Date(2026, 9, 26, 12));
const activeHtml = renderToStaticMarkup(<MarketLiveSummaryActions {...actions} stage="operating" session={active} />);
assert.match(activeHtml, />收攤<\/button>/);
assert.doesNotMatch(activeHtml, /今日營業狀態|目前為正式營業時段|補登收入/);
const activeReadOnly = renderToStaticMarkup(<MarketLiveSummaryActions {...actions} stage="operating" session={active} canManage={false} />);
assert.doesNotMatch(activeReadOnly, />收攤<\/button>/);
const busy = renderToStaticMarkup(<MarketLiveSummaryActions {...actions} stage="operating" session={active} isUpdating />);
assert.match(busy, /disabled=""/);
const early = resolveMarketOperatingSession(market, new Date(2026, 9, 26, 9, 30));
const earlyHtml = renderToStaticMarkup(<MarketLiveSummaryActions {...actions} stage="preparing" session={early} />);
assert.match(earlyHtml, /提前開始營業/);
assert.doesNotMatch(earlyHtml, /查看市集管理|>收攤<\/button>/);
console.log('PASS stage-aware DOM priority, multi-day closure, valid backfill dates, consolidated summary and preserved action permissions');
