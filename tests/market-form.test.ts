import assert from 'node:assert/strict';

import {
  calculateMarketDurationLabel,
  calculateMarketFixedCost,
  deriveMarketDateBounds,
  getFirstMarketCoreError,
  hasMarketFormChanges,
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

const initial = { dates: ['2026-10-25', '2026-10-24'], operatingStartTime: '13:00:00', notes: ' hello ' };
assert.equal(hasMarketFormChanges(initial, { dates: ['2026-10-24', '2026-10-25'], operatingStartTime: '13:00', notes: 'hello' }), false);
assert.equal(hasMarketFormChanges(initial, { ...initial, operatingStartTime: '' }), true, 'clearing a known time is a real change');
assert.equal(hasMarketFormChanges(initial, { ...initial, notes: 'changed' }), true);
assert.equal(hasMarketFormChanges(initial, { ...initial, dates: ['2026-10-25'] }), true);
assert.equal(calculateMarketDurationLabel('', '19:00'), '尚未設定');
assert.equal(calculateMarketDurationLabel(null, '19:00'), '尚未設定');
assert.equal(calculateMarketDurationLabel('25:99', '19:00'), '尚未設定');
assert.equal(calculateMarketDurationLabel('12:00:00', '19:30:00'), '7 小時 30 分鐘');
console.log('PASS shared market form validation and calculations');
