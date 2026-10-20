import assert from 'node:assert/strict';

import {
  buildMarketListGroups,
  formatMarketListDateRange,
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
assert.equal(groups.preparing[0].statusLabel, '如期舉行');
assert.equal(groups.active[0].statusLabel, '進行中');

const recurringVisibility = buildMarketListGroups([
  market({ id: 'manual-visible', status: 'registered', startDate: '2026-07-20', endDate: '2026-07-20' }),
  market({ id: 'legacy-schedule-visible', status: 'registered', startDate: '2026-07-21', endDate: '2026-07-21', sessionOrigin: 'schedule' }),
  market({ id: 'scheduled-visible', status: 'registered', startDate: '2026-07-22', endDate: '2026-07-22', sessionOrigin: 'schedule', scheduleOccurrenceState: 'scheduled' }),
  market({ id: 'suppressed-hidden', status: 'registered', startDate: '2026-07-23', endDate: '2026-07-23', sessionOrigin: 'schedule', scheduleOccurrenceState: 'suppressed' }),
  market({ id: 'rule-removed-hidden', status: 'registered', startDate: '2026-07-24', endDate: '2026-07-24', sessionOrigin: 'schedule', scheduleOccurrenceState: 'rule_removed' }),
  market({ id: 'skipped-hidden', status: 'cancelled', startDate: '2026-07-25', endDate: '2026-07-25', sessionOrigin: 'schedule', scheduleOccurrenceState: 'skipped' }),
], new Date(2026, 6, 15, 12, 0));
assert.deepEqual(
  recurringVisibility.preparing.map(item => item.market.id),
  ['manual-visible', 'legacy-schedule-visible', 'scheduled-visible'],
);
assert.deepEqual(recurringVisibility.cancelled, []);

const preparingStatuses = buildMarketListGroups([
  market({ id: 'registered', status: 'registered', startDate: '2026-07-20', endDate: '2026-07-20' }),
  market({ id: 'accepted', status: 'accepted', startDate: '2026-07-21', endDate: '2026-07-21' }),
  market({ id: 'paid', status: 'paid', startDate: '2026-07-22', endDate: '2026-07-22' }),
  market({ id: 'postponed', status: 'postponed', startDate: '2026-07-23', endDate: '2026-07-23' }),
], new Date(2026, 6, 15, 12, 0));
assert.deepEqual(
  preparingStatuses.preparing.map(item => item.statusLabel),
  ['已報名 · 等待錄取', '已錄取 · 待繳費', '已繳費', '已延期']
);
assert.deepEqual(
  preparingStatuses.preparing.map(item => item.preparationAttention),
  ['awaiting_decision', 'payment_due', null, null],
);

const preparationDetails = buildMarketListGroups([
  market({
    id: 'prepared-details',
    status: 'accepted',
    startDate: '2026-07-25',
    endDate: '2026-07-25',
    checkInTime: '09:00',
    operatingStartTime: '10:00',
    operatingEndTime: '18:00',
    registrationFee: 100,
    boothCost: 1200,
    deposit: 500,
    tableRental: 200,
    chairRental: 0,
    umbrellaRental: 300,
    umbrellaFree: true,
  }),
], new Date(2026, 6, 15, 12, 0)).preparing[0].preparationSummary;
assert.ok(preparationDetails);
assert.equal(preparationDetails.timeStatus, 'provided');
assert.equal(preparationDetails.checkInTime, '09:00');
assert.equal(preparationDetails.estimatedExpense, 1500);
assert.equal(preparationDetails.deposit, 500);
assert.deepEqual(
  preparationDetails.equipment.map(item => [item.label, item.status, item.amount]),
  [
    ['桌', 'rental', 200],
    ['椅', 'self_supplied', null],
    ['傘', 'provided', null],
  ],
);
assert.equal(groups.active[0].preparationSummary, null);
assert.equal(groups.active[0].completionSummary, null);

const presetTimeDetails = buildMarketListGroups([
  market({
    id: 'preset-time',
    startDate: '2026-07-26',
    endDate: '2026-07-26',
    checkInTime: '12:00',
    operatingStartTime: '13:00',
    operatingEndTime: '19:00',
  }),
  market({ id: 'missing-time', startDate: '2026-07-27', endDate: '2026-07-27' }),
], new Date(2026, 6, 15, 12, 0)).preparing;
assert.equal(presetTimeDetails[0].preparationSummary?.timeStatus, 'preset');
assert.equal(presetTimeDetails[1].preparationSummary?.timeStatus, 'missing');

const completionDetails = buildMarketListGroups([
  market({
    id: 'ended-with-results',
    status: 'completed',
    startDate: '2026-07-10',
    endDate: '2026-07-10',
    totalRevenue: 5000,
    totalProfit: 3000,
    totalDeals: 8,
    registrationFee: 100,
    boothCost: 800,
    tableRental: 200,
    chairRental: 100,
    umbrellaRental: 300,
    umbrellaFree: true,
    commissionRate: 10,
  }),
  market({
    id: 'ended-without-results',
    status: 'completed',
    startDate: '2026-07-11',
    endDate: '2026-07-11',
    totalRevenue: 0,
    totalProfit: 0,
    totalDeals: 0,
  }),
], new Date(2026, 6, 15, 12, 0)).ended;
const endedWithResults = completionDetails.find(item => item.market.id === 'ended-with-results');
const endedWithoutResults = completionDetails.find(item => item.market.id === 'ended-without-results');
assert.deepEqual(endedWithResults?.completionSummary, {
  totalRevenue: 5000,
  estimatedNetProfit: 1300,
  totalDeals: 8,
});
assert.equal(endedWithoutResults?.completionSummary, null);
assert.equal(endedWithResults?.preparationSummary, null);

assert.equal(formatMarketListDateRange(market({
  startDate: '2026-07-02',
  endDate: '2026-07-31',
  dates: ['2026-07-02', '2026-07-18', '2026-07-31'],
})), '2026/7/02~31');
assert.equal(formatMarketListDateRange(market({
  startDate: '2026-07-30',
  endDate: '2026-08-02',
  dates: ['2026-07-30', '2026-08-02'],
})), '2026/7/30~8/02');
assert.equal(formatMarketListDateRange(market({
  startDate: '2026-12-31',
  endDate: '2027-01-02',
  dates: ['2026-12-31', '2027-01-02'],
})), '2026/12/31~2027/1/02');

const afterClosing = buildMarketListGroups([
  market({ id: 'closed-today', operatingStartTime: '08:00', operatingEndTime: '11:00' }),
], new Date(2026, 6, 15, 12, 0));
assert.equal(afterClosing.ended[0].market.id, 'closed-today');

const multiDayAfterClosing = buildMarketListGroups([
  market({
    id: 'next-session-remains',
    dates: ['2026-07-15', '2026-07-18'],
    startDate: '2026-07-15',
    endDate: '2026-07-18',
    operatingStartTime: '08:00',
    operatingEndTime: '11:00',
  }),
  market({
    id: 'closing-with-next-session',
    operationPhase: 'closing',
    dates: ['2026-07-15', '2026-07-18'],
    startDate: '2026-07-15',
    endDate: '2026-07-18',
  }),
], new Date(2026, 6, 15, 12, 0));
assert.deepEqual(
  multiDayAfterClosing.preparing.map(item => item.market.id),
  ['next-session-remains', 'closing-with-next-session']
);
assert.equal(multiDayAfterClosing.preparing[0].displayDate, '2026-07-18');

console.log('PASS work-stage market list model');
