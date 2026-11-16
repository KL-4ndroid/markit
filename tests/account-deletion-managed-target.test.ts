import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAccountDeletionMigration, DELETION_MANAGED_QUERY_URL, DELETION_MIGRATION_PROJECT,
  DELETION_TEST_PRG_PROJECT, DELETION_TEST_PRG_QUERY_URL } from '../scripts/lib/account-deletion-migration';
import { managedMigrationSql, runManagedMigration } from '../scripts/lib/account-deletion-managed-target';
import { buildTestPrgUpgradeAndInstall } from '../scripts/lib/account-deletion-test-prg-upgrade';

const token = 'synthetic-management-token';
const candidate = buildAccountDeletionMigration();
type Body = { query: string; read_only: boolean };
function harness(reply?: (body: Body, index: number) => Response | Promise<Response>, expectedUrl = DELETION_MANAGED_QUERY_URL) {
  const calls: Body[] = [];
  const transport: typeof fetch = async (url, init) => {
    assert.equal(url, expectedUrl);
    assert.equal(init?.redirect, 'error'); assert.equal(init?.method, 'POST');
    assert.deepEqual(init?.headers, { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    assert.ok(init?.signal instanceof AbortSignal);
    const body = JSON.parse(String(init?.body)) as Body; calls.push(body);
    if (reply) return reply(body, calls.length);
    if (calls.length === 1) return Response.json([{ nonce: body.query.match(/SELECT '([0-9a-f]{64})'/)?.[1], database: 'postgres', session_user: 'postgres' }]);
    if (calls.length === 2) return Response.json([{ acknowledged: true }]);
    return Response.json([{ version: candidate.version, project_ref: DELETION_MIGRATION_PROJECT,
      payload_sha: candidate.payloadSha, runtime_enabled: false, schema_matches: true }]);
  };
  return { calls, transport };
}

test('verify only sends one bounded read-only request to the fixed project, without claiming installation', async () => {
  const h = harness(); const result = await runManagedMigration({ token, mode: 'verify-target' }, h.transport);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].read_only, true);
  assert.doesNotMatch(h.calls[0].query, /SET|CREATE|DELETE|INSERT|UPDATE/);
  assert.ok(result.status === 'target_verified_only'); assert.equal(result.installationAttempted, false);
  assert.equal('installed' in result, false); assert.equal('runtimeEnabled' in result, false);
  assert.ok(!JSON.stringify(result).includes(token));
});

test('missing credentials or reviewed digest reject locally before any network', async () => {
  const h = harness();
  for (const bad of ['', 'contains whitespace']) await assert.rejects(runManagedMigration({ token: bad, mode: 'verify-target' }, h.transport), /managed_access_token_required/);
  for (const sha of [undefined, '0'.repeat(64), candidate.payloadSha]) await assert.rejects(runManagedMigration({ token, mode: 'install-disabled', reviewedSqlSha: sha }, h.transport), /managed_reviewed_sql_sha_required/);
  assert.equal(h.calls.length, 0);
});

test('the managed read-only role verifies the target but cannot proceed to installation', async () => {
  const h = harness(body => Response.json([{
    nonce: body.query.match(/SELECT '([0-9a-f]{64})'/)?.[1],
    database: 'postgres', session_user: 'supabase_read_only_user',
  }]));
  const result = await runManagedMigration({ token, mode: 'verify-target' }, h.transport);
  assert.equal(result.status, 'target_verified_only');
  await assert.rejects(runManagedMigration({ token, mode: 'install-disabled', reviewedSqlSha: candidate.sqlSha }, h.transport),
    /managed_target_response_mismatch_nonce_ok_db_ok_role_supabase_read_only_user/);
  assert.deepEqual(h.calls.map(call => call.read_only), [true, false]);
  assert.ok(h.calls.every(call => call.query.startsWith('SELECT ')));
});

test('nonce, physical DB, role, or malformed control-plane response stops before DDL', async () => {
  for (const changed of [{ nonce: '0'.repeat(64) }, { database: 'another-db' }, { session_user: 'service_role' }]) {
    const h = harness(body => Response.json([{ nonce: body.query.match(/SELECT '([0-9a-f]{64})'/)?.[1], database: 'postgres', session_user: 'postgres', ...changed }]));
    const expected = 'managed_target_response_mismatch_nonce_' + ('nonce' in changed ? 'mismatch' : 'ok')
      + '_db_' + ('database' in changed ? 'mismatch' : 'ok')
      + '_role_' + ('session_user' in changed ? 'unknown' : 'postgres');
    await assert.rejects(runManagedMigration({ token, mode: 'install-disabled', reviewedSqlSha: candidate.sqlSha }, h.transport), { message: expected });
    assert.equal(h.calls.length, 1);
  }
  for (const bad of [{}, [], [{}, {}]]) {
    const h = harness(() => Response.json(bad));
    await assert.rejects(runManagedMigration({ token, mode: 'verify-target' }, h.transport), /managed_response_unrecognized/);
  }
});

test('HTTP errors and transport errors never disclose bodies or tokens, and never retry', async () => {
  for (const status of [302, 401, 403, 429, 500]) {
    const h = harness(() => new Response(token, { status }));
    await assert.rejects(runManagedMigration({ token, mode: 'verify-target' }, h.transport), new RegExp(`^Error: managed_target_http_${status}$`));
    assert.equal(h.calls.length, 1);
  }
  const h = harness(() => { throw Error(token); });
  await assert.rejects(runManagedMigration({ token, mode: 'verify-target' }, h.transport), /^Error: managed_target_request_failed$/);
  assert.equal(h.calls.length, 1);
});

test('explicit dormant install binds both requests to the same path, scopes settings to transaction and reads back', async () => {
  const h = harness(); const result = await runManagedMigration({ token, mode: 'install-disabled', reviewedSqlSha: candidate.sqlSha }, h.transport);
  assert.deepEqual(h.calls.map(c => c.read_only), [false, false, false]);
  assert.ok(h.calls[0].query.startsWith('SELECT '));
  assert.ok(h.calls[2].query.startsWith('SELECT '));
  assert.match(h.calls[1].query, /BEGIN;\nSET LOCAL deletion.install_environment='managed'/);
  assert.match(h.calls[1].query, new RegExp(`install_nonce='${result.nonce}'`));
  assert.ok(h.calls[1].query.includes(DELETION_MANAGED_QUERY_URL));
  assert.doesNotMatch(h.calls[1].query, /app.settings.project_ref/);
  assert.match(h.calls[1].query, /CHECK\(NOT runtime_enabled\)/);
  assert.match(h.calls[2].query, /schema_hash=[\s\S]*SELECT md5/);
  assert.ok(result.status === 'installed_disabled_readback_verified'); assert.equal(result.runtimeEnabled, false);
});

test('lost install response and unavailable readback leave outcome uncertain without reissuing DDL', async () => {
  for (const failingCall of [2, 3]) {
    const normal = harness();
    const h = harness(async (body, index) => {
      if (index === failingCall) throw Error(token);
      return normal.transport(DELETION_MANAGED_QUERY_URL, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(1000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    });
    await assert.rejects(runManagedMigration({ token, mode: 'install-disabled', reviewedSqlSha: candidate.sqlSha }, h.transport),
      failingCall === 2 ? /managed_install_outcome_unknown_do_not_retry/ : /managed_install_readback_unavailable_do_not_retry/);
    assert.equal(h.calls.length, failingCall);
    assert.equal(h.calls.filter(c => !c.query.startsWith('SELECT ')).length, 1);
  }
});

test('a successful HTTP result cannot substitute for the installed version, payload, disabled state and schema check', async () => {
  for (const changed of [{ version: 'wrong' }, { project_ref: 'wrong' }, { payload_sha: 'wrong' }, { runtime_enabled: true }, { schema_matches: false }]) {
    const h = harness((body, index) => {
      if (index === 1) return Response.json([{ nonce: body.query.match(/SELECT '([0-9a-f]{64})'/)?.[1], database: 'postgres', session_user: 'postgres' }]);
      if (index === 2) return Response.json([{ acknowledged: true }]);
      return Response.json([{ version: candidate.version, project_ref: DELETION_MIGRATION_PROJECT,
        payload_sha: candidate.payloadSha, runtime_enabled: false, schema_matches: true, ...changed }]);
    });
    await assert.rejects(runManagedMigration({ token, mode: 'install-disabled', reviewedSqlSha: candidate.sqlSha }, h.transport), /managed_install_readback_mismatch/);
    assert.equal(h.calls.length, 3);
  }
});

test('invalid nonce cannot be interpolated into SQL', () => {
  assert.throws(() => managedMigrationSql(candidate, "'; SELECT 1; --"), /managed_nonce_invalid/);
});

const testPrgCandidate = buildAccountDeletionMigration('test_prg');
const testPrgTargetReply = (body: Body, upgradeMarkersPresent: boolean, deletionSchemaPresent = false) => Response.json([{
  nonce: body.query.match(/SELECT '([0-9a-f]{64})'/)?.[1], database: 'postgres', session_user: 'postgres',
  upgrade_markers_present: upgradeMarkersPresent, deletion_schema_present: deletionSchemaPresent,
}]);

test('test_prg verification is read-only and reports the unapplied upgrade', async () => {
  const h = harness(body => testPrgTargetReply(body, false), DELETION_TEST_PRG_QUERY_URL);
  const result = await runManagedMigration({ target: 'test_prg', token, mode: 'verify-target' }, h.transport);
  assert.deepEqual(h.calls.map(call => call.read_only), [true]);
  assert.match(h.calls[0].query, /^SELECT [\s\S]* AS upgrade_markers_present/);
  assert.equal(result.projectRef, DELETION_TEST_PRG_PROJECT);
  assert.equal('upgradeMarkersPresent' in result && result.upgradeMarkersPresent, false);
  assert.equal('deletionSchemaPresent' in result && result.deletionSchemaPresent, false);
});

test('the production digest and a rollback-only test_prg baseline cannot authorize test DDL', async () => {
  const h = harness(body => testPrgTargetReply(body, false), DELETION_TEST_PRG_QUERY_URL);
  assert.equal(testPrgCandidate.payloadSha, candidate.payloadSha);
  assert.notEqual(testPrgCandidate.sqlSha, candidate.sqlSha);
  const options = { target: 'test_prg', token, mode: 'install-disabled' } as const;
  await assert.rejects(runManagedMigration({ ...options, reviewedSqlSha: candidate.sqlSha }, h.transport), /managed_reviewed_sql_sha_required/);
  assert.equal(h.calls.length, 0);
  await assert.rejects(runManagedMigration({ ...options, reviewedSqlSha: testPrgCandidate.sqlSha }, h.transport), /managed_test_prg_schema_upgrade_required/);
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0].query, /^SELECT /);
});

test('test installation sends every request to test_prg and rejects a receipt for production', async () => {
  for (const projectRef of [DELETION_TEST_PRG_PROJECT, DELETION_MIGRATION_PROJECT]) {
    const h = harness((body, index) => {
      if (index === 1) return testPrgTargetReply(body, true);
      if (index === 2) return Response.json([{ acknowledged: true }]);
      return Response.json([{ version: testPrgCandidate.version, project_ref: projectRef,
        payload_sha: testPrgCandidate.payloadSha, runtime_enabled: false, schema_matches: true }]);
    }, DELETION_TEST_PRG_QUERY_URL);
    const install = runManagedMigration({ target: 'test_prg', token, mode: 'install-disabled',
      reviewedSqlSha: testPrgCandidate.sqlSha }, h.transport);
    if (projectRef === DELETION_TEST_PRG_PROJECT) {
      const result = await install;
      assert.equal(result.status, 'installed_disabled_readback_verified');
      assert.equal('runtimeEnabled' in result && result.runtimeEnabled, false);
    } else await assert.rejects(install, /managed_install_readback_mismatch/);
    assert.equal(h.calls.length, 3);
    assert.ok(h.calls[1].query.includes(DELETION_TEST_PRG_QUERY_URL));
    assert.ok(!h.calls[1].query.includes(DELETION_MANAGED_QUERY_URL));
    assert.match(h.calls[1].query, /CHECK\(NOT runtime_enabled\)/);
  }
});

test('combined upgrade is bound to the test endpoint and one reviewed transaction', async () => {
  const combined = buildTestPrgUpgradeAndInstall();
  const options = { target: 'test_prg', token, mode: 'upgrade-and-install-disabled' } as const;
  let installNonce: string | undefined;
  const h = harness((body, index) => {
    if (index === 1) return testPrgTargetReply(body, false);
    if (index === 2) {
      installNonce = body.query.match(/install_nonce='([0-9a-f]{64})'/)?.[1];
      return Response.json([{ acknowledged: true }]);
    }
    assert.match(body.query, /target_ack->>'nonce' AS install_nonce/);
    return Response.json([{ version: combined.version, project_ref: DELETION_TEST_PRG_PROJECT,
      payload_sha: combined.payloadSha, runtime_enabled: false, schema_matches: true, install_nonce: installNonce }]);
  }, DELETION_TEST_PRG_QUERY_URL);
  assert.notEqual(combined.sqlSha, testPrgCandidate.sqlSha);
  await assert.rejects(runManagedMigration({ ...options, target: 'production', reviewedSqlSha: combined.sqlSha }, h.transport),
    /managed_upgrade_test_prg_only/);
  await assert.rejects(runManagedMigration({ ...options, reviewedSqlSha: testPrgCandidate.sqlSha }, h.transport),
    /managed_reviewed_sql_sha_required/);
  assert.equal(h.calls.length, 0);
  const result = await runManagedMigration({ ...options, reviewedSqlSha: combined.sqlSha }, h.transport);
  assert.equal(result.status, 'installed_disabled_readback_verified');
  assert.equal(h.calls.length, 3);
  const ddl = h.calls[1].query;
  assert.deepEqual(ddl.match(/^(?:BEGIN|COMMIT|ROLLBACK);$/gm), ['BEGIN;', 'COMMIT;']);
  assert.match(ddl, /BEGIN;\nSET LOCAL deletion.install_environment='managed'/);
  assert.match(ddl, /pg_advisory_xact_lock[^\n]*\nDO \$scope\$[\s\S]*DO \$preserve_before\$[\s\S]*DO \$candidate_migration\$[\s\S]*DO \$preserve_after\$[\s\S]*COMMIT;\n/);
  assert.doesNotMatch(ddl, /REHEARSAL_FIXTURES BEGIN|BASELINE_UPGRADE_REHEARSAL_ROLLED_BACK/);
  assert.match(ddl, /CHECK\(NOT runtime_enabled\)/);
});

test('combined upgrade refuses a changed target and never resends uncertain DDL', async () => {
  const options = { target: 'test_prg', token, mode: 'upgrade-and-install-disabled',
    reviewedSqlSha: buildTestPrgUpgradeAndInstall().sqlSha } as const;
  for (const [upgraded, installed] of [[true, false], [false, true]]) {
    const h = harness(body => testPrgTargetReply(body, upgraded, installed), DELETION_TEST_PRG_QUERY_URL);
    await assert.rejects(runManagedMigration(options, h.transport), /managed_test_prg_upgrade_requires_legacy_schema/);
    assert.equal(h.calls.length, 1);
  }
  const h = harness((body, index) => {
    if (index === 1) return testPrgTargetReply(body, false);
    throw Error('Synthetic connection loss');
  }, DELETION_TEST_PRG_QUERY_URL);
  await assert.rejects(runManagedMigration(options, h.transport), /managed_install_outcome_unknown_do_not_retry/);
  assert.equal(h.calls.length, 2);
  const stale = harness((body, index) => {
    if (index === 1) return testPrgTargetReply(body, false);
    if (index === 2) return Response.json([{ acknowledged: true }]);
    return Response.json([{ version: testPrgCandidate.version, project_ref: DELETION_TEST_PRG_PROJECT,
      payload_sha: testPrgCandidate.payloadSha, runtime_enabled: false, schema_matches: true, install_nonce: 'old-install' }]);
  }, DELETION_TEST_PRG_QUERY_URL);
  await assert.rejects(runManagedMigration(options, stale.transport), /managed_install_readback_mismatch/);
  assert.equal(stale.calls.length, 3);
});
