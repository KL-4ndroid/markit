import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createCloudflareR2SalesPhotoEvidenceUploadAdapter,
  createSalesPhotoEvidenceR2ServerConfigFromEnv,
  type SalesPhotoEvidenceR2PutObjectClient,
} from '../lib/sales/photo-evidence-r2-upload-adapter.server';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const VALID_KEY = [
  'sales-evidence',
  '7d',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444.webp',
].join('/');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const serverAdapterSource = readProjectFile('lib/sales/photo-evidence-r2-upload-adapter.server.ts');
const routeSource = readProjectFile('app/api/sales-photo-evidence/upload/route.ts');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function validConfig() {
  return {
    accountId: 'account-id',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
    bucketName: 'private-bucket',
  };
}

function validUploadInput() {
  return {
    key: VALID_KEY,
    body: new Uint8Array([1, 2, 3]),
    contentType: 'image/webp' as const,
    contentLength: 3,
  };
}

console.log('\n=== Sales photo evidence R2 upload adapter server ===');

runTest('server config is built only from explicit server env input', () => {
  assert.deepEqual(createSalesPhotoEvidenceR2ServerConfigFromEnv({
    R2_ACCOUNT_ID: 'account',
    R2_ACCESS_KEY_ID: 'access',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET_NAME: 'bucket',
    R2_ENDPOINT: 'https://example.test',
  }), {
    ok: true,
    config: {
      accountId: 'account',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      bucketName: 'bucket',
      endpoint: 'https://example.test',
    },
  });
});

runTest('server adapter sends one private PutObjectCommand through the injected client', async () => {
  const sent: unknown[] = [];
  const fakeClient: SalesPhotoEvidenceR2PutObjectClient = {
    async send(command) {
      sent.push(command);
      return { ETag: '"etag"' };
    },
  };
  const adapter = createCloudflareR2SalesPhotoEvidenceUploadAdapter({
    config: validConfig(),
    client: fakeClient,
  });

  const result = await adapter.uploadObject(validUploadInput());

  assert.deepEqual(result, {
    ok: true,
    key: VALID_KEY,
    etag: '"etag"',
  });
  assert.equal(sent.length, 1);
  assert.deepEqual((sent[0] as { input: Record<string, unknown> }).input, {
    Bucket: 'private-bucket',
    Key: VALID_KEY,
    Body: new Uint8Array([1, 2, 3]),
    ContentType: 'image/webp',
    ContentLength: 3,
  });
});

runTest('server adapter validates upload input before sending to R2', async () => {
  let sendCalled = false;
  const adapter = createCloudflareR2SalesPhotoEvidenceUploadAdapter({
    config: validConfig(),
    client: {
      async send() {
        sendCalled = true;
        return {};
      },
    },
  });

  const result = await adapter.uploadObject({
    ...validUploadInput(),
    key: 'wrong-prefix/file.webp',
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'invalid_upload_object');
  assert.equal(sendCalled, false);
});

runTest('server adapter maps R2 errors to retryable upload failures', async () => {
  const adapter = createCloudflareR2SalesPhotoEvidenceUploadAdapter({
    config: validConfig(),
    client: {
      async send() {
        throw new Error('network failed');
      },
    },
  });

  const result = await adapter.uploadObject(validUploadInput());

  assert.equal(result.ok, false);
  assert.equal(result.code, 'r2_upload_failed');
  assert.equal(result.message, 'Sales photo evidence R2 upload failed.');
});

runTest('R2 SDK is confined to server adapter and route remains dependency-injected', () => {
  assert.match(serverAdapterSource, /@aws-sdk\/client-s3/);
  assert.match(serverAdapterSource, /PutObjectCommand/);
  assert.match(serverAdapterSource, /S3Client/);
  assert.doesNotMatch(serverAdapterSource, /NEXT_PUBLIC_R2|SERVICE_ROLE|service_role/);
  assert.doesNotMatch(serverAdapterSource, /process\.env/);
  assert.doesNotMatch(routeSource, /@aws-sdk|S3Client|PutObjectCommand|createPresignedPost|getSignedUrl/);
});

runTest('package and execution plan record Slice 7B-4E without production enablement', () => {
  assert.equal(packageJson.dependencies?.['@aws-sdk/client-s3'] !== undefined, true);
  assert.match(executionPlanSource, /Slice 7B-4E Status/);
  assert.match(executionPlanSource, /real R2 adapter/);
  assert.match(executionPlanSource, /lazy-loads this adapter only when `SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED=1`/);
  assert.match(executionPlanSource, /does not enable production upload, connect UI upload buttons, issue signed URLs, or delete local payloads/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-r2-upload-adapter-server\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence R2 upload adapter server tests failed`);
  }
}

main();
