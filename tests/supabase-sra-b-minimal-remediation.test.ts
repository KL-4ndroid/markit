import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sql = read('docs/security/drafts/SRA_B_LOCAL_REVIEW_TRANSACTION.sql');
const proposal = read('docs/security/SUPABASE_SRA_B_MINIMAL_REMEDIATION_PROPOSAL_2026_09_01.md');
const evidence = JSON.parse(
  read('docs/security/SRA_BCD_PRODUCTION_READ_ONLY_INVENTORY_2026_09_01.json'),
) as {
  transactionReadOnly: string;
  remoteWrites: number;
  sraB: { unsafePolicies: Array<{ policy: string }>; retainedPolicy: { policy: string } };
};
const localEvidence = JSON.parse(
  read('docs/security/SRA_B_DISPOSABLE_LOCAL_EVIDENCE_2026_09_01.json'),
) as {
  ok: boolean;
  productionConnections: number;
  remoteWrites: number;
  results: Record<string, boolean | number>;
  cleanup: { containerRemoved: boolean; backupCreated: boolean };
};

assert.match(sql, /^\s*--[\s\S]*?BEGIN;/u);
assert.match(sql, /COMMIT;\s*$/u);
assert.match(sql, /SET LOCAL statement_timeout = '15s';/u);
assert.match(sql, /SET LOCAL lock_timeout = '3s';/u);
assert.match(sql, /migration ledger baseline changed/u);
assert.equal((sql.match(/^DROP POLICY /gmu) ?? []).length, 3);
for (const name of [
  'authenticated_can_insert_markets',
  '允許 authenticated 插入市集',
  '允許 authenticated 插入商品',
]) {
  assert.ok(sql.includes(name));
  assert.ok(evidence.sraB.unsafePolicies.some(policy => policy.policy === name));
}
assert.ok(sql.includes('Users can insert own products'));
assert.equal(evidence.sraB.retainedPolicy.policy, 'Users can insert own products');
assert.equal(evidence.transactionReadOnly, 'on');
assert.equal(evidence.remoteWrites, 0);
assert.equal(localEvidence.ok, true);
assert.equal(localEvidence.productionConnections, 0);
assert.equal(localEvidence.remoteWrites, 0);
assert.equal(localEvidence.results.directMarketInsertDenied, true);
assert.equal(localEvidence.results.foreignProductInsertDenied, true);
assert.equal(localEvidence.results.ownerProductInsertAllowed, true);
assert.equal(localEvidence.results.marketEventProjectionPassed, true);
assert.equal(localEvidence.results.productEventProjectionPassed, true);
assert.equal(localEvidence.results.repeatApplicationRejected, true);
assert.equal(localEvidence.cleanup.containerRemoved, true);
assert.equal(localEvidence.cleanup.backupCreated, false);

assert.doesNotMatch(sql, /\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|CREATE TABLE)\b/iu);
assert.doesNotMatch(sql, /\b(?:ALTER|CREATE|DROP)\s+(?:VIEW|FUNCTION|TRIGGER)\b/iu);
assert.doesNotMatch(sql, /\b(?:GRANT|REVOKE)\b/iu);
assert.doesNotMatch(sql, /\b(?:auth\.users|storage\.objects|public\.events)\b/iu);
assert.doesNotMatch(sql, /WITH CHECK\s*\(true\)/iu);

for (const marker of [
  'No direct application INSERT',
  'There is intentionally no corrective-forward',
  'do not authorize that Production write',
]) {
  assert.ok(proposal.includes(marker), `missing SRA-B proposal marker: ${marker}`);
}

assert.ok(
  read('scripts/test-files.txt').includes('tsx tests/supabase-sra-b-minimal-remediation.test.ts'),
);

console.log('PASS SRA-B minimal remediation stays exact-scope, fail-closed, and local-only');
