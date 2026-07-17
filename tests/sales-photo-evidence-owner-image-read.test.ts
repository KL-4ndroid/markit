import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSalesPhotoEvidenceImageRouteHandlers,
  isSalesPhotoEvidenceImageReadRouteEnabledForEnv,
} from '../app/api/sales-photo-evidence/image/route';
import {
  fetchSalesPhotoEvidenceOwnerImageObjectUrl,
} from '../lib/sales/photo-evidence-owner-image-client';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const routeSource = readProjectFile('app/api/sales-photo-evidence/image/route.ts');
const imageClientSource = readProjectFile('lib/sales/photo-evidence-owner-image-client.ts');
const imageComponentSource = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx');
const shellSource = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx');
const testManifestSource = readProjectFile('scripts/test-files.txt');

const ownerId = '11111111-1111-4111-8111-111111111111';
const evidenceId = '22222222-2222-4222-8222-222222222222';
const marketId = '33333333-3333-4333-8333-333333333333';
const saleId = '44444444-4444-4444-8444-444444444444';

function objectKey(variant: 'image' | 'thumbnail'): string {
  const root = variant === 'thumbnail' ? 'sales-evidence-thumbs' : 'sales-evidence';
  return `${root}/7d/${ownerId}/${marketId}/${saleId}/${evidenceId}.webp`;
}

console.log('\n=== Sales photo evidence owner image read ===');

runTest('image read route enablement uses separate local/staging and production guard', () => {
  assert.equal(isSalesPhotoEvidenceImageReadRouteEnabledForEnv({}), false);
  assert.equal(isSalesPhotoEvidenceImageReadRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED: '1',
    NODE_ENV: 'development',
  }), true);
  assert.equal(isSalesPhotoEvidenceImageReadRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'production',
  }), false);
  assert.equal(isSalesPhotoEvidenceImageReadRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED: '1',
    SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION: '1',
    VERCEL_ENV: 'production',
  }), true);
});

runTest('route returns private image bytes only after auth metadata and R2 adapter checks', async () => {
  const calls: string[] = [];
  const handlers = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => {
      calls.push('auth');
      return { actorId: ownerId };
    },
    getEvidenceRow: async input => {
      calls.push(`row:${input.evidenceId}`);
      return {
        id: evidenceId,
        owner_id: ownerId,
        market_id: marketId,
        sale_id: saleId,
        captured_by_staff_id: '55555555-5555-4555-8555-555555555555',
        status: 'uploaded',
        r2_object_key: objectKey('image'),
        r2_thumbnail_key: objectKey('thumbnail'),
        deleted_at: null,
      };
    },
    createR2ReadAdapter: async () => ({
      async readObject(input) {
        calls.push(`r2:${input.key}`);
        return {
          ok: true,
          body: new Uint8Array([1, 2, 3]),
          contentType: 'image/webp',
        };
      },
    }),
  });

  const response = await handlers.GET(new Request(`http://localhost/api/sales-photo-evidence/image?evidenceId=${evidenceId}&variant=thumbnail`));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
  assert.deepEqual(calls, ['auth', `row:${evidenceId}`, `r2:${objectKey('thumbnail')}`]);
});

runTest('route rejects non-owner actors before R2 read', async () => {
  let r2Read = false;
  const handlers = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: '99999999-9999-4999-8999-999999999999' }),
    getEvidenceRow: async () => ({
      id: evidenceId,
      owner_id: ownerId,
      market_id: marketId,
      sale_id: saleId,
      captured_by_staff_id: null,
      status: 'uploaded',
      r2_object_key: objectKey('image'),
      r2_thumbnail_key: objectKey('thumbnail'),
      deleted_at: null,
    }),
    createR2ReadAdapter: async () => ({
      async readObject() {
        r2Read = true;
        return { ok: false, code: 'r2_read_failed', message: 'must not read' };
      },
    }),
  });

  const response = await handlers.GET(new Request(`http://localhost/api/sales-photo-evidence/image?evidenceId=${evidenceId}`));

  assert.equal(response.status, 403);
  assert.equal(r2Read, false);
});

runTest('image auth and metadata dependency outages return retryable server errors', async () => {
  const authUnavailable = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => 'unavailable',
    getEvidenceRow: async () => {
      throw new Error('must not query');
    },
    createR2ReadAdapter: async () => null,
  });
  const request = new Request(
    `http://localhost/api/sales-photo-evidence/image?evidenceId=${evidenceId}`
  );
  const authResponse = await authUnavailable.GET(request);
  const authBody = await authResponse.json() as { code: string; retryable: boolean };
  assert.equal(authResponse.status, 503);
  assert.equal(authBody.code, 'authentication_unavailable');
  assert.equal(authBody.retryable, true);

  const lookupUnavailable = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: ownerId }),
    getEvidenceRow: async () => {
      throw new Error('database endpoint detail');
    },
    createR2ReadAdapter: async () => null,
  });
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const lookupResponse = await lookupUnavailable.GET(request);
    const lookupText = await lookupResponse.text();
    assert.equal(lookupResponse.status, 503);
    assert.match(lookupText, /image_route_unavailable/);
    assert.doesNotMatch(lookupText, /database endpoint detail/);
    assert.match(lookupText, /"retryable":true/);
  } finally {
    console.error = originalConsoleError;
  }
});

runTest('route rejects a stored object key that is not bound to the evidence row', async () => {
  let r2Read = false;
  const handlers = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: ownerId }),
    getEvidenceRow: async () => ({
      id: evidenceId,
      owner_id: ownerId,
      market_id: marketId,
      sale_id: saleId,
      captured_by_staff_id: null,
      status: 'uploaded',
      r2_object_key: 'sales-evidence/7d/another/tenant/object.webp',
      r2_thumbnail_key: 'sales-evidence-thumbs/7d/another/tenant/object.webp',
      deleted_at: null,
    }),
    createR2ReadAdapter: async () => ({
      async readObject() {
        r2Read = true;
        return { ok: false, code: 'r2_read_failed', message: 'must not read' };
      },
    }),
  });

  const response = await handlers.GET(new Request(
    `http://localhost/api/sales-photo-evidence/image?evidenceId=${evidenceId}`
  ));
  const body = await response.json() as { code: string };
  assert.equal(response.status, 404);
  assert.equal(body.code, 'invalid_object_binding');
  assert.equal(r2Read, false);
});

runTest('route rejects invalid R2 content and never returns adapter error details', async () => {
  const row = {
    id: evidenceId,
    owner_id: ownerId,
    market_id: marketId,
    sale_id: saleId,
    captured_by_staff_id: null,
    status: 'uploaded',
    r2_object_key: objectKey('image'),
    r2_thumbnail_key: objectKey('thumbnail'),
    deleted_at: null,
  };
  const request = new Request(
    `http://localhost/api/sales-photo-evidence/image?evidenceId=${evidenceId}`
  );

  const invalidContentHandlers = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: ownerId }),
    getEvidenceRow: async () => row,
    createR2ReadAdapter: async () => ({
      async readObject() {
        return {
          ok: true,
          body: new Uint8Array([1]),
          contentType: 'text/plain',
        };
      },
    }),
  });
  const invalidContent = await invalidContentHandlers.GET(request);
  const invalidBody = await invalidContent.json() as { code: string };
  assert.equal(invalidContent.status, 502);
  assert.equal(invalidBody.code, 'invalid_image_object');

  const storageFailureHandlers = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: ownerId }),
    getEvidenceRow: async () => row,
    createR2ReadAdapter: async () => ({
      async readObject() {
        return {
          ok: false,
          code: 'r2_read_failed',
          message: 'secret endpoint and credential detail',
        };
      },
    }),
  });
  const storageFailure = await storageFailureHandlers.GET(request);
  const storageText = await storageFailure.text();
  assert.equal(storageFailure.status, 502);
  assert.doesNotMatch(storageText, /secret endpoint|credential detail/i);
  assert.match(storageText, /Sales photo evidence image storage read failed/);
});

runTest('owner image client uses bearer fetch and object URL without exposing R2 keys', async () => {
  const calls: string[] = [];
  const result = await fetchSalesPhotoEvidenceOwnerImageObjectUrl({
    evidenceId,
    variant: 'thumbnail',
  }, {
    getAccessToken: async () => 'token',
    fetchImpl: async (url, init) => {
      calls.push(`${url}:${(init?.headers as Record<string, string>).Authorization}`);
      return new Response(new Blob([new Uint8Array([1])], { type: 'image/webp' }), { status: 200 });
    },
    createObjectUrl: blob => {
      calls.push(`blob:${blob.type}:${blob.size}`);
      return 'blob:photo';
    },
  });

  assert.deepEqual(result, { ok: true, objectUrl: 'blob:photo' });
  assert.deepEqual(calls, [
    `/api/sales-photo-evidence/image?evidenceId=${evidenceId}&variant=thumbnail:Bearer token`,
    'blob:image/webp:1',
  ]);
  assert.match(imageClientSource, /buildAppApiUrl/);
  assert.match(imageClientSource, /isAppApiUrlError/);
  assert.doesNotMatch(imageClientSource, /@aws-sdk|R2_BUCKET|service_role|r2_object_key|r2_thumbnail_key/i);
});

runTest('owner image client reports invalid remote API configuration without making a request', async () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  let fetchCalled = false;

  process.env.NEXT_PUBLIC_API_BASE_URL = '/relative-api';
  try {
    const result = await fetchSalesPhotoEvidenceOwnerImageObjectUrl({ evidenceId }, {
      getAccessToken: async () => 'token',
      fetchImpl: async () => {
        fetchCalled = true;
        return new Response(null, { status: 500 });
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'api_base_url_invalid');
    assert.equal(fetchCalled, false);
  } finally {
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  }
});

runTest('owner image client returns a stable network error when fetch rejects', async () => {
  let attempts = 0;
  const result = await fetchSalesPhotoEvidenceOwnerImageObjectUrl({ evidenceId }, {
    getAccessToken: async () => 'token',
    fetchImpl: async () => {
      attempts += 1;
      throw new Error('offline');
    },
    sleepImpl: async () => undefined,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'network_error');
  assert.equal(attempts, 2);
});

runTest('owner image client retries 503 once but never retries 403', async () => {
  let transientAttempts = 0;
  const recovered = await fetchSalesPhotoEvidenceOwnerImageObjectUrl({ evidenceId }, {
    getAccessToken: async () => 'token',
    fetchImpl: async () => {
      transientAttempts += 1;
      return transientAttempts === 1
        ? new Response(JSON.stringify({ ok: false, code: 'temporary_failure' }), { status: 503 })
        : new Response(new Blob([new Uint8Array([1])], { type: 'image/webp' }), { status: 200 });
    },
    sleepImpl: async () => undefined,
    createObjectUrl: () => 'blob:recovered',
  });
  assert.equal(recovered.ok, true);
  assert.equal(transientAttempts, 2);

  let deniedAttempts = 0;
  const denied = await fetchSalesPhotoEvidenceOwnerImageObjectUrl({ evidenceId }, {
    getAccessToken: async () => 'token',
    fetchImpl: async () => {
      deniedAttempts += 1;
      return new Response(JSON.stringify({
        ok: false,
        code: 'unauthorized_actor',
        retryable: false,
      }), { status: 403 });
    },
    sleepImpl: async () => undefined,
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, 'unauthorized_actor');
  assert.equal(deniedAttempts, 1);
});

runTest('mobile image read uses the explicit HTTPS Vercel API origin', async () => {
  const previousBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const previousTarget = process.env.NEXT_PUBLIC_APP_BUILD_TARGET;
  let requestedUrl = '';
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://app.example.test';
  process.env.NEXT_PUBLIC_APP_BUILD_TARGET = 'mobile';
  try {
    const result = await fetchSalesPhotoEvidenceOwnerImageObjectUrl({ evidenceId }, {
      getAccessToken: async () => 'token',
      fetchImpl: async input => {
        requestedUrl = String(input);
        return new Response(new Blob([new Uint8Array([1])], { type: 'image/webp' }), { status: 200 });
      },
      createObjectUrl: () => 'blob:mobile',
    });
    assert.equal(result.ok, true);
    assert.equal(
      requestedUrl,
      `https://app.example.test/api/sales-photo-evidence/image?evidenceId=${evidenceId}&variant=thumbnail`
    );
  } finally {
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousBase;
    if (previousTarget === undefined) delete process.env.NEXT_PUBLIC_APP_BUILD_TARGET;
    else process.env.NEXT_PUBLIC_APP_BUILD_TARGET = previousTarget;
  }
});

runTest('owner album shell renders the image component but does not fetch directly', () => {
  assert.match(shellSource, /SalesPhotoEvidenceOwnerAlbumImage/);
  assert.match(shellSource, /canLoad=\{item\.displayStatus === 'uploaded_private' && \(item\.hasPrivateThumbnailObject \|\| item\.hasPrivateImageObject\)\}/);
  assert.match(imageComponentSource, /fetchSalesPhotoEvidenceOwnerImageObjectUrl/);
  assert.match(imageComponentSource, /URL\.revokeObjectURL/);
  assert.match(imageComponentSource, /variant: SalesPhotoEvidenceOwnerImageVariant/);
  assert.match(imageComponentSource, /aria-label="放大查看成交照片"/);
  assert.doesNotMatch(shellSource, /fetchSalesPhotoEvidenceOwnerImageObjectUrl|fetch\(|supabase|@aws-sdk|R2_BUCKET|service_role/i);
});

runTest('route keeps SDK confined to server read adapter and manifest includes the test', () => {
  assert.match(routeSource, /createSalesPhotoEvidenceSignedReadContract/);
  assert.match(routeSource, /createCloudflareR2SalesPhotoEvidenceReadAdapter/);
  assert.doesNotMatch(routeSource, /GetObjectCommand|PutObjectCommand|S3Client|getSignedUrl|createPresignedPost/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-owner-image-read\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence owner image read tests failed`);
  }
}

main();
