import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateNativeExternalAccountReadiness,
  NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS,
  NATIVE_EXTERNAL_ACCOUNT_CHECK_STATUSES,
  NativeExternalAccountReadinessValidationError,
  parseNativeExternalAccountReadiness,
} from '../lib/deployment/native-external-account-readiness';

type MutableCheck = { id: string; status: string };
type MutableDocument = Record<string, unknown> & { checks: MutableCheck[] };

const root = process.cwd();
const jsonPath = join(
  root,
  'docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json',
);
const source = readFileSync(jsonPath, 'utf8');
const canonical = JSON.parse(source) as MutableDocument;
const document = parseNativeExternalAccountReadiness(canonical);
const report = evaluateNativeExternalAccountReadiness(document);

assert.equal(report.readyForRuntimeHandoff, false);
assert.equal(report.totalCount, 26);
assert.equal(report.completeCount, 0);
assert.equal(report.blockerCount, 26);
assert.deepEqual(report.counts, {
  complete: 0,
  pending_manual: 22,
  blocked_dependency: 4,
  not_applicable: 0,
});
assert.deepEqual(document.checks.map(check => check.id), NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS);
assert.deepEqual(NATIVE_EXTERNAL_ACCOUNT_CHECK_STATUSES, [
  'complete',
  'pending_manual',
  'blocked_dependency',
  'not_applicable',
]);
assert.doesNotMatch(source, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu);
assert.doesNotMatch(source, /"(?:value|email|name|address|token|secret|credential)"\s*:/iu);

function clone(): MutableDocument {
  return structuredClone(canonical);
}

const ready = clone();
for (const check of ready.checks) check.status = 'complete';
assert.equal(
  evaluateNativeExternalAccountReadiness(parseNativeExternalAccountReadiness(ready))
    .readyForRuntimeHandoff,
  true,
);

const conditional = clone();
for (const check of conditional.checks) check.status = 'complete';
for (const id of [
  'google.device_verification_requirement',
  'google.closed_test_requirement',
]) conditional.checks.find(check => check.id === id)!.status = 'not_applicable';
assert.equal(
  evaluateNativeExternalAccountReadiness(parseNativeExternalAccountReadiness(conditional))
    .readyForRuntimeHandoff,
  true,
);

function expectInvalid(
  mutate: (input: MutableDocument) => void,
  code: NativeExternalAccountReadinessValidationError['code'],
): void {
  const input = clone();
  mutate(input);
  assert.throws(
    () => parseNativeExternalAccountReadiness(input),
    (error: unknown) => error instanceof NativeExternalAccountReadinessValidationError
      && error.code === code,
  );
}

expectInvalid(input => { input.activationStatus = 'enabled'; }, 'activation_status_invalid');
expectInvalid(input => { input.environment = 'production'; }, 'environment_invalid');
expectInvalid(input => { input.evidencePolicy = 'include_values'; }, 'evidence_policy_invalid');
expectInvalid(input => { input.checks.pop(); }, 'check_count_invalid');
expectInvalid(input => { input.checks[1].id = input.checks[0].id; }, 'check_duplicate');
expectInvalid(input => { input.checks[0].id = 'apple.unknown'; }, 'check_id_invalid');
expectInvalid(input => { input.checks[0].status = 'almost_complete'; }, 'check_status_invalid');
expectInvalid(input => { input.checks[0].status = 'not_applicable'; }, 'not_applicable_invalid');
expectInvalid(input => { input.accountEmail = 'not-allowed'; }, 'document_invalid');
expectInvalid(input => { input.checks[0].evidence = 'not-allowed'; }, 'document_invalid');

const documentation = readFileSync(join(
  root,
  'docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.md',
), 'utf8');
const plan = readFileSync(join(
  root,
  'docs/subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md',
), 'utf8');
const manual = readFileSync(join(root, 'docs/WEB_LAUNCH_MANUAL_ACTIONS_2026_08_01.md'), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
assert.match(documentation, /status-only handoff/);
assert.match(documentation, /12 opted-in closed-test users for 14 continuous days/);
assert.match(documentation, /must never contain names, addresses, email/);
assert.match(plan, /NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06\.json/);
assert.match(manual, /check:native-external-readiness/);
assert.ok(manifest.includes('tsx tests/native-external-account-readiness.test.ts'));
assert.ok(manifest.includes('tsx tests/native-external-account-readiness-cli.test.ts'));
assert.ok(packageJson.includes('"check:native-external-readiness"'));

console.log('PASS Native external account handoff is strict and secret-free');
