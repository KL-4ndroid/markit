import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const runbook = read('docs/IOS_PHASE2_GATE2_COMPENSATION_RUNBOOK.md');
const template = read('docs/IOS_PHASE2_GATE2_COMPENSATION_EVIDENCE_TEMPLATE.md');
const progress = read('docs/IOS_CAPACITOR_PROGRESS.md');
const resolver = read('lib/sales/photo-evidence-fault-injection.server.ts');
const manifest = read('scripts/test-files.txt');
const gates = JSON.parse(read('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json')) as {
  overallStatus: string;
  gates: Array<{ id: string; status: string }>;
};

for (const variable of [
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ENABLED',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ALLOW_PRODUCTION',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_OWNER_ID',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_MARKET_ID',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_SALE_ID',
  'SALES_PHOTO_EVIDENCE_FAULT_INJECTION_AUTOMATIC_MODE',
]) {
  assert.ok(runbook.includes(variable), `runbook is missing existing control ${variable}`);
}

for (const mode of ['thumbnail_upload_failed', 'metadata_finalize_failed']) {
  assert.ok(runbook.includes(mode), `runbook is missing mode ${mode}`);
  assert.ok(template.includes(mode), `evidence template is missing mode ${mode}`);
  assert.ok(resolver.includes(mode), `runbook must reference an existing resolver mode: ${mode}`);
}

assert.match(runbook, /does not add a[\s\S]*probe, route, adapter, cleanup worker, or verifier/i);
assert.match(runbook, /remove all seven variables/i);
assert.match(runbook, /physical absence/i);
assert.match(runbook, /normal retry succeeds/i);
assert.match(runbook, /Gate 2 remains open/i);
assert.match(template, /Status: `INCOMPLETE`/);
assert.match(template, /Gate 2 decision: `KEEP_OPEN`/);
assert.doesNotMatch(`${runbook}\n${template}`, /sb_secret_|AKIA[0-9A-Z]{16}/);
assert.doesNotMatch(`${runbook}\n${template}`, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

assert.match(progress, /IOS_PHASE2_GATE2_COMPENSATION_RUNBOOK\.md/);
assert.match(progress, /IOS_PHASE2_GATE2_COMPENSATION_EVIDENCE_TEMPLATE\.md/);
assert.equal(gates.overallStatus, 'not_ready');
assert.equal(
  gates.gates.find(gate => gate.id === 'CAPACITOR-GATE2')?.status,
  'pending_external',
);
assert.ok(
  manifest.includes('tsx tests/ios-phase2-gate2-compensation-runbook.test.ts'),
  'documentation guardrail must stay in the complete test manifest',
);

console.log('PASS Gate 2 compensation runbook reuses existing runtime and stays fail closed');
