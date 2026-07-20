import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

const testRequire = createRequire(import.meta.url);
const serverOnlyPath = testRequire.resolve('server-only');
const serverOnlyMarker = new Module(serverOnlyPath);
serverOnlyMarker.filename = serverOnlyPath;
serverOnlyMarker.loaded = true;
serverOnlyMarker.exports = {};
testRequire.cache[serverOnlyPath] = serverOnlyMarker;

// `server-only` intentionally throws under a normal Node resolver. Stub only
// that marker before loading the route; the route and its server dependencies
// still execute normally in these handler-level tests.
const {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
  createSalesPhotoEvidenceUploadRouteHandlers,
  isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv,
  isSalesPhotoEvidenceR2UploadRouteEnabledForEnv,
} = testRequire('../app/api/sales-photo-evidence/upload/route') as typeof import(
  '../app/api/sales-photo-evidence/upload/route'
);
import type {
  SalesPhotoEvidenceMetadataClaimSupabaseClient,
  SalesPhotoEvidenceServerMutationRepository,
} from '../lib/supabase/sales-photo-evidence-metadata-claim-repository';

type TestFn = () => void | Promise<void>;

type FinalizeMutationInput = Parameters<
  SalesPhotoEvidenceServerMutationRepository['finalizeEvidenceUploaded']
>[0];
type FailureMutationInput = Parameters<
  SalesPhotoEvidenceServerMutationRepository['markEvidenceUploadFailed']
>[0];

type FakeMutationRepositoryOptions = {
  finalizeError?: Error;
  markFailedError?: Error;
};

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

async function assertDisabledResponse(methodName: string, handler: (request: Request) => Promise<Response>): Promise<void> {
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
    retryable: false,
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

function createFakeMutationRepository(
  calls: string[] = [],
  options: FakeMutationRepositoryOptions = {}
): SalesPhotoEvidenceServerMutationRepository & {
  createdCapturedByStaffIds: Array<string | null>;
  finalizedInputs: FinalizeMutationInput[];
  failedInputs: FailureMutationInput[];
} {
  const createdCapturedByStaffIds: Array<string | null> = [];
  const finalizedInputs: FinalizeMutationInput[] = [];
  const failedInputs: FailureMutationInput[] = [];

  return {
    createdCapturedByStaffIds,
    finalizedInputs,
    failedInputs,
    async createEvidenceUploadingClaim(input) {
      calls.push('claim');
      createdCapturedByStaffIds.push(input.capturedByStaffId);
      return {
        id: IDS.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: input.capturedByStaffId,
        status: 'uploading',
      };
    },
    async markEvidenceUploading(input) {
      calls.push('claim');
      return {
        id: input.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: IDS.staffId,
        status: 'uploading',
      };
    },
    async finalizeEvidenceUploaded(input) {
      calls.push('server_finalize');
      finalizedInputs.push(input);
      if (options.finalizeError) throw options.finalizeError;
      return {
        id: input.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: IDS.staffId,
        status: 'uploaded',
      };
    },
    async markEvidenceUploadFailed(input) {
      calls.push('server_mark_failed');
      failedInputs.push(input);
      if (options.markFailedError) throw options.markFailedError;
      return {
        id: input.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: IDS.staffId,
        status: 'upload_failed',
      };
    },
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
  if (type === 'image/jpeg') {
    const bytes = new Uint8Array(Math.max(size, 3));
    bytes.set([0xff, 0xd8, 0xff]);
    return new Blob([bytes], { type });
  }

  const bytes = new Uint8Array(Math.max(size, 12));
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  return new Blob([bytes], { type });
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

runTest('enabled multipart POST requires an authenticated actor before parsing the body', async () => {
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return null;
    },
    createRepository() {
      throw new Error('repository should not be created without auth');
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as { code: string };

  assert.equal(response.status, 401);
  assert.equal(body.code, 'authentication_required');
});

runTest('authentication dependency outage is retryable 503 rather than expired-login 401', async () => {
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return 'unavailable';
    },
    createRepository() {
      throw new Error('repository must not be created');
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as { code: string; retryable: boolean };
  assert.equal(response.status, 503);
  assert.equal(body.code, 'authentication_unavailable');
  assert.equal(body.retryable, true);
});

runTest('unexpected route failures return structured JSON and retain the local payload', async () => {
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
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
    const response = await handlers.POST(createUploadFormDataRequest());
    const body = await response.json() as { code: string; shouldKeepLocalPayload: boolean };

    assert.equal(response.status, 500);
    assert.equal(body.code, 'upload_route_unexpected_error');
    assert.equal(body.shouldKeepLocalPayload, true);
  } finally {
    console.error = originalConsoleError;
  }
});

runTest('legacy JSON POST is rejected without auth, repository, or metadata mutation', async () => {
  let authCalled = false;
  let repositoryCalled = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    async resolveActor() {
      authCalled = true;
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      repositoryCalled = true;
      return createFakeClient({});
    },
  });

  const response = await handlers.POST(createJsonRequest(validRequestBody()));
  const body = await response.json() as { code: string; retryable: boolean };
  assert.equal(response.status, 415);
  assert.equal(body.code, 'unsupported_media_type');
  assert.equal(body.retryable, false);
  assert.equal(authCalled, false);
  assert.equal(repositoryCalled, false);
});

runTest('staff identity and attribution come from the verified actor rather than client fields', async () => {
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
    staff_relationships: { data: { owner_id: IDS.ownerId }, error: null },
    'sale_photo_evidence:insert': { data: evidenceRow(), error: null },
  });
  const mutations = createFakeMutationRepository();
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.staffId };
    },
    createRepository() {
      return fakeClient;
    },
    createMutationRepository() {
      return mutations;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        return { ok: true, key: input.key };
      },
    },
  });
  const source = createUploadFormDataRequest();
  const formData = await source.formData();
  formData.set('capturedByStaffId', '99999999-9999-4999-8999-999999999999');

  const response = await handlers.POST(new Request(
    'https://example.test/api/sales-photo-evidence/upload',
    { method: 'POST', body: formData }
  ));
  assert.equal(response.status, 200);
  assert.deepEqual(mutations.createdCapturedByStaffIds, [IDS.staffId]);
});

runTest('inactive staff relationship fails closed before metadata mutation', async () => {
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
    staff_relationships: { data: null, error: null },
  });
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.staffId };
    },
    createRepository() {
      return fakeClient;
    },
    createMutationRepository() {
      return createFakeMutationRepository();
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as { code: string; retryable: boolean };
  assert.equal(response.status, 403);
  assert.equal(body.code, 'permission_denied');
  assert.equal(body.retryable, false);
  assert.equal(fakeClient.calls.some(call => call.operation === 'insert'), false);
});

runTest('enabled multipart POST rejects invalid form data before repository creation', async () => {
  let repositoryCalled = false;
  let mutationRepositoryCalled = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      repositoryCalled = true;
      return createFakeClient({});
    },
    createMutationRepository() {
      mutationRepositoryCalled = true;
      return createFakeMutationRepository();
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(new Request(
    'https://example.test/api/sales-photo-evidence/upload',
    { method: 'POST', body: new FormData() }
  ));
  const body = await response.json() as { code: string };

  assert.equal(response.status, 400);
  assert.equal(body.code, 'invalid_upload_form_data');
  assert.equal(repositoryCalled, false);
  assert.equal(mutationRepositoryCalled, false);
});

runTest('missing server mutation configuration returns retryable 503 before DB or R2 writes', async () => {
  let repositoryCalled = false;
  let r2Called = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      repositoryCalled = true;
      return createFakeClient({});
    },
    createMutationRepository() {
      return null;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        r2Called = true;
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as {
    code: string;
    retryable: boolean;
    shouldKeepLocalPayload: boolean;
  };

  assert.equal(response.status, 503);
  assert.equal(body.code, 'sales_photo_evidence_server_mutation_unavailable');
  assert.equal(body.retryable, true);
  assert.equal(body.shouldKeepLocalPayload, true);
  assert.equal(repositoryCalled, false);
  assert.equal(r2Called, false);
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

runTest('oversized multipart requests fail before authentication or body parsing', async () => {
  let authCalled = false;
  let formDataCalled = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      authCalled = true;
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      throw new Error('repository must not be created');
    },
  });
  const request = {
    headers: new Headers({
      'content-type': 'multipart/form-data; boundary=test',
      'content-length': '2000001',
    }),
    async formData() {
      formDataCalled = true;
      return new FormData();
    },
  } as unknown as Request;

  const response = await handlers.POST(request);
  const body = await response.json() as { code: string };
  assert.equal(response.status, 413);
  assert.equal(body.code, 'upload_request_too_large');
  assert.equal(authCalled, false);
  assert.equal(formDataCalled, false);
});

runTest('multipart MIME signature mismatch fails before metadata or R2 writes', async () => {
  let repositoryCalled = false;
  let r2Called = false;
  const source = createUploadFormDataRequest();
  const formData = await source.formData();
  const invalidImage = new Blob([new Uint8Array(20)], { type: 'image/webp' });
  formData.set('image', invalidImage);
  formData.set('imageMetadata', JSON.stringify({
    kind: 'image',
    mimeType: invalidImage.type,
    fileSizeBytes: invalidImage.size,
    width: 1200,
    height: 900,
  }));
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      repositoryCalled = true;
      return createFakeClient({});
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        r2Called = true;
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(new Request(
    'https://example.test/api/sales-photo-evidence/upload',
    { method: 'POST', body: formData }
  ));
  const body = await response.json() as { code: string };
  assert.equal(response.status, 400);
  assert.equal(body.code, 'invalid_upload_form_data');
  assert.equal(repositoryCalled, false);
  assert.equal(r2Called, false);
});

runTest('unauthorized fault headers fail before claim or R2 writes', async () => {
  let mutationCalled = false;
  let r2Called = false;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      return createFakeClient({});
    },
    createMutationRepository() {
      mutationCalled = true;
      return createFakeMutationRepository();
    },
    resolveFaultInjection() {
      return { action: 'reject' };
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        r2Called = true;
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        r2Called = true;
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as {
    code: string;
    retryable: boolean;
    shouldKeepLocalPayload: boolean;
  };

  assert.equal(response.status, 403);
  assert.equal(body.code, 'fault_injection_not_authorized');
  assert.equal(body.retryable, false);
  assert.equal(body.shouldKeepLocalPayload, true);
  assert.equal(mutationCalled, false);
  assert.equal(r2Called, false);
});

runTest('production handler path uses one attempt for claim R2 uploads and server finalize', async () => {
  const calls: string[] = [];
  const attemptIds: string[] = [];
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
  const mutations = createFakeMutationRepository(calls);
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
    createMutationRepository(actor, attemptId) {
      calls.push('mutation_repository');
      assert.equal(actor.actorId, IDS.ownerId);
      assert.match(
        attemptId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      attemptIds.push(attemptId);
      return mutations;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'upload_thumbnail' : 'upload_image');
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        return { ok: true, key: input.key };
      },
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
  assert.deepEqual(calls, [
    'auth',
    'mutation_repository',
    'repository',
    'claim',
    'upload_image',
    'upload_thumbnail',
    'server_finalize',
  ]);
  assert.equal(attemptIds.length, 1);
  assert.deepEqual(mutations.finalizedInputs, [{
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    imageObjectKey: `sales-evidence/7d/${IDS.ownerId}/${IDS.marketId}/${IDS.saleId}/${IDS.evidenceId}.webp`,
    thumbnailObjectKey: `sales-evidence-thumbs/7d/${IDS.ownerId}/${IDS.marketId}/${IDS.saleId}/${IDS.evidenceId}.webp`,
    mimeType: 'image/webp',
    width: 1200,
    height: 900,
    fileSizeBytes: 12,
    capturedAt: '2026-07-07T01:05:00.000Z',
    uploadedAt: '2026-07-07T02:00:00.000Z',
    expiresAt: '2026-07-14T02:00:00.000Z',
  }]);
  assert.deepEqual(mutations.failedInputs, []);
});

runTest('R2 failure is recorded through the same server mutation repository before responding', async () => {
  const calls: string[] = [];
  const attemptIds: string[] = [];
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
  const mutations = createFakeMutationRepository(calls);
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      return fakeClient;
    },
    createMutationRepository(actor, attemptId) {
      assert.equal(actor.actorId, IDS.ownerId);
      attemptIds.push(attemptId);
      return mutations;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        calls.push('upload_image');
        return { ok: false, key: input.key, code: 'r2_upload_failed', message: 'R2 unavailable' };
      },
      async deleteObject(input) {
        calls.push('unexpected_delete');
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as { code: string; shouldKeepLocalPayload: boolean };

  assert.equal(response.status, 500);
  assert.equal(body.code, 'r2_image_upload_failed');
  assert.equal(body.shouldKeepLocalPayload, true);
  assert.equal(attemptIds.length, 1);
  assert.deepEqual(calls, ['claim', 'upload_image', 'server_mark_failed']);
  assert.deepEqual(mutations.failedInputs, [{
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    reason: 'r2_image_upload_failed',
  }]);
  assert.deepEqual(mutations.finalizedInputs, []);
});

runTest('thumbnail failure deletes the image confirmed uploaded by the same attempt', async () => {
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
  });
  const mutations = createFakeMutationRepository(calls);
  let uploadCount = 0;
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      return fakeClient;
    },
    createMutationRepository() {
      return mutations;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        uploadCount++;
        if (uploadCount === 1) {
          calls.push('upload_image');
          return { ok: true, key: input.key };
        }
        calls.push('upload_thumbnail');
        return { ok: false, key: input.key, code: 'r2_upload_failed', message: 'R2 unavailable' };
      },
      async deleteObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'unexpected_delete_thumbnail' : 'delete_image');
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as {
    code: string;
    shouldKeepLocalPayload: boolean;
    cleanupIncomplete: boolean;
  };

  assert.equal(response.status, 500);
  assert.equal(body.code, 'r2_thumbnail_upload_failed');
  assert.equal(body.shouldKeepLocalPayload, true);
  assert.equal(body.cleanupIncomplete, false);
  assert.deepEqual(calls, [
    'claim',
    'upload_image',
    'upload_thumbnail',
    'delete_image',
    'server_mark_failed',
  ]);
  assert.deepEqual(mutations.failedInputs, [{
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    reason: 'r2_thumbnail_upload_failed',
  }]);
});

runTest('authorized thumbnail fault skips the thumbnail PUT and uses the compensation path', async () => {
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
  });
  const mutations = createFakeMutationRepository(calls);
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      return fakeClient;
    },
    createMutationRepository() {
      return mutations;
    },
    resolveFaultInjection() {
      return { action: 'inject', mode: 'thumbnail_upload_failed' };
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'unexpected_upload_thumbnail' : 'upload_image');
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'unexpected_delete_thumbnail' : 'delete_image');
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as { code: string; cleanupIncomplete: boolean };

  assert.equal(response.status, 500);
  assert.equal(body.code, 'r2_thumbnail_upload_failed');
  assert.equal(body.cleanupIncomplete, false);
  assert.deepEqual(calls, ['claim', 'upload_image', 'delete_image', 'server_mark_failed']);
});

runTest('finalize rejection keeps the payload and performs same-attempt failure cleanup', async () => {
  const calls: string[] = [];
  const attemptIds: string[] = [];
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
    staff_relationships: { data: { owner_id: IDS.ownerId }, error: null },
  });
  const mutations = createFakeMutationRepository(calls, {
    finalizeError: new Error('staff relationship was revoked before finalize'),
  });
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.staffId };
    },
    createRepository() {
      return fakeClient;
    },
    createMutationRepository(actor, attemptId) {
      assert.equal(actor.actorId, IDS.staffId);
      attemptIds.push(attemptId);
      return mutations;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'upload_thumbnail' : 'upload_image');
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'delete_thumbnail' : 'delete_image');
        return { ok: true, key: input.key };
      },
    },
    now: () => new Date('2026-07-07T02:00:00.000Z'),
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as {
    ok: boolean;
    code: string;
    retryable: boolean;
    shouldKeepLocalPayload: boolean;
    cleanupIncomplete: boolean;
    shouldDeleteLocalPayloadAfterSuccess?: boolean;
  };

  assert.equal(response.status, 500);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'metadata_finalize_failed');
  assert.equal(body.retryable, true);
  assert.equal(body.shouldKeepLocalPayload, true);
  assert.equal(body.cleanupIncomplete, false);
  assert.equal(body.shouldDeleteLocalPayloadAfterSuccess, undefined);
  assert.equal(attemptIds.length, 1, 'One request must create exactly one upload-attempt lease.');
  assert.deepEqual(calls, [
    'claim',
    'upload_image',
    'upload_thumbnail',
    'server_finalize',
    'delete_thumbnail',
    'delete_image',
    'server_mark_failed',
  ]);
  assert.equal(mutations.finalizedInputs.length, 1);
  assert.deepEqual(mutations.failedInputs, [{
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    reason: 'metadata_finalize_failed',
  }]);
});

runTest('authorized finalize fault skips finalize mutation and compensates both uploads', async () => {
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
  });
  const mutations = createFakeMutationRepository(calls);
  const handlers = createSalesPhotoEvidenceUploadRouteHandlers({
    isMetadataClaimEnabled: () => true,
    isR2UploadEnabled: () => true,
    async resolveActor() {
      return { actorId: IDS.ownerId };
    },
    createRepository() {
      return fakeClient;
    },
    createMutationRepository() {
      return mutations;
    },
    resolveFaultInjection() {
      return { action: 'inject', mode: 'metadata_finalize_failed' };
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'upload_thumbnail' : 'upload_image');
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'delete_thumbnail' : 'delete_image');
        return { ok: true, key: input.key };
      },
    },
  });

  const response = await handlers.POST(createUploadFormDataRequest());
  const body = await response.json() as { code: string; cleanupIncomplete: boolean };

  assert.equal(response.status, 500);
  assert.equal(body.code, 'metadata_finalize_failed');
  assert.equal(body.cleanupIncomplete, false);
  assert.deepEqual(calls, [
    'claim',
    'upload_image',
    'upload_thumbnail',
    'delete_thumbnail',
    'delete_image',
    'server_mark_failed',
  ]);
  assert.deepEqual(mutations.finalizedInputs, []);
});

runTest('compensation reports cleanup incomplete and still attempts every confirmed object', async () => {
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
  });
  const mutations = createFakeMutationRepository(calls, {
    finalizeError: new Error('finalize failed'),
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
    createMutationRepository() {
      return mutations;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        calls.push(input.key.includes('sales-evidence-thumbs/') ? 'upload_thumbnail' : 'upload_image');
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        if (input.key.includes('sales-evidence-thumbs/')) {
          calls.push('delete_thumbnail_failed');
          return {
            ok: false,
            key: input.key,
            code: 'r2_delete_failed',
            message: 'R2 unavailable',
          };
        }
        calls.push('delete_image');
        return { ok: true, key: input.key };
      },
    },
  });

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const response = await handlers.POST(createUploadFormDataRequest());
    const body = await response.json() as {
      code: string;
      shouldKeepLocalPayload: boolean;
      cleanupIncomplete: boolean;
    };

    assert.equal(response.status, 500);
    assert.equal(body.code, 'metadata_finalize_failed');
    assert.equal(body.shouldKeepLocalPayload, true);
    assert.equal(body.cleanupIncomplete, true);
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(calls, [
    'claim',
    'upload_image',
    'upload_thumbnail',
    'server_finalize',
    'delete_thumbnail_failed',
    'delete_image',
    'server_mark_failed',
  ]);
});

runTest('server mutation secrets never escape through route JSON or cleanup logs', async () => {
  const canary = 'sb_secret_ROUTE_CANARY_must_not_escape';
  const logs: unknown[][] = [];
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
  });
  const mutations = createFakeMutationRepository([], {
    finalizeError: new Error(canary),
    markFailedError: new Error(canary),
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
    createMutationRepository() {
      return mutations;
    },
    r2UploadAdapter: {
      async uploadObject(input) {
        return { ok: true, key: input.key };
      },
      async deleteObject(input) {
        return { ok: true, key: input.key };
      },
    },
  });

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    const response = await handlers.POST(createUploadFormDataRequest());
    const body = await response.json() as {
      ok: boolean;
      code: string;
      message: string;
      retryable: boolean;
      shouldKeepLocalPayload: boolean;
      cleanupIncomplete: boolean;
    };
    const observableOutput = JSON.stringify({
      body,
      headers: Object.fromEntries(response.headers.entries()),
      logs,
    });

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      ok: false,
      code: 'metadata_finalize_failed',
      message: 'Sales photo evidence metadata finalize failed.',
      retryable: true,
      shouldKeepLocalPayload: true,
      cleanupIncomplete: false,
    });
    assert.doesNotMatch(observableOutput, /sb_secret_ROUTE_CANARY_must_not_escape/);
    assert.equal(mutations.finalizedInputs.length, 1);
    assert.equal(mutations.failedInputs.length, 1);
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
  assert.match(routeSource, /parseAndValidateSalesPhotoEvidenceUploadFormData\(await request\.formData\(\)\)/);
  assert.match(routeSource, /authenticateAppApiRequest/);
  assert.match(routeSource, /createAppApiUserSupabaseClient/);
  assert.match(routeSource, /capturedByStaffId:\s*getTrustedCapturedByStaffId\(actor, body\.ownerId\)/);
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
