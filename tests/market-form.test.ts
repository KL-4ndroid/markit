import assert from 'node:assert/strict';

import {
  calculateMarketDurationLabel,
  calculateMarketFixedCost,
  deriveMarketDateBounds,
  getFirstMarketCoreError,
  validateMarketCoreForm,
} from '../lib/markets/market-form';

const errors = validateMarketCoreForm({ name: ' ', location: '', dates: [] });
assert.deepEqual(errors, {
  name: '請輸入市集名稱',
  location: '請輸入市集地點',
  dates: '請至少選擇一個市集日期',
});
assert.equal(getFirstMarketCoreError(errors), 'name');

assert.deepEqual(validateMarketCoreForm({ name: '', location: '', dates: ['2026-07-20'] }, {
  requireIdentity: false,
}), {});

assert.deepEqual(deriveMarketDateBounds(['2026-07-21', '2026-07-19', '2026-07-20']), {
  dates: ['2026-07-19', '2026-07-20', '2026-07-21'],
  startDate: '2026-07-19',
  endDate: '2026-07-21',
});

assert.equal(calculateMarketDurationLabel('13:00', '19:30'), '6 小時 30 分鐘');
assert.equal(calculateMarketDurationLabel('22:00', '01:00'), '3 小時');

assert.equal(calculateMarketFixedCost({
  boothCost: 1200,
  tableRental: 200,
  chairRental: 100,
  umbrellaRental: 300,
  tableFree: true,
  chairFree: false,
  umbrellaFree: false,
}), 1600);

console.log('PASS shared market form validation and calculations');
