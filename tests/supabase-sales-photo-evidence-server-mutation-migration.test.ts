import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void | Promise<void>;

type ExtractedFunction = {
  parameters: string;
  body: string;
};

type RpcContract = {
  name: string;
  signature: string[];
  regprocedure: string;
};

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const capabilitySource = readFileSync(join(
  projectRoot,
  'supabase/migrations/058_add_sales_photo_evidence_server_mutation_rpcs.sql'
), 'utf8');
const cutoverSource = readFileSync(join(
  projectRoot,
  'supabase/migrations/059_enforce_sales_photo_evidence_server_mutation_boundary.sql'
), 'utf8');
const manifest = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

const RPCS = {
  claim: {
    name: 'bff_claim_sale_photo_evidence_upload',
    signature: ['UUID', 'UUID', 'UUID', 'UUID', 'UUID', 'UUID', 'TIMESTAMPTZ'],
    regprocedure: 'public.bff_claim_sale_photo_evidence_upload(uuid,uuid,uuid,uuid,uuid,uuid,timestamp with time zone)',
  },
  finalize: {
    name: 'bff_finalize_sale_photo_evidence_upload',
    signature: [
      'UUID', 'UUID', 'UUID', 'UUID', 'UUID', 'UUID',
      'TEXT', 'TEXT', 'TEXT',
      'INTEGER', 'INTEGER', 'INTEGER',
      'TIMESTAMPTZ', 'TIMESTAMPTZ', 'TIMESTAMPTZ',
    ],
    regprocedure: 'public.bff_finalize_sale_photo_evidence_upload(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,integer,integer,integer,timestamp with time zone,timestamp with time zone,timestamp with time zone)',
  },
  fail: {
    name: 'bff_mark_sale_photo_evidence_upload_failed',
    signature: ['UUID', 'UUID', 'UUID', 'UUID', 'UUID', 'UUID', 'TEXT'],
    regprocedure: 'public.bff_mark_sale_photo_evidence_upload_failed(uuid,uuid,uuid,uuid,uuid,uuid,text)',
  },
} satisfies Record<string, RpcContract>;

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFunction(source: string, name: string): ExtractedFunction {
  const match = new RegExp(
    `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${escapeRegex(name)}\\s*\\(([\\s\\S]*?)\\)`
      + `\\s*RETURNS\\s+public\\.sale_photo_evidence[\\s\\S]*?AS\\s+\\$\\$([\\s\\S]*?)\\$\\$;`,
    'i'
  ).exec(source);

  assert.ok(match, `Could not extract function ${name}`);
  return {
    parameters: match[1],
    body: match[2],
  };
}

function signaturePattern(contract: RpcContract): string {
  return `public\\.${escapeRegex(contract.name)}\\s*\\(\\s*${contract.signature.join('\\s*,\\s*')}\\s*\\)`;
}

function assertExactOwnerAndAcl(source: string, contract: RpcContract): void {
  const signature = signaturePattern(contract);
  assert.match(
    source,
    new RegExp(`ALTER\\s+FUNCTION\\s+${signature}\\s+OWNER\\s+TO\\s+postgres\\s*;`, 'i')
  );
  assert.match(
    source,
    new RegExp(
      `REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+${signature}`
        + `\\s+FROM\\s+PUBLIC\\s*,\\s*anon\\s*,\\s*authenticated\\s*;`,
      'i'
    )
  );
  assert.match(
    source,
    new RegExp(
      `GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+${signature}`
        + `\\s+TO\\s+service_role\\s*;`,
      'i'
    )
  );
  assert.match(
    source,
    new RegExp(`COMMENT\\s+ON\\s+FUNCTION\\s+${signature}\\s+IS\\s+'[^']+'\\s*;`, 'i')
  );
}

function matchIndex(source: string, pattern: RegExp, label: string): number {
  const match = pattern.exec(source);
  assert.ok(match, `Missing ${label}`);
  return match.index;
}

const claim = extractFunction(capabilitySource, RPCS.claim.name);
const finalize = extractFunction(capabilitySource, RPCS.finalize.name);
const fail = extractFunction(capabilitySource, RPCS.fail.name);

console.log('\n=== Supabase sales photo evidence server mutation migrations ===');

runTest('058 requires 057 and keeps a legacy-compatible lease shape before cutover', () => {
  for (const constraint of [
    'sale_photo_evidence_r2_object_key_identity_check',
    'sale_photo_evidence_r2_thumbnail_key_identity_check',
    'sale_photo_evidence_file_size_ceiling_check',
  ]) {
    assert.match(capabilitySource, new RegExp(escapeRegex(constraint)));
  }

  assert.match(capabilitySource, /ADD COLUMN IF NOT EXISTS upload_attempt_id UUID/);
  assert.match(capabilitySource, /ADD COLUMN IF NOT EXISTS upload_lease_expires_at TIMESTAMPTZ/);
  assert.match(capabilitySource, /sale_photo_evidence_upload_lease_shape_check/);
  assert.match(
    capabilitySource,
    /status = 'uploading'[\s\S]*upload_attempt_id IS NULL[\s\S]*upload_lease_expires_at IS NULL[\s\S]*OR[\s\S]*upload_attempt_id IS NOT NULL[\s\S]*upload_lease_expires_at IS NOT NULL/
  );
  assert.doesNotMatch(capabilitySource, /DROP POLICY IF EXISTS "sale_photo_evidence_(?:insert|update)/);
  assert.doesNotMatch(capabilitySource, /REVOKE\s+ALL(?:\s+PRIVILEGES)?\s+ON\s+TABLE\s+public\.sale_photo_evidence/i);
});

runTest('claim function owns the attempt lease and locks live authorization before the row', () => {
  assert.match(claim.parameters, /p_attempt_id\s+UUID/i);
  assert.match(claim.body, /p_attempt_id IS NULL/);
  assert.match(claim.body, /pg_catalog\.pg_advisory_xact_lock/);
  assert.match(claim.body, /v_now := pg_catalog\.clock_timestamp\(\)/);
  assert.doesNotMatch(claim.body, /statement_timestamp\(/);
  assert.match(
    claim.body,
    /upload_lease_expires_at > v_now[\s\S]*upload_attempt_id IS DISTINCT FROM p_attempt_id/
  );
  assert.match(claim.body, /upload_attempt_id = p_attempt_id/);
  assert.match(claim.body, /upload_lease_expires_at = v_now \+ INTERVAL '2 minutes'/);
  assert.match(
    claim.body,
    /captured_by_staff_id = CASE WHEN v_is_owner THEN NULL ELSE p_actor_id END/
  );

  const saleLock = matchIndex(
    claim.body,
    /FROM public\.events AS e[\s\S]*?FOR SHARE OF e, m/,
    'claim sale/market SHARE lock'
  );
  const staffLock = matchIndex(
    claim.body,
    /FROM public\.staff_relationships AS sr[\s\S]*?sr\.status = 'active'[\s\S]*?FOR SHARE/,
    'claim staff SHARE lock'
  );
  const evidenceLock = matchIndex(
    claim.body,
    /FROM public\.sale_photo_evidence AS spe[\s\S]*?FOR UPDATE/,
    'claim evidence UPDATE lock'
  );
  assert.ok(saleLock < staffLock && staffLock < evidenceLock, 'claim lock order must be sale -> staff -> evidence');
});

runTest('finalize is attempt-bound, null-safe, lease-bounded, and lock-ordered', () => {
  assert.match(finalize.parameters, /p_attempt_id\s+UUID/i);
  assert.match(finalize.body, /p_attempt_id IS NULL/);
  assert.match(finalize.body, /p_mime_type IS NULL/);
  assert.match(finalize.body, /p_mime_type NOT IN \('image\/webp', 'image\/jpeg'\)/);
  assert.match(finalize.body, /v_now := pg_catalog\.clock_timestamp\(\)/);
  assert.match(finalize.body, /upload_attempt_id IS DISTINCT FROM p_attempt_id/);
  assert.match(
    finalize.body,
    /upload_lease_expires_at IS NULL[\s\S]*upload_lease_expires_at <= v_now/
  );
  assert.match(finalize.body, /upload_lease_expires_at = NULL/);
  assert.match(
    finalize.body,
    /AND spe\.upload_attempt_id = p_attempt_id[\s\S]*AND spe\.upload_lease_expires_at > v_now/
  );
  assert.ok(
    matchIndex(finalize.body, /upload_attempt_id IS DISTINCT FROM p_attempt_id/, 'finalize attempt guard')
      < matchIndex(finalize.body, /v_evidence\.status = 'uploaded'/, 'finalize idempotent status branch'),
    'finalize must bind the attempt before an idempotent return'
  );

  const saleLock = matchIndex(
    finalize.body,
    /FROM public\.events AS e[\s\S]*?FOR SHARE OF e, m/,
    'finalize sale/market SHARE lock'
  );
  const staffLock = matchIndex(
    finalize.body,
    /FROM public\.staff_relationships AS sr[\s\S]*?sr\.status = 'active'[\s\S]*?FOR SHARE/,
    'finalize staff SHARE lock'
  );
  const evidenceLock = matchIndex(
    finalize.body,
    /FROM public\.sale_photo_evidence AS spe[\s\S]*?FOR UPDATE/,
    'finalize evidence UPDATE lock'
  );
  assert.ok(saleLock < staffLock && staffLock < evidenceLock, 'finalize lock order must be sale -> staff -> evidence');
  assert.match(finalize.body, /captured_by_staff_id IS DISTINCT FROM p_actor_id/);
});

runTest('failure cleanup is null-safe and cannot affect a reclaimed attempt', () => {
  assert.match(fail.parameters, /p_attempt_id\s+UUID/i);
  assert.match(fail.body, /p_attempt_id IS NULL/);
  assert.match(fail.body, /p_failure_reason IS NULL/);
  assert.match(
    fail.body,
    /p_failure_reason NOT IN \([\s\S]*'r2_image_upload_failed'[\s\S]*'r2_thumbnail_upload_failed'[\s\S]*'metadata_finalize_failed'/
  );
  assert.match(fail.body, /upload_attempt_id IS DISTINCT FROM p_attempt_id/);
  assert.match(fail.body, /AND spe\.upload_attempt_id = p_attempt_id/);
  assert.match(fail.body, /upload_lease_expires_at = NULL/);
  assert.ok(
    matchIndex(fail.body, /upload_attempt_id IS DISTINCT FROM p_attempt_id/, 'failure attempt guard')
      < matchIndex(fail.body, /v_evidence\.status = 'upload_failed'/, 'failure idempotent status branch'),
    'failure cleanup must bind the attempt before an idempotent return'
  );
  assert.match(
    fail.body,
    /p_actor_id = p_owner_id[\s\S]*v_evidence\.captured_by_staff_id = p_actor_id/
  );
  assert.doesNotMatch(fail.body, /FROM public\.staff_relationships/);
});

runTest('058 pins every SECURITY DEFINER RPC owner and exact ACL signature', () => {
  assert.equal((capabilitySource.match(/^SECURITY DEFINER$/gm) ?? []).length, 3);
  assert.equal((capabilitySource.match(/^SET search_path = ''$/gm) ?? []).length, 3);
  for (const contract of Object.values(RPCS)) {
    assertExactOwnerAndAcl(capabilitySource, contract);
  }
});

runTest('059 fails closed unless the exact 058 RPCs and trusted owners exist', () => {
  for (const contract of Object.values(RPCS)) {
    assert.match(
      cutoverSource,
      new RegExp(`pg_catalog\\.to_regprocedure\\(\\s*'${escapeRegex(contract.regprocedure)}'\\s*\\)`, 'i')
    );
  }
  assert.match(cutoverSource, /v_claim IS NULL OR v_finalize IS NULL OR v_fail IS NULL/);
  assert.match(cutoverSource, /p\.proname IN \([\s\S]*bff_claim_sale_photo_evidence_upload[\s\S]*bff_finalize_sale_photo_evidence_upload[\s\S]*bff_mark_sale_photo_evidence_upload_failed[\s\S]*\)\s*\) <> 3/);
  assert.match(cutoverSource, /pg_catalog\.pg_get_userbyid\(p\.proowner\) <> 'postgres'/);
  assert.match(cutoverSource, /LOCK TABLE public\.sale_photo_evidence IN SHARE ROW EXCLUSIVE MODE/);
  assert.match(
    cutoverSource,
    /status = 'uploading'[\s\S]*upload_attempt_id IS NULL[\s\S]*OR spe\.upload_lease_expires_at IS NULL/
  );
});

runTest('059 installs and validates the strict lease state before removing compatibility shape', () => {
  assert.match(cutoverSource, /sale_photo_evidence_upload_lease_state_check/);
  assert.match(
    cutoverSource,
    /status = 'uploading'[\s\S]*upload_attempt_id IS NOT NULL[\s\S]*upload_lease_expires_at IS NOT NULL[\s\S]*status <> 'uploading'[\s\S]*upload_lease_expires_at IS NULL/
  );
  const addStrict = matchIndex(
    cutoverSource,
    /ADD CONSTRAINT sale_photo_evidence_upload_lease_state_check/,
    'strict lease constraint creation'
  );
  const validateStrict = matchIndex(
    cutoverSource,
    /VALIDATE CONSTRAINT sale_photo_evidence_upload_lease_state_check/,
    'strict lease constraint validation'
  );
  const dropShape = matchIndex(
    cutoverSource,
    /DROP CONSTRAINT IF EXISTS sale_photo_evidence_upload_lease_shape_check/,
    'compatibility lease constraint removal'
  );
  assert.ok(addStrict < validateStrict && validateStrict < dropShape);
});

runTest('059 removes policies plus PUBLIC, table, and column mutation capabilities', () => {
  for (const policy of [
    'sale_photo_evidence_insert_owner_or_active_staff',
    'sale_photo_evidence_update_owner',
    'sale_photo_evidence_update_own_staff_capture',
  ]) {
    assert.match(
      cutoverSource,
      new RegExp(`DROP POLICY IF EXISTS "${escapeRegex(policy)}"\\s+ON public\\.sale_photo_evidence`, 'i')
    );
  }

  assert.match(
    cutoverSource,
    /REVOKE ALL ON TABLE public\.sale_photo_evidence\s+FROM PUBLIC, anon, authenticated, service_role;/
  );
  assert.match(cutoverSource, /FROM pg_catalog\.pg_attribute AS a/);
  assert.match(cutoverSource, /a\.attnum > 0[\s\S]*NOT a\.attisdropped/);
  assert.match(cutoverSource, /pg_catalog\.quote_ident\(a\.attname\)/);
  assert.match(
    cutoverSource,
    /REVOKE ALL PRIVILEGES \(%s\) ON TABLE public\.sale_photo_evidence FROM PUBLIC, anon, authenticated, service_role/
  );
  assert.match(
    cutoverSource,
    /GRANT SELECT ON TABLE public\.sale_photo_evidence TO authenticated, service_role;/
  );
  assert.doesNotMatch(
    cutoverSource,
    /GRANT\s+(?:INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER)[^;]*TO\s+(?:anon|authenticated|service_role)/i
  );
  assert.match(
    cutoverSource,
    /REVOKE ALL ON FUNCTION public\.is_sale_photo_evidence_sale_event\(UUID, UUID, UUID\)\s+FROM PUBLIC, anon, authenticated, service_role;/
  );
});

runTest('059 preserves only the exact service-role RPC ACLs after cutover', () => {
  for (const contract of Object.values(RPCS)) {
    const signature = signaturePattern(contract);
    assert.match(
      cutoverSource,
      new RegExp(
        `REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+${signature}`
          + `\\s+FROM\\s+PUBLIC\\s*,\\s*anon\\s*,\\s*authenticated\\s*;`,
        'i'
      )
    );
    assert.match(
      cutoverSource,
      new RegExp(
        `GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+${signature}`
          + `\\s+TO\\s+service_role\\s*;`,
        'i'
      )
    );
  }
});

runTest('both migrations contain no credential and the test remains registered', () => {
  for (const source of [capabilitySource, cutoverSource]) {
    assert.doesNotMatch(
      source,
      /sb_secret_|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|R2_SECRET_ACCESS_KEY/
    );
  }
  assert.match(
    manifest,
    /tsx tests\/supabase-sales-photo-evidence-server-mutation-migration\.test\.ts/
  );
});

async function main(): Promise<void> {
  let failed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence server mutation migration tests failed`);
  }
}

main();
