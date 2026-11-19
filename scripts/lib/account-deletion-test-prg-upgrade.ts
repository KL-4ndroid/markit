import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildAccountDeletionMigration } from './account-deletion-migration';
import { capturedAccessDefinitions } from './account-deletion-access-fixture';
import { quoteSql as q } from './account-deletion-catalog-fixture';

export function restoreTestPrgRoutineLineEndings() {
  const rows = capturedAccessDefinitions().routines.map(({ detail }) => {
    const signature = `public.${detail.name}(${detail.argumentTypes})`;
    const normalizedHash = createHash('md5').update(detail.definition.replaceAll('\r', '')).digest('hex');
    // Index runs of CRLF lines. The deployed 092/093 cash guards inserted LF
    // into otherwise CRLF bodies, so uniform CRLF would fail exact comparison.
    const ranges: string[] = [];
    let start: number | undefined;
    for (const [index, line] of detail.definition.split('\n').entries()) {
      if (line.endsWith('\r')) start ??= index + 1;
      else if (start !== undefined) {
        ranges.push(`[${start},${index + 1})`);
        start = undefined;
      }
    }
    assert.equal(start, undefined);
    return `(${q(signature)},${q(detail.definitionMd5)},${q(normalizedHash)},${q(`{${ranges.join(',')}}`)}::int4multirange)`;
  }).join(',\n');
  return `DO $routine_line_endings$
DECLARE routine record;
BEGIN
  FOR routine IN
    SELECT e.fingerprint, (SELECT string_agg(line ||
      CASE WHEN e.crlf @> ordinal::integer THEN chr(13) ELSE '' END, chr(10) ORDER BY ordinal)
      FROM string_to_table(f.normalized,chr(10)) WITH ORDINALITY AS lines(line,ordinal)) AS reviewed_form
    FROM (VALUES ${rows}) e(signature,fingerprint,normalized_hash,crlf)
    JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
    -- PostgreSQL may inline/reorder the join before applying its signature filter.
    -- Guard the expression itself so catalog aggregates are never decompiled.
    CROSS JOIN LATERAL (SELECT CASE WHEN p.prokind IN ('f','p') THEN pg_get_functiondef(p.oid) END AS definition) d
    CROSS JOIN LATERAL (SELECT replace(d.definition,chr(13),'') AS normalized) f
    WHERE md5(d.definition)<>e.fingerprint AND md5(f.normalized)=e.normalized_hash
  LOOP
    -- Recreate only when changing body line endings reproduces the exact captured definition.
    IF md5(routine.reviewed_form)=routine.fingerprint THEN EXECUTE routine.reviewed_form; END IF;
  END LOOP;
END;
$routine_line_endings$;`;
}

export function buildTestPrgUpgradeAndInstall() {
  const candidate = buildAccountDeletionMigration('test_prg');
  const { before, after } = JSON.parse(execFileSync(process.execPath,
    ['scripts/prepare-account-deletion-test-prg-rollback.mjs', '--emit-baseline-upgrade-body'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as { before: string; after: string };
  assert.ok(before.startsWith('DO $scope$') && after.includes('DO $preserve_after$'));
  assert.doesNotMatch(before + after, /^\s*(?:BEGIN\s*;|COMMIT\b|ROLLBACK\b|PREPARE TRANSACTION\b)/im);

  // Reuse 096's transaction and advisory lock for the upgrade as well.
  const installer = '\nDO $candidate_migration$';
  assert.equal(candidate.sql.split(installer).length, 2);
  assert.match(candidate.sql, /\nCOMMIT;\n$/);
  const sql = candidate.sql.replace(installer, () => `\n${before}${restoreTestPrgRoutineLineEndings()}\n${installer}`)
    .replace(/\nCOMMIT;\n$/, () => `\nSET CONSTRAINTS ALL IMMEDIATE;\n${after.trimEnd()}\nCOMMIT;\n`);
  return { ...candidate, sql, sqlSha: createHash('sha256').update(sql).digest('hex') };
}
