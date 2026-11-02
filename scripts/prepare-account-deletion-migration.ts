import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildAccountDeletionMigration, DELETION_MIGRATION_PATH, DELETION_MIGRATION_PROJECT } from './lib/account-deletion-migration';
import { candidateSourceHashes } from './lib/account-deletion-candidate-sources';

assert.deepEqual(process.argv.slice(2), [process.argv[2]]);
assert.ok(['--write', '--check'].includes(process.argv[2]));
const candidate = buildAccountDeletionMigration();
const sourcePaths = ['scripts/lib/account-deletion-migration.ts', 'scripts/prepare-account-deletion-migration.ts',
  'supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql','scripts/verify-account-deletion-migration.ts'];
const sources = [...candidateSourceHashes(), ...sourcePaths.map(path => ({ path,
  sha256: createHash('sha256').update(readFileSync(path, 'utf8').replaceAll('\r\n', '\n')).digest('hex') }))];
const manifest = { version: candidate.version, projectRef: DELETION_MIGRATION_PROJECT, payloadSha: candidate.payloadSha,
  sqlSha: candidate.sqlSha, sources, runtimeEnabled: false, remoteExecutionApproved: false,
  status: 'transactional_migration_candidate_requires_target_review',
  baseline: 'captured catalog plus independently deployed 095',
  runtimeGuard: 'SQL CHECK prohibits enablement by row update; no release adapter, target or credentials installed',
  remoteTarget: 'DBA acknowledgement plus server-side app.settings.project_ref; managed provider binding remains unverified',
};
const manifestPath = 'docs/subscription/candidate/migration-manifest.json';
if (process.argv[2] === '--write') {
  writeFileSync(DELETION_MIGRATION_PATH, candidate.sql);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Prepared 096 candidate. Remote execution NOT approved; runtime cannot be enabled by row updates.');
} else {
  assert.equal(readFileSync(DELETION_MIGRATION_PATH, 'utf8').replaceAll('\r\n', '\n'), candidate.sql, 'Generated migration SQL drift');
  assert.deepEqual(JSON.parse(readFileSync(manifestPath, 'utf8')), manifest, 'Migration source/manifest drift');
  console.log('PASS generated SQL, payload and source fingerprints match. Runtime remains disabled.');
}
