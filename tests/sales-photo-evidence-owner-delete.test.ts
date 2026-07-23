import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSalesPhotoEvidenceDeleteRouteHandlers,
  isSalesPhotoEvidenceDeleteRouteEnabledForEnv,
} from '../app/api/sales-photo-evidence/delete/route';
import { deleteSalesPhotoEvidenceAsOwner } from '../lib/sales/photo-evidence-owner-delete-client';
import type { SalesPhotoEvidenceR2UploadAdapter } from '../lib/sales/photo-evidence-r2-upload-adapter';
import type {
  SalesPhotoEvidenceDeletePreparedRow,
  SalesPhotoEvidenceDeleteRepository,
} from '../lib/supabase/sales-photo-evidence-delete-repository.server';

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const ownerId = '11111111-1111-4111-8111-111111111111';
const evidenceId = '22222222-2222-4222-8222-222222222222';
const marketId = '33333333-3333-4333-8333-333333333333';
const saleId = '44444444-4444-4444-8444-444444444444';

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

function preparedRow(overrides: Partial<SalesPhotoEvidenceDeletePreparedRow> = {}): SalesPhotoEvidenceDeletePreparedRow {
  return {
    id: evidenceId,
    ownerId,
    marketId,
    saleId,
    status: 'uploaded',
    imageObjectKey: objectKey('image'),
    thumbnailObjectKey: objectKey('thumbnail'),
    deletedAt: null,
    ...overrides,
  };
}

function createAdapter(
  deleteObject: SalesPhotoEvidenceR2UploadAdapter['deleteObject']
): SalesPhotoEvidenceR2UploadAdapter {
  return {
    uploadObject: async input => ({
      ok: false,
      key: input.key,
      code: 'r2_upload_failed',
      message: 'upload is not used by delete tests',
    }),
    deleteObject,
  };
}

console.log('\n=== Sales photo evidence owner delete ===');

runTest('delete route enablement requires an explicit production gate', () => {
  assert.equal(isSalesPhotoEvidenceDeleteRouteEnabledForEnv({}), false);
  assert.equal(isSalesPhotoEvidenceDeleteRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ENABLED: '1',
    NODE_ENV: 'development',
  }), true);
  assert.equal(isSalesPhotoEvidenceDeleteRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'production',
  }), false);
  assert.equal(isSalesPhotoEvidenceDeleteRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ENABLED: '1',
    SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ALLOW_PRODUCTION: '1',
    VERCEL_ENV: 'production',
  }), true);
});

runTest('owner deletion removes both bound R2 objects before metadata finalize', async () => {
  const calls: string[] = [];
  const row = preparedRow();
  const repository: SalesPhotoEvidenceDeleteRepository = {
    prepareDeletion: async id => {
      calls.push(`prepare:${id}`);
      return row;
    },
    finalizeDeletion: async value => {
      calls.push(`finalize:${value.id}`);
    },
  };
  const handlers = createSalesPhotoEvidenceDeleteRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => {
      calls.push('auth');
      return { actorId: ownerId };
    },
    createDeleteRepository: async () => repository,
    createR2DeleteAdapter: async () => createAdapter(async input => {
      calls.push(`r2:${input.key}`);
      return { ok: true, key: input.key };
    }),
  });

  const response = await handlers.DELETE(new Request(
    `http://localhost/api/sales-photo-evidence/delete?evidenceId=${evidenceId}`,
    { method: 'DELETE' }
  ));
  const body = await response.json() as { ok: boolean; evidenceId: string };

  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, evidenceId });
  assert.deepEqual(calls, [
    'auth',
    `prepare:${evidenceId}`,
    `r2:${objectKey('thumbnail')}`,
    `r2:${objectKey('image')}`,
    `finalize:${evidenceId}`,
  ]);
});

runTest('non-owner and invalid object bindings fail before R2 deletion', async () => {
  let r2Calls = 0;
  const adapter = createAdapter(async input => {
    r2Calls += 1;
    return { ok: true, key: input.key };
  });
  const nonOwner = createSalesPhotoEvidenceDeleteRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: '99999999-9999-4999-8999-999999999999' }),
    createDeleteRepository: async () => ({
      prepareDeletion: async () => preparedRow(),
      finalizeDeletion: async () => undefined,
    }),
    createR2DeleteAdapter: async () => adapter,
  });
  const invalidBinding = createSalesPhotoEvidenceDeleteRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: ownerId }),
    createDeleteRepository: async () => ({
      prepareDeletion: async () => preparedRow({ imageObjectKey: 'sales-evidence/7d/another/tenant.webp' }),
      finalizeDeletion: async () => undefined,
    }),
    createR2DeleteAdapter: async () => adapter,
  });
  const request = new Request(
    `http://localhost/api/sales-photo-evidence/delete?evidenceId=${evidenceId}`,
    { method: 'DELETE' }
  );

  assert.equal((await nonOwner.DELETE(request)).status, 403);
  assert.equal((await invalidBinding.DELETE(request)).status, 409);
  assert.equal(r2Calls, 0);
});

runTest('storage failure prevents metadata finalize and reports incomplete cleanup', async () => {
  let finalized = false;
  const handlers = createSalesPhotoEvidenceDeleteRouteHandlers({
    isEnabled: () => true,
    resolveActor: async () => ({ actorId: ownerId }),
    createDeleteRepository: async () => ({
      prepareDeletion: async () => preparedRow(),
      finalizeDeletion: async () => {
        finalized = true;
      },
    }),
    createR2DeleteAdapter: async () => createAdapter(async input => ({
      ok: false,
      key: input.key,
      code: 'r2_delete_failed',
      message: 'private storage detail',
    })),
  });

  const response = await handlers.DELETE(new Request(
    `http://localhost/api/sales-photo-evidence/delete?evidenceId=${evidenceId}`,
    { method: 'DELETE' }
  ));
  const text = await response.text();

  assert.equal(response.status, 502);
  assert.equal(finalized, false);
  assert.match(text, /"cleanupIncomplete":true/);
  assert.doesNotMatch(text, /private storage detail/);
});

runTest('portable client sends one authenticated DELETE request', async () => {
  const previousBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test';
  const requests: Array<{ url: string; method?: string; authorization?: string | null }> = [];
  try {
    const result = await deleteSalesPhotoEvidenceAsOwner(evidenceId, {
      getAccessToken: async () => 'access-token',
      fetchImpl: async (input, init) => {
        requests.push({
          url: String(input),
          method: init?.method,
          authorization: new Headers(init?.headers).get('authorization'),
        });
        return Response.json({ ok: true, evidenceId });
      },
    });

    assert.deepEqual(result, { ok: true, evidenceId });
    assert.deepEqual(requests, [{
      url: `https://api.example.test/api/sales-photo-evidence/delete?evidenceId=${evidenceId}`,
      method: 'DELETE',
      authorization: 'Bearer access-token',
    }]);
  } finally {
    if (previousBaseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousBaseUrl;
  }
});

runTest('owner UI confirms deletion and updates the shared album state', () => {
  const shell = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx');
  const detail = readProjectFile('components/markets/MarketDetailScreen.tsx');
  const client = readProjectFile('lib/sales/photo-evidence-owner-delete-client.ts');
  const route = readProjectFile('app/api/sales-photo-evidence/delete/route.ts');

  assert.match(shell, /Trash2/);
  assert.match(shell, /ConfirmDialog/);
  assert.match(shell, /onDelete\?: \(evidenceId: string\)/);
  assert.match(detail, /setOwnerSalesPhotoEvidenceRows\(rows => rows\.filter\(row => row\.id !== evidenceId\)\)/);
  assert.match(detail, /onDelete=\{handleDeleteOwnerSalesPhotoEvidence\}/);
  assert.match(detail, /<MarketOverviewPhotoStory[\s\S]*rows=\{ownerSalesPhotoEvidenceRows\}/);
  assert.doesNotMatch(client, /@aws-sdk|SUPABASE_SECRET_KEY|bff_prepare_sale_photo_evidence_delete/);
  assert.match(route, /photo-evidence-r2-upload-adapter\.server/);
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
  if (failed > 0) throw new Error(`${failed} sales photo evidence owner delete tests failed`);
}

void main();
