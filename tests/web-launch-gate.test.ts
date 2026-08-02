import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateWebLaunchReadiness,
  parseWebLaunchGateDocument,
  WEB_LAUNCH_GATE_IDS,
  WEB_LAUNCH_GATE_STATUSES,
} from '../lib/deployment/web-launch-gate';

const root = process.cwd();
const structuredPath = join(root, 'docs/WEB_LAUNCH_GATES_2026_08_01.json');
const readinessPath = join(root, 'docs/WEB_LAUNCH_READINESS_2026_07_30.md');
const authenticatedMatrixPath = join(root, 'docs/WEB_AUTHENTICATED_RELEASE_MATRIX_2026_08_01.md');
const structured = JSON.parse(readFileSync(structuredPath, 'utf8')) as unknown;
const readiness = readFileSync(readinessPath, 'utf8');
const authenticatedMatrix = readFileSync(authenticatedMatrixPath, 'utf8');
const document = parseWebLaunchGateDocument(structured);
const report = evaluateWebLaunchReadiness(document);

assert.equal(report.ready, false);
assert.equal(report.overallStatus, 'not_ready');
assert.equal(report.totalCount, 19);
assert.equal(report.completeCount, 6);
assert.equal(report.blockerCount, 13);
assert.equal(document.updatedAt, readiness.match(/^Date: (\d{4}-\d{2}-\d{2})$/m)?.[1]);
assert.match(readiness, /Overall status: `NOT_READY`/);
assert.deepEqual(report.counts, {
  complete: 6,
  implemented_local: 1,
  pending_external: 5,
  pending_approval: 3,
  evidence_missing: 4,
});
assert.deepEqual(
  report.blockers.map(gate => gate.id),
  WEB_LAUNCH_GATE_IDS.filter(id => ![
    'CI-WEB',
    'LOCAL-QUALITY',
    'DB-063-065',
    'TEAM-LIVE',
    'PROD-SURFACE',
    'DEPLOY-IDENTITY',
  ].includes(id)),
);

for (const gate of document.gates) {
  const row = readiness.split('\n').find(line => line.startsWith(`| \`${gate.id}\` |`));
  assert.ok(row, `missing Markdown row for ${gate.id}`);
  assert.ok(row.includes(`| \`${gate.status}\` |`), `status drift for ${gate.id}`);
}
assert.equal(
  readiness.match(/^\| `[^`]+` \|/gm)?.length,
  WEB_LAUNCH_GATE_IDS.length,
  'Markdown launch matrix must not contain untracked gate rows',
);
assert.match(readiness, /General availability is `NO-GO` while any row above is not `complete`/);
assert.match(readiness, /`WEB_AUTHENTICATED_RELEASE_MATRIX_2026_08_01\.md`/);
assert.match(authenticatedMatrix, /Status: partial evidence only; `STAGING-E2E` remains `evidence_missing`/);
assert.match(authenticatedMatrix, /Latest public release revision: `3369ff622ca1214bedc9aa43beee77dc96f6c3ae`/);
assert.match(authenticatedMatrix, /Original browser matrix revision: `cac6fa6f7ffcf02779b0f3e66fb00ec9f4314250`/);
assert.match(authenticatedMatrix, /paid Production Pro and Team owner states/);
assert.match(authenticatedMatrix, /valid dedicated account in the Production target is required/);
assert.match(authenticatedMatrix, /No credential was\s+entered/);
assert.match(authenticatedMatrix, /Local subscription simulation was disabled before the browser run ended/);

const allComplete = parseWebLaunchGateDocument({
  ...document,
  overallStatus: 'ready',
  gates: document.gates.map(gate => ({ ...gate, status: 'complete' })),
});
assert.equal(evaluateWebLaunchReadiness(allComplete).ready, true);

function mutableDocument(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
}

const wrongOverall = mutableDocument();
wrongOverall.overallStatus = 'ready';
assert.throws(() => parseWebLaunchGateDocument(wrongOverall), error => (
  error instanceof Error && error.message === 'overall_status_mismatch'
));

const duplicate = mutableDocument();
const duplicateGates = duplicate.gates as Array<Record<string, unknown>>;
duplicateGates[1].id = duplicateGates[0].id;
assert.throws(() => parseWebLaunchGateDocument(duplicate), /duplicate_gate/);

const missing = mutableDocument();
(missing.gates as unknown[]).pop();
assert.throws(() => parseWebLaunchGateDocument(missing), /gate_count_invalid/);

const unknownId = mutableDocument();
(unknownId.gates as Array<Record<string, unknown>>)[0].id = 'UNKNOWN';
assert.throws(() => parseWebLaunchGateDocument(unknownId), /gate_id_invalid/);

const unknownStatus = mutableDocument();
(unknownStatus.gates as Array<Record<string, unknown>>)[0].status = 'almost_ready';
assert.throws(() => parseWebLaunchGateDocument(unknownStatus), /gate_status_invalid/);

const invalidDate = mutableDocument();
invalidDate.updatedAt = '2026-02-30';
assert.throws(() => parseWebLaunchGateDocument(invalidDate), /updated_date_invalid/);

const extraRootField = mutableDocument();
extraRootField.evidence = 'must-not-be-stored';
assert.throws(() => parseWebLaunchGateDocument(extraRootField), /document_invalid/);

const extraGateField = mutableDocument();
(extraGateField.gates as Array<Record<string, unknown>>)[0].notes = 'must-not-be-stored';
assert.throws(() => parseWebLaunchGateDocument(extraGateField), /document_invalid/);

assert.deepEqual(WEB_LAUNCH_GATE_STATUSES, [
  'complete',
  'implemented_local',
  'pending_external',
  'pending_approval',
  'evidence_missing',
]);
assert.deepEqual(
  Object.keys(report).sort(),
  [
    'blockerCount',
    'blockers',
    'completeCount',
    'counts',
    'overallStatus',
    'ready',
    'schemaVersion',
    'sourceDocument',
    'totalCount',
    'updatedAt',
  ],
);
assert.doesNotMatch(
  JSON.stringify(report),
  /private-object-key|raw-provider-message|owner-secret|access-token/,
);

const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const runbook = readFileSync(join(root, 'docs/WEB_LAUNCH_GATE_CHECK.md'), 'utf8');
assert.ok(packageJson.includes('"check:web-launch-readiness"'));
assert.ok(manifest.includes('tsx tests/web-launch-gate.test.ts'));
assert.ok(manifest.includes('tsx tests/web-launch-gate-cli.test.ts'));
assert.match(runbook, /Exit `1` is the expected result while any gate is not `complete`/);
assert.match(runbook, /does not approve or execute a launch/);

console.log('PASS fail-closed machine-readable Web launch gates');
