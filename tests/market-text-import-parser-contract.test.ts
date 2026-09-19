import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseMarketText } from '../lib/market-text-import/parser';
import { validateParsedMarketDraft } from '../lib/market-text-import/validation';
import { loadGoldEvaluationTargets } from './fixtures/market-text-import-gold-evaluator';

const projectRoot = join(__dirname, '..');

assert.deepEqual(
  parseMarketText({ inputText: ' \n\t ', referenceDate: '2026-09-16', locale: 'zh-TW' }),
  { ok: false, error: { code: 'empty_input' } },
);
assert.deepEqual(
  parseMarketText({ inputText: '市集', referenceDate: '2026-02-30', locale: 'zh-TW' }),
  { ok: false, error: { code: 'invalid_reference_date' } },
);
assert.deepEqual(
  parseMarketText({ inputText: '市'.repeat(20_001), referenceDate: '2026-09-16', locale: 'zh-TW' }),
  { ok: false, error: { code: 'input_too_long' } },
);

const gold = loadGoldEvaluationTargets(projectRoot);
for (const target of gold) {
  const request = { inputText: target.inputText, referenceDate: target.referenceDate, locale: 'zh-TW' as const };
  const first = parseMarketText(request);
  const second = parseMarketText(request);
  if (first.ok === false) assert.fail(`${target.fixtureId}: parser returned ${first.error.code}`);
  assert.deepEqual(second, first, `${target.fixtureId}: parser must be deterministic`);
  const validation = validateParsedMarketDraft(target.inputText, target.referenceDate, first.draft);
  assert.equal(validation.valid, true, `${target.fixtureId}: ${validation.errors.join('; ')}`);
}

const unicodeInput = '🎪星光市集\r\n活動日期：2026/10/03～2026/10/04\r\n地點：嘉義公園';
const unicodeResult = parseMarketText({ inputText: unicodeInput, referenceDate: '2026-09-16', locale: 'zh-TW' });
assert.equal(unicodeResult.ok, true);
if (unicodeResult.ok) {
  const validation = validateParsedMarketDraft(unicodeInput, '2026-09-16', unicodeResult.draft);
  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.ok(unicodeResult.draft.evidence.some((evidence) => evidence.text === '🎪星光市集'));
}

const administrativeInput = [
  '秋日森林市集',
  '活動日期：2026/10/03～2026/10/04',
  '市集時間：14:00～19:00',
  '地點：嘉義公園',
  '報名截止：2026/09/20 23:59',
].join('\n');
const administrativeResult = parseMarketText({
  inputText: administrativeInput,
  referenceDate: '2026-09-16',
  locale: 'zh-TW',
});
assert.equal(administrativeResult.ok, true);
if (administrativeResult.ok) {
  const event = administrativeResult.draft.events[0];
  const dates = event.candidates.find((candidate) => candidate.field === 'dates');
  assert.deepEqual(dates?.value, { kind: 'selected_dates', dates: ['2026-10-03', '2026-10-04'] });
  assert.ok(event.candidates.some((candidate) => candidate.field === 'operatingStartTime'));
  assert.ok(event.candidates.some((candidate) => candidate.field === 'operatingEndTime'));
  assert.ok(administrativeResult.draft.ignoreSpans.length > 0);
}

const conditionalResult = parseMarketText({
  inputText: '秋日森林市集\n活動日期：2026/10/03～2026/10/04\n市集時間：平日17:00-21:00；假日14:00-21:00\n地點：嘉義公園',
  referenceDate: '2026-09-16',
  locale: 'zh-TW',
});
assert.equal(conditionalResult.ok, true);
if (conditionalResult.ok) {
  const event = conditionalResult.draft.events[0];
  assert.equal(event.candidates.some((candidate) => candidate.field === 'operatingStartTime'), false);
  assert.ok(conditionalResult.draft.warnings.some((warning) => warning.code === 'conditional_schedule_unsupported'));
}

const parserSource = readFileSync(join(projectRoot, 'lib/market-text-import/parser.ts'), 'utf8');
assert.doesNotMatch(parserSource, /\b(?:window|document|navigator|localStorage|sessionStorage|indexedDB)\s*\./);
assert.doesNotMatch(parserSource, /@capacitor|next\//);

console.log('market text import parser contract: 83 Gold drafts, evidence, time, and platform boundary passed');
