import assert from 'node:assert/strict';
import { join } from 'node:path';

import { parseMarketText } from '../lib/market-text-import/parser';
import type { ParsedTimeValue } from '../lib/market-text-import/types';
import { loadFullGoldEvaluationTargets } from './fixtures/market-text-import-gold-full-evaluator';

const projectRoot = join(__dirname, '..');
const targets = loadFullGoldEvaluationTargets(projectRoot);

const readExpectedPair = (candidates: typeof targets[number]['events'][number]['candidates']): string | null => {
  let start: string | undefined;
  let end: string | undefined;
  for (const candidate of candidates.filter((item) => item.group === 'time' && item.status === 'exact')) {
    if (candidate.semanticRole === 'operation_start' && typeof candidate.normalizedValue === 'string') start = candidate.normalizedValue;
    if (candidate.semanticRole === 'operation_end' && typeof candidate.normalizedValue === 'string') end = candidate.normalizedValue;
    if (candidate.semanticRole === 'operatingStartTime' && typeof candidate.normalizedValue === 'string') start = candidate.normalizedValue;
    if (candidate.semanticRole === 'operatingEndTime' && typeof candidate.normalizedValue === 'string') end = candidate.normalizedValue;
    if (
      ['operation_hours', 'operatingHours'].includes(candidate.semanticRole)
      && candidate.normalizedValue
      && typeof candidate.normalizedValue === 'object'
      && 'start' in candidate.normalizedValue
      && 'end' in candidate.normalizedValue
      && typeof candidate.normalizedValue.start === 'string'
      && typeof candidate.normalizedValue.end === 'string'
    ) {
      start = candidate.normalizedValue.start;
      end = candidate.normalizedValue.end;
    }
  }
  return start && end ? `${start}-${end}` : null;
};

const readActualPair = (candidates: Array<{ field: string; value: unknown }>): string | null => {
  const startValue = candidates.find((candidate) => candidate.field === 'operatingStartTime')?.value as ParsedTimeValue | undefined;
  const endValue = candidates.find((candidate) => candidate.field === 'operatingEndTime')?.value as ParsedTimeValue | undefined;
  const start = startValue?.kind === 'single' ? startValue.start : undefined;
  const end = endValue?.kind === 'single' ? endValue.end : undefined;
  return start && end ? `${start}-${end}` : null;
};

let expectedCount = 0;
let actualCount = 0;
let correctCount = 0;
const failures: string[] = [];
for (const target of targets) {
  const response = parseMarketText({ inputText: target.inputText, referenceDate: target.referenceDate, locale: 'zh-TW' });
  if (response.ok === false) assert.fail(`${target.fixtureId}: parser returned ${response.error.code}`);
  const eventCount = Math.max(target.events.length, response.draft.events.length);
  for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
    const expected = target.events[eventIndex] ? readExpectedPair(target.events[eventIndex].candidates) : null;
    const actual = response.draft.events[eventIndex]
      ? readActualPair(response.draft.events[eventIndex].candidates)
      : null;
    if (expected) expectedCount += 1;
    if (actual) actualCount += 1;
    if (expected && actual === expected) correctCount += 1;
    if (actual && actual !== expected) failures.push(`${target.fixtureId} event ${eventIndex}: ${actual} != ${expected}`);
  }
}

const precision = actualCount === 0 ? 1 : correctCount / actualCount;
const recall = expectedCount === 0 ? 1 : correctCount / expectedCount;
assert.ok(expectedCount >= 20, `expected meaningful Gold time coverage, received ${expectedCount}`);
assert.equal(precision, 1, failures.join('\n'));
assert.ok(recall >= 0.9, `operating time recall ${recall} (${correctCount}/${expectedCount})`);

console.log(`market text import parser Gate 5 operating time Gold: precision=${precision}, recall=${recall} (${correctCount}/${expectedCount})`);
