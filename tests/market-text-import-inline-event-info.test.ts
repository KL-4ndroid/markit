import assert from 'node:assert/strict';

import { parseMarketText } from '../lib/market-text-import/parser';

const inputText = [
  '2026星空音樂節（重磅登場）',
  '每年都有不同主題的冬日市集，搭配戶外表演。',
  '市集日期｜11.21 - 11.22　市集時間｜14:00 - 21:00　市集地點｜示範購物中心 A2 館戶外廣場',
  '市集招募｜手作、美食與餐車',
].join('\n');

const result = parseMarketText({ inputText, referenceDate: '2026-10-01', locale: 'zh-TW' });
assert.equal(result.ok, true);

if (result.ok) {
  const event = result.draft.events[0];
  const name = event.candidates.find((candidate) => candidate.field === 'name');
  const location = event.candidates.find((candidate) => candidate.field === 'location');

  assert.equal(name?.value, '2026星空音樂節（重磅登場）');
  assert.equal(name?.status, 'exact');
  assert.equal(location?.value, '示範購物中心 A2 館戶外廣場');
  assert.equal(location?.status, 'exact');
  assert.equal(location?.reasonCode, 'explicit_event_location');
  assert.equal(location?.applyPolicy, 'eligible');
  assert.equal(result.draft.readiness, 'reviewable_core');
}

console.log('market text import inline event info name and location extraction passed');
