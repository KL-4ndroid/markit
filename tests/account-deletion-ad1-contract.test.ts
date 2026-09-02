import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACCOUNT_DELETION_POLICY_REVISION,
  canTransitionAccountDeletionRequest,
  evaluateAccountDeletionCompletion,
  requiredAccountDeletionSteps,
  type AccountDeletionAccountKind,
  type AccountDeletionStepEvidence,
} from '../lib/subscription/account-deletion-contract';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const hash = 'a'.repeat(64);

function completedSteps(kind: AccountDeletionAccountKind): AccountDeletionStepEvidence[] {
  return requiredAccountDeletionSteps(kind).map(code => ({
    code,
    status: 'completed',
    affectedCount: 0,
    evidenceHash: hash,
  }));
}

assert.equal(ACCOUNT_DELETION_POLICY_REVISION, '2026-08-17');
assert.equal(canTransitionAccountDeletionRequest('requested', 'identity_confirmed'), true);
assert.equal(canTransitionAccountDeletionRequest('requested', 'processing'), false);
assert.equal(canTransitionAccountDeletionRequest('completed', 'processing'), false);
assert.equal(canTransitionAccountDeletionRequest('cancelled', 'requested'), false);

for (const accountKind of ['owner', 'staff'] as const) {
  const decision = evaluateAccountDeletionCompletion({
    accountKind,
    requestStatus: 'processing',
    identityConfirmed: true,
    preflightResolution: 'clean',
    leaseActive: false,
    steps: completedSteps(accountKind),
  });
  assert.deepEqual(decision, { eligible: true, blockers: [], missingSteps: [] });
}

const ownerSteps = completedSteps('owner');
const withoutAbsenceProof = ownerSteps.filter(step => step.code !== 'r2_absence_verified');
assert.deepEqual(
  evaluateAccountDeletionCompletion({
    accountKind: 'owner',
    requestStatus: 'processing',
    identityConfirmed: true,
    preflightResolution: 'discard_confirmed',
    leaseActive: false,
    steps: withoutAbsenceProof,
  }).missingSteps,
  ['r2_absence_verified'],
);

const invalidEvidence = ownerSteps.map(step => step.code === 'billing_identity_detached'
  ? { ...step, evidenceHash: 'raw-owner-id' }
  : step);
assert.ok(evaluateAccountDeletionCompletion({
  accountKind: 'owner',
  requestStatus: 'processing',
  identityConfirmed: true,
  preflightResolution: 'sync_confirmed',
  leaseActive: false,
  steps: invalidEvidence,
}).blockers.includes('step_evidence_invalid'));

assert.ok(evaluateAccountDeletionCompletion({
  accountKind: 'staff',
  requestStatus: 'processing',
  identityConfirmed: false,
  preflightResolution: null,
  leaseActive: true,
  steps: completedSteps('staff'),
}).blockers.every(code => [
  'identity_not_confirmed',
  'preflight_not_resolved',
  'worker_lease_active',
].includes(code)));

const duplicate = [...completedSteps('staff'), completedSteps('staff')[0]];
assert.ok(evaluateAccountDeletionCompletion({
  accountKind: 'staff',
  requestStatus: 'manual_review',
  identityConfirmed: true,
  preflightResolution: 'export_confirmed',
  leaseActive: false,
  steps: duplicate,
}).blockers.includes('step_duplicate'));

const draft = read('docs/subscription/drafts/ACCOUNT_DELETION_AD1_REQUEST_FOUNDATION_DRAFT.sql');
const normalizedDraft = draft.replace(/\s+/gu, ' ');
assert.match(draft, /REVIEW-ONLY DRAFT/);
assert.match(draft, /ROLLBACK;/);
assert.match(draft, /ENABLE ROW LEVEL SECURITY/g);
assert.match(draft, /REVOKE ALL ON TABLE public\.account_deletion_requests/);
assert.match(draft, /one_active_actor/);
assert.match(draft, /active_actor_id IS NULL/);
assert.match(draft, /r2_absence_verified/);
assert.match(draft, /billing_identity_detached/);
assert.match(draft, /auth_user_deleted/);
assert.match(draft, /account_deletion_terminal_state/);
assert.match(draft, /account_deletion_transition_invalid/);
assert.match(draft, /account_deletion_completion_incomplete/);
assert.match(draft, /prevent_account_deletion_audit_mutation/);
assert.match(draft, /evidence_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
assert.doesNotMatch(normalizedDraft, /GRANT (INSERT|UPDATE|DELETE|ALL).*authenticated/i);
assert.doesNotMatch(normalizedDraft, /\b(email|purchase_token|raw_receipt|object_key|support_message)\b/i);

const threatModel = read('docs/subscription/ACCOUNT_DELETION_AD1_THREAT_MODEL_2026_08_17.md');
for (const threatId of Array.from({ length: 15 }, (_, index) => `AD-T${String(index + 1).padStart(2, '0')}`)) {
  assert.match(threatModel, new RegExp(`\\b${threatId}\\b`));
}
assert.match(threatModel, /delete_current_user_app_data\(\)/);
assert.match(threatModel, /No external account or user data was[\s\S]*mutated/);

console.log('PASS account deletion AD1 contracts fail closed with review-only schema evidence');
