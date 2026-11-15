// Generates rollback rehearsals or SQL fragments for the managed test installer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const directory = 'supabase/migrations';
const entries = readdirSync(directory);
const emitBaselineUpgrade = process.argv.includes('--emit-baseline-upgrade-body');
if (emitBaselineUpgrade) assert.deepEqual(process.argv.slice(2), ['--emit-baseline-upgrade-body']);
const verifyBaselineUpgrade = emitBaselineUpgrade || process.argv.includes('--verify-baseline-upgrade');
const verifyColumnBaseline = verifyBaselineUpgrade || process.argv.includes('--verify-column-baseline');
const verifyRoutineBaseline = verifyColumnBaseline || process.argv.includes('--verify-routine-baseline');
const verifySyncStatus = verifyRoutineBaseline || process.argv.includes('--verify-sync-status');
const verifyCleanup = verifySyncStatus || process.argv.includes('--verify-cleanup-prerequisites');
const auditCatalog = verifyCleanup || process.argv.includes('--audit-catalog');
const repairPolicies = auditCatalog || process.argv.includes('--repair-policies');
const hardenLegacy = repairPolicies || process.argv.includes('--harden-legacy');
const compatibilityMode = hardenLegacy || process.argv.includes('--compatibility');
const versions = Array.from({ length: 24 }, (_, index) => index + 72);
if (compatibilityMode) versions.unshift(60, 61);
const blocks = [];
for (const version of versions) {
  const label = String(version).padStart(3, '0');
  const files = entries.filter(file => file.startsWith(`${label}_`));
  assert.equal(files.length, 1);
  const source = version === 85 ? 'supabase/repairs/085_test_prg_boolean_photo_rpc_compatibility.sql' : `${directory}/${files[0]}`;
  let sql = read(source).trimEnd();
  if (version !== 72) {
    assert.match(sql, /(?:^|\n)BEGIN;\n/);
    assert.match(sql, /\nCOMMIT;$/);
    sql = sql.replace(/(^|\n)BEGIN;\n/, '$1').replace(/\nCOMMIT;$/, '');
  }
  sql = sql.replace(/^NOTIFY pgrst,\s*'reload schema';\s*$/gm, '');
  assert.doesNotMatch(sql, /^\s*(?:BEGIN\s*;|COMMIT\b|ROLLBACK\b|START TRANSACTION\b|PREPARE TRANSACTION\b|\\)/im, source);
  blocks.push(`-- ${source}\n${sql}`);
}

const preflight = read('docs/subscription/candidate/PREFLIGHT.sql');
assert.match(preflight, /\nBEGIN READ ONLY;\n/);
assert.match(preflight, /\nROLLBACK;\s*$/);
// The reviewed file emits five SELECTs, each with its own final line semicolon.
const queries = preflight.split('BEGIN READ ONLY;\n')[1].replace(/\nROLLBACK;\s*$/, '').trim().split(/;\n(?=WITH |SELECT |-- READ ONLY)/);
assert.equal(queries.length, 5);
const detailMode = process.argv.includes('--details');
const [relations, routines, , extraRoutines] = queries;
const relationFields = [
  'kind', 'rls', 'forceRls', 'columns', 'constraints', 'triggers', 'policies', 'grants', 'viewDefinition',
];
const relationStart = 'checks AS(SELECT e.identity,c.oid IS NOT NULL AND';
const relationEnd = ' AS passed\n FROM expected e LEFT JOIN';
function relationDiffQuery() {
  const [prefix, checks] = relations.split(relationStart);
  const [conditions, tail] = checks.split(relationEnd);
  const expressions = conditions.trim().split(/\s+AND (?=(?:\(e\.detail|e\.detail))/);
  assert.equal(expressions.length, relationFields.length);
  const fields = expressions.map((expression, index) =>
    `CASE WHEN (${expression}) IS NOT TRUE THEN '${relationFields[index]}' END`);
  return `${prefix}checks AS(SELECT e.identity, CASE WHEN c.oid IS NULL THEN ARRAY['missing']
  ELSE array_remove(ARRAY[${fields.join(',\n')}], NULL) END AS fields
  FROM expected e LEFT JOIN${tail.split('\nSELECT ')[0]}
  SELECT identity, fields FROM checks WHERE cardinality(fields)>0`;
}

function routineDiffQuery(query) {
  return `SELECT drift.signature, CASE WHEN p.oid IS NULL THEN 'missing' ELSE 'definition' END AS difference,
    p.prosecdef AS security_definer,
    CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
    CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute,
    CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_execute
  FROM (${query.trim().replace(/;$/, '')}) drift
  LEFT JOIN pg_proc p ON p.oid=to_regprocedure(drift.signature) WHERE NOT drift.passed`;
}

function catalogReports(candidate, relationBaseline) {
  const routineBaseline = candidate.match(/WITH expected\(sig,h,config,definer,owner_name,normalize_095,grants\)AS\(VALUES ([\s\S]+?)\)SELECT string_agg/);
  const routineAcl = candidate.match(/OR(\(SELECT coalesce\(jsonb_agg\(jsonb_build_object\('role'[^\n]+\n\s+IS DISTINCT FROM[^\n;]+);/);
  assert.ok(routineBaseline && routineAcl, '096 routine baseline shape changed');

  const relationFields = ['columns', 'constraints', 'grants'];
  const fields = relationFields.map(field => {
    const expression = candidate.split('\n').find(line => line.includes(`OR e.d->'${field}'IS DISTINCT FROM`));
    assert.ok(expression, `096 ${field} check changed`);
    const actual = expression.split('IS DISTINCT FROM')[1];
    return `('${field}', e.d->'${field}', ${actual})`;
  });
  const relationDiff = `WITH expected(identity,d) AS (VALUES ${relationBaseline}),
    definitions AS (
      SELECT e.identity,f.* FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.identity)
      CROSS JOIN LATERAL (VALUES ${fields.join(',\n')}) f(field,baseline,actual)
    ), details AS (SELECT identity,field,
      CASE WHEN (SELECT jsonb_agg(value ORDER BY value) FROM jsonb_array_elements(baseline))
             IS NOT DISTINCT FROM (SELECT jsonb_agg(value ORDER BY value) FROM jsonb_array_elements(actual))
        THEN true ELSE false END AS order_only,
      ARRAY(SELECT value FROM jsonb_array_elements(baseline) EXCEPT SELECT value FROM jsonb_array_elements(actual)) AS missing,
      ARRAY(SELECT value FROM jsonb_array_elements(actual) EXCEPT SELECT value FROM jsonb_array_elements(baseline)) AS extra
    FROM definitions WHERE baseline IS DISTINCT FROM actual), shape AS (
    SELECT e.identity,concat_ws(',',
    CASE WHEN c.oid IS NULL THEN 'missing' END,
    CASE WHEN e.d->>'kind' IS DISTINCT FROM c.relkind::text THEN 'kind' END,
    CASE WHEN (e.d->>'rls')::boolean IS DISTINCT FROM c.relrowsecurity OR (e.d->>'forceRls')::boolean IS DISTINCT FROM c.relforcerowsecurity THEN 'rls' END,
    CASE WHEN e.d->>'owner' IS DISTINCT FROM c.relowner::regrole::text THEN 'owner' END,
    CASE WHEN e.d->'options' IS DISTINCT FROM coalesce(to_jsonb(c.reloptions),'null') THEN 'options' END,
    CASE WHEN e.d->'triggers' IS DISTINCT FROM (SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,true)) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
      OR EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND t.tgenabled<>'O') THEN 'triggers' END,
    CASE WHEN e.d->>'viewDefinition' IS DISTINCT FROM CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid,true) END THEN 'view' END
    ) AS fields FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.identity))
    SELECT identity,field,order_only,to_jsonb(missing) AS missing,to_jsonb(extra) AS extra FROM details
    UNION ALL SELECT identity,fields,false,NULL,NULL FROM shape WHERE fields<>''`;
  const routineDiff = `WITH expected(sig,h,config,definer,owner_name,normalize_095,grants) AS (VALUES ${routineBaseline[1]}),
    definitions AS (SELECT substring(e.sig FROM 8) AS signature, concat_ws(',',
      CASE WHEN p.oid IS NULL THEN 'missing' ELSE CASE
        WHEN md5(CASE WHEN e.normalize_095 THEN replace(f.definition,chr(13),'') ELSE f.definition END)=e.h THEN NULL
        WHEN md5(replace(f.definition,p.prosrc,replace(replace(p.prosrc,chr(13),''),chr(10),chr(13)||chr(10))))=e.h
          OR md5(replace(f.definition,p.prosrc,replace(p.prosrc,chr(13),'')))=e.h THEN 'line_endings'
        ELSE 'definition' END END,
      CASE WHEN p.oid IS NOT NULL AND coalesce(to_jsonb(p.proconfig),'null') IS DISTINCT FROM e.config THEN 'settings' END,
      CASE WHEN p.oid IS NOT NULL AND p.prosecdef IS DISTINCT FROM e.definer THEN 'security' END,
      CASE WHEN p.oid IS NOT NULL AND p.proowner::regrole::text IS DISTINCT FROM e.owner_name THEN 'owner' END,
      CASE WHEN p.oid IS NOT NULL AND (${routineAcl[1]}) THEN 'acl' END
    ) AS fields FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.sig)
    CROSS JOIN LATERAL (SELECT pg_get_functiondef(p.oid) AS definition) f)
    SELECT fields,array_agg(signature ORDER BY signature) AS signatures FROM definitions WHERE fields<>'' GROUP BY fields`;
  return [
    ['relationFields', relationDiff, 'identity,field'],
    ['routineFields', routineDiff, 'fields'],
    ['extraRoutines', extraRoutines.trim().replace(/;$/, ''), 'identity'],
  ];
}

function compatibilityReports() {
  const candidate = read('docs/subscription/candidate/096_account_deletion_candidate.sql');
  const policyBaseline = candidate.match(/WITH expected\(identity,d\)AS\(VALUES ([\s\S]+?)\)\s*SELECT 1 FROM expected e LEFT JOIN/);
  const policyCapture = candidate.match(/OR e\.d->'policies'IS DISTINCT FROM(\(SELECT [^\n]+\))/);
  assert.ok(policyBaseline && policyCapture, '096 policy baseline shape changed');
  const policies = hardenLegacy ? `WITH expected(identity,d) AS (VALUES ${policyBaseline[1]}),
      definitions AS (SELECT e.identity,e.d->'policies' AS baseline,${policyCapture[1]} AS actual
        FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.identity))
      SELECT d.identity,coalesce(b.policy->>'name',a.policy->>'name') AS policy,
        CASE WHEN a.policy IS NULL THEN ARRAY['missing'] WHEN b.policy IS NULL THEN ARRAY['extra']
        ELSE ARRAY(SELECT field FROM unnest(ARRAY['command','permissive','roles','using','check']) field
          WHERE b.policy->field IS DISTINCT FROM a.policy->field) END AS fields
      FROM definitions d CROSS JOIN LATERAL (
        SELECT baseline.policy AS expected_policy, actual.policy AS actual_policy
        FROM jsonb_array_elements(d.baseline) baseline(policy)
        FULL JOIN jsonb_array_elements(d.actual) actual(policy)
          ON baseline.policy->>'name'=actual.policy->>'name'
        WHERE baseline.policy IS DISTINCT FROM actual.policy
      ) delta
      CROSS JOIN LATERAL (SELECT delta.expected_policy AS policy) b
      CROSS JOIN LATERAL (SELECT delta.actual_policy AS policy) a` : `WITH expected(identity,d) AS (VALUES ${policyBaseline[1]})
      SELECT e.identity FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.identity)
      WHERE e.d->'policies' IS DISTINCT FROM ${policyCapture[1]}`;
  return [
    ...(auditCatalog ? catalogReports(candidate, policyBaseline[1]) : []),
    ['policies', policies, hardenLegacy ? 'identity, policy' : 'identity'],
    ['salesPhoto', `WITH baseline AS (${routines.trim().replace(/;$/, '').replace('e.signature,coalesce', 'e.signature,e.fingerprint,coalesce')})
      SELECT baseline.signature, CASE WHEN p.oid IS NULL THEN 'missing' WHEN baseline.passed THEN 'exact'
        WHEN md5(replace(pg_get_functiondef(p.oid),p.prosrc,replace(p.prosrc,chr(10),chr(13)||chr(10))))=baseline.fingerprint THEN 'line_endings'
        ELSE 'different' END AS definition,
        coalesce(p.prosecdef AND p.proowner::regrole::text='postgres' AND p.proconfig=ARRAY['search_path=""']
          AND has_function_privilege('service_role',p.oid,'EXECUTE')
          AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
            WHERE a.privilege_type='EXECUTE' AND (a.grantee NOT IN (p.proowner,'service_role'::regrole) OR a.is_grantable))
          AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
          AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE'),false) AS service_only
      FROM baseline LEFT JOIN pg_proc p ON p.oid=to_regprocedure(baseline.signature)
      WHERE baseline.signature ~ '^public\\.bff_(prepare_sale_photo_evidence_delete|finalize_sale_photo_evidence_(delete|expiration)|list_expired_sale_photo_evidence)\\('`, 'signature'],
    ['legacy', hardenLegacy ? `SELECT 'user_market_ids(uuid)' AS identity,
        to_regprocedure('public.user_market_ids(uuid)') IS NULL AS removed,
        true AS synthetic_market_access_passed` : `SELECT p.oid::regprocedure::text AS identity, p.prosecdef AS definer,
        p.proowner::regrole::text AS owner, p.proconfig AS settings,
        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
        pg_get_functiondef(p.oid) AS definition,
        ARRAY(SELECT pg_describe_object(d.classid,d.objid,d.objsubid) FROM pg_depend d
          WHERE d.refclassid='pg_proc'::regclass AND d.refobjid=p.oid ORDER BY 1) AS catalog_dependents,
        ARRAY(SELECT q.oid::regprocedure::text FROM pg_proc q JOIN pg_namespace n ON n.oid=q.pronamespace
          WHERE n.nspname='public' AND q.oid<>p.oid AND q.prosrc ~ '\\muser_market_ids[[:space:]]*\\(' ORDER BY 1) AS routine_references
      FROM pg_proc p WHERE p.oid=to_regprocedure('public.user_market_ids(uuid)')`, 'identity'],
  ];
}

const reportQueries = compatibilityMode ? compatibilityReports() : [
  ['relations', relationDiffQuery(), 'identity'],
  ['routines', routineDiffQuery(routines), 'signature'],
  ['extraRoutines', extraRoutines.trim().replace(/;$/, ''), 'identity'],
];
const reports = compatibilityMode || detailMode ? reportQueries.map(([key, query, order]) => `report := report || jsonb_build_object('${key}',
    (SELECT coalesce(jsonb_agg(to_jsonb(result) ORDER BY ${order}), '[]') FROM (${query}) result));`)
  : queries.map((query, index) => `SELECT count(*), count(*) FILTER (WHERE NOT passed)
    INTO total, failed FROM (${query.trim().replace(/;$/, '')}) AS result;
  report := report || jsonb_build_array(jsonb_build_object('group', ${index + 1}, 'total', total, 'failed', failed));`);

const inventory = read('supabase/verification/096_account_deletion_test_prg_inventory.sql').trim().replace(/;$/, '');
const remainingRoutineNames = [
  'auto_add_staff_to_new_market', 'cleanup_expired_invitations',
  'drain_checklist_toggle_pending_operation', 'enforce_event_actor_authorization',
  'enqueue_checklist_toggle_pending_operation', 'get_my_staff', 'handle_new_user',
  'list_owner_pending_operation_diagnostics', 'restore_staff_relationship',
  'staff_team_access_from_source_rows', 'sync_team_plan_staff_suspension',
  'update_market_read_model', 'update_product_read_model',
];

function capturedRoutines(names, expectedCount) {
  const capture = JSON.parse(read('docs/subscription/evidence/account-deletion-access-definitions-2026-11-02.json'));
  const candidate = read('docs/subscription/candidate/096_account_deletion_candidate.sql');
  assert.equal(capture.projectRef, 'fgejncfsvvsayiequubm');
  const selected = capture.rows.filter(row => row.category === 'routine' && names.includes(row.detail.name));
  assert.equal(selected.length, expectedCount);
  assert.deepEqual([...new Set(selected.map(({ detail }) => detail.name))].sort(), [...names].sort());
  return selected.map(({ detail }) => {
    const signature = `public.${detail.name}(${detail.argumentTypes})`;
    assert.match(signature, /^public\.[a-z_]+\([a-z, ]*\)$/);
    const fingerprint = createHash('md5').update(detail.definition).digest('hex');
    assert.equal(fingerprint, detail.definitionMd5);
    assert.ok(candidate.includes(`('${signature}','${fingerprint}',`), signature);
    assert.doesNotMatch(detail.definition, /^\s*(?:COMMIT|ROLLBACK|PREPARE TRANSACTION)\b/im);
    // The SQL Editor can normalize line endings, so transmit the reviewed definition as bytes.
    return { signature, detail, hex: Buffer.from(detail.definition).toString('hex') };
  });
}

function capturedPhotoRoutines() {
  const selected = capturedRoutines([
    'claim_product_cover_photo_upload', 'finalize_product_cover_photo_upload', 'product_cover_photo_write_allowed',
  ], 5);
  const ddl = selected.map(({ signature, detail, hex }) => {
    assert.deepEqual(detail.grants.map(grant => [grant.role, grant.privilege, grant.grantable]), [
      ['postgres', 'EXECUTE', false], ['service_role', 'EXECUTE', false],
    ]);
    return `EXECUTE convert_from(decode('${hex}','hex'),'UTF8');
    REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`;
  });
  return `DO $photo_baseline$\nBEGIN\n${ddl.join('\n')}\nEND;\n$photo_baseline$;`;
}

function capturedRemainingRoutines() {
  const values = capturedRoutines(remainingRoutineNames, remainingRoutineNames.length).map(({ signature, detail, hex }) => {
    assert.equal(detail.owner, 'postgres');
    for (const { role, privilege, grantable } of detail.grants) {
      assert.ok(['postgres', 'authenticated', 'service_role'].includes(role));
      assert.equal(privilege, 'EXECUTE');
      assert.equal(grantable, false);
    }
    const roles = detail.grants.filter(grant => grant.role !== 'postgres').map(grant => `'${grant.role}'`);
    return `('${signature}','${hex}',ARRAY[${roles.join(',')}]::text[])`;
  });
  return `DO $routine_baseline$
DECLARE
  fixture record;
  routine_oid oid;
  granted_role text;
BEGIN
  FOR fixture IN SELECT * FROM (VALUES ${values.join(',\n')}) AS fixtures(signature,definition_hex,roles) LOOP
    routine_oid := to_regprocedure(fixture.signature);
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=routine_oid AND proowner='postgres'::regrole) THEN
      RAISE EXCEPTION 'Expected existing postgres-owned routine: %',fixture.signature;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE p.oid=routine_oid AND a.grantee NOT IN (0,'postgres'::regrole,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)) THEN
      RAISE EXCEPTION 'Unexpected grantee for %',fixture.signature;
    END IF;
    IF fixture.signature='public.get_my_staff()' AND pg_get_function_result(routine_oid)=
      'TABLE(staff_id uuid, staff_email text, status text, permissions jsonb, invited_at timestamp with time zone, accepted_at timestamp with time zone)' THEN
      IF EXISTS (SELECT 1 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
        AND p.oid<>routine_oid AND p.prosrc ~ 'get_my_staff[[:space:]]*[(]') THEN
        RAISE EXCEPTION 'Legacy staff listing has a routine reference';
      END IF;
      DROP FUNCTION public.get_my_staff() RESTRICT;
    END IF;
    EXECUTE convert_from(decode(fixture.definition_hex,'hex'),'UTF8');
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',fixture.signature);
    FOREACH granted_role IN ARRAY fixture.roles LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',fixture.signature,granted_role);
    END LOOP;
  END LOOP;
END;
$routine_baseline$;`;
}

function installerBaselineCheck() {
  const candidate = read('docs/subscription/candidate/096_account_deletion_candidate.sql');
  const start = "IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname LIKE 'deletion_%')";
  const end = "IF schema_now IS NOT NULL THEN RAISE EXCEPTION 'deletion_migration_baseline_routines: %',schema_now;END IF;";
  const startIndex = candidate.indexOf(start);
  const endIndex = candidate.indexOf(end, startIndex);
  assert.ok(startIndex >= 0 && endIndex > startIndex, '096 baseline assertions were not found');
  const baseline = candidate.slice(startIndex, endIndex + end.length);
  assert.doesNotMatch(baseline, /^\s*(?:EXECUTE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im);
  return `BEGIN
    ${baseline}
    report := report || '{"installerPreflightPassed":true}'::jsonb;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM !~ '^deletion_migration_(baseline_|unreviewed_private_schema)' THEN RAISE; END IF;
    report := report || jsonb_build_object('installerPreflightPassed',false,'installerPreflightFailure',SQLERRM);
  END;`;
}

const scopeGuard = `DO $scope$
BEGIN
  IF current_database() <> 'postgres' OR session_user <> 'postgres'
    OR to_regnamespace('deletion_release_private') IS NOT NULL
    OR to_regnamespace('deletion_upload_private') IS NOT NULL
    OR to_regclass('public.market_cash_records') IS NOT NULL
    OR to_regclass('public.subscription_write_guard_settings') IS NOT NULL
    OR md5(replace(pg_get_functiondef(to_regprocedure('public.claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint,boolean)')),chr(13),'')) IS DISTINCT FROM '5a40cb4ffe6c5405ea392db0ed713ba3'
    OR md5(replace(pg_get_functiondef(to_regprocedure('public.finalize_product_cover_photo_upload(uuid,uuid,uuid,integer,text,text,text,text,text,text,integer,integer,integer,integer,boolean)')),chr(13),'')) IS DISTINCT FROM '42cb8357642beabb579e87b6a2404cc8'
  THEN RAISE EXCEPTION 'Rehearsal requires the reviewed test_prg catalog'; END IF;
END;
$scope$;
`;
const transactionStart = `-- Rollback-only rehearsal. Submit the entire file in test_prg (tzhbirwchhqabkxhqjdl).
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '20s';
${scopeGuard}`;

function stage(name) {
  const sql = read(`supabase/verification/096_test_prg_${name}_rehearsal.sql`).trimEnd();
  if (!verifyBaselineUpgrade) return sql;
  const parts = sql.split('\n-- REHEARSAL FIXTURES BEGIN\n');
  assert.equal(parts.length, 2, `Missing fixture boundary for ${name}`);
  return parts[0].trimEnd();
}

const stages = `${blocks.join('\n\n')}${verifyRoutineBaseline ? `\n\n${capturedRemainingRoutines()}` : ''}${hardenLegacy ? `\n\nSET LOCAL feria.test_prg_legacy_rehearsal = 'on';
${stage('legacy_market_access')}` : ''}${repairPolicies ? `\n\nSET LOCAL feria.test_prg_policy_rehearsal = 'on';
${stage('policy')}` : ''}${verifyCleanup ? `\n\n${capturedPhotoRoutines()}
SET LOCAL feria.test_prg_cleanup_rehearsal = 'on';
${stage('cleanup_prerequisites')}` : ''}${verifySyncStatus ? `\n\nSET LOCAL feria.test_prg_sync_status_rehearsal = 'on';
${stage('sync_status')}` : ''}${verifyRoutineBaseline && !verifyBaselineUpgrade ? `\n\n${read('supabase/verification/096_test_prg_routine_baseline_rehearsal.sql').trimEnd()}` : ''}${verifyColumnBaseline ? `\n\nSET LOCAL feria.test_prg_column_rehearsal = 'on';
${stage('column_baseline')}` : ''}`;

function baselineUpgradeFragments() {
  const preservation = read('supabase/verification/096_test_prg_baseline_data_preservation.sql')
    .split('\n-- BASELINE UPDATES RUN HERE\n');
  assert.equal(preservation.length, 2);
  assert.doesNotMatch(stages, /a9610000-0000-4000-8000-|096 disposable/);
  return { before: `${scopeGuard}${preservation[0]}\n${stages}\n`, after: preservation[1] };
}

if (emitBaselineUpgrade) {
  console.log(JSON.stringify(baselineUpgradeFragments()));
  process.exit(0);
}

function baselineUpgradeRehearsal() {
  const { before, after } = baselineUpgradeFragments();
  return `${transactionStart}${before.slice(scopeGuard.length)}${after}
DO $upgrade_result$
DECLARE
  schema_now text;
  report jsonb;
BEGIN
  SELECT jsonb_build_object('existingRowsPreserved',true,
    'tablesChecked',count(*),'rowsChecked',sum(row_count)) INTO report FROM pg_temp.test_prg_baseline_rows;
  ${installerBaselineCheck()}
  RAISE EXCEPTION 'BASELINE_UPGRADE_REHEARSAL_ROLLED_BACK %',report;
END;
$upgrade_result$;
ROLLBACK;
`;
}

const result = verifyBaselineUpgrade ? baselineUpgradeRehearsal() : `${transactionStart}${stages}

DO $result$
DECLARE
  report jsonb := '${compatibilityMode || detailMode ? '{}' : '[]'}';
  structure jsonb;
  total bigint;
  failed bigint;
  ${verifyColumnBaseline ? 'schema_now text;' : ''}
BEGIN
  SELECT to_jsonb(result) INTO structure FROM (${inventory}) result;
  ${reports.join('\n  ')}${repairPolicies ? `\n  IF report->'policies' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'POLICY_BASELINE_MISMATCH %', report->'policies';
  END IF;
  report := report || '{"policyAccessPassed":true}'::jsonb;` : ''}${verifyCleanup ? `\n  IF EXISTS (SELECT 1 FROM jsonb_array_elements(report->'routineFields') r,
    jsonb_array_elements_text(r->'signatures') s WHERE s ~ '^(claim_product_cover_photo_upload|finalize_product_cover_photo_upload|product_cover_photo_write_allowed)\\(') THEN
    RAISE EXCEPTION 'PRODUCT_PHOTO_BASELINE_MISMATCH';
  END IF;
  report := report || '{"cleanupPrerequisitesPassed":true}'::jsonb;` : ''}${verifySyncStatus ? `\n  report := report || '{"syncStatusAccessPassed":true}'::jsonb;` : ''}${verifyRoutineBaseline ? `
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(report->'routineFields') r,
    jsonb_array_elements_text(r->'signatures') s
    WHERE split_part(s,'(',1) IN (${remainingRoutineNames.map(name => `'${name}'`).join(',')})) THEN
    RAISE EXCEPTION 'REVIEWED_ROUTINE_BASELINE_MISMATCH %', report->'routineFields';
  END IF;
  report := report || '{"reviewedRoutineBaselinePassed":true}'::jsonb;` : ''}${verifyRoutineBaseline && !verifyColumnBaseline ? `
  report := report || jsonb_build_object(
    'legacyProductSyncStatus', (SELECT jsonb_build_object(
      'rows',count(*),'synced',count(*) FILTER (WHERE sync_status::text='synced'),
      'null',count(*) FILTER (WHERE sync_status IS NULL),
      'other',count(*) FILTER (WHERE sync_status::text<>'synced')) FROM public.products));` : ''}
  ${verifyColumnBaseline ? `IF EXISTS (SELECT 1 FROM jsonb_array_elements(report->'relationFields') r
    WHERE r->>'field'='columns' AND r->>'identity' IN ('public.market_members','public.products')) THEN
    RAISE EXCEPTION 'REVIEWED_COLUMN_BASELINE_MISMATCH';
  END IF;
  report := report || '{"reviewedColumnBaselinePassed":true}'::jsonb;
  ${installerBaselineCheck()}` : ''}
  RAISE EXCEPTION 'REHEARSAL_COMPLETE_ROLLED_BACK %', jsonb_build_object('inventory', structure, 'preflight', report);
END;
$result$;
ROLLBACK;
`;
assert.equal((result.match(/^ROLLBACK;$/gm) ?? []).length, 1);
assert.doesNotMatch(result, /^\s*(?:COMMIT|PREPARE TRANSACTION)\b/im);
const suffix = verifyBaselineUpgrade ? '-upgrade' : verifyColumnBaseline ? '-column-baseline' : verifyRoutineBaseline ? '-routine-baseline' : verifySyncStatus ? '-sync-status' : verifyCleanup ? '-cleanup' : auditCatalog ? '-catalog' : repairPolicies ? '-policies' : hardenLegacy ? '-legacy-access' : compatibilityMode ? '-compatibility' : detailMode ? '-details' : '';
const path = `.codex-artifacts/test-prg-072-095-rollback${suffix}.sql`;
mkdirSync('.codex-artifacts', { recursive: true });
writeFileSync(path, result);
console.log(JSON.stringify({ path, bytes: Buffer.byteLength(result), sha256: createHash('sha256').update(result).digest('hex') }));
