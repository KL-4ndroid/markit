import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
  createSalesPhotoEvidenceUploadRouteHandlers,
  isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv,
  isSalesPhotoEvidenceR2UploadRouteEnabledForEnv,
} from '../app/api/sales-photo-evidence/upload/route';
import type { SalesPhotoEvidenceMetadataClaimSupabaseClient } from '../lib/supabase/sales-photo-evidence-metadata-claim-repository';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const IDS = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  staffId: '22222222-2222-4222-8222-222222222222',
  marketId: '33333333-3333-4333-8333-333333333333',
  saleId: '44444444-4444-4444-8444-444444444444',
  evidenceId: '55555555-5555-4555-8555-555555555555',
};

type QueryCall = {
  table: string;
  operation: 'select' | 'insert' | 'update';
  columns?: string;
  values?: Record<string, unknown>;
  filters: Array<{ column: string; value: string | null; operator: 'eq' | 'is' }>;
  terminal?: 'maybeSingle' | 'single';
};

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const routeSource = readProjectFile('app/api/sales-photo-evidence/upload/route.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

async function assertDisabledResponse(methodName: string, handler: (request?: Request) => Promise<Response>): Promise<void> {
  const response = await handler(new Request('https://example.test/api/sales-photo-evidence/upload', { method: methodName }));
  const body = await response.json() as {
    ok: boolean;
    code: string;
    message: string;
  };

  assert.equal(response.status, 501, methodName);
  assert.equal(response.headers.get('cache-control'), 'no-store', methodName);
  assert.deepEqual(body, {
    ok: false,
    code: 'sales_photo_evidence_upload_disabled',
    message: 'Sales photo evidence upload is not enabled yet.',
  });
}

function createFakeClient(
  responses: Record<string, { data: unknown | null; error: unknown | null }>
): SalesPhotoEvidenceMetadataClaimSupabaseClient & { calls: QueryCall[] } {
  const calls: QueryCall[] = [];

  return {
    calls,
    from(table) {
      return {
        select(columns: string) {
          const call: QueryCall = { table, operation: 'select', columns, filters: [] };
          calls.push(call);
          return buildQuery(call);
        },
        insert(values: Record<string, unknown>) {
          const call: QueryCall = { table, operation: 'insert', values, filters: [] };
          calls.push(call);
          return buildQuery(call);
        },
        update(values: Record<string, unknown>) {
          const call: QueryCall = { table, operation: 'update', values, filters: [] };
          calls.push(call);
          return buildQuery(call);
        },
      };
    },
  };

  function buildQuery(call: QueryCall) {
    return {
      eq(column: string, value: string) {
        call.filters.push({ column, value, operator: 'eq' });
        return this;
      },
      is(column: string, value: null) {
        call.filters.push({ column, value, operator: 'is' });
        return this;
      },
      select(columns: string) {
        call.columns = columns;
        return this;
      },
      async maybeSingle() {
        call.terminal = 'maybeSingle';
        return responses[call.table] ?? { data: null, error: null };
      },
      async single() {
        call.terminal = 'single';
        return responses[`${call.table}:${call.operation}`] ?? responses[call.table] ?? { data: null, error: null };
      },
    };
  }
}

function evidenceRow(status = 'uploading') {
  return {
    id: IDS.evidenceId,
    owner_id: IDS.ownerId,
    market_id: IDS.marketId,
    sale_id: IDS.saleId,
    captured_by_staff_id: IDS.staffId,
    status,
    deleted_at: null,
  };
}

function validRequestBody() {
  return {
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleEventId: IDS.saleId,
    capturedByStaffId: IDS.staffId,
    capturedAt: '2026-07-07T01:05:00.000Z',
    saleCompletedAt: '2026-07-07T01:02:03.000Z',
    hasLocalPayload: true,
  };
}

function createJsonRequest(body: unknown): Request {
  return new Request('https://example.test/api/sales-photo-evidence/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createBlob(size: number, type: 'image/webp' | 'image/jpeg'): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

function createUploadFormDataRequest(): Request {
  const image = createBlob(4, 'image/webp');
  const thumbnail = createBlob(2, 'image/webp');
  const formData = new FormData();

  formData.set('ownerId', IDS.ownerId);
  formData.set('marketId', IDS.marketId);
  formData.set('saleEventId', IDS.saleId);
  formData.set('capturedByStaffId', IDS.staffId);
  formData.set('capturedAt', '2026-07-07T01:05:00.000Z');
  formData.set('saleCompletedAt', '2026-07-07T01:02:03.000Z');
  formData.set('queueId', 'queue-1');
  formData.set('image', image);
  formData.set('thumbnail', thumbnail);
  formData.set('imageMetadata', JSON.stringify({
    kind: 'image',
    mimeType: image.type,
    fileSizeBytes: image.size,
    width: 1200,
    height: 900,
  }));
  formData.set('thumbnailMetadata', JSON.stringify({
    kind: 'thumbnail',
    mimeType: thumbnail.type,
    fileSizeBytes: thumbnail.size,
    width: 320,
    height: 240,
  }));

  return new Request('https://example.test/api/sales-photo-evidence/upload', {
    method: 'POST',
    body: formData,
  });
}

console.log('\n=== Sales photo evidence upload route metadata claim wiring ===');

runTest('default route methods remain disabled by default', async () => {
  await assertDisabledResponse('GET', GET);
  await assertDisabledResponse('POST', POST);
  await assertDisabledResponse('PUT', PUT);
  await assertDisabledResponse('PATCH', PATCH);
  await assertDisabledResponse('DELETE', DELETE);
});

runTest('disabled POST does not parse request body or create repository', async () => {
  let jsonCalled = false;
  let repositoryCalled = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => false,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      repositoryCalled = true;
      return createFakeClient({});
    },
  });
  const request = {
    headers: new Headers(),
    async json() {
      jsonCalled = true;
      throw new Error('json should not be called while disabled');
    },
  } as unknown as Request;

  const response = await handlers.POST(request);

  assert.equal(response.status, 501);
  assert.equal(jsonCalled, false);
  assert.equal(repositoryCalled, false);
});

runTest('metadata claim route enablement allows local and staging but blocks production by default', () => {
  assert.equal(isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv({}), false);
  assert.equal(isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED: '1',
    NODE_ENV: 'development',
  }), true);
  assert.equal(isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'preview',
  }), true);
  assert.equal(isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED: '1',
    APP_ENV: 'staging',
  }), true);
  assert.equal(isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'production',
  }), false);
  assert.equal(isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'production',
    SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION: '1',
  }), true);
});

runTest('R2 upload route enablement uses a separate local staging and production guard', () => {
  assert.equal(isSalesPhotoEvidenceR2UploadRouteEnabledForEnv({}), false);
  assert.equal(isSalesPhotoEvidenceR2UploadRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED: '1',
    NODE_ENV: 'development',
  }), true);
  assert.equal(isSalesPhotoEvidenceR2UploadRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED: '1',
    APP_ENV: 'staging',
  }), true);
  assert.equal(isSalesPhotoEvidenceR2UploadRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'production',
  }), false);
  assert.equal(isSalesPhotoEvidenceR2UploadRouteEnabledForEnv({
    SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED: '1',
    VERCEL_ENV: 'production',
    SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION: '1',
  }), true);
});

runTest('enabled POST requires authenticated actor before parsing metadata claim body', async () => {
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    async resolveActor() {
      return null;
    },
    createRepository() {
      throw new Error('repository should not be created without auth');
    },
  });

  const response = await handlers.POST(createJsonRequest(validRequestBody()));
  const body = await response.json() as { code: string };

  assert.equal(response.status, 401);
  assert.equal(body.code, 'authentication_required');
});

runTest('unexpected route failures return structured JSON and retain the local payload', async () => {
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    async resolveActor() {
      throw new Error('temporary auth dependency failure');
    },
    createRepository() {
      return createFakeClient({});
    },
  });

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const response = await handlers.POST(createJsonRequest(validRequestBody()));
    const body = await response.json() as { code: string; shouldKeepLocalPayload: boolean };

    assert.equal(response.status, 500);
    assert.equal(body.code, 'upload_route_unexpected_error');
    assert.equal(body.shouldKeepLocalPayload, true);
  } finally {
    console.error = originalConsoleError;
  }
});

runTest('enabled POST creates an uploading metadata claim through injected repository only', async () => {
  const fakeClient = createFakeClient({
    events: {
      data: {
        id: IDS.saleId,
        type: 'deal_closed',
        market_id: IDS.marketId,
        timestamp: '2026-07-07T01:02:03.000Z',
        markets: { owner_id: IDS.ownerId },
      },
      error: null,
    },
    sale_photo_evidence: { data: null, error: null },
    'sale_photo_evidence:insert': { data: evidenceRow(), error: null },
  });
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      return fakeClient;
    },
  });

  const response = await handlers.POST(createJsonRequest(validRequestBody()));
  const body = await response.json() as {
    ok: boolean;
    action: string;
    nextAction: string;
    shouldKeepLocalPayloadUntilServerSuccess: boolean;
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.action, 'metadata_claim_created');
  assert.equal(body.nextAction, 'r2_upload_not_implemented');
  assert.equal(body.shouldKeepLocalPayloadUntilServerSuccess, true);

  const insertCall = fakeClient.calls.find(call => call.operation === 'insert');
  assert.deepEqual(insertCall?.values, {
    owner_id: IDS.ownerId,
    market_id: IDS.marketId,
    sale_id: IDS.saleId,
    captured_by_staff_id: IDS.staffId,
    status: 'uploading',
    sale_completed_at: '2026-07-07T01:02:03.000Z',
    captured_at: '2026-07-07T01:05:00.000Z',
  });
});

runTest('enabled POST rejects invalid request before repository creation', async () => {
  let repositoryCalled = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      repositoryCalled = true;
      return createFakeClient({});
    },
  });

  const response = await handlers.POST(createJsonRequest({ ownerId: IDS.ownerId }));
  const body = await response.json() as { code: string };

  assert.equal(response.status, 400);
  assert.equal(body.code, 'invalid_request');
  assert.equal(repositoryCalled, false);
});

runTest('enabled FormData POST stays disabled behind the R2 upload gate before parsing body', async () => {
  let repositoryCalled = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => false,
    async resolveActor() {
      throw new Error('auth should not be resolved while R2 upload is disabled');
    },
    createRepository() {
      repositoryCalled = true;
      return createFakeClient({});
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as { code: string; shouldKeepLocalPayload: boolean };

  assert.equal(response.status, 501);
  assert.equal(body.code, 'sales_photo_evidence_r2_upload_disabled');
  assert.equal(body.shouldKeepLocalPayload, true);
  assert.equal(repositoryCalled, false);
});

runTest('enabled FormData POST runs claim image upload thumbnail upload and finalize through injected fakes only', async () => {
  const calls: string[] = [];
  const fakeClient = createFakeClient({
    events: {
      data: {
        id: IDS.saleId,
        type: 'deal_closed',
        market_id: IDS.marketId,
        timestamp: '2026-07-07T01:02:03.000Z',
        markets: { owner_id: IDS.ownerId },
      },
      error: null,
    },
    sale_photo_evidence: { data: null, error: null },
    'sale_photo_evidence:insert': { data: evidenceRow(), error: null },
  });
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      calls.push('auth');
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      calls.push('repository');
      return fakeClient;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'upload_thumbnail' : 'upload_image');
        return { ok: true, key: input.key };
      },
    },
    async finalizeUploadedEvidence(input) {
      calls.push('finalize');
      assert.equal(input.evidenceId, IDS.evidenceId);
      assert.equal(input.ownerId, IDS.ownerId);
      assert.equal(input.marketId, IDS.marketId);
      assert.equal(input.saleId, IDS.saleId);
      assert.match(input.imageObjectKey, /^sales-evidence\/7d\//);
      assert.match(input.thumbnailObjectKey, /^sales-evidence-thumbs\/7d\//);
      assert.equal(input.mimeType, 'image/webp');
      assert.equal(input.width, 1200);
      assert.equal(input.height, 900);
      assert.equal(input.fileSizeBytes, 4);
    },
    now: () => new Date('2026-07-07T02:00:00.000Z'),
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as {
    ok: boolean;
    action: string;
    evidenceId: string;
    shouldDeleteLocalPayloadAfterSuccess: boolean;
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.action, 'upload_completed');
  assert.equal(body.evidenceId, IDS.evidenceId);
  assert.equal(body.shouldDeleteLocalPayloadAfterSuccess, true);
  assert.deepEqual(calls, ['auth', 'repository', 'upload_image', 'upload_thumbnail', 'finalize']);
});

runTest('R2 failure remains identifiable even when failure-status metadata cannot be updated', async () => {
  const fakeClient = createFakeClient({
    events: {
      data: {
        id: IDS.saleId,
        type: 'deal_closed',
        market_id: IDS.marketId,
        timestamp: '2026-07-07T01:02:03.000Z',
        markets: { owner_id: IDS.ownerId },
      },
      error: null,
    },
    sale_photo_evidence: { data: null, error: null },
    'sale_photo_evidence:insert': { data: evidenceRow(), error: null },
  });
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      return fakeClient;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        return { ok: false, key: input.key, code: 'r2_upload_failed', message: 'R2 unavailable' };
      },
    },
    async markEvidenceUploadFailed() {
      throw new Error('metadata update unavailable');
    },
  });

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const response = await handlers.POST(createUploadFormDataRequest());
    const body = await response.json() as { code: string; shouldKeepLocalPayload: boolean };

    assert.equal(response.status, 500);
    assert.equal(body.code, 'r2_image_upload_failed');
    assert.equal(body.shouldKeepLocalPayload, true);
  } finally {
    console.error = originalConsoleError;
  }
});

runTest('route source wires metadata claim but still avoids R2 signed reads and local payload deletion', () => {
  assert.match(routeSource, /executeSalesPhotoEvidenceMetadataClaimAdapter/);
  assert.match(routeSource, /createSalesPhotoEvidenceMetadataClaimSupabaseRepository/);
  assert.match(routeSource, /SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED/);
  assert.match(routeSource, /SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION/);
  assert.match(routeSource, /SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED/);
  assert.match(routeSource, /SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION/);
  assert.match(routeSource, /isR2UploadEnabled/);
  assert.match(routeSource, /createDefaultR2UploadAdapter/);
  assert.match(routeSource, /parseSalesPhotoEvidenceUploadFormData\(await request\.formData\(\)\)/);
  assert.match(routeSource, /global:\s*{\s*headers:\s*{\s*Authorization:\s*`Bearer \$\{token\}`/);
  assert.doesNotMatch(routeSource, /@aws-sdk|S3Client|PutObjectCommand|GetObjectCommand|getSignedUrl|createPresignedPost/);
  assert.doesNotMatch(routeSource, /deletePendingSalesPhotoEvidencePayload|indexedDB|Dexie|salesPhotoEvidencePendingPayloads/i);
  assert.doesNotMatch(routeSource, /NEXT_PUBLIC_R2|SERVICE_ROLE|service_role/i);
});

runTest('execution plan and test manifest record metadata claim route wiring', () => {
  assert.match(executionPlanSource, /Slice 7B-3E Status/);
  assert.match(executionPlanSource, /upload route is wired to the metadata claim adapter and repository/);
  assert.match(executionPlanSource, /does not implement R2 upload, signed URL issuance, local payload deletion, queue drain, or production runtime enqueue/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-upload-route-disabled\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence upload route metadata claim wiring tests failed`);
  }
}

main();
