import assert from 'node:assert/strict';

import {
  buildMarketListGroups,
  getMarketListActionLabel,
} from '../lib/markets/market-list-view-model';
import type { Market } from '../types/db';

function market(overrides: Partial<Market>): Market {
  return {
    id: 'market-1',
    name: '測試市集',
    location: '廣場',
    startDate: '2026-07-15',
    endDate: '2026-07-15',
    status: 'ongoing',
    registrationFee: 0,
    boothCost: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const groups = buildMarketListGroups([
  market({ id: 'active', operatingStartTime: '10:00', operatingEndTime: '18:00' }),
  market({ id: 'prepare', dates: ['2026-07-18'], startDate: '2026-07-18', endDate: '2026-07-18' }),
  market({ id: 'ended', dates: ['2026-07-14'], startDate: '2026-07-14', endDate: '2026-07-14' }),
  market({ id: 'cancelled', status: 'cancelled', updatedAt: 10 }),
], new Date(2026, 6, 15, 12, 0));

assert.deepEqual(groups.active.map(item => item.market.id), ['active']);
assert.deepEqual(groups.preparing.map(item => item.market.id), ['prepare']);
assert.deepEqual(groups.ended.map(item => item.market.id), ['ended']);
assert.deepEqual(groups.cancelled.map(item => item.market.id), ['cancelled']);
assert.equal(groups.preparing[0].displayDate, '2026-07-18');

const afterClosing = buildMarketListGroups([
  market({ id: 'closed-today', operatingStartTime: '08:00', operatingEndTime: '11:00' }),
], new Date(2026, 6, 15, 12, 0));
assert.equal(afterClosing.ended[0].market.id, 'closed-today');

assert.equal(getMarketListActionLabel('preparing', false), '完成設定');
assert.equal(getMarketListActionLabel('preparing', true), '查看任務');
assert.equal(getMarketListActionLabel('active', true), '繼續現場');

console.log('PASS work-stage market list model');
