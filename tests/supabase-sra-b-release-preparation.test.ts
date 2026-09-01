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
    forwardCommitted: boolean;
    baselineReverifiedUnchanged: boolean;
    postcheckAccepted: boolean;
    reauthorizationRequired: boolean;
    executionEvidence: string;
  };
  remoteWritesDuringPreparation: number;
  productionMutationsDuringExecution: number;
  advisorAfterAttempt: { warnings: number; sraBWarnings: number };
};

assert.equal(manifest.releaseId, 'SRA-B-20260901-PREP-01');
assert.equal(manifest.status, 'execution_attempt_stopped_no_mutation');
assert.equal(manifest.execution.authorized, true);
assert.equal(manifest.execution.attemptCount, 1);
assert.equal(manifest.execution.attemptOutcome, 'sql_editor_syntax_error_before_transaction');
assert.equal(manifest.execution.forwardCommitted, false);
assert.equal(manifest.execution.baselineReverifiedUnchanged, true);
assert.equal(manifest.execution.postcheckAccepted, false);
assert.equal(manifest.execution.reauthorizationRequired, true);
assert.equal(manifest.unsafeCorrectiveForwardIntentionallyAbsent, true);
assert.equal(manifest.remoteWritesDuringPreparation, 0);
assert.equal(manifest.productionMutationsDuringExecution, 0);
assert.equal(manifest.advisorAfterAttempt.warnings, 59);
assert.equal(manifest.advisorAfterAttempt.sraBWarnings, 3);
assert.ok(read(manifest.execution.executionEvidence).includes('zero Production mutations'));
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
  'one attempt consumed',
  'zero Production mutations',
  'press Run once',
  'Do not retry after any error',
  'requires a new explicit authorization',
  'never restore `WITH CHECK (true)`',
  '- [ ] Fixed forward transaction committed exactly once.',
]) {
  assert.ok(guide.includes(marker), `missing SRA-B release boundary: ${marker}`);
}
assert.ok(read('scripts/test-files.txt').includes('tsx tests/supabase-sra-b-release-preparation.test.ts'));

console.log('PASS SRA-B failed Production attempt stays fixed-hash, zero-mutation, and fail-closed');
