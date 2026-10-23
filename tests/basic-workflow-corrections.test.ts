import assert from 'node:assert/strict';
import { parseMarketText } from '../lib/market-text-import/parser';
import { buildImportReviewSummary } from '../lib/market-text-import/review-summary';
import { installSessionStatePort } from '../lib/platform/session-state-capability';
import { productListStateKey, readProductListState, writeProductListState } from '../lib/products/product-list-return-state';
import { countDealRecordsByDate } from '../lib/markets/event-view-utils';
import type { Event } from '../types/db';

assert.deepEqual(countDealRecordsByDate([
  { type: 'deal_closed', timestamp: 1, payload: { dealDate: '2026-08-26', manualDealCount: 3, is_manual_entry: true } },
  { type: 'interaction_recorded', timestamp: 1, payload: { dealDate: '2026-08-26' } },
] as Event[]), { '2026-08-26': 1 }, 'one summary record is not three separate transaction records');

const result = parseMarketText({ inputText: [
  '市集名稱：秋日手作市集', '活動日期：2026/10/24、2026/10/25', '地點：台南文化廣場',
  '營業時間：13:00–19:00', '攤位費：每日 800 元', '報到時間：12:00',
].join('\n'), referenceDate: '2026-10-22', locale: 'zh-TW' });
assert.equal(result.ok, true);
if (!result.ok) throw new Error('fixture did not parse');
const event = result.draft.events[0];
assert.equal(event.candidates.find(candidate => candidate.field === 'name')?.value, '秋日手作市集');
assert.deepEqual(event.candidates.find(candidate => candidate.field === 'operatingStartTime')?.value, { kind: 'single', start: '13:00' });
assert.deepEqual(event.candidates.find(candidate => candidate.field === 'operatingEndTime')?.value, { kind: 'single', end: '19:00' });
assert.deepEqual(buildImportReviewSummary(event, {}).missingCore, []);
assert.deepEqual(buildImportReviewSummary({ ...event, candidates: [] }, {}).missingCore, ['name', 'location', 'dates']);
assert.deepEqual(buildImportReviewSummary({ ...event, candidates: [] }, { name: '已填名稱', location: '已填地點', dates: ['2026-10-24'] }).missingCore, []);

const memory = new Map<string, string>();
const restore = installSessionStatePort({ read: key => memory.get(key) ?? null, write: (key, value) => { memory.set(key, value); } });
try {
  const first = productListStateKey('actor-a', 'owner-a', false);
  const state = { category: 'accessory' as const, query: '耳環', showInactive: true, scrollY: 620 };
  writeProductListState(first, state);
  assert.deepEqual(readProductListState(first), state);
  assert.equal(readProductListState(productListStateKey('actor-b', 'owner-a', false)), null);
  assert.equal(readProductListState(productListStateKey('actor-a', 'owner-b', false)), null);
  assert.equal(readProductListState(productListStateKey('actor-a', 'owner-a', true)), null);
  memory.set(first, '{bad');
  assert.equal(readProductListState(first), null);
  memory.set(first, 'null');
  assert.equal(readProductListState(first), null);
} finally { restore(); }
const restoreUnavailable = installSessionStatePort({ read: () => { throw new Error('unavailable'); }, write: () => { throw new Error('unavailable'); } });
try {
  assert.equal(readProductListState('optional'), null);
  assert.doesNotThrow(() => writeProductListState('optional', { category: 'all', query: '', showInactive: false, scrollY: 0 }));
} finally { restoreUnavailable(); }
console.log('PASS import evidence summary and isolated product return state');
