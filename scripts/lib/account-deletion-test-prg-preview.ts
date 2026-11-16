import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DELETION_TEST_PRG_PROJECT, migrationCatalogSql } from './account-deletion-migration';

export function buildTestPrgPreviewScope() {
  const draft = readFileSync('docs/subscription/drafts/ACCOUNT_DELETION_TEST_PRG_SCOPE.sql', 'utf8').replaceAll('\r\n', '\n');
  assert.match(draft, /^--[^\n]+\nBEGIN;\n/);
  assert.match(draft, /\nROLLBACK;\s*$/);
  const sql = draft.replace('SET LOCAL search_path = pg_catalog;\n', '')
    .replace(/^--[^\n]+\nBEGIN;\n/, () => `-- Reviewed test_prg Preview candidate. Apply only through the fixed test project management endpoint.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(hashtextextended('feria:account-deletion:migration:096',0));
DO $verify$
BEGIN
  IF (SELECT schema_hash FROM deletion_release_private.installation) IS DISTINCT FROM (${migrationCatalogSql()})
    THEN RAISE EXCEPTION 'preview_deletion_installation_drift'; END IF;
END;
$verify$;
`)
    .replace(/\nROLLBACK;\s*$/, () => `
CREATE TABLE deletion_release_private.preview_scope_installation AS
  SELECT '${DELETION_TEST_PRG_PROJECT}'::text AS project_ref, (${migrationCatalogSql()}) AS schema_hash;
REVOKE ALL ON deletion_release_private.preview_scope_installation FROM PUBLIC, anon, authenticated, service_role;
-- Recompute after creating this receipt table so the hash covers its ACL.
UPDATE deletion_release_private.preview_scope_installation SET schema_hash=(${migrationCatalogSql()});
COMMIT;
`);
  const readbackSql = `BEGIN READ ONLY;
SELECT i.project_ref,
  i.project_ref = '${DELETION_TEST_PRG_PROJECT}' AS target_matches,
  i.schema_hash = (${migrationCatalogSql()}) AS schema_matches,
  NOT c.runtime_enabled AS global_runtime_disabled,
  (SELECT count(*) FROM deletion_release_private.preview_grant) AS grant_count
FROM deletion_release_private.preview_scope_installation i
CROSS JOIN deletion_release_private.controls c;
ROLLBACK;
`;
  return { sql, readbackSql, sqlSha: createHash('sha256').update(sql).digest('hex'), projectRef: DELETION_TEST_PRG_PROJECT };
}
