// Offline review/deployment package. Does not load .env or contact any service.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildRegistrationCompatibility, REGISTRATION_SOURCE, REGISTRATION_COMPAT_VERSION } from './lib/account-deletion-registration-compat';
import { buildAccountDeletionMigration, migrationCatalogSql, DELETION_MIGRATION_PATH } from './lib/account-deletion-migration';

assert.deepEqual(process.argv.slice(2), [process.argv[2]]);
assert.ok(['--write', '--check'].includes(process.argv[2]));
const directory = 'docs/subscription/candidate/';
const files: Record<string, string> = {};
const targets = (['production', 'test_prg'] as const).map(target => {
  const candidate = buildRegistrationCompatibility(target);
  const original = buildAccountDeletionMigration(target);
  files[`097_deletion_compat_${target}.sql`] = candidate.sql;
  files[`097_deletion_compat_${target}_rollback.sql`] = candidate.rollbackSql;
  files[`097_deletion_compat_${target}_readback.sql`] = `-- Read only. Must return one matching installation; no runtime enablement.
BEGIN READ ONLY;
DO $readback$
BEGIN
 IF (SELECT count(*) FROM deletion_release_private.installation)<>1
  OR NOT EXISTS(SELECT 1 FROM deletion_release_private.installation i
   CROSS JOIN deletion_release_private.controls c WHERE c.slot AND NOT c.runtime_enabled
    AND i.project_ref='${candidate.projectRef}'
    AND i.version='${original.version}' AND i.payload_sha='${original.payloadSha}'
    AND i.target_ack->'registration097'->>'version'='${candidate.version}'
    AND i.target_ack->'registration097'->>'source097Sha'='${candidate.source097Sha}'
    AND i.target_ack->'registration097'->>'payloadSha'='${candidate.payloadSha}'
    AND i.schema_hash=(${migrationCatalogSql()}))
 THEN RAISE EXCEPTION 'registration_compat_readback_failed'; END IF;
 PERFORM deletion_engine_private.assert_catalog();
END;
$readback$;
SELECT project_ref,version,NOT runtime_enabled AS runtime_disabled,
 target_ack->'registration097'->>'version' AS registration_compat_version
FROM deletion_release_private.installation CROSS JOIN deletion_release_private.controls;
ROLLBACK;
`;
  return { target, projectRef: candidate.projectRef, payloadSha: candidate.payloadSha, sqlSha: candidate.sqlSha,
    rollbackSha: candidate.rollbackSha, original096SqlSha: candidate.original096SqlSha, source097Sha: candidate.source097Sha };
});
const paths = [REGISTRATION_SOURCE, DELETION_MIGRATION_PATH, 'scripts/lib/account-deletion-registration-compat.ts',
  'scripts/lib/account-deletion-migration.ts', 'scripts/lib/account-deletion-test-prg-upgrade.ts',
  'scripts/test-files.txt', 'tsconfig.account-deletion-workflow.json',
  'scripts/lib/account-deletion-registration-compat-checks.ts', 'scripts/prepare-account-deletion-registration-compat.ts',
  'scripts/verify-account-deletion-migration.ts', 'scripts/verify-account-deletion-upload-race.ts',
  'scripts/lib/account-deletion-photo-handler-checks.ts', 'tests/account-deletion-registration-compat.test.ts'];
files['registration-compatibility-manifest.json'] = JSON.stringify({ schemaVersion: 1, version: REGISTRATION_COMPAT_VERSION,
  status: 'local_candidate_requires_hosted_readback_and_review', runtimeEnabled: false, remoteExecutionApproved: false, targets,
  sources: paths.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path, 'utf8').replaceAll('\r\n', '\n')).digest('hex') })),
  installation: 'Requires installed disabled 096-v2 with exact payload. Applies unchanged 097 atomically if absent; verifies only its known delta if present. Refuses active freeze/processing or previously installed Preview scope.',
  rollback: 'Requires exact inactive compatibility candidate. Restores pre-compat 097 state and disabled 096 receipt; preserves all registration condition data. Old engine blocks on 097 drift again. Cannot reverse deleted business data.',
}, null, 2) + '\n';
for (const [file, content] of Object.entries(files)) {
  if (process.argv[2] === '--write') writeFileSync(directory + file, content);
  else assert.equal(readFileSync(directory + file, 'utf8').replaceAll('\r\n', '\n'), content, `Compatibility package drift: ${file}`);
}
console.log(`PASS 097 compatibility package ${process.argv[2] === '--write' ? 'prepared' : 'matches reviewed sources'}; no remote operation or enablement`);
