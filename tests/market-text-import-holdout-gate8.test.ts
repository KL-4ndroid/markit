import assert from 'node:assert/strict';

import { parseMarketText } from '../lib/market-text-import/parser';
import type { FieldCandidate } from '../lib/market-text-import/types';
import { MARKET_TEXT_IMPORT_HOLDOUT_EXPECTED } from './fixtures/market-text-import-holdout-expected';
import { MARKET_TEXT_IMPORT_HOLDOUT_INPUTS } from './fixtures/market-text-import-holdout';

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${key}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const candidateMatches = (candidate: FieldCandidate<unknown>, expected: { field: string; value?: unknown }): boolean => {
  if (candidate.field !== expected.field || candidate.applyPolicy !== 'eligible') return false;
  if (expected.field === 'name') return typeof candidate.value === 'string' && candidate.value.trim().length >= 2;
  if (expected.value === undefined) return true;
  if (expected.field.endsWith('Free') || expected.field.endsWith('Rental')) {
    const actual = candidate.value as Record<string, unknown> | null;
    const wanted = expected.value as Record<string, unknown>;
    if (!actual) return false;
    return actual.type === wanted.type
      && actual.provision === wanted.provision
      && actual.quantity === wanted.quantity
      && (wanted.money === undefined || stable(actual.money) === stable(wanted.money));
  }
  return stable(candidate.value) === stable(expected.value);
};

let dispositions = 0;
let eventCounts = 0;
let expectedCount = 0;
let matchedExpected = 0;
let actualEligibleCount = 0;
let matchedActual = 0;
let unsafeApplyCount = 0;
let rejectLeakCount = 0;
let evidenceChecks = 0;
let validEvidenceChecks = 0;
let linkedOptionChecks = 0;
let validLinkedOptionChecks = 0;
const failures: string[] = [];
interface ScenarioStats {
  fixtures: number;
  dispositions: number;
  eventCounts: number;
  expected: number;
  matchedExpected: number;
  actual: number;
  matchedActual: number;
  evidence: number;
  validEvidence: number;
  options: number;
  validOptions: number;
  unsafe: number;
}
const emptyStats = (): ScenarioStats => ({
  fixtures: 0, dispositions: 0, eventCounts: 0, expected: 0, matchedExpected: 0,
  actual: 0, matchedActual: 0, evidence: 0, validEvidence: 0, options: 0, validOptions: 0, unsafe: 0,
});
const scenarioStats = {
  focused_block: emptyStats(),
  focused_with_context: emptyStats(),
  full_message_stress: emptyStats(),
};

for (const input of MARKET_TEXT_IMPORT_HOLDOUT_INPUTS) {
  const expected = MARKET_TEXT_IMPORT_HOLDOUT_EXPECTED.find((item) => item.fixtureId === input.fixtureId);
  assert.ok(expected, `${input.fixtureId}: missing expected result`);
  const response = parseMarketText({ inputText: input.inputText, referenceDate: input.referenceDate, locale: 'zh-TW' });
  assert.equal(response.ok, true, `${input.fixtureId}: parser response`);
  if (!response.ok) continue;
  const draft = response.draft;
  const scenario = scenarioStats[input.pasteScenario];
  scenario.fixtures += 1;
  if (draft.disposition === expected.disposition) {
    dispositions += 1;
    scenario.dispositions += 1;
  }
  const expectedEvents = expected.disposition === 'reject' ? 0 : 1;
  if (draft.events.length === expectedEvents) {
    eventCounts += 1;
    scenario.eventCounts += 1;
  }
  if (expected.disposition === 'reject' && draft.events.length > 0) rejectLeakCount += 1;

  const actualCandidates = draft.events.flatMap((event) => event.candidates);
  const eligibleCandidates = actualCandidates.filter((candidate) => candidate.applyPolicy === 'eligible');
  expectedCount += expected.candidates.length;
  actualEligibleCount += eligibleCandidates.length;
  scenario.expected += expected.candidates.length;
  scenario.actual += eligibleCandidates.length;
  for (const wanted of expected.candidates) {
    if (eligibleCandidates.some((candidate) => candidateMatches(candidate, wanted))) {
      matchedExpected += 1;
      scenario.matchedExpected += 1;
    }
    else failures.push(`${input.fixtureId}: missing ${wanted.field} ${wanted.value === undefined ? '' : stable(wanted.value)}`.trim());
  }
  for (const candidate of eligibleCandidates) {
    const matched = expected.candidates.some((wanted) => candidateMatches(candidate, wanted));
    if (matched) {
      matchedActual += 1;
      scenario.matchedActual += 1;
    }
    else {
      unsafeApplyCount += 1;
      scenario.unsafe += 1;
      failures.push(`${input.fixtureId}: unexpected eligible ${candidate.field} ${stable(candidate.value)}`);
    }
    for (const evidenceId of candidate.evidenceIds) {
      evidenceChecks += 1;
      scenario.evidence += 1;
      const evidence = draft.evidence.find((item) => item.id === evidenceId);
      if (evidence && (
        (evidence.source === 'reference_date' && evidence.text === input.referenceDate)
        || (evidence.source === 'input_text' && evidence.start !== null && evidence.end !== null
          && input.inputText.slice(evidence.start, evidence.end).includes(evidence.text))
      )) {
        validEvidenceChecks += 1;
        scenario.validEvidence += 1;
      }
    }
  }
  for (const candidate of actualCandidates.filter((item) => item.status === 'choice_required')) {
    linkedOptionChecks += 1;
    scenario.options += 1;
    if (candidate.options?.length && candidate.options.every((option) => option.linkedCandidateIds.includes(candidate.id))) {
      validLinkedOptionChecks += 1;
      scenario.validOptions += 1;
    }
  }
  assert.equal(draft.sensitiveSpans.length, 0, `${input.fixtureId}: deidentified fixture must not contain sensitive spans`);
}

assert.equal(MARKET_TEXT_IMPORT_HOLDOUT_INPUTS.length, 30);
assert.equal(new Set(MARKET_TEXT_IMPORT_HOLDOUT_INPUTS.map((item) => item.fixtureId)).size, 30);
assert.equal(MARKET_TEXT_IMPORT_HOLDOUT_EXPECTED.length, 30);

const report = {
  fixtureCount: 30,
  dispositionAccuracy: dispositions / 30,
  eventCountAccuracy: eventCounts / 30,
  candidatePrecision: matchedActual / actualEligibleCount,
  supportedRecall: matchedExpected / expectedCount,
  evidenceIntegrity: validEvidenceChecks / evidenceChecks,
  linkedOptionIntegrity: linkedOptionChecks === 0 ? 1 : validLinkedOptionChecks / linkedOptionChecks,
  rejectLeakCount,
  unsafeApplyCount,
  misses: failures.filter((failure) => failure.includes(': missing ')),
  unsafe: failures.filter((failure) => failure.includes(': unexpected eligible ')),
  byScenario: Object.fromEntries(Object.entries(scenarioStats).map(([key, value]) => [key, {
    fixtureCount: value.fixtures,
    dispositionAccuracy: value.dispositions / value.fixtures,
    eventCountAccuracy: value.eventCounts / value.fixtures,
    candidatePrecision: value.actual === 0 ? 1 : value.matchedActual / value.actual,
    supportedRecall: value.expected === 0 ? 1 : value.matchedExpected / value.expected,
    evidenceIntegrity: value.evidence === 0 ? 1 : value.validEvidence / value.evidence,
    linkedOptionIntegrity: value.options === 0 ? 1 : value.validOptions / value.options,
    unsafeApplyCount: value.unsafe,
  }])),
};

console.log(JSON.stringify(report, null, 2));
assert.equal(report.dispositionAccuracy, 1);
assert.equal(report.eventCountAccuracy, 1);
assert.ok(report.candidatePrecision >= 0.98, `candidate precision ${report.candidatePrecision}`);
assert.ok(report.supportedRecall >= 0.85, `supported recall ${report.supportedRecall}`);
assert.equal(report.evidenceIntegrity, 1);
assert.equal(report.linkedOptionIntegrity, 1);
assert.equal(report.rejectLeakCount, 0);
assert.equal(report.unsafeApplyCount, 0, report.unsafe.join('\n'));
const focused = report.byScenario.focused_block;
assert.equal(focused.dispositionAccuracy, 1);
assert.equal(focused.eventCountAccuracy, 1);
assert.ok(focused.candidatePrecision >= 0.99, `focused candidate precision ${focused.candidatePrecision}`);
assert.ok(focused.supportedRecall >= 0.90, `focused supported recall ${focused.supportedRecall}`);
assert.equal(focused.evidenceIntegrity, 1);
assert.equal(focused.linkedOptionIntegrity, 1);
assert.equal(focused.unsafeApplyCount, 0);
