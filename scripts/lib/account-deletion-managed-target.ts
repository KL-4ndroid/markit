// Deployment tooling only. No app imports, dotenv, token discovery or arbitrary URL.
import { randomBytes } from 'node:crypto';
import { buildAccountDeletionMigration, migrationCatalogSql, type AccountDeletionMigrationTarget } from './account-deletion-migration';
import { quoteSql as q } from './account-deletion-catalog-fixture';
import { buildTestPrgUpgradeAndInstall } from './account-deletion-test-prg-upgrade';

type Candidate = ReturnType<typeof buildAccountDeletionMigration>;
export function managedMigrationSql(candidate: Candidate, nonce: string) {
  if (!/^[0-9a-f]{64}$/.test(nonce)) throw Error('managed_nonce_invalid');
  const settings = {
    install_environment: 'managed', install_project_ref: candidate.projectRef,
    install_payload_sha: candidate.payloadSha, install_review_sha: candidate.payloadSha,
    install_transport: 'supabase-management-api', install_target_uri: candidate.controlPlaneUrl,
    install_nonce: nonce,
  };
  // LOCAL settings live INSIDE the migration transaction: no pooled-session leak.
  return candidate.sql.replace('\nBEGIN;\n', '\nBEGIN;\n' + Object.entries(settings)
    .map(([key, value]) => `SET LOCAL deletion.${key}=${q(value)};`).join('\n') + '\n');
}

/** Identity comes from authenticated HTTPS to this fixed control-plane path,
 * NOT from a project label or a forgeable PostgreSQL custom setting.
 * fetch injection exists solely for isolated transport tests. No automatic retries. */
export async function runManagedMigration(options: {
  token: string; mode: 'verify-target' | 'install-disabled' | 'upgrade-and-install-disabled'; reviewedSqlSha?: string;
  target?: AccountDeletionMigrationTarget;
}, transport: typeof fetch = fetch) {
  const upgradesBaseline = options.mode === 'upgrade-and-install-disabled';
  if (!['verify-target', 'install-disabled', 'upgrade-and-install-disabled'].includes(options.mode)) throw Error('managed_mode_invalid');
  if (upgradesBaseline && options.target !== 'test_prg') throw Error('managed_upgrade_test_prg_only');
  if (!options.token || /\s/.test(options.token)) throw Error('managed_access_token_required');
  const candidate = upgradesBaseline ? buildTestPrgUpgradeAndInstall() : buildAccountDeletionMigration(options.target);
  if (options.mode !== 'verify-target' && options.reviewedSqlSha !== candidate.sqlSha) throw Error('managed_reviewed_sql_sha_required');
  const nonce = randomBytes(32).toString('hex');
  async function query(sql: string, readOnly: boolean, installs = false): Promise<Array<Record<string, unknown>>> {
    let response: Response;
    try {
      response = await transport(candidate.controlPlaneUrl, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(95000),
        headers: { Authorization: `Bearer ${options.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql, read_only: readOnly }),
      });
    } catch {
      throw Error(installs ? 'managed_install_outcome_unknown_do_not_retry' : 'managed_target_request_failed');
    }
    // Never include provider bodies, query text or credentials in errors.
    if (!response.ok) throw Error(installs ? `managed_install_http_${response.status}_inspect_before_retry` : `managed_target_http_${response.status}`);
    let rows: unknown;
    try { rows = await response.json(); } catch { throw Error('managed_response_unrecognized_inspect_before_retry'); }
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object') throw Error('managed_response_unrecognized_inspect_before_retry');
    return rows as Array<Record<string, unknown>>;
  }
  // The explicit install command checks the same management session role that
  // runs DDL. Its preflight and readback are fixed SELECTs, even when the API
  // must use the privileged session to execute them.
  const testPrg = options.target === 'test_prg';
  const testPrgMarkers = testPrg ? `,
    (to_regclass('public.market_cash_records') IS NOT NULL AND to_regtype('public.sync_status') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.products') AND attname='sync_status' AND NOT attisdropped)
      AND (SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute
        WHERE attrelid=to_regclass('public.market_members') AND attnum>0 AND NOT attisdropped)
        = ARRAY['market_id','user_id','joined_at','role']) IS TRUE AS upgrade_markers_present,
    to_regnamespace('deletion_release_private') IS NOT NULL AS deletion_schema_present` : '';
  const [target] = await query(`SELECT ${q(nonce)} AS nonce,current_database() AS database,session_user AS session_user${testPrgMarkers};`, options.mode === 'verify-target');
  const roleAllowed = target.session_user === 'postgres'
    || (options.mode === 'verify-target' && target.session_user === 'supabase_read_only_user');
  if (target.nonce !== nonce || target.database !== 'postgres' || !roleAllowed) {
    const nonceStatus = target.nonce === nonce ? 'ok' : 'mismatch';
    const databaseStatus = target.database === 'postgres' ? 'ok' : 'mismatch';
    const sessionRole = target.session_user;
    const role = sessionRole === 'postgres' || sessionRole === 'supabase_read_only_user' || sessionRole === 'supabase_admin'
      ? sessionRole : 'unknown';
    throw Error(`managed_target_response_mismatch_nonce_${nonceStatus}_db_${databaseStatus}_role_${role}`);
  }
  const base = { projectRef: candidate.projectRef, controlPlaneUrl: candidate.controlPlaneUrl,
    sqlSha: candidate.sqlSha, payloadSha: candidate.payloadSha, nonce, candidateRuntimeEnabled: false,
    identityBasis: 'fixed authenticated HTTPS control-plane route; SQL settings are acknowledgements only' };
  if (testPrg && (typeof target.upgrade_markers_present !== 'boolean' || typeof target.deletion_schema_present !== 'boolean')) {
    throw Error('managed_test_prg_marker_response_invalid');
  }
  if (options.mode === 'verify-target') return { ...base, status: 'target_verified_only' as const, installationAttempted: false,
    ...(testPrg && { upgradeMarkersPresent: target.upgrade_markers_present, deletionSchemaPresent: target.deletion_schema_present }) };
  if (upgradesBaseline && (target.upgrade_markers_present || target.deletion_schema_present)) {
    throw Error('managed_test_prg_upgrade_requires_legacy_schema');
  }
  if (testPrg && !upgradesBaseline && target.upgrade_markers_present !== true) throw Error('managed_test_prg_schema_upgrade_required');
  // This separate, explicit mode installs DDL only; the CHECK remains disabled.
  // Do not treat an HTTP response as commit proof. Read back once, without replaying DDL.
  // DDL query returns a single acknowledgement row after COMMIT.
  await query(managedMigrationSql(candidate, nonce) + '\nSELECT true AS acknowledged;', false, true);
  let installed: Record<string, unknown>;
  try {
    [installed] = await query(`SELECT i.version,i.project_ref,i.payload_sha,c.runtime_enabled,
    i.schema_hash=(${migrationCatalogSql()}) AS schema_matches${upgradesBaseline ? ",i.target_ack->>'nonce' AS install_nonce" : ''}
    FROM deletion_release_private.installation i CROSS JOIN deletion_release_private.controls c
    WHERE i.version=${q(candidate.version)} AND c.slot;`, false);
  } catch { throw Error('managed_install_readback_unavailable_do_not_retry'); }
  if (installed.version !== candidate.version || installed.project_ref !== candidate.projectRef
    || installed.payload_sha !== candidate.payloadSha || installed.runtime_enabled !== false || installed.schema_matches !== true
    || (upgradesBaseline && installed.install_nonce !== nonce)) throw Error('managed_install_readback_mismatch');
  return { ...base, status: 'installed_disabled_readback_verified' as const, installed: true, runtimeEnabled: false };
}
