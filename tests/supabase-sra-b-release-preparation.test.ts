import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const manifestPath = 'docs/security/SRA_B_RELEASE_MANIFEST_2026_09_01.json';
const guidePath = 'docs/security/SUPABASE_SRA_B_RELEASE_PREPARATION_2026_09_01.md';
const manifest = JSON.parse(read(manifestPath)) as {
  releaseId: string;
  status: string;
  artifacts: Array<{ purpose: string; path: string; sha256: string }>;
  unsafeCorrectiveForwardIntentionallyAbsent: boolean;
  execution: {
    authorized: boolean;
    attemptCount: number;
    attemptOutcome: string;
    attempts: Array<{
      number: number;
      outcome: string;
      forwardCommitted: boolean;
      productionMutationCount?: number;
      fixedForwardExecutionCount?: number;
      policyDdlChangeCount?: number;
      businessRowMutationCount?: number;
      evidence: string;
    }>;
    forwardCommitted: boolean;
    fixedForwardCommittedCount: number;
    baselineReverifiedUnchanged: boolean;
    postcheckAccepted: boolean;
    reviewerSignoffAccepted: boolean;
    reauthorizationRequired: boolean;
    priorAttemptEvidence: string;
    executionEvidence: string;
  };
  remoteWritesDuringPreparation: number;
  productionPolicyDdlChangesDuringExecution: number;
  productionBusinessRowMutationsDuringExecution: number;
  migrationHistoryChanged: boolean;
  advisorAfterExecution: { errors: number; warnings: number; info: number; sraBWarnings: number };
};

assert.equal(manifest.releaseId, 'SRA-B-20260901-PREP-01');
assert.equal(manifest.status, 'production_execution_accepted');
assert.equal(manifest.execution.authorized, true);
assert.equal(manifest.execution.attemptCount, 2);
assert.equal(manifest.execution.attemptOutcome, 'attempt_2_committed_and_postcheck_accepted');
assert.equal(manifest.execution.forwardCommitted, true);
assert.equal(manifest.execution.fixedForwardCommittedCount, 1);
assert.equal(manifest.execution.baselineReverifiedUnchanged, true);
assert.equal(manifest.execution.postcheckAccepted, true);
assert.equal(manifest.execution.reviewerSignoffAccepted, true);
assert.equal(manifest.execution.reauthorizationRequired, false);
assert.equal(manifest.unsafeCorrectiveForwardIntentionallyAbsent, true);
assert.equal(manifest.remoteWritesDuringPreparation, 0);
assert.equal(manifest.productionPolicyDdlChangesDuringExecution, 3);
assert.equal(manifest.productionBusinessRowMutationsDuringExecution, 0);
assert.equal(manifest.migrationHistoryChanged, false);
assert.deepEqual(manifest.advisorAfterExecution, { errors: 3, warnings: 56, info: 12, sraBWarnings: 0 });
assert.deepEqual(
  manifest.execution.attempts.map(attempt => ({
    number: attempt.number,
    outcome: attempt.outcome,
    committed: attempt.forwardCommitted,
  })),
  [
    { number: 1, outcome: 'sql_editor_syntax_error_before_transaction', committed: false },
    { number: 2, outcome: 'success_no_rows_returned', committed: true },
  ],
);
assert.equal(manifest.execution.attempts[0]!.productionMutationCount, 0);
assert.equal(manifest.execution.attempts[1]!.fixedForwardExecutionCount, 1);
assert.equal(manifest.execution.attempts[1]!.policyDdlChangeCount, 3);
assert.equal(manifest.execution.attempts[1]!.businessRowMutationCount, 0);
assert.ok(read(manifest.execution.priorAttemptEvidence).includes('zero Production mutations'));
const successEvidence = read(manifest.execution.executionEvidence);
assert.ok(successEvidence.includes('committed exactly once'));
assert.ok(successEvidence.includes('Warnings | 59 | 56'));
assert.equal(manifest.artifacts.length, 3);
for (const artifact of manifest.artifacts) {
  assert.equal(sha256(read(artifact.path)), artifact.sha256, `SRA-B hash drift: ${artifact.path}`);
  assert.match(artifact.sha256, /^[0-9a-f]{64}$/u);
}

const forward = read(manifest.artifacts[0]!.path).replace(/--[^\n]*/gu, '');
assert.equal((forward.match(/^DROP POLICY /gmu) ?? []).length, 3);
assert.doesNotMatch(forward, /\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\b/iu);
assert.doesNotMatch(forward, /\b(?:CREATE|ALTER|DROP)\s+(?:VIEW|FUNCTION|TRIGGER)\b/iu);
assert.doesNotMatch(forward, /\b(?:GRANT|REVOKE)\b/iu);

for (const artifact of manifest.artifacts.slice(1)) {
  const sql = read(artifact.path);
  assert.match(sql, /BEGIN;\s*SET TRANSACTION READ ONLY;/u);
  assert.match(sql, /ROLLBACK;\s*$/u);
  assert.match(sql, /assertion_guard/u);
  assert.doesNotMatch(
    sql,
    /^\s*(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO|COPY|COMMIT)\b/gimu,
  );
}

const guide = read(guidePath);
for (const marker of [
  'two attempts recorded',
  'exactly one fixed forward committed',
  'press Run once',
  'Do not retry after any error',
  'new explicit authorization',
  'never restore `WITH CHECK (true)`',
  '- [x] Fixed forward transaction committed exactly once.',
  '- [x] Same-target postcheck and Security Advisor delta accepted.',
  '- [x] SRA-B reviewer signoff completed.',
]) {
  assert.ok(guide.includes(marker), `missing SRA-B release boundary: ${marker}`);
}
assert.ok(read('scripts/test-files.txt').includes('tsx tests/supabase-sra-b-release-preparation.test.ts'));

console.log('PASS SRA-B Production acceptance preserves attempt history and fixed-hash boundaries');
