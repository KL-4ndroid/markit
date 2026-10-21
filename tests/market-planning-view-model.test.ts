import assert from 'node:assert/strict';
import { buildMarketPlanningViewModel, getMarketRegistrationLabel, matchesMarketSearch } from '../lib/markets/market-planning-view-model';
import type { Market } from '../types/db';

function market(id: string, overrides: Partial<Market> = {}): Market {
  return {
    id, name: id, location: '台南・文化廣場', startDate: '2026-10-24', endDate: '2026-10-24',
    status: 'paid', registrationFee: 0, boothCost: 1200, createdAt: 1, updatedAt: 1, ...overrides,
  };
}
const now = new Date(2026, 9, 20, 10);
const pending = market('待繳費', { status: 'accepted', dates: ['2026-10-24'] });
const registered = market('候補', { status: 'registered', dates: ['2026-10-24', '2026-10-31'] });
const input = [
  pending, registered,
  market('已繳費'),
  market('已取消', { status: 'cancelled' }),
  market('已完成', { status: 'completed' }),
  market('已刪除', { isDeleted: true }),
  market('已延期', { status: 'postponed' }),
  market('已過期', { status: 'accepted', startDate: '2026-10-10', endDate: '2026-10-10' }),
  market('固定營業', { status: 'registered', sessionOrigin: 'schedule', startDate: '2026-11-01', endDate: '2026-11-01' }),
  market('停用固定場次', { status: 'accepted', sessionOrigin: 'schedule', scheduleOccurrenceState: 'suppressed' }),
];
const before = JSON.stringify(input);
const planning = buildMarketPlanningViewModel(input, now);
assert.deepEqual(planning.paymentDue.map(item => item.market.id), ['待繳費']);
assert.deepEqual(planning.awaitingDecision.map(item => item.market.id), ['候補']);
assert.equal(planning.sameDayArrangements.length, 1);
assert.equal(planning.sameDayArrangements[0].date, '2026-10-24');
assert.deepEqual(new Set(planning.sameDayArrangements[0].markets.map(item => item.id)), new Set(['待繳費', '候補', '已繳費']));
assert.equal(JSON.stringify(input), before, 'planning must never update financial data or booking state');

const afterPayment = buildMarketPlanningViewModel([{ ...pending, status: 'paid' }, registered], now);
assert.equal(afterPayment.paymentDue.length, 0, 'recorded payment removes the hint immediately');
assert.equal(afterPayment.awaitingDecision.length, 1);

// Explicit nonconsecutive dates must not create a false overlap on the dates between them.
assert.deepEqual(buildMarketPlanningViewModel([
  market('週末', { dates: ['2026-10-24', '2026-10-31'], endDate: '2026-10-31' }),
  market('週中', { dates: ['2026-10-28'], startDate: '2026-10-28', endDate: '2026-10-28' }),
], now).sameDayArrangements, []);
// Legacy ranges, reverse input order, and multi-day markets already in progress.
for (const rows of [
  [market('多日', { startDate: '2026-10-19', endDate: '2026-10-25' }), market('單日')],
  [market('單日'), market('多日', { startDate: '2026-10-19', endDate: '2026-10-25' })],
]) {
  assert.equal(buildMarketPlanningViewModel(rows, now).sameDayArrangements[0].date, '2026-10-24');
}
assert.deepEqual(buildMarketPlanningViewModel([
  market('跨月', { dates: ['2026-10-31', '2026-11-07'], endDate: '2026-11-07' }),
  market('十一月', { dates: ['2026-11-07'], startDate: '2026-11-07', endDate: '2026-11-07' }),
], now).sameDayArrangements.map(item => item.date), ['2026-11-07']);
assert.deepEqual(buildMarketPlanningViewModel([
  market('不合法日期', { dates: ['2026-10-32'] }),
  market('也不合法', { dates: ['2026-10-32'] }),
], now).sameDayArrangements, []);
assert.deepEqual(buildMarketPlanningViewModel([], now), { paymentDue: [], awaitingDecision: [], sameDayArrangements: [] });

const searchable = market('search', { name: 'Féria ＡＢＣ 手作市集' });
assert.equal(matchesMarketSearch(searchable, 'abc 台南'), true);
assert.equal(matchesMarketSearch(searchable, '  FÉRIA　手作  '), true);
assert.equal(matchesMarketSearch(searchable, '台北'), false);
assert.equal(matchesMarketSearch(searchable, '   '), true);
assert.equal(matchesMarketSearch(searchable, '文化 廣場'), true);
assert.equal(getMarketRegistrationLabel(pending), '待繳費');
assert.equal(getMarketRegistrationLabel(registered), '等待錄取');
assert.equal(getMarketRegistrationLabel(market('paid')), '已繳費');
assert.equal(getMarketRegistrationLabel(market('ongoing', { status: 'ongoing' })), '如期舉行', 'ongoing must not imply a payment record');
assert.equal(getMarketRegistrationLabel(market('schedule', { sessionOrigin: 'schedule' })), '固定營業');
console.log('PASS mobile market planning, payment hints, exact shared dates, and market search');
