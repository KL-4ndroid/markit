import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const plan = read('docs/subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md');
const normalizedPlan = plan.replace(/\s+/g, ' ');
const gates = JSON.parse(
  read('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json'),
) as {
  schemaVersion: number;
  sourceDocument: string;
  updatedAt: string;
  overallStatus: string;
  gates: Array<{ id: string; status: string }>;
};
const providerDecision = read('docs/subscription/BILLING_PROVIDER_DECISION.md');
const capacitorProgress = read('docs/IOS_CAPACITOR_PROGRESS.md');

for (const invariant of [
  'authenticated Féria owner account',
  'never to a device',
  'Apple In-App Purchase',
  'Google Play Billing',
  'Web checkout is deferred',
  'One owner workspace may have at most one active paid transaction origin',
  'Restore may recover a purchase only for the same trusted Féria account',
  'client purchase result',
  'never grants Pro or Team by itself',
]) {
  assert.ok(normalizedPlan.includes(invariant), `native execution invariant missing: ${invariant}`);
}

assert.equal(gates.schemaVersion, 1);
assert.equal(gates.overallStatus, 'not_ready');
assert.equal(gates.updatedAt, '2026-08-06');
assert.equal(gates.gates.length, 14);
assert.deepEqual(
  gates.gates.filter(gate => gate.status === 'complete').map(gate => gate.id),
  ['NATIVE-DIRECTION', 'ACCOUNT-ENTITLEMENT-CORE', 'IAP-PLATFORM-PORT'],
);
assert.ok(gates.gates.some(gate => (
  gate.id === 'CAPACITOR-GATE2' && gate.status === 'pending_external'
)));
assert.ok(gates.gates.some(gate => (
  gate.id === 'ENTITLEMENT-WRITER' && gate.status === 'pending_approval'
)));
assert.ok(gates.gates.some(gate => (
  gate.id === 'NATIVE-ADAPTERS' && gate.status === 'blocked_dependency'
)));

assert.ok(providerDecision.includes('ECPay recurring payment'));
assert.ok(providerDecision.includes('deferred_web_phase'));
assert.ok(providerDecision.includes('NewebPay 不再是選定供應商'));
assert.ok(capacitorProgress.includes('RESUMED WITH EXISTING GATE'));
assert.ok(capacitorProgress.includes('Gate 2 stays closed'));

console.log('PASS native-first account entitlement direction and launch gates');
