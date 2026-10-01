import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateLaunchExecutionPlan,
  LAUNCH_EXECUTION_RELEASE_ORDER,
  parseLaunchExecutionPlan,
} from '../lib/deployment/launch-execution-plan';
import { parseNativeLaunchGateDocument } from '../lib/deployment/native-launch-gate';
import { parseWebLaunchGateDocument } from '../lib/deployment/web-launch-gate';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const web = parseWebLaunchGateDocument(
  JSON.parse(read('docs/WEB_LAUNCH_GATES_2026_08_01.json')) as unknown,
);
const native = parseNativeLaunchGateDocument(
  JSON.parse(
    read('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json'),
  ) as unknown,
);
const raw = JSON.parse(read('docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json')) as unknown;
const document = parseLaunchExecutionPlan(raw, web, native);
const report = evaluateLaunchExecutionPlan(document);

assert.equal(document.overallStatus, 'not_ready');
assert.deepEqual(document.releaseOrder, LAUNCH_EXECUTION_RELEASE_ORDER);
assert.equal(report.launchReady, false);
assert.equal(report.totalTaskCount, 31);
assert.deepEqual(report.counts, {
  complete: 5,
  ready_agent: 0,
  pending_manual: 8,
  pending_approval: 5,
  blocked_dependency: 10,
  deferred: 3,
});
assert.deepEqual(report.agentReadyIds, []);
assert.ok(!report.humanActionIds.includes('NATIVE-GATE2-EVIDENCE'));
assert.ok(!report.humanActionIds.includes('SEC-SRA000-EXECUTION'));
assert.ok(report.humanActionIds.includes('APPLE-ACCOUNT-READINESS'));
assert.ok(!report.humanActionIds.includes('ACCOUNT-DELETION-POLICY'));
assert.ok(report.approvalIds.includes('STORE-VERIFICATION-RUNTIME'));
assert.ok(report.approvalIds.includes('SEC-REMEDIATION'));
assert.ok(report.deferredIds.includes('WEB-ECPAY'));

for (const task of document.tasks) {
  for (const path of task.evidence) assert.equal(existsSync(join(root, path)), true, path);
}

function mutablePlan(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
}

function task(plan: Record<string, unknown>, id: string): Record<string, unknown> {
  const tasks = plan.tasks as Array<Record<string, unknown>>;
  const found = tasks.find(candidate => candidate.id === id);
  if (!found) throw new Error(`missing test task: ${id}`);
  return found;
}

const wrongOverall = mutablePlan();
wrongOverall.overallStatus = 'ready';
assert.throws(
  () => parseLaunchExecutionPlan(wrongOverall, web, native),
  /overall_status_mismatch/,
);

const duplicate = mutablePlan();
(duplicate.tasks as Array<Record<string, unknown>>)[1].id = 'CONTROL-MASTER-PLAN';
assert.throws(() => parseLaunchExecutionPlan(duplicate, web, native), /task_duplicate/);

const missingCoverage = mutablePlan();
task(missingCoverage, 'APPLE-ACCOUNT-READINESS').gateRefs = [];
assert.throws(
  () => parseLaunchExecutionPlan(missingCoverage, web, native),
  /gate_coverage_missing/,
);

const reopened = mutablePlan();
task(reopened, 'APPLE-ACCOUNT-READINESS').gateRefs = [
  'native:APPLE-DEVELOPER',
  'web:CI-WEB',
];
assert.throws(
  () => parseLaunchExecutionPlan(reopened, web, native),
  /complete_gate_reopened/,
);

const cycle = mutablePlan();
task(cycle, 'CONTROL-MASTER-PLAN').dependsOn = ['SEC-SRA000-ARTIFACT'];
task(cycle, 'SEC-SRA000-ARTIFACT').dependsOn = ['CONTROL-MASTER-PLAN'];
assert.throws(() => parseLaunchExecutionPlan(cycle, web, native), /dependency_cycle/);

const invalidBlocked = mutablePlan();
task(invalidBlocked, 'SEC-REMEDIATION').status = 'blocked_dependency';
assert.throws(
  () => parseLaunchExecutionPlan(invalidBlocked, web, native),
  /dependency_status_invalid/,
);

const invalidOwner = mutablePlan();
task(invalidOwner, 'APPLE-ACCOUNT-READINESS').owner = 'agent';
assert.throws(
  () => parseLaunchExecutionPlan(invalidOwner, web, native),
  /task_status_owner_invalid/,
);

const invalidEvidence = mutablePlan();
task(invalidEvidence, 'CONTROL-MASTER-PLAN').evidence = ['../outside.json'];
assert.throws(
  () => parseLaunchExecutionPlan(invalidEvidence, web, native),
  /evidence_path_invalid/,
);

const unsafe = mutablePlan();
task(unsafe, 'CONTROL-MASTER-PLAN').title = 'Open https://example.invalid';
assert.throws(() => parseLaunchExecutionPlan(unsafe, web, native), /unsafe_value/);

const packageJson = read('package.json');
const manifest = read('scripts/test-files.txt');
const plan = read('docs/LAUNCH_EXECUTION_MASTER_PLAN_2026_08_09.md');
assert.match(packageJson, /check:launch-execution-plan/);
assert.match(manifest, /launch-execution-plan\.test\.ts/);
assert.match(plan, /Human Action Queue/);
assert.match(plan, /Agent Execution Queue/);
assert.match(plan, /Exit `0`[\s\S]*does\s+not mean the product is launch-ready/);

console.log('PASS canonical launch execution plan is complete, acyclic, and gate-aligned');
