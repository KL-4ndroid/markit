import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSalesPhotoEvidenceExpirationRouteHandlers,
  isSalesPhotoEvidenceExpirationCronAuthorized,
  isSalesPhotoEvidenceExpirationRouteEnabledForEnv,
} from '../app/api/cron/sales-photo-evidence-expiration/route';
import type { SalesPhotoEvidenceR2UploadAdapter } from '../lib/sales/photo-evidence-r2-upload-adapter';
import type {
  SalesPhotoEvidenceExpirationCandidate,
  SalesPhotoEvidenceExpirationRepository,
} from '../lib/supabase/sales-photo-evidence-expiration-repository.server';

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const ownerId = '11111111-1111-4111-8111-111111111111';
const evidenceId = '22222222-2222-4222-8222-222222222222';
const marketId = '33333333-3333-4333-8333-333333333333';
const saleId = '44444444-4444-4444-8444-444444444444';
const cronSecret = 'cron-secret-that-is-at-least-thirty-two-characters';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function objectKey(variant: 'image' | 'thumbnail'): string {
  const root = variant === 'thumbnail' ? 'sales-evidence-thumbs' : 'sales-evidence';
  return `${root}/7d/${ownerId}/${marketId}/${saleId}/${evidenceId}.webp`;
}

function candidate(overrides: Partial<SalesPhotoEvidenceExpirationCandidate> = {}): SalesPhotoEvidenceExpirationCandidate {
  return {
    id: evidenceId,
    ownerId,
    marketId,
    saleId,
    imageObjectKey: objectKey('image'),
    thumbnailObjectKey: objectKey('thumbnail'),
    expiresAt: '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

function adapter(
  deleteObject: SalesPhotoEvidenceR2UploadAdapter['deleteObject']
): SalesPhotoEvidenceR2UploadAdapter {
  return {
    uploadObject: async input => ({
      ok: false,
      key: input.key,
      code: 'r2_upload_failed',
      message: 'upload is not used by expiration tests',
    }),
    deleteObject,
  };
}

console.log('\n=== Sales photo evidence expiration ===');

runTest('expiration route requires explicit production enablement and cron authentication', () => {
  assert.equal(isSalesPhotoEvidenceExpirationRouteEnabledForEnv({}), false);
  assert.equal(isSalesPhotoEvidenceExpirationRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ENABLED: '1',
    NODE_ENV: 'development',
  }), true);
  assert.equal(isSalesPhotoEvidenceExpirationRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'production',
  }), false);
  assert.equal(isSalesPhotoEvidenceExpirationRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ENABLED: '1',
    SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ALLOW_PRODUCTION: '1',
    VERCEL_ENV: 'production',
  }), true);

  const authorizedRequest = new Request('https://app.example.test/api/cron/expiration', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  assert.equal(isSalesPhotoEvidenceExpirationCronAuthorized(authorizedRequest, {
    CRON_SECRET: cronSecret,
  }), true);
  assert.equal(isSalesPhotoEvidenceExpirationCronAuthorized(authorizedRequest, {
    CRON_SECRET: `${cronSecret}-wrong`,
  }), false);
});

runTest('cleanup deletes thumbnail and image before expiration metadata finalize', async () => {
  const calls: string[] = [];
  const item = candidate();
  const repository: SalesPhotoEvidenceExpirationRepository = {
    listExpired: async limit => {
      calls.push(`list:${limit}`);
      return [item];
    },
    finalizeExpiration: async value => {
      calls.push(`finalize:${value.id}`);
    },
  };
  const handlers = createSalesPhotoEvidenceExpirationRouteHandlers({
    isEnabled: () => true,
    isAuthorized: () => true,
    createRepository: async () => repository,
    createR2DeleteAdapter: async () => adapter(async input => {
      calls.push(`r2:${input.key}`);
      return { ok: true, key: input.key };
    }),
  });

  const response = await handlers.GET(new Request('https://app.example.test/api/cron/expiration'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, scannedCount: 1, expiredCount: 1 });
  assert.deepEqual(calls, [
    'list:25',
    `r2:${objectKey('thumbnail')}`,
    `r2:${objectKey('image')}`,
    `finalize:${evidenceId}`,
  ]);
});

runTest('cleanup remains retryable when an R2 deletion fails', async () => {
  let finalized = false;
  const handlers = createSalesPhotoEvidenceExpirationRouteHandlers({
    isEnabled: () => true,
    isAuthorized: () => true,
    createRepository: async () => ({
      listExpired: async () => [candidate()],
      finalizeExpiration: async () => {
        finalized = true;
      },
    }),
    createR2DeleteAdapter: async () => adapter(async input => ({
      ok: false,
      key: input.key,
      code: 'r2_delete_failed',
      message: 'private storage error',
    })),
  });

  const response = await handlers.GET(new Request('https://app.example.test/api/cron/expiration'));
  const body = await response.text();
  assert.equal(response.status, 503);
  assert.equal(finalized, false);
  assert.match(body, /expiration_cleanup_incomplete/);
  assert.match(body, /"cleanupIncomplete":true/);
  assert.doesNotMatch(body, /private storage error/);
});

runTest('migration and UI preserve history while removing expired object access', () => {
  const migration = readProjectFile('supabase/migrations/061_add_sales_photo_evidence_expiration_rpcs.sql');
  const repository = readProjectFile('lib/supabase/sales-photo-evidence-expiration-repository.server.ts');
  const imageRoute = readProjectFile('app/api/sales-photo-evidence/image/route.ts');
  const album = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx');
  const dealDetail = readProjectFile('components/markets/DealDetailModal.tsx');
  const vercel = readProjectFile('vercel.json');

  assert.match(migration, /status = 'expired'/);
  assert.match(migration, /r2_object_key = NULL/);
  assert.match(migration, /r2_thumbnail_key = NULL/);
  assert.doesNotMatch(migration, /DELETE FROM public\.sale_photo_evidence/);
  assert.match(repository, /import 'server-only'/);
  assert.match(repository, /bff_list_expired_sale_photo_evidence/);
  assert.match(repository, /bff_finalize_sale_photo_evidence_expiration/);
  assert.match(repository, /SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(repository, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
  assert.match(imageRoute, /code: 'evidence_expired'/);
  assert.match(imageRoute, /expires_at/);
  assert.match(album, /雲端清理排程中/);
  assert.match(album, /24 小時內到期/);
  assert.match(dealDetail, /成交紀錄與營收統計仍會保留/);
  assert.match(vercel, /sales-photo-evidence-expiration/);
  assert.match(vercel, /0 3 \* \* \*/);
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
  if (failed > 0) throw new Error(`${failed} sales photo evidence expiration tests failed`);
}

void main();
