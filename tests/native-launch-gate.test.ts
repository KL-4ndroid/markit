import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateNativeLaunchReadiness,
  NATIVE_LAUNCH_GATE_IDS,
  NATIVE_LAUNCH_GATE_STATUSES,
  parseNativeLaunchGateDocument,
} from '../lib/deployment/native-launch-gate';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const structured = JSON.parse(
  read('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json'),
) as unknown;
const document = parseNativeLaunchGateDocument(structured);
const report = evaluateNativeLaunchReadiness(document);

assert.equal(report.ready, false);
assert.equal(report.overallStatus, 'not_ready');
assert.equal(report.totalCount, 16);
assert.equal(report.completeCount, 3);
assert.equal(report.blockerCount, 13);
assert.deepEqual(report.counts, {
  complete: 3,
  pending_external: 4,
  pending_manual: 5,
  pending_approval: 3,
  blocked_dependency: 1,
});
assert.deepEqual(
  report.blockers.map(gate => gate.id),
  NATIVE_LAUNCH_GATE_IDS.filter(id => ![
    'NATIVE-DIRECTION',
    'ACCOUNT-ENTITLEMENT-CORE',
    'IAP-PLATFORM-PORT',
  ].includes(id)),
);

const allComplete = parseNativeLaunchGateDocument({
  ...document,
  overallStatus: 'ready',
  gates: document.gates.map(gate => ({ ...gate, status: 'complete' })),
});
assert.equal(evaluateNativeLaunchReadiness(allComplete).ready, true);

function mutableDocument(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
}

const wrongOverall = mutableDocument();
wrongOverall.overallStatus = 'ready';
assert.throws(() => parseNativeLaunchGateDocument(wrongOverall), /overall_status_mismatch/);

const duplicate = mutableDocument();
const duplicateGates = duplicate.gates as Array<Record<string, unknown>>;
duplicateGates[1].id = duplicateGates[0].id;
assert.throws(() => parseNativeLaunchGateDocument(duplicate), /duplicate_gate/);

const missing = mutableDocument();
(missing.gates as unknown[]).pop();
assert.throws(() => parseNativeLaunchGateDocument(missing), /gate_count_invalid/);

const unknownId = mutableDocument();
(unknownId.gates as Array<Record<string, unknown>>)[0].id = 'UNKNOWN';
assert.throws(() => parseNativeLaunchGateDocument(unknownId), /gate_id_invalid/);

const unknownStatus = mutableDocument();
(unknownStatus.gates as Array<Record<string, unknown>>)[0].status = 'almost_ready';
assert.throws(() => parseNativeLaunchGateDocument(unknownStatus), /gate_status_invalid/);

const invalidDate = mutableDocument();
invalidDate.updatedAt = '2026-02-30';
assert.throws(() => parseNativeLaunchGateDocument(invalidDate), /updated_date_invalid/);

const extraRootField = mutableDocument();
extraRootField.evidence = 'must-not-be-stored';
assert.throws(() => parseNativeLaunchGateDocument(extraRootField), /document_invalid/);

const extraGateField = mutableDocument();
(extraGateField.gates as Array<Record<string, unknown>>)[0].notes = 'must-not-be-stored';
assert.throws(() => parseNativeLaunchGateDocument(extraGateField), /document_invalid/);

assert.deepEqual(NATIVE_LAUNCH_GATE_STATUSES, [
  'complete',
  'pending_external',
  'pending_manual',
  'pending_approval',
  'blocked_dependency',
]);
assert.doesNotMatch(
  JSON.stringify(report),
  /purchase-token|account-secret|provider-reference|customer-data/,
);

const packageJson = read('package.json');
const manifest = read('scripts/test-files.txt');
const runbook = read('docs/subscription/NATIVE_LAUNCH_GATE_CHECK.md');
assert.ok(packageJson.includes('"check:native-launch-readiness"'));
assert.ok(manifest.includes('tsx tests/native-launch-gate.test.ts'));
assert.ok(manifest.includes('tsx tests/native-launch-gate-cli.test.ts'));
assert.match(runbook, /Exit `1` is evidence that the checker ran successfully/);
assert.match(runbook, /does not approve a gate/);

console.log('PASS fail-closed machine-readable Native launch gates');
