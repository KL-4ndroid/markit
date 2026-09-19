import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const proposal = read(
  'docs/subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md',
);
const normalizedProposal = proposal.replace(/\s+/g, ' ');
const roleMatrix = read('docs/staff-role-matrix.md');
const executionPlan = read('docs/subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md');
const gates = JSON.parse(
  read('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json'),
) as { overallStatus: string; gates: Array<{ id: string; status: string }> };
const migration001 = read('supabase/migrations/001_uuid_schema.sql');
const migration055 = read('supabase/migrations/055_add_sales_photo_evidence_schema.sql');
const migration066 = read('supabase/migrations/066_add_subscription_price_catalog_foundation.sql');
const migration067 = read('supabase/migrations/067_add_billing_event_transaction_ledger.sql');
const pendingReport = read('lib/sync/local-pending-write-report.ts');
const manifest = read('scripts/test-files.txt');

for (const boundary of [
  'AD0–AD3 disposable evidence complete',
  'deployment, real store/device evidence, public release alignment, and Production remain incomplete',
  'auth.admin.deleteUser()',
  'getLocalPendingWriteReport()',
  'viewer/operator/manager can delete only their own account',
  'R2 image and thumbnail partial failures',
  'F3A/F3B',
  'AD1',
  'AD2',
  'AD3',
  'AD4',
  'anonymous request/status/confirm/cancel denial',
  'cross-owner',
  'corrective-forward',
]) {
  assert.ok(normalizedProposal.includes(boundary), `proposal boundary missing: ${boundary}`);
}

for (const role of ['owner', 'manager', 'operator', 'viewer', 'anonymous']) {
  assert.match(proposal, new RegExp(`\\| ${role} \\|`));
}

assert.match(proposal, /events\.actor_id/);
assert.match(proposal, /ON DELETE RESTRICT/);
assert.match(proposal, /billing subject independent of `profiles`\/`auth\.users`/);
assert.match(proposal, /Do not clear Dexie or sign out before the server has accepted/);
assert.match(proposal, /auth deletion last/i);
assert.match(proposal, /No route accepts `ownerId`, `staffId`, email, role, or object keys/);

assert.match(migration001, /actor_id UUID NOT NULL REFERENCES profiles\(id\)/);
assert.match(migration055, /captured_by_staff_id UUID REFERENCES public\.profiles\(id\) ON DELETE SET NULL/);
assert.match(migration066, /owner_id UUID NOT NULL REFERENCES public\.profiles\(id\) ON DELETE RESTRICT/);
assert.match(migration067, /owner_id UUID NOT NULL REFERENCES public\.profiles\(id\) ON DELETE RESTRICT/);
assert.match(pendingReport, /pendingSalesPhotoEvidencePayloadCount/);
assert.match(pendingReport, /pendingProductCoverPhotoPayloadCount/);

assert.match(roleMatrix, /Account Deletion Planning Boundary/);
assert.match(roleMatrix, /viewer`, `operator`, and `manager`/);
assert.match(executionPlan, /ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06\.md/);
assert.equal(gates.overallStatus, 'not_ready');
assert.equal(gates.gates.find(gate => gate.id === 'ACCOUNT-DELETION')?.status, 'pending_approval');
assert.ok(manifest.includes('tsx tests/account-deletion-implementation-proposal.test.ts'));

assert.doesNotMatch(proposal, /sb_secret_|AKIA[0-9A-Z]{16}/);
assert.doesNotMatch(
  proposal,
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
);

console.log('PASS account deletion proposal keeps unexecuted runtime boundaries role-safe');
