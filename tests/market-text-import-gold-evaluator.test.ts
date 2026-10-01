import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  assessDraftGoldQualityGate,
  createPerfectGoldActualResults,
  evaluateGoldResults,
  loadGoldEvaluationTargets,
  type CoreEvaluationCandidate,
} from './fixtures/market-text-import-gold-evaluator';

const projectRoot = join(__dirname, '..');
const targets = loadGoldEvaluationTargets(projectRoot);

assert.equal(targets.length, 83);
assert.ok(targets.every((target) => target.events.every((event) => event.coreCandidates.length <= 3)));
assert.ok(
  targets.flatMap((target) => target.events).some((event) => (
    event.coreCandidates.some((candidate) => candidate.field === 'name')
  )),
);

const perfect = createPerfectGoldActualResults(targets);
const perfectReport = evaluateGoldResults(targets, perfect);
assert.equal(perfectReport.overall.fixtureCount, 83);
assert.equal(perfectReport.overall.dispositionAccuracy.rate, 1);
assert.equal(perfectReport.overall.readinessAccuracy.rate, 1);
assert.equal(perfectReport.overall.eventCountAccuracy.rate, 1);
assert.equal(perfectReport.overall.coreCandidatePrecision.rate, 1);
assert.equal(perfectReport.overall.coreSupportedRecall.rate, 1);
assert.equal(perfectReport.overall.eligiblePrecision.rate, 1);
assert.equal(perfectReport.overall.evidenceIntegrity.rate, 1);
assert.equal(perfectReport.overall.rejectLeakCount, 0);
assert.equal(perfectReport.overall.crossEventMergeViolations, 0);
assert.equal(perfectReport.overall.unsafeApplyCount, 0);
assert.equal(perfectReport.overall.administrativeDateLeakageCount, 0);
assert.equal(perfectReport.overall.externalEvidenceViolations, 0);
assert.equal(assessDraftGoldQualityGate(perfectReport).passed, true);

assert.equal(perfectReport.byRound.A.fixtureCount, 23);
assert.equal(perfectReport.byRound.B.fixtureCount, 30);
assert.equal(perfectReport.byRound.C.fixtureCount, 30);
assert.equal(
  perfectReport.byScenario.focused_block.fixtureCount
    + perfectReport.byScenario.focused_with_context.fixtureCount
    + perfectReport.byScenario.full_message_stress.fixtureCount,
  83,
);

const flawed = structuredClone(perfect);
const rejectTarget = targets.find((target) => target.disposition === 'reject');
assert.ok(rejectTarget);
const rejectActual = flawed.find((actual) => actual.fixtureId === rejectTarget.fixtureId);
assert.ok(rejectActual);
const leakingCandidate: CoreEvaluationCandidate = {
  field: 'dates',
  semanticRole: 'administrative_date',
  status: 'exact',
  normalizedValue: ['2099-01-01'],
  applyPolicy: 'eligible',
  evidence: [{ source: 'external', text: 'outside input' }],
  sourceEventIndexes: [0, 1],
};
rejectActual.events = [{ coreCandidates: [leakingCandidate] }];
rejectActual.disposition = 'single_candidate';
rejectActual.readiness = 'reviewable_core';

const flawedReport = evaluateGoldResults(targets, flawed);
assert.equal(flawedReport.overall.rejectLeakCount, 1);
assert.equal(flawedReport.overall.crossEventMergeViolations, 1);
assert.equal(flawedReport.overall.unsafeApplyCount, 1);
assert.equal(flawedReport.overall.coreFalsePositiveCount, 1);
assert.equal(flawedReport.overall.administrativeDateLeakageCount, 1);
assert.equal(flawedReport.overall.externalEvidenceViolations, 1);
assert.ok(flawedReport.overall.evidenceIntegrity.rate < 1);
const failedGate = assessDraftGoldQualityGate(flawedReport);
assert.equal(failedGate.passed, false);
assert.ok(failedGate.failures.some((failure) => failure.startsWith('rejectLeakCount')));

assert.throws(
  () => evaluateGoldResults(targets, perfect.slice(1)),
  /coverage mismatch/,
);
assert.throws(
  () => evaluateGoldResults(targets, [...perfect, perfect[0]]),
  /duplicate actual result/,
);

console.log('market text import Gold evaluator core: 83 fixtures and failure probes passed');
