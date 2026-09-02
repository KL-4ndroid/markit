import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSalesPhotoEvidenceServerMutationRepository,
  isSalesPhotoEvidenceServerMutationConfiguredForEnv,
  type SalesPhotoEvidenceServerMutationClientFactory,
} from '../lib/supabase/sales-photo-evidence-server-mutation-repository.server';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const IDS = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  staffId: '22222222-2222-4222-8222-222222222222',
  marketId: '33333333-3333-4333-8333-333333333333',
  saleId: '44444444-4444-4444-8444-444444444444',
  evidenceId: '55555555-5555-4555-8555-555555555555',
  attemptId: '66666666-6666-4666-8666-666666666666',
};

const SECRET_KEY = `sb_secret_${'a'.repeat(48)}`;

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
    SUPABASE_SECRET_KEY: SECRET_KEY,
    ...overrides,
  };
}

function rpcRow(
  status: 'uploading' | 'uploaded' | 'upload_failed' = 'uploading',
  attemptId = IDS.attemptId
) {
  return {
    id: IDS.evidenceId,
    owner_id: IDS.ownerId,
    market_id: IDS.marketId,
    sale_id: IDS.saleId,
    captured_by_staff_id: IDS.staffId,
    status,
    upload_attempt_id: attemptId,
  };
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== App API server-only Supabase mutation client ===');

runTest('server mutation config accepts only a bounded sb_secret key on the verified Supabase URL', () => {
  assert.equal(isSalesPhotoEvidenceServerMutationConfiguredForEnv(validEnv()), true);
  assert.equal(isSalesPhotoEvidenceServerMutationConfiguredForEnv(validEnv({
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  })), true);

  const invalidEnvs = [
    validEnv({ SUPABASE_SECRET_KEY: undefined }),
    validEnv({ SUPABASE_SECRET_KEY: 'legacy-service-role-jwt' }),
    validEnv({ SUPABASE_SECRET_KEY: 'sb_secret_short' }),
    validEnv({ SUPABASE_SECRET_KEY: ` ${SECRET_KEY}` }),
    validEnv({ SUPABASE_SECRET_KEY: `${SECRET_KEY}\n` }),
    validEnv({ NEXT_PUBLIC_SUPABASE_URL: 'http://project.supabase.co' }),
    validEnv({ NEXT_PUBLIC_SUPABASE_URL: 'ftp://project.supabase.co' }),
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
      NEXT_PUBLIC_SUPABASE_SECRET_KEY: SECRET_KEY,
    },
  ];

  for (const env of invalidEnvs) {
    assert.equal(isSalesPhotoEvidenceServerMutationConfiguredForEnv(env), false);
  }
});

runTest('factory creates an isolated no-session client and claim RPC derives authority from actorId', async () => {
  const factoryCalls: Array<{ url: string; key: string; options: unknown }> = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const createMutationClient: SalesPhotoEvidenceServerMutationClientFactory = (url, key, options) => {
    factoryCalls.push({ url, key, options });
    return {
      async rpc(name, args) {
        rpcCalls.push({ name, args });
        return { data: rpcRow(), error: null };
      },
    };
  };

  const repository = createSalesPhotoEvidenceServerMutationRepository(IDS.staffId, IDS.attemptId, {
    env: validEnv(),
    createMutationClient,
  });
  assert.ok(repository);

  const row = await repository.createEvidenceUploadingClaim({
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    capturedByStaffId: '99999999-9999-4999-8999-999999999999',
    status: 'uploading',
    saleCompletedAt: '2026-07-07T01:02:03.000Z',
    capturedAt: '2026-07-07T01:05:00.000Z',
  });

  assert.equal(row.status, 'uploading');
  assert.deepEqual(factoryCalls, [{
    url: 'https://project.supabase.co',
    key: SECRET_KEY,
    options: {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  }]);
  assert.deepEqual(rpcCalls, [{
    name: 'bff_claim_sale_photo_evidence_upload',
    args: {
      p_actor_id: IDS.staffId,
      p_owner_id: IDS.ownerId,
      p_market_id: IDS.marketId,
      p_sale_id: IDS.saleId,
      p_expected_evidence_id: null,
      p_attempt_id: IDS.attemptId,
      p_captured_at: '2026-07-07T01:05:00.000Z',
    },
  }]);
  assert.equal('p_actor_role' in rpcCalls[0].args, false);
  assert.equal('p_captured_by_staff_id' in rpcCalls[0].args, false);
  assert.equal('p_sale_completed_at' in rpcCalls[0].args, false);
});

runTest('finalize and failure mutations call only their allowlisted RPC contracts', async () => {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = createSalesPhotoEvidenceServerMutationRepository(IDS.ownerId, IDS.attemptId, {
    env: validEnv(),
    createMutationClient: () => ({
      async rpc(name, args) {
        rpcCalls.push({ name, args });
        const status = name === 'bff_finalize_sale_photo_evidence_upload'
          ? 'uploaded'
          : 'upload_failed';
        return { data: rpcRow(status), error: null };
      },
    }),
  });
  assert.ok(repository);

  await repository.finalizeEvidenceUploaded({
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    imageObjectKey: 'sales-evidence/7d/owner/market/sale/evidence.webp',
    thumbnailObjectKey: 'sales-evidence-thumbs/7d/owner/market/sale/evidence.webp',
    mimeType: 'image/webp',
    width: 1200,
    height: 900,
    fileSizeBytes: 1234,
    capturedAt: '2026-07-07T01:05:00.000Z',
    uploadedAt: '2026-07-07T02:00:00.000Z',
    expiresAt: '2026-07-14T02:00:00.000Z',
  });
  await repository.markEvidenceUploadFailed({
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    reason: 'metadata_finalize_failed',
  });

  assert.deepEqual(rpcCalls, [{
    name: 'bff_finalize_sale_photo_evidence_upload',
    args: {
      p_actor_id: IDS.ownerId,
      p_evidence_id: IDS.evidenceId,
      p_owner_id: IDS.ownerId,
      p_market_id: IDS.marketId,
      p_sale_id: IDS.saleId,
      p_attempt_id: IDS.attemptId,
      p_image_object_key: 'sales-evidence/7d/owner/market/sale/evidence.webp',
      p_thumbnail_object_key: 'sales-evidence-thumbs/7d/owner/market/sale/evidence.webp',
      p_mime_type: 'image/webp',
      p_width: 1200,
      p_height: 900,
      p_file_size_bytes: 1234,
      p_captured_at: '2026-07-07T01:05:00.000Z',
      p_uploaded_at: '2026-07-07T02:00:00.000Z',
      p_expires_at: '2026-07-14T02:00:00.000Z',
    },
  }, {
    name: 'bff_mark_sale_photo_evidence_upload_failed',
    args: {
      p_actor_id: IDS.ownerId,
      p_evidence_id: IDS.evidenceId,
      p_owner_id: IDS.ownerId,
      p_market_id: IDS.marketId,
      p_sale_id: IDS.saleId,
      p_attempt_id: IDS.attemptId,
      p_failure_reason: 'metadata_finalize_failed',
    },
  }]);
});

runTest('missing config and client creation failure fail closed without a caller-token fallback', () => {
  let createCalled = false;
  const missing = createSalesPhotoEvidenceServerMutationRepository(IDS.ownerId, IDS.attemptId, {
    env: validEnv({ SUPABASE_SECRET_KEY: undefined }),
    createMutationClient: () => {
      createCalled = true;
      throw new Error('must not run');
    },
  });
  assert.equal(missing, null);
  assert.equal(createCalled, false);

  const failed = createSalesPhotoEvidenceServerMutationRepository(IDS.ownerId, IDS.attemptId, {
    env: validEnv(),
    createMutationClient: () => {
      throw new Error(`${SECRET_KEY} must not escape`);
    },
  });
  assert.equal(failed, null);

  const invalidAttempts = ['', 'not-a-uuid', IDS.attemptId.toUpperCase().replace('4', '0')];
  for (const attemptId of invalidAttempts) {
    assert.equal(createSalesPhotoEvidenceServerMutationRepository(
      IDS.ownerId,
      attemptId,
      { env: validEnv(), createMutationClient: () => { throw new Error('must not run'); } }
    ), null);
  }
});

runTest('RPC failures and invalid rows expose only generic local errors', async () => {
  const canary = `${SECRET_KEY}-CANARY`;
  const failedRepository = createSalesPhotoEvidenceServerMutationRepository(IDS.ownerId, IDS.attemptId, {
    env: validEnv(),
    createMutationClient: () => ({
      async rpc() {
        return { data: null, error: { message: canary } };
      },
    }),
  });
  assert.ok(failedRepository);

  await assert.rejects(
    () => failedRepository.markEvidenceUploading({
      evidenceId: IDS.evidenceId,
      ownerId: IDS.ownerId,
      marketId: IDS.marketId,
      saleId: IDS.saleId,
      status: 'uploading',
      capturedAt: '2026-07-07T01:05:00.000Z',
    }),
    error => error instanceof Error
      && /server mutation failed/.test(error.message)
      && !error.message.includes(canary)
  );

  const invalidRowRepository = createSalesPhotoEvidenceServerMutationRepository(IDS.ownerId, IDS.attemptId, {
    env: validEnv(),
    createMutationClient: () => ({
      async rpc() {
        return { data: { ...rpcRow(), owner_id: IDS.staffId }, error: null };
      },
    }),
  });
  assert.ok(invalidRowRepository);
  await assert.rejects(
    () => invalidRowRepository.createEvidenceUploadingClaim({
      ownerId: IDS.ownerId,
      marketId: IDS.marketId,
      saleId: IDS.saleId,
      capturedByStaffId: null,
      status: 'uploading',
      saleCompletedAt: '2026-07-07T01:02:03.000Z',
      capturedAt: '2026-07-07T01:05:00.000Z',
    }),
    /out-of-scope row/
  );

  const wrongAttemptRepository = createSalesPhotoEvidenceServerMutationRepository(
    IDS.ownerId,
    IDS.attemptId,
    {
      env: validEnv(),
      createMutationClient: () => ({
        async rpc() {
          return {
            data: rpcRow('uploading', '77777777-7777-4777-8777-777777777777'),
            error: null,
          };
        },
      }),
    }
  );
  assert.ok(wrongAttemptRepository);
  await assert.rejects(
    () => wrongAttemptRepository.markEvidenceUploading({
      evidenceId: IDS.evidenceId,
      ownerId: IDS.ownerId,
      marketId: IDS.marketId,
      saleId: IDS.saleId,
      status: 'uploading',
      capturedAt: '2026-07-07T01:05:00.000Z',
    }),
    /invalid row/
  );

  const multipleRowsRepository = createSalesPhotoEvidenceServerMutationRepository(
    IDS.ownerId,
    IDS.attemptId,
    {
      env: validEnv(),
      createMutationClient: () => ({
        async rpc() {
          return { data: [rpcRow(), rpcRow()], error: null };
        },
      }),
    }
  );
  assert.ok(multipleRowsRepository);
  await assert.rejects(
    () => multipleRowsRepository.markEvidenceUploading({
      evidenceId: IDS.evidenceId,
      ownerId: IDS.ownerId,
      marketId: IDS.marketId,
      saleId: IDS.saleId,
      status: 'uploading',
      capturedAt: '2026-07-07T01:05:00.000Z',
    }),
    /invalid row/
  );
});

runTest('server mutation module and mobile verification are covered by the test manifest', () => {
  const source = readFileSync(join(
    projectRoot,
    'lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts'
  ), 'utf8');
  const manifest = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

  assert.match(source, /SUPABASE_SECRET_KEY/);
  assert.match(source, /import 'server-only'/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SECRET/);
  assert.match(source, /persistSession:\s*false/);
  assert.match(source, /autoRefreshToken:\s*false/);
  assert.match(source, /detectSessionInUrl:\s*false/);
  assert.doesNotMatch(source, /global:\s*\{[\s\S]*Authorization/);
  assert.match(manifest, /tsx tests\/app-api-server-mutation-client\.test\.ts/);
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
    throw new Error(`${failed} app API server mutation client tests failed`);
  }
}

main();
