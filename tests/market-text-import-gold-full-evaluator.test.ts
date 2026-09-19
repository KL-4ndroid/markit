import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  assessFrozenGoldQualityGateV1,
  createPerfectFullGoldActualResults,
  evaluateFullGoldResults,
  FROZEN_GOLD_QUALITY_THRESHOLDS_V1,
  loadFullGoldEvaluationTargets,
  summarizeFullGoldEvaluation,
} from './fixtures/market-text-import-gold-full-evaluator';

const projectRoot = join(__dirname, '..');
const targets = loadFullGoldEvaluationTargets(projectRoot);
assert.equal(targets.length, 83);

const allCandidates = targets.flatMap((target) => [
  ...target.events.flatMap((event) => event.candidates),
  ...target.warnings,
]);
for (const group of ['core', 'time', 'money', 'equipment', 'warning'] as const) {
  assert.ok(allCandidates.some((candidate) => candidate.group === group), `missing ${group} projection`);
}
assert.ok(targets.some((target) => target.events.some((event) => event.linkedOptions.length > 0)));
assert.ok(
  targets.flatMap((target) => target.events).flatMap((event) => event.linkedOptions)
    .every((option) => option.optionFingerprint !== 'undefined'),
  'choice_required candidates must preserve option payloads',
);

const perfect = createPerfectFullGoldActualResults(targets);
const perfectReport = evaluateFullGoldResults(targets, perfect);
assert.equal(perfectReport.overall.candidatePrecision.rate, 1);
assert.equal(perfectReport.overall.supportedRecall.rate, 1);
assert.equal(perfectReport.overall.eligiblePrecision.rate, 1);
assert.equal(perfectReport.overall.evidenceIntegrity.rate, 1);
assert.equal(perfectReport.overall.linkedOptionIntegrity.rate, 1);
assert.equal(perfectReport.overall.warningPrecision.rate, 1);
assert.equal(perfectReport.overall.warningRecall.rate, 1);
assert.equal(perfectReport.overall.unsafeApplyCount, 0);
assert.equal(perfectReport.overall.externalEvidenceViolations, 0);
assert.equal(perfectReport.overall.optionIntegrityViolations, 0);
for (const group of ['core', 'time', 'money', 'equipment', 'warning'] as const) {
  assert.equal(perfectReport.byGroup[group].candidatePrecision.rate, 1);
  assert.equal(perfectReport.byGroup[group].supportedRecall.rate, 1);
  assert.equal(perfectReport.byGroup[group].evidenceIntegrity.rate, 1);
}
for (const status of ['exact', 'inferable', 'choice_required', 'conflict', 'not_present', 'unsupported', 'ignore'] as const) {
  assert.equal(perfectReport.byStatus[status].candidatePrecision.rate, 1);
  assert.equal(perfectReport.byStatus[status].evidenceIntegrity.rate, 1);
}

const passedGate = assessFrozenGoldQualityGateV1(perfectReport);
assert.equal(passedGate.passed, true);
assert.deepEqual(passedGate.failures, []);
assert.equal(passedGate.thresholds.version, 1);
assert.equal(FROZEN_GOLD_QUALITY_THRESHOLDS_V1.overall.candidatePrecision, 0.98);
assert.equal(FROZEN_GOLD_QUALITY_THRESHOLDS_V1.focused.candidatePrecision, 0.99);

const summary = summarizeFullGoldEvaluation(perfectReport);
assert.equal(summary.thresholdVersion, 1);
assert.ok('byGroup' in summary && 'byStatus' in summary && 'byRound' in summary && 'byScenario' in summary);

const flawed = structuredClone(perfect);
const moneyFixture = flawed.find((fixture) => fixture.events.some((event) => (
  event.candidates.some((candidate) => candidate.group === 'money' && candidate.applyPolicy === 'never')
)));
assert.ok(moneyFixture);
const unsafeMoney = moneyFixture.events
  .flatMap((event) => event.candidates)
  .find((candidate) => candidate.group === 'money' && candidate.applyPolicy === 'never');
assert.ok(unsafeMoney);
unsafeMoney.applyPolicy = 'eligible';

const optionFixture = flawed.find((fixture) => fixture.events.some((event) => event.linkedOptions.length > 0));
assert.ok(optionFixture);
const option = optionFixture.events.find((event) => event.linkedOptions.length > 0)?.linkedOptions[0];
assert.ok(option);
option.optionFingerprint = 'tampered-option-combination';

const equipmentFixture = flawed.find((fixture) => fixture.events.some((event) => (
  event.candidates.some((candidate) => (
    candidate.group === 'equipment'
    && (candidate.status === 'exact' || candidate.status === 'inferable')
  ))
)));
assert.ok(equipmentFixture);
const equipmentEvent = equipmentFixture.events.find((event) => (
  event.candidates.some((candidate) => (
    candidate.group === 'equipment'
    && (candidate.status === 'exact' || candidate.status === 'inferable')
  ))
));
assert.ok(equipmentEvent);
const supportedEquipment = equipmentEvent.candidates.find((candidate) => (
  candidate.group === 'equipment'
  && (candidate.status === 'exact' || candidate.status === 'inferable')
));
assert.ok(supportedEquipment);
equipmentEvent.candidates = equipmentEvent.candidates.filter(
  (candidate) => candidate.candidateId !== supportedEquipment.candidateId,
);

const flawedReport = evaluateFullGoldResults(targets, flawed);
assert.equal(flawedReport.overall.unsafeApplyCount, 1);
assert.equal(flawedReport.overall.optionIntegrityViolations, 1);
assert.ok(flawedReport.byGroup.equipment.supportedRecall.rate < 1);
const failedGate = assessFrozenGoldQualityGateV1(flawedReport);
assert.equal(failedGate.passed, false);
assert.ok(failedGate.failures.some((failure) => failure.startsWith('full unsafeApplyCount')));
assert.ok(failedGate.failures.some((failure) => failure.startsWith('full optionIntegrityViolations')));

console.log('market text import Gold full evaluator: all groups, report, and frozen gate v1 passed');
