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
        market_id: '33333333-3333-4333-8333-333333333333',
        sale_id: '44444444-4444-4444-8444-444444444444',
        captured_by_staff_id: '55555555-5555-4555-8555-555555555555',
        status: 'uploaded',
        r2_object_key: 'sales-evidence/7d/a/b/c/d.webp',
        r2_thumbnail_key: 'sales-evidence-thumbs/7d/a/b/c/d.webp',
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
  assert.deepEqual(calls, ['auth', `row:${evidenceId}`, 'r2:sales-evidence-thumbs/7d/a/b/c/d.webp']);
});

runTest('route rejects non-owner actors before R2 read', async () => {
  let r2Read = false;
  const handlers = createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: '99999999-9999-4999-8999-999999999999' }),
    getEvidenceRow: async () => ({
      id: evidenceId,
      owner_id: ownerId,
      market_id: '33333333-3333-4333-8333-333333333333',
      sale_id: '44444444-4444-4444-8444-444444444444',
      captured_by_staff_id: null,
      status: 'uploaded',
      r2_object_key: 'sales-evidence/7d/a/b/c/d.webp',
      r2_thumbnail_key: 'sales-evidence-thumbs/7d/a/b/c/d.webp',
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
  assert.doesNotMatch(imageClientSource, /@aws-sdk|R2_BUCKET|service_role|r2_object_key|r2_thumbnail_key/i);
});

runTest('owner album shell renders the image component but does not fetch directly', () => {
  assert.match(shellSource, /SalesPhotoEvidenceOwnerAlbumImage/);
  assert.match(shellSource, /canLoad=\{item\.displayStatus === 'uploaded_private' && item\.hasPrivateThumbnailObject\}/);
  assert.match(imageComponentSource, /fetchSalesPhotoEvidenceOwnerImageObjectUrl/);
  assert.match(imageComponentSource, /URL\.revokeObjectURL/);
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
