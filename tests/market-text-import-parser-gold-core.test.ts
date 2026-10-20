import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  assessDraftGoldQualityGate,
  evaluateGoldResults,
  loadGoldEvaluationTargets,
} from './fixtures/market-text-import-gold-evaluator';
import { parseGoldTargets } from './fixtures/market-text-import-parser-gold-adapter';

const projectRoot = join(__dirname, '..');
const targets = loadGoldEvaluationTargets(projectRoot);
const actual = parseGoldTargets(targets);
const report = evaluateGoldResults(targets, actual);
const assessment = assessDraftGoldQualityGate(report);

assert.equal(actual.length, 83);
assert.equal(report.overall.rejectLeakCount, 0);
assert.equal(report.overall.crossEventMergeViolations, 0);
assert.equal(report.overall.administrativeDateLeakageCount, 0);

if (!assessment.passed) {
  console.error(JSON.stringify({ overall: report.overall, byScenario: report.byScenario, failures: assessment.failures }, null, 2));
}
assert.equal(assessment.passed, true, assessment.failures.join('\n'));

console.log('market text import parser Gate 5 core Gold quality gate passed');
