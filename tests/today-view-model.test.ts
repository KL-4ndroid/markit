import assert from 'node:assert/strict';

import {
  buildTodayViewModel,
  getTodayMarketActionLabel,
  toLocalDateKey,
} from '../lib/home/today-view-model';
import type { Market } from '../types/db';

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-1',
    name: '週末市集',
    location: '中央廣場',
    dates: ['2026-07-15'],
    startDate: '2026-07-15',
    endDate: '2026-07-15',
    status: 'ongoing',
    operatingStartTime: '10:00',
    operatingEndTime: '18:00',
    registrationFee: 0,
    boothCost: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

assert.equal(toLocalDateKey(new Date(2026, 6, 5, 8, 0)), '2026-07-05');

const preparing = buildTodayViewModel([market()], new Date(2026, 6, 15, 9, 59));
assert.equal(preparing.focusState, 'preparing');
assert.equal(preparing.primaryMarket?.phaseLabel, '今日待開場');

const operating = buildTodayViewModel([market()], new Date(2026, 6, 15, 10, 0));
assert.equal(operating.focusState, 'operating');

const ended = buildTodayViewModel([market()], new Date(2026, 6, 15, 18, 0));
assert.equal(ended.focusState, 'ended');

const completed = buildTodayViewModel([
  market({ status: 'completed', operatingEndTime: undefined }),
], new Date(2026, 6, 15, 12, 0));
assert.equal(completed.focusState, 'ended');

const sorted = buildTodayViewModel([
  market({ id: 'ended', operatingStartTime: '08:00', operatingEndTime: '09:00' }),
  market({ id: 'later', operatingStartTime: '13:00', operatingEndTime: '17:00' }),
  market({ id: 'live', operatingStartTime: '09:00', operatingEndTime: '13:00' }),
], new Date(2026, 6, 15, 12, 0));
assert.deepEqual(sorted.todayMarkets.map(item => item.market.id), ['live', 'later', 'ended']);

const upcoming = buildTodayViewModel([
  market({ id: 'cancelled', dates: ['2026-07-16'], startDate: '2026-07-16', endDate: '2026-07-16', status: 'cancelled' }),
  market({ id: 'second', dates: ['2026-07-20', '2026-07-17'], startDate: '2026-07-17', endDate: '2026-07-20' }),
  market({ id: 'first', dates: undefined, startDate: '2026-07-16', endDate: '2026-07-16' }),
], new Date(2026, 6, 15, 12, 0));
assert.deepEqual(upcoming.upcomingMarkets.map(item => [item.market.id, item.nextDate]), [
  ['first', '2026-07-16'],
  ['second', '2026-07-17'],
]);

assert.equal(getTodayMarketActionLabel('operating', true), '開始交易');
assert.equal(getTodayMarketActionLabel('operating', false), '進入現場');
assert.equal(getTodayMarketActionLabel('ended', false), '查看今日回顧');

console.log('PASS role and schedule aware today view model');
