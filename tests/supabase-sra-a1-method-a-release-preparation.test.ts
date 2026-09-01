import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const stripComments = (value: string) => value.replace(/--[^\n]*/gu, '');

const manifestPath = 'docs/security/SRA_A1_METHOD_A_RELEASE_MANIFEST_2026_08_31.json';
const guidePath = 'docs/security/SUPABASE_SRA_A1_METHOD_A_RELEASE_PREPARATION_2026_08_31.md';
const rehearsalPath = 'docs/security/SRA_A1_METHOD_A_LOCAL_REHEARSAL_2026_08_31.json';
const forwardPath = 'docs/security/release/SRA_A1_METHOD_A_TRANSACTION.sql';
const correctivePath = 'docs/security/release/SRA_A1_METHOD_A_CORRECTIVE_FORWARD.sql';
const postcheckPath = 'supabase/verification/sra_a1_method_a_postcheck_read_only.sql';
const executionEvidencePath =
  'docs/security/SUPABASE_SRA_A1_METHOD_A_PRODUCTION_EXECUTION_2026_09_01.md';
const executionEvidenceJsonPath =
  'docs/security/SRA_A1_METHOD_A_PRODUCTION_EXECUTION_EVIDENCE_2026_09_01.json';
const artifactPaths = [forwardPath, correctivePath, postcheckPath] as const;

for (const path of [
  manifestPath,
  guidePath,
  rehearsalPath,
  executionEvidencePath,
  executionEvidenceJsonPath,
  ...artifactPaths,
]) {
  assert.ok(existsSync(join(root, path)), `missing Method A artifact: ${path}`);
}

const manifest = JSON.parse(read(manifestPath)) as {
  releaseId: string;
  status: string;
  targetFingerprintSha256: string;
  artifacts: Array<{ purpose: string; path: string; sha256: string }>;
  execution: {
    authorized: boolean;
    operator: string | null;
    maintenanceWindow: string | null;
    releaseReviewer: string | null;
    executionEvidence: string | null;
    postcheckAccepted: boolean;
    correctiveForwardAuthorized: boolean;
  };
  remoteWritesDuringPreparation: number;
};
assert.equal(manifest.releaseId, 'SRA-A1-METHOD-A-20260831-PREP-01');
assert.equal(manifest.status, 'production_executed_postcheck_accepted');
assert.equal(
  manifest.targetFingerprintSha256,
  '9b9284e718b0815ac6c6ed7385938480da0efff3260e0eba4527867b0ad3998c',
);
assert.equal(manifest.execution.authorized, true);
assert.equal(manifest.execution.operator, 'user_self');
assert.equal(
  manifest.execution.maintenanceWindow,
  '2026-09-01T10:13:18+08:00/2026-09-01T11:43:18+08:00',
);
assert.equal(manifest.execution.releaseReviewer, 'user_self');
assert.equal(manifest.execution.executionEvidence, executionEvidencePath);
assert.equal(manifest.execution.postcheckAccepted, true);
assert.equal(manifest.execution.correctiveForwardAuthorized, false);
assert.equal(manifest.remoteWritesDuringPreparation, 0);

const executionEvidence = JSON.parse(read(executionEvidenceJsonPath)) as {
  ok: boolean;
  releaseId: string;
  environment: string;
  targetFingerprintMatched: boolean;
  targetFingerprintSha256: string;
  reviewedCommit: string;
  operator: string;
  releaseReviewer: string;
  preflight: {
    transactionReadOnly: string;
    migrationLedgerPresent: boolean;
    functionCount: number;
    triggerCount: number;
    exactBaselineMatched: boolean;
  };
  forwardTransaction: {
    sha256: string;
    executionCount: number;
    committed: boolean;
    functionBodyChanges: number;
    triggerChanges: number;
    businessDataReads: number;
    businessDataWrites: number;
    migrationHistoryWrites: number;
  };
  postcheck: {
    sha256: string;
    ok: boolean;
    assertionGuard: number;
    transactionReadOnly: string;
    migrationLedgerPresent: boolean;
    functionCount: number;
    allFunctionChecksTrue: boolean;
  };
  correctiveForwardExecuted: boolean;
  rawProjectReferenceRetained: boolean;
  rawDefinitionsRetained: boolean;
  rawAclDumpRetained: boolean;
};
assert.equal(executionEvidence.ok, true);
assert.equal(executionEvidence.releaseId, manifest.releaseId);
assert.equal(executionEvidence.environment, 'Production');
assert.equal(executionEvidence.targetFingerprintMatched, true);
assert.equal(executionEvidence.targetFingerprintSha256, manifest.targetFingerprintSha256);
assert.equal(executionEvidence.reviewedCommit, '908d450290ee55879684edd7a717f6226cf03d48');
assert.equal(executionEvidence.operator, 'user_self');
assert.equal(executionEvidence.releaseReviewer, 'user_self');
assert.equal(executionEvidence.preflight.transactionReadOnly, 'on');
assert.equal(executionEvidence.preflight.migrationLedgerPresent, false);
assert.equal(executionEvidence.preflight.functionCount, 4);
assert.equal(executionEvidence.preflight.triggerCount, 4);
assert.equal(executionEvidence.preflight.exactBaselineMatched, true);
assert.equal(executionEvidence.forwardTransaction.sha256, manifest.artifacts[0]?.sha256);
assert.equal(executionEvidence.forwardTransaction.executionCount, 1);
assert.equal(executionEvidence.forwardTransaction.committed, true);
assert.equal(executionEvidence.forwardTransaction.functionBodyChanges, 0);
assert.equal(executionEvidence.forwardTransaction.triggerChanges, 0);
assert.equal(executionEvidence.forwardTransaction.businessDataReads, 0);
assert.equal(executionEvidence.forwardTransaction.businessDataWrites, 0);
assert.equal(executionEvidence.forwardTransaction.migrationHistoryWrites, 0);
assert.equal(executionEvidence.postcheck.sha256, manifest.artifacts[2]?.sha256);
assert.equal(executionEvidence.postcheck.ok, true);
assert.equal(executionEvidence.postcheck.assertionGuard, 1);
assert.equal(executionEvidence.postcheck.transactionReadOnly, 'on');
assert.equal(executionEvidence.postcheck.migrationLedgerPresent, false);
assert.equal(executionEvidence.postcheck.functionCount, 4);
assert.equal(executionEvidence.postcheck.allFunctionChecksTrue, true);
assert.equal(executionEvidence.correctiveForwardExecuted, false);
assert.equal(executionEvidence.rawProjectReferenceRetained, false);
assert.equal(executionEvidence.rawDefinitionsRetained, false);
assert.equal(executionEvidence.rawAclDumpRetained, false);

const rehearsal = JSON.parse(read(rehearsalPath)) as {
  ok: boolean;
  scope: string;
  projectId: string;
  databasePort: number;
  productionConnections: number;
  remoteWrites: number;
  productionLedgerAbsenceReproducedLocally: boolean;
  forwardTransaction: { passed: boolean };
  readOnlyPostcheck: {
    ok: boolean;
    assertionGuard: number;
    transactionReadOnly: string;
    migrationLedgerPresent: boolean;
    functionCount: number;
  };
  correctiveForward: {
    passed: boolean;
    originalBaselineRestored: boolean;
    repeatRejectedWithoutPersistentChange: boolean;
  };
  cleanup: { backup: boolean; containersAfterStop: number; volumesAfterStop: number };
};
assert.equal(rehearsal.ok, true);
assert.equal(rehearsal.scope, 'new-disposable-local-only');
assert.equal(rehearsal.projectId, 'sra-a1-method-a-20260831');
assert.equal(rehearsal.databasePort, 55422);
assert.equal(rehearsal.productionConnections, 0);
assert.equal(rehearsal.remoteWrites, 0);
assert.equal(rehearsal.productionLedgerAbsenceReproducedLocally, true);
assert.equal(rehearsal.forwardTransaction.passed, true);
assert.equal(rehearsal.readOnlyPostcheck.ok, true);
assert.equal(rehearsal.readOnlyPostcheck.assertionGuard, 1);
assert.equal(rehearsal.readOnlyPostcheck.transactionReadOnly, 'on');
assert.equal(rehearsal.readOnlyPostcheck.migrationLedgerPresent, false);
assert.equal(rehearsal.readOnlyPostcheck.functionCount, 4);
assert.equal(rehearsal.correctiveForward.passed, true);
assert.equal(rehearsal.correctiveForward.originalBaselineRestored, true);
assert.equal(rehearsal.correctiveForward.repeatRejectedWithoutPersistentChange, true);
assert.equal(rehearsal.cleanup.backup, false);
assert.equal(rehearsal.cleanup.containersAfterStop, 0);
assert.equal(rehearsal.cleanup.volumesAfterStop, 0);

assert.deepEqual(manifest.artifacts.map(artifact => artifact.path), artifactPaths);
for (const artifact of manifest.artifacts) {
  assert.equal(sha256(read(artifact.path)), artifact.sha256, `hash drift: ${artifact.path}`);
  assert.match(artifact.sha256, /^[0-9a-f]{64}$/u);
}

const forward = stripComments(read(forwardPath));
assert.match(forward, /^\s*BEGIN;/u);
assert.match(forward, /COMMIT;\s*$/u);
assert.equal((forward.match(/ALTER FUNCTION public\./gu) ?? []).length, 4);
assert.equal((forward.match(/REVOKE EXECUTE ON FUNCTION public\./gu) ?? []).length, 4);
assert.equal((forward.match(/SET search_path TO pg_catalog, public/gu) ?? []).length, 4);
assert.match(forward, /to_regclass\('supabase_migrations\.schema_migrations'\) IS NOT NULL/u);
assert.match(forward, /current_user <> 'postgres'/u);
assert.match(forward, /current_setting\('server_version_num'\)::integer \/ 10000 <> 17/u);
for (const hash of [
  'e0f49fbb9d20b3f7e5c63477f647cba6',
  '6d14aa3115a3deb38c605316d026f8a6',
  '02f806361aaf8574f884d1f4843d1f1f',
  '1455caf09593c37bb51965944e0e88ff',
  'bff498382d61382bdd440f9a8e5d2807',
  '42281ca83183d1a5e88bc75865cae1b7',
  '3132d6bc9c4707d667001d080011cb8a',
  'ef21f08fc762225ffe4d026209211250',
]) {
  assert.ok(forward.includes(hash));
}
assert.doesNotMatch(forward, /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/iu);
assert.doesNotMatch(forward, /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE|DROP|CREATE\s+TABLE)\b/iu);
assert.doesNotMatch(forward, /\b(?:GRANT|REVOKE|ALTER)\b[^;]*\b(?:TABLE|TRIGGER|POLICY|SCHEMA)\b/iu);

const corrective = stripComments(read(correctivePath));
assert.match(corrective, /^\s*BEGIN;/u);
assert.match(corrective, /COMMIT;\s*$/u);
assert.equal((corrective.match(/ALTER FUNCTION public\.[^;]+RESET search_path;/gu) ?? []).length, 4);
assert.equal((corrective.match(/GRANT EXECUTE ON FUNCTION public\./gu) ?? []).length, 4);
assert.match(corrective, /execute_acl_count <> 2/u);
assert.match(corrective, /execute_acl_count <> 5/u);
assert.match(corrective, /actual_definition_hash <> target\.definition_hash/u);
assert.doesNotMatch(corrective, /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/iu);
assert.doesNotMatch(corrective, /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE|DROP|CREATE\s+TABLE)\b/iu);
assert.doesNotMatch(corrective, /\b(?:GRANT|REVOKE|ALTER)\b[^;]*\b(?:TABLE|TRIGGER|POLICY|SCHEMA)\b/iu);

const postcheck = stripComments(read(postcheckPath));
assert.match(postcheck, /^\s*BEGIN;\s*SET TRANSACTION READ ONLY;/u);
assert.match(postcheck, /SET LOCAL statement_timeout = '15s';/u);
assert.match(postcheck, /SET LOCAL lock_timeout = '3s';/u);
assert.match(postcheck, /ROLLBACK;\s*$/u);
assert.match(postcheck, /'ok', summary\.all_ok/u);
assert.match(postcheck, /assertion_guard/u);
assert.doesNotMatch(
  postcheck,
  /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE|TRUNCATE|CALL|COPY|DO|COMMIT)\b/iu,
);
assert.doesNotMatch(postcheck, /\b(?:FROM|JOIN)\s+(?:public|auth)\./iu);

const guide = read(guidePath);
for (const marker of [
  'forward executed once',
  'corrective-forward is NOT authorized',
  'Press Run once. Do not retry after an error.',
  'corrective-forward file is a prepared option, not an automatic rollback',
  '| Operator | `user_self`',
  '- [x] Artifact hashes pinned in a machine-readable manifest.',
  'closed loop passed on a new disposable local stack.',
  'zero matching containers',
  '- [x] Production execution authorization record completed.',
  '- [x] Forward transaction executed once on the exact target.',
  '- [x] Same-target read-only postcheck accepted.',
]) {
  assert.ok(guide.includes(marker), `missing Method A guide marker: ${marker}`);
}

const taskMatrix = JSON.parse(read('docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json')) as {
  tasks: Array<{ id: string; status: string; evidence: string[] }>;
};
const task = taskMatrix.tasks.find(candidate => candidate.id === 'SEC-REMEDIATION');
assert.equal(task?.status, 'pending_approval');
assert.ok(task?.evidence.includes(guidePath));
assert.ok(task?.evidence.includes(manifestPath));
assert.ok(task?.evidence.includes(forwardPath));
assert.ok(task?.evidence.includes(postcheckPath));
assert.ok(task?.evidence.includes(executionEvidencePath));

const migrations = readdirSync(join(root, 'supabase', 'migrations'));
assert.equal(migrations.some(name => /sra[_-]?a1/iu.test(name)), false);
assert.ok(read('scripts/test-files.txt').includes(
  'tsx tests/supabase-sra-a1-method-a-release-preparation.test.ts',
));

console.log('PASS SRA-A1 Method A Production execution evidence stays fixed-hash and fail-closed');
